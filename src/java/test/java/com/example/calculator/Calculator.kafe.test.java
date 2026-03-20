package com.example.calculator;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

class CalculatorKafeTest {
    
    public static void main(String[] args) {
        System.out.println("Starting Calculator Kafe tests...");
        
        // Create test implementation
        Map<String, String> suites = new HashMap<>();
        suites.put("Default", "Default test suite for Calculator");
        
        Map<String, Object> givens = new HashMap<>();
        givens.put("Default", (Function<Void, Calculator>) (v) -> new Calculator());
        
        Map<String, Object> whens = new HashMap<>();
        whens.put("press", (Function<String, Function<Calculator, Calculator>>) 
            button -> calculator -> calculator.press(button));
        whens.put("enter", (Function<Void, Function<Calculator, Calculator>>) 
            v -> calculator -> calculator.enter());
        whens.put("memoryStore", (Function<Void, Function<Calculator, Calculator>>) 
            v -> calculator -> calculator.memoryStore());
        whens.put("memoryRecall", (Function<Void, Function<Calculator, Calculator>>) 
            v -> calculator -> calculator.memoryRecall());
        whens.put("memoryClear", (Function<Void, Function<Calculator, Calculator>>) 
            v -> calculator -> calculator.memoryClear());
        whens.put("memoryAdd", (Function<Void, Function<Calculator, Calculator>>) 
            v -> calculator -> calculator.memoryAdd());
        
        Map<String, Object> thens = new HashMap<>();
        thens.put("result", (Function<String, Function<Calculator, Boolean>>) 
            expected -> calculator -> {
                String actual = calculator.getDisplay();
                if (!actual.equals(expected)) {
                    System.err.println("Expected display '" + expected + "', got '" + actual + "'");
                    return false;
                }
                return true;
            });
        
        System.out.println("Test implementation created successfully");
        System.out.println("Suites: " + suites.size());
        System.out.println("Givens: " + givens.size());
        System.out.println("Whens: " + whens.size());
        System.out.println("Thens: " + thens.size());
        
        // Run a simple test directly
        System.out.println("\nRunning a simple test...");
        Calculator calc = new Calculator();
        calc.press("1").press("2").press("3");
        System.out.println("After pressing 123: " + calc.getDisplay());
        
        if ("123".equals(calc.getDisplay())) {
            System.out.println("✓ Test passed!");
        } else {
            System.out.println("✗ Test failed!");
        }
        
        // Test clear
        calc.press("C");
        if ("".equals(calc.getDisplay())) {
            System.out.println("✓ Clear test passed!");
        } else {
            System.out.println("✗ Clear test failed!");
        }
        
        System.out.println("\nAll tests completed!");
    }
}
