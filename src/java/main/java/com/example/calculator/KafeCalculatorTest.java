package com.example.calculator;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * Example of using Calculator with Kafe testing framework.
 * This demonstrates how the Calculator could be integrated with Kafe.
 */
public class KafeCalculatorTest {
    
    public static void main(String[] args) {
        System.out.println("Kafe Calculator Test Example");
        System.out.println("============================");
        
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
            expected -> calculator -> calculator.getDisplay().equals(expected));
        
        // Demonstrate the implementation
        System.out.println("Suites: " + suites);
        System.out.println("Number of givens: " + givens.size());
        System.out.println("Number of whens: " + whens.size());
        System.out.println("Number of thens: " + thens.size());
        
        // Test the calculator directly
        Calculator calc = new Calculator();
        calc.press("1").press("2").press("3");
        System.out.println("\nDirect test - After pressing 123: " + calc.getDisplay());
        
        // Test addition
        calc.press("+").press("4").press("5").press("6").enter();
        System.out.println("After 123+456 and enter: " + calc.getDisplay());
        
        // Test memory operations
        Calculator calc2 = new Calculator();
        calc2.press("5").press("0").memoryStore();
        System.out.println("After storing 50 in memory: display cleared");
        calc2.memoryRecall();
        System.out.println("After memory recall: " + calc2.getDisplay());
        
        System.out.println("\nKafe integration example completed!");
    }
}
