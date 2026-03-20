// Native Test Detection and Translation for Go
package main

import (
	"encoding/json"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"strings"
)

// DetectionResult represents the result of native test detection
type DetectionResult struct {
	IsNativeTest   bool                   `json:"isNativeTest"`
	FrameworkType  string                 `json:"frameworkType"`
	TestStructure  map[string]interface{} `json:"testStructure"`
}

// Detector handles detection of native Go tests
type Detector struct {
	filePath string
	content  string
	fset     *token.FileSet
	astFile  *ast.File
}

// NewDetector creates a new detector for a Go file
func NewDetector(filePath string) (*Detector, error) {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, err
	}

	fset := token.NewFileSet()
	astFile, err := parser.ParseFile(fset, filePath, content, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	return &Detector{
		filePath: filePath,
		content:  string(content),
		fset:     fset,
		astFile:  astFile,
	}, nil
}

// IsNativeTest checks if the file contains native Go tests
func (d *Detector) IsNativeTest() bool {
	// Check file naming patterns
	filename := filepath.Base(d.filePath)
	if strings.HasSuffix(filename, "_test.go") {
		return true
	}

	// Check for test function patterns in AST
	hasTestFunctions := false
	ast.Inspect(d.astFile, func(n ast.Node) bool {
		if fn, ok := n.(*ast.FuncDecl); ok {
			if strings.HasPrefix(fn.Name.Name, "Test") ||
				strings.HasPrefix(fn.Name.Name, "Example") ||
				strings.HasPrefix(fn.Name.Name, "Benchmark") {
				hasTestFunctions = true
				return false
			}
		}
		return true
	})

	return hasTestFunctions
}

// FrameworkType identifies the specific test framework
func (d *Detector) FrameworkType() string {
	if !d.IsNativeTest() {
		return ""
	}

	// Check imports for testify
	if d.hasImport("github.com/stretchr/testify") {
		return "testify"
	}

	// Check for ginkgo imports
	if d.hasImport("github.com/onsi/ginkgo") || d.hasImport("github.com/onsi/ginkgo/v2") {
		return "ginkgo"
	}

	// Check for gomega imports (often used with ginkgo)
	if d.hasImport("github.com/onsi/gomega") {
		return "ginkgo" // Usually used with ginkgo
	}

	// Default to standard Go testing
	return "testing"
}

// TestStructure extracts the structure of tests in the file
func (d *Detector) TestStructure() map[string]interface{} {
	structure := map[string]interface{}{
		"testFunctions": []map[string]interface{}{},
		"testSuites":    []map[string]interface{}{},
		"imports":       []string{},
	}

	if !d.IsNativeTest() {
		return structure
	}

	// Collect imports
	for _, imp := range d.astFile.Imports {
		if imp.Path != nil {
			structure["imports"] = append(structure["imports"].([]string), strings.Trim(imp.Path.Value, "\""))
		}
	}

	// Collect test functions
	testFuncs := []map[string]interface{}{}
	ast.Inspect(d.astFile, func(n ast.Node) bool {
		if fn, ok := n.(*ast.FuncDecl); ok {
			if strings.HasPrefix(fn.Name.Name, "Test") ||
				strings.HasPrefix(fn.Name.Name, "Example") ||
				strings.HasPrefix(fn.Name.Name, "Benchmark") {
				
				funcInfo := map[string]interface{}{
					"name": fn.Name.Name,
					"type": d.getFunctionType(fn.Name.Name),
				}

				// Get line number
				if fn.Pos().IsValid() {
					funcInfo["line"] = d.fset.Position(fn.Pos()).Line
				}

				// Check for subtests
				funcInfo["hasSubtests"] = d.hasSubtests(fn)

				testFuncs = append(testFuncs, funcInfo)
			}
		}
		return true
	})

	structure["testFunctions"] = testFuncs

	// Check for test suite structures
	if d.FrameworkType() == "testify" {
		structure["hasTestSuite"] = d.hasTestifySuite()
	}

	return structure
}

// Helper methods
func (d *Detector) hasImport(importPath string) bool {
	for _, imp := range d.astFile.Imports {
		if imp.Path != nil && strings.Contains(strings.Trim(imp.Path.Value, "\""), importPath) {
			return true
		}
	}
	return false
}

func (d *Detector) getFunctionType(name string) string {
	if strings.HasPrefix(name, "Test") {
		return "test"
	} else if strings.HasPrefix(name, "Example") {
		return "example"
	} else if strings.HasPrefix(name, "Benchmark") {
		return "benchmark"
	}
	return "unknown"
}

func (d *Detector) hasSubtests(fn *ast.FuncDecl) bool {
	hasSubtests := false
	ast.Inspect(fn.Body, func(n ast.Node) bool {
		if callExpr, ok := n.(*ast.CallExpr); ok {
			if selExpr, ok := callExpr.Fun.(*ast.SelectorExpr); ok {
				if selExpr.Sel.Name == "Run" {
					hasSubtests = true
					return false
				}
			}
		}
		return true
	})
	return hasSubtests
}

func (d *Detector) hasTestifySuite() bool {
	hasSuite := false
	ast.Inspect(d.astFile, func(n ast.Node) bool {
		if typeSpec, ok := n.(*ast.TypeSpec); ok {
			if structType, ok := typeSpec.Type.(*ast.StructType); ok {
				for _, field := range structType.Fields.List {
					if selExpr, ok := field.Type.(*ast.SelectorExpr); ok {
						if selExpr.Sel.Name == "Suite" {
							hasSuite = true
							return false
						}
					}
				}
			}
		}
		return true
	})
	return hasSuite
}

// TranslateNativeTest is the main entry point for detection and translation
func TranslateNativeTest(filePath string) (*DetectionResult, error) {
	detector, err := NewDetector(filePath)
	if err != nil {
		return &DetectionResult{
			IsNativeTest:  false,
			FrameworkType: "",
			TestStructure: map[string]interface{}{},
		}, nil
	}

	if detector.IsNativeTest() {
		frameworkType := detector.FrameworkType()
		testStructure := detector.TestStructure()

		return &DetectionResult{
			IsNativeTest:  true,
			FrameworkType: frameworkType,
			TestStructure: testStructure,
		}, nil
	}

	return &DetectionResult{
		IsNativeTest:  false,
		FrameworkType: "",
		TestStructure: map[string]interface{}{},
	}, nil
}

// Main function for command-line testing
func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run native_detection.go <file-path>")
		os.Exit(1)
	}

	filePath := os.Args[1]
	result, err := TranslateNativeTest(filePath)
	if err != nil {
		fmt.Printf("Error detecting native test: %v\n", err)
		os.Exit(1)
	}

	jsonResult, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Printf("Error marshaling result: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(jsonResult))
}
