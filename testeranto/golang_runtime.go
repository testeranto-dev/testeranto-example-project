package main

import (
	"crypto/md5"
	"encoding/hex"
	"encoding/json"
	"fmt"

	// "log"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Package struct maps the fields we need from 'go list'
type Package struct {
	ImportPath   string   `json:"ImportPath"`
	Dir          string   `json:"Dir"`
	GoFiles      []string `json:"GoFiles"`
	CgoFiles     []string `json:"CgoFiles"`
	CFiles       []string `json:"CFiles"`
	CXXFiles     []string `json:"CXXFiles"`
	HFiles       []string `json:"HFiles"`
	SFiles       []string `json:"SFiles"`
	SwigFiles    []string `json:"SwigFiles"`
	SwigCXXFiles []string `json:"SwigCXXFiles"`
	SysoFiles    []string `json:"SysoFiles"`
	EmbedFiles   []string `json:"EmbedFiles"`
	TestGoFiles  []string `json:"TestGoFiles"`
	Module       *struct {
		Main bool `json:"Main"`
	} `json:"Module"`
}

// TestEntry represents a test entry in the metafile
type TestEntry struct {
	Name   string   `json:"name"`
	Path   string   `json:"path"`
	Inputs []string `json:"inputs"`
	Output string   `json:"output"`
}

// Metafile structure matching esbuild format
type Metafile struct {
	Inputs  map[string]InputEntry  `json:"inputs"`
	Outputs map[string]OutputEntry `json:"outputs"`
}

// InputEntry represents an input file
type InputEntry struct {
	Bytes   int      `json:"bytes"`
	Imports []string `json:"imports"`
}

// OutputEntry represents an output entry
type OutputEntry struct {
	Imports    []string               `json:"imports"`
	Exports    []string               `json:"exports"`
	EntryPoint string                 `json:"entryPoint"`
	Inputs     map[string]InputDetail `json:"inputs"`
	Bytes      int                    `json:"bytes"`
}

// InputDetail represents input file details in output
type InputDetail struct {
	BytesInOutput int `json:"bytesInOutput"`
}

func computeFilesHash(files []string) (string, error) {
	hash := md5.New()
	for _, file := range files {
		absPath := filepath.Join("/workspace", file)
		// Add file path to hash
		hash.Write([]byte(file))

		// Add file stats to hash
		info, err := os.Stat(absPath)
		if err == nil {
			hash.Write([]byte(info.ModTime().String()))
			hash.Write([]byte(fmt.Sprintf("%d", info.Size())))
		} else {
			hash.Write([]byte("missing"))
		}
	}
	return hex.EncodeToString(hash.Sum(nil)), nil
}

func main() {
	// Force output to be visible
	fmt.Fprintln(os.Stdout, "🚀 Go builder starting...")
	fmt.Fprintln(os.Stderr, "🚀 Go builder starting (stderr)...")
	os.Stdout.Sync()
	os.Stderr.Sync()

	// Parse command line arguments similar to Rust builder
	// Expected: main.go <project_config> <golang_config> <test_name> <entry_points...>
	args := os.Args
	if len(args) < 4 {
		fmt.Fprintln(os.Stderr, "❌ Insufficient arguments")
		fmt.Fprintln(os.Stderr, "Usage: main.go <project_config> <golang_config> <test_name> <entry_points...>")
		os.Exit(1)
	}

	// projectConfigPath := args[1]
	// golangConfigPath := args[2]
	testName := args[3]
	entryPoints := args[4:]

	fmt.Printf("Test name: %s\n", testName)
	fmt.Printf("Entry points: %v\n", entryPoints)

	if len(entryPoints) == 0 {
		fmt.Fprintln(os.Stderr, "❌ No entry points provided")
		os.Exit(1)
	}

	// Change to workspace directory
	workspace := "/workspace"
	if err := os.Chdir(workspace); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to change to workspace directory: %v\n", err)
		os.Exit(1)
	}

	// Create bundles directory
	bundlesDir := filepath.Join(workspace, "testeranto/bundles", testName)
	if err := os.MkdirAll(bundlesDir, 0755); err != nil {
		fmt.Fprintf(os.Stderr, "❌ Failed to create bundles directory: %v\n", err)
		os.Exit(1)
	}

	// Process each entry point
	for _, entryPoint := range entryPoints {
		fmt.Printf("\n📦 Processing Go test: %s\n", entryPoint)

		// Get entry point path
		entryPointPath := filepath.Join(workspace, entryPoint)
		if _, err := os.Stat(entryPointPath); err != nil {
			fmt.Fprintf(os.Stderr, "  ❌ Entry point does not exist: %s\n", entryPointPath)
			os.Exit(1)
		}

		// Get base name (without .go extension)
		fileName := filepath.Base(entryPoint)
		if !strings.HasSuffix(fileName, ".go") {
			fmt.Fprintf(os.Stderr, "  ❌ Entry point is not a Go file: %s\n", entryPoint)
			os.Exit(1)
		}
		baseName := strings.TrimSuffix(fileName, ".go")
		// Replace dots with underscores to make a valid binary name
		binaryName := strings.ReplaceAll(baseName, ".", "_")

		// Find module root
		moduleRoot := findModuleRoot(entryPointPath)
		if moduleRoot == "" {
			fmt.Fprintf(os.Stderr, "  ❌ Cannot find go.mod in or above %s\n", entryPointPath)
			os.Exit(1)
		}

		// Change to module root directory
		if err := os.Chdir(moduleRoot); err != nil {
			fmt.Fprintf(os.Stderr, "  ❌ Cannot change to module root %s: %v\n", moduleRoot, err)
			os.Exit(1)
		}

		// Get relative path from module root to entry point
		relEntryPath, err := filepath.Rel(moduleRoot, entryPointPath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "  ❌ Failed to get relative path: %v\n", err)
			os.Exit(1)
		}

		// Go modules handle dependencies automatically
		// The build will succeed or fail based on go.mod correctness
		fmt.Printf("  Building with Go modules...\n")
		
		// Ensure dependencies are up to date, especially for local modules
		// First, remove go.sum to force fresh resolution
		goSumPath := filepath.Join(moduleRoot, "go.sum")
		if _, err := os.Stat(goSumPath); err == nil {
			fmt.Printf("  Removing go.sum to force fresh dependency resolution...\n")
			os.Remove(goSumPath)
		}
		
		fmt.Printf("  Running go mod tidy...\n")
		tidyCmd := exec.Command("go", "mod", "tidy")
		tidyCmd.Stdout = os.Stdout
		tidyCmd.Stderr = os.Stderr
		tidyCmd.Dir = moduleRoot
		if err := tidyCmd.Run(); err != nil {
			fmt.Printf("  ⚠️  go mod tidy failed: %v\n", err)
			// Continue anyway, as the build might still work
		}

		// Collect input files in a simple way, similar to rust builder
		var inputs []string
		
		// Add the entry point file itself
		relEntryToWorkspace, err := filepath.Rel(workspace, entryPointPath)
		if err == nil && !strings.HasPrefix(relEntryToWorkspace, "..") {
			inputs = append(inputs, relEntryToWorkspace)
		} else {
			// Fallback
			inputs = append(inputs, entryPoint)
		}
		
		// Add go.mod and go.sum if they exist
		goModPath := filepath.Join(moduleRoot, "go.mod")
		goSumPath := filepath.Join(moduleRoot, "go.sum")
		fmt.Printf("  Module root: %s\n", moduleRoot)
		fmt.Printf("  go.mod path: %s\n", goModPath)
		for _, filePath := range []string{goModPath, goSumPath} {
			if _, err := os.Stat(filePath); err == nil {
				relToWorkspace, err := filepath.Rel(workspace, filePath)
				if err == nil && !strings.HasPrefix(relToWorkspace, "..") {
					inputs = append(inputs, relToWorkspace)
				}
			} else {
				fmt.Printf("  ⚠️  File not found: %s\n", filePath)
			}
		}
		
		// Add all .go files in the module root and subdirectories
		// This is similar to rust builder which adds all .rs files in src/
		err = filepath.Walk(moduleRoot, func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return nil // skip errors
			}
			if !info.IsDir() && strings.HasSuffix(path, ".go") {
				relToWorkspace, err := filepath.Rel(workspace, path)
				if err == nil && !strings.HasPrefix(relToWorkspace, "..") {
					inputs = append(inputs, relToWorkspace)
				}
			}
			return nil
		})
		if err != nil {
			fmt.Printf("  ⚠️  Warning while walking directory: %v\n", err)
		}
		
		fmt.Printf("  Found %d input files (simplified collection)\n", len(inputs))

		// Compute hash
		testHash, err := computeFilesHash(inputs)
		if err != nil {
			fmt.Printf("  ⚠️  Failed to compute hash: %v\n", err)
			testHash = "error"
		}

		// Create inputFiles.json
		inputFilesBasename := strings.ReplaceAll(entryPoint, "/", "_") + "-inputFiles.json"
		inputFilesPath := filepath.Join(bundlesDir, inputFilesBasename)
		inputFilesJSON, err := json.MarshalIndent(inputs, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "  ❌ Failed to marshal inputFiles.json: %v\n", err)
			os.Exit(1)
		}
		if err := os.WriteFile(inputFilesPath, inputFilesJSON, 0644); err != nil {
			fmt.Fprintf(os.Stderr, "  ❌ Failed to write inputFiles.json: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("  ✅ Created inputFiles.json at %s\n", inputFilesPath)

		// Compile the binary
		outputExePath := filepath.Join(bundlesDir, binaryName)
		fmt.Printf("  🔨 Compiling %s to %s...\n", relEntryPath, outputExePath)

		// Build the entire package directory, not just the single file
		// Get the directory containing the entry point
		entryDir := filepath.Dir(relEntryPath)
		if entryDir == "." {
			entryDir = "./"
		}
		
		// List all .go files in the entry directory for debugging
		fmt.Printf("  📁 Building package in directory: %s\n", entryDir)
		goFiles, _ := filepath.Glob(filepath.Join(entryDir, "*.go"))
		fmt.Printf("  📄 Found %d .go files in package:\n", len(goFiles))
		for _, f := range goFiles {
			fmt.Printf("    - %s\n", filepath.Base(f))
		}
		
		// Build the package in that directory
		// Use ./... pattern to build all packages in the directory
		// First, ensure all dependencies are built
		buildDepsCmd := exec.Command("go", "build", "./...")
		buildDepsCmd.Stdout = os.Stdout
		buildDepsCmd.Stderr = os.Stderr
		buildDepsCmd.Dir = moduleRoot
		if err := buildDepsCmd.Run(); err != nil {
			fmt.Printf("  ⚠️  Failed to build dependencies: %v\n", err)
			// Continue anyway, as the main build might still work
		}
		
		buildCmd := exec.Command("go", "build", "-o", outputExePath, "./"+entryDir)
		buildCmd.Stdout = os.Stdout
		buildCmd.Stderr = os.Stderr
		buildCmd.Dir = moduleRoot

		if err := buildCmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "  ❌ Failed to compile: %v\n", err)
			fmt.Fprintf(os.Stderr, "  💡 Go module dependency error.\n")
			fmt.Fprintf(os.Stderr, "  💡 This could be due to:\n")
			fmt.Fprintf(os.Stderr, "  💡 1. Missing or incorrect module structure\n")
			fmt.Fprintf(os.Stderr, "  💡 2. Network issues downloading modules\n")
			fmt.Fprintf(os.Stderr, "  💡 3. Version conflicts in go.mod\n")
			fmt.Fprintf(os.Stderr, "  💡 4. Missing files in the package (trying to build single file instead of package)\n")
			fmt.Fprintf(os.Stderr, "  💡 5. Inconsistent imports between files\n")
			fmt.Fprintf(os.Stderr, "  💡 6. Local module replace directives not working\n")
			fmt.Fprintf(os.Stderr, "  💡 7. Try running 'go mod tidy' manually\n")
			fmt.Fprintf(os.Stderr, "  💡 8. Dependencies not built\n")
			fmt.Fprintf(os.Stderr, "  💡 Check that all imported packages exist and are correctly published.\n")
			os.Exit(1)
		}
		
		fmt.Printf("  ✅ Successfully compiled to %s\n", outputExePath)

		// Make executable
		if err := os.Chmod(outputExePath, 0755); err != nil {
			fmt.Printf("  ⚠️  Failed to make binary executable: %v\n", err)
		}

		// Create dummy bundle file (for consistency with other runtimes)
		dummyPath := filepath.Join(bundlesDir, entryPoint)
		if err := os.MkdirAll(filepath.Dir(dummyPath), 0755); err != nil {
			fmt.Fprintf(os.Stderr, "  ❌ Failed to create dummy bundle directory: %v\n", err)
			os.Exit(1)
		}

		dummyContent := fmt.Sprintf(`#!/usr/bin/env bash
# Dummy bundle file generated by testeranto
# Hash: %s
# This file execs the compiled Go binary

exec "%s" "$@"
`, testHash, outputExePath)

		if err := os.WriteFile(dummyPath, []byte(dummyContent), 0755); err != nil {
			fmt.Fprintf(os.Stderr, "  ❌ Failed to write dummy bundle file: %v\n", err)
			os.Exit(1)
		}

		fmt.Printf("  ✅ Created dummy bundle file at %s\n", dummyPath)

		// Change back to workspace root for next iteration
		if err := os.Chdir(workspace); err != nil {
			fmt.Fprintf(os.Stderr, "  ⚠️  Failed to change back to workspace: %v\n", err)
		}
	}

	fmt.Println("\n🎉 Go builder completed successfully")
}

func getCurrentDir() string {
	dir, err := os.Getwd()
	if err != nil {
		return fmt.Sprintf("Error: %v", err)
	}
	return dir
}

func findConfig() string {
	return "/workspace/testeranto/runtimes/golang/golang.go"
}

// loadConfig is defined in config.go
// findModuleRoot walks up from dir to find a directory containing go.mod
func findModuleRoot(dir string) string {
	current := dir
	for {
		goModPath := filepath.Join(current, "go.mod")
		if _, err := os.Stat(goModPath); err == nil {
			return current
		}
		parent := filepath.Dir(current)
		if parent == current {
			break
		}
		current = parent
	}
	return ""
}

// TestConfig represents configuration for a single test
type TestConfig struct {
	Path string `json:"path"`
}

// GolangConfig represents the Go-specific configuration
type GolangConfig struct {
	Tests map[string]TestConfig `json:"tests"`
}

// Config represents the overall configuration
type Config struct {
	Golang GolangConfig `json:"golang"`
}

func copyFile(src, dst string) error {
	input, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	// Ensure the destination directory exists
	if err := os.MkdirAll(filepath.Dir(dst), 0755); err != nil {
		return err
	}
	return os.WriteFile(dst, input, 0644)
}

func copyDir(src, dst string) error {
	// Get properties of source dir
	info, err := os.Stat(src)
	if err != nil {
		return err
	}

	// Create the destination directory
	if err := os.MkdirAll(dst, info.Mode()); err != nil {
		return err
	}

	// Read the source directory
	entries, err := os.ReadDir(src)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		srcPath := filepath.Join(src, entry.Name())
		dstPath := filepath.Join(dst, entry.Name())

		if entry.IsDir() {
			if err := copyDir(srcPath, dstPath); err != nil {
				return err
			}
		} else {
			if err := copyFile(srcPath, dstPath); err != nil {
				return err
			}
		}
	}
	return nil
}

func loadConfig(path string) (*Config, error) {
	fmt.Printf("[INFO] Loading config from: %s\n", path)

	// Run the Go file to get JSON output
	cmd := exec.Command("go", "run", path)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to run config program: %w", err)
	}

	var config Config
	if err := json.Unmarshal(output, &config); err != nil {
		return nil, fmt.Errorf("failed to decode config JSON: %w", err)
	}

	fmt.Printf("[INFO] Loaded config with %d Go test(s)\n", len(config.Golang.Tests))
	for testName, testConfig := range config.Golang.Tests {
		fmt.Printf("[INFO]   - %s (path: %s)\n", testName, testConfig.Path)
	}

	return &config, nil
}
