//! Testeranto test for Calculator
//! This file is used by the Testeranto framework to run BDD-style tests.

use crate::Calculator;

fn main() {
    println!("Calculator test - starting...");
    
    // Test basic functionality
    let mut calc = Calculator::new();
    
    // Test 1: Basic number input
    calc.press("1").press("2").press("3");
    assert_eq!(calc.get_display(), "123");
    println!("✓ Test 1 passed: Basic number input");
    
    // Test 2: Clear
    calc.press("C");
    assert_eq!(calc.get_display(), "");
    println!("✓ Test 2 passed: Clear");
    
    // Test 3: Another number
    calc.press("4").press("5").press("6");
    assert_eq!(calc.get_display(), "456");
    println!("✓ Test 3 passed: Another number");
    
    // Test 4: Memory store and recall
    calc.press("C");
    calc.press("7").press("8").press("9");
    calc.press("MS"); // Memory store
    assert_eq!(calc.get_display(), "");
    calc.press("MR"); // Memory recall
    assert_eq!(calc.get_display(), "789");
    println!("✓ Test 4 passed: Memory store and recall");
    
    // Test 5: Memory clear
    calc.press("MC");
    calc.press("MR");
    assert_eq!(calc.get_display(), "0");
    println!("✓ Test 5 passed: Memory clear");
    
    println!("\nAll tests passed successfully!");
}
