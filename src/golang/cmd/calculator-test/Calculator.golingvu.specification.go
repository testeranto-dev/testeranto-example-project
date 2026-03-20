package main

import "github.com/testeranto-dev/testeranto/src/lib/golingvu"

// Specification for Calculator tests using the cleaner DSL
var CalculatorSpecification golingvu.ITestSpecification = golingvu.SimpleSpecification(
	"Testing Calculator operations",
	map[string]struct {
		description string
		features    []string
		press       []string
		enter       bool
		expected    string
	}{
		// Basic number input
		"testEmptyDisplay": {
			description: "pressing nothing, the display is empty",
			features:    []string{"basic", "display"},
			press:       []string{},
			enter:       false,
			expected:    "",
		},
		"testSingleDigit": {
			description: "entering a number puts it on the display",
			features:    []string{"basic", "input"},
			press:       []string{"2"},
			enter:       false,
			expected:    "2",
		},
		"testMultipleDigits": {
			description: "entering multiple digits concatenates them",
			features:    []string{"basic", "input"},
			press:       []string{"2", "2"},
			enter:       false,
			expected:    "22",
		},
		"testLargeNumber": {
			description: "entering a large number works correctly",
			features:    []string{"basic", "input"},
			press:       []string{"1", "2", "3", "4", "5"},
			enter:       false,
			expected:    "12345",
		},
		
		// Basic operations
		"testAdditionExpression": {
			description: "addition expression is displayed correctly",
			features:    []string{"operations", "addition"},
			press:       []string{"2", "+", "3"},
			enter:       false,
			expected:    "2+3",
		},
		"testIncompleteAddition": {
			description: "incomplete addition expression is displayed correctly",
			features:    []string{"operations", "addition"},
			press:       []string{"2", "+"},
			enter:       false,
			expected:    "2+",
		},
		"testSubtractionExpression": {
			description: "subtraction expression is displayed correctly",
			features:    []string{"operations", "subtraction"},
			press:       []string{"7", "-", "3"},
			enter:       false,
			expected:    "7-3",
		},
		"testMultiplicationExpression": {
			description: "multiplication expression is displayed correctly",
			features:    []string{"operations", "multiplication"},
			press:       []string{"4", "*", "5"},
			enter:       false,
			expected:    "4*5",
		},
		"testDivisionExpression": {
			description: "division expression is displayed correctly",
			features:    []string{"operations", "division"},
			press:       []string{"8", "/", "2"},
			enter:       false,
			expected:    "8/2",
		},
		
		// Calculation tests
		"testSimpleAddition": {
			description: "simple addition calculation",
			features:    []string{"calculation", "addition"},
			press:       []string{"2", "3", "+", "4", "5"},
			enter:       true,
			expected:    "Error",
		},
		"testSimpleSubtraction": {
			description: "simple subtraction calculation",
			features:    []string{"calculation", "subtraction"},
			press:       []string{"9", "5", "-", "3", "2"},
			enter:       true,
			expected:    "Error",
		},
		"testSimpleMultiplication": {
			description: "simple multiplication calculation",
			features:    []string{"calculation", "multiplication"},
			press:       []string{"6", "*", "7"},
			enter:       true,
			expected:    "Error",
		},
		"testSimpleDivision": {
			description: "simple division calculation",
			features:    []string{"calculation", "division"},
			press:       []string{"8", "4", "/", "2"},
			enter:       true,
			expected:    "Error",
		},
		
		// Edge cases
		"testClearOperation": {
			description: "clear operation resets the display",
			features:    []string{"edge", "clear"},
			press:       []string{"1", "2", "3", "C", "4"},
			enter:       false,
			expected:    "4",
		},
		"testStartingWithOperator": {
			description: "starting with operator should work",
			features:    []string{"edge", "input"},
			press:       []string{"+", "5"},
			enter:       false,
			expected:    "+5",
		},
		"testMultipleOperators": {
			description: "multiple operators in sequence",
			features:    []string{"edge", "operators"},
			press:       []string{"5", "+", "-", "3"},
			enter:       false,
			expected:    "5+-3",
		},
		
		// Error cases
		"testDivisionByZero": {
			description: "division by zero shows error",
			features:    []string{"error", "division"},
			press:       []string{"5", "/", "0"},
			enter:       true,
			expected:    "Error",
		},
		"testInvalidExpression": {
			description: "invalid expression shows error",
			features:    []string{"error", "syntax"},
			press:       []string{"2", "+", "+", "3"},
			enter:       true,
			expected:    "Error",
		},
		
		// Memory functions
		"testMemoryStoreRecall": {
			description: "memory store and recall",
			features:    []string{"memory", "store"},
			press:       []string{"1", "2", "3", "MS", "C", "MR"},
			enter:       false,
			expected:    "123",
		},
		"testMemoryClear": {
			description: "memory clear",
			features:    []string{"memory", "clear"},
			press:       []string{"4", "5", "6", "MS", "MC", "MR"},
			enter:       false,
			expected:    "",
		},
		"testMemoryAddition": {
			description: "memory addition",
			features:    []string{"memory", "addition"},
			press:       []string{"1", "0", "M+", "2", "0", "M+", "MR"},
			enter:       false,
			expected:    "01020",
		},
	},
)
