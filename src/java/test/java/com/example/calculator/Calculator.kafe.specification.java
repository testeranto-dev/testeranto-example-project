package com.example.calculator;

import kafe.Default;
import java.util.*;

import static kafe.Default.*;

class CalculatorKafeSpecification {
    
    public static Object specification(
        Map<String, String> suites,
        Map<String, Object> givens,
        Map<String, Object> whens,
        Map<String, Object> thens
    ) {
        Map<String, Map<String, Object>> testCases = new HashMap<>();
        
        // Helper to add test cases concisely
        // Basic number input
        testCases.put("testEmptyDisplay", testCase(
            new String[]{"pressing nothing, the display is empty"},
            Collections.emptyList(),
            Collections.singletonList(then(thens, "result", ""))
        ));
        
        testCases.put("testSingleDigit", testCase(
            new String[]{"entering a number puts it on the display"},
            Collections.singletonList(when(whens, "press", "2")),
            Collections.singletonList(then(thens, "result", "2"))
        ));
        
        testCases.put("testMultipleDigits", testCase(
            new String[]{"entering multiple digits concatenates them"},
            Arrays.asList(
                when(whens, "press", "2"),
                when(whens, "press", "2")
            ),
            Collections.singletonList(then(thens, "result", "22"))
        ));
        
        testCases.put("testLargeNumber", testCase(
            new String[]{"entering a large number works correctly"},
            Arrays.asList(
                when(whens, "press", "1"),
                when(whens, "press", "2"),
                when(whens, "press", "3"),
                when(whens, "press", "4"),
                when(whens, "press", "5")
            ),
            Collections.singletonList(then(thens, "result", "12345"))
        ));
        
        // Basic operations
        testCases.put("testAdditionExpression", testCase(
            new String[]{"addition expression is displayed correctly"},
            Arrays.asList(
                when(whens, "press", "2"),
                when(whens, "press", "+"),
                when(whens, "press", "3")
            ),
            Collections.singletonList(then(thens, "result", "2+3"))
        ));
        
        testCases.put("testIncompleteAddition", testCase(
            new String[]{"incomplete addition expression is displayed correctly"},
            Arrays.asList(
                when(whens, "press", "2"),
                when(whens, "press", "+")
            ),
            Collections.singletonList(then(thens, "result", "2+"))
        ));
        
        testCases.put("testSubtractionExpression", testCase(
            new String[]{"subtraction expression is displayed correctly"},
            Arrays.asList(
                when(whens, "press", "7"),
                when(whens, "press", "-"),
                when(whens, "press", "3")
            ),
            Collections.singletonList(then(thens, "result", "7-3"))
        ));
        
        testCases.put("testMultiplicationExpression", testCase(
            new String[]{"multiplication expression is displayed correctly"},
            Arrays.asList(
                when(whens, "press", "4"),
                when(whens, "press", "*"),
                when(whens, "press", "5")
            ),
            Collections.singletonList(then(thens, "result", "4*5"))
        ));
        
        testCases.put("testDivisionExpression", testCase(
            new String[]{"division expression is displayed correctly"},
            Arrays.asList(
                when(whens, "press", "8"),
                when(whens, "press", "/"),
                when(whens, "press", "2")
            ),
            Collections.singletonList(then(thens, "result", "8/2"))
        ));
        
        // Calculation tests
        testCases.put("testSimpleAddition", testCase(
            new String[]{"simple addition calculation"},
            Arrays.asList(
                when(whens, "press", "2"),
                when(whens, "press", "3"),
                when(whens, "press", "+"),
                when(whens, "press", "4"),
                when(whens, "press", "5"),
                when(whens, "enter")
            ),
            Collections.singletonList(then(thens, "result", "68"))
        ));
        
        testCases.put("testSimpleSubtraction", testCase(
            new String[]{"simple subtraction calculation"},
            Arrays.asList(
                when(whens, "press", "9"),
                when(whens, "press", "5"),
                when(whens, "press", "-"),
                when(whens, "press", "3"),
                when(whens, "press", "2"),
                when(whens, "enter")
            ),
            Collections.singletonList(then(thens, "result", "63"))
        ));
        
        testCases.put("testSimpleMultiplication", testCase(
            new String[]{"simple multiplication calculation"},
            Arrays.asList(
                when(whens, "press", "6"),
                when(whens, "press", "*"),
                when(whens, "press", "7"),
                when(whens, "enter")
            ),
            Collections.singletonList(then(thens, "result", "42"))
        ));
        
        testCases.put("testSimpleDivision", testCase(
            new String[]{"simple division calculation"},
            Arrays.asList(
                when(whens, "press", "8"),
                when(whens, "press", "4"),
                when(whens, "press", "/"),
                when(whens, "press", "2"),
                when(whens, "enter")
            ),
            Collections.singletonList(then(thens, "result", "42"))
        ));
        
        // Edge cases
        testCases.put("testClearOperation", testCase(
            new String[]{"clear operation resets the display"},
            Arrays.asList(
                when(whens, "press", "1"),
                when(whens, "press", "2"),
                when(whens, "press", "3"),
                when(whens, "press", "C"),
                when(whens, "press", "4")
            ),
            Collections.singletonList(then(thens, "result", "4"))
        ));
        
        testCases.put("testStartingWithOperator", testCase(
            new String[]{"starting with operator should work"},
            Arrays.asList(
                when(whens, "press", "+"),
                when(whens, "press", "5")
            ),
            Collections.singletonList(then(thens, "result", "+5"))
        ));
        
        testCases.put("testMultipleOperators", testCase(
            new String[]{"multiple operators in sequence"},
            Arrays.asList(
                when(whens, "press", "5"),
                when(whens, "press", "+"),
                when(whens, "press", "-"),
                when(whens, "press", "3")
            ),
            Collections.singletonList(then(thens, "result", "5+-3"))
        ));
        
        // Error cases
        testCases.put("testDivisionByZero", testCase(
            new String[]{"division by zero shows error"},
            Arrays.asList(
                when(whens, "press", "5"),
                when(whens, "press", "/"),
                when(whens, "press", "0"),
                when(whens, "enter")
            ),
            Collections.singletonList(then(thens, "result", "Error"))
        ));
        
        testCases.put("testInvalidExpression", testCase(
            new String[]{"invalid expression shows error"},
            Arrays.asList(
                when(whens, "press", "2"),
                when(whens, "press", "+"),
                when(whens, "press", "+"),
                when(whens, "press", "3"),
                when(whens, "enter")
            ),
            Collections.singletonList(then(thens, "result", "Error"))
        ));
        
        // Memory functions
        testCases.put("testMemoryStoreRecall", testCase(
            new String[]{"memory store and recall"},
            Arrays.asList(
                when(whens, "press", "1"),
                when(whens, "press", "2"),
                when(whens, "press", "3"),
                when(whens, "press", "MS"),
                when(whens, "press", "C"),
                when(whens, "press", "MR")
            ),
            Collections.singletonList(then(thens, "result", "123"))
        ));
        
        testCases.put("testMemoryClear", testCase(
            new String[]{"memory clear"},
            Arrays.asList(
                when(whens, "press", "4"),
                when(whens, "press", "5"),
                when(whens, "press", "6"),
                when(whens, "press", "MS"),
                when(whens, "press", "MC"),
                when(whens, "press", "MR")
            ),
            Collections.singletonList(then(thens, "result", "0"))
        ));
        
        testCases.put("testMemoryAddition", testCase(
            new String[]{"memory addition"},
            Arrays.asList(
                when(whens, "press", "1"),
                when(whens, "press", "0"),
                when(whens, "press", "M+"),
                when(whens, "press", "2"),
                when(whens, "press", "0"),
                when(whens, "press", "M+"),
                when(whens, "press", "MR")
            ),
            Collections.singletonList(then(thens, "result", "30"))
        ));
        
        // Create the suite using the library helper
        return suite("Testing Calculator operations", testCases);
    }
}
