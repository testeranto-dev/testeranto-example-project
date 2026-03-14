//! Integration tests for the Calculator library
//! 
//! These are regular Rust integration tests that run with `cargo test`.
//! They are separate from Testeranto tests which are compiled as separate binaries.

use calculator::Calculator;

#[test]
fn test_basic_number_input() {
    let mut calc = Calculator::new();
    calc.press("1").press("2").press("3");
    assert_eq!(calc.get_display(), "123");
}

#[test]
fn test_clear() {
    let mut calc = Calculator::new();
    calc.press("1").press("2").press("3");
    calc.press("C");
    assert_eq!(calc.get_display(), "");
}

#[test]
fn test_memory_operations() {
    let mut calc = Calculator::new();
    calc.press("4").press("5").press("6");
    calc.press("MS");
    assert_eq!(calc.get_display(), "");
    
    calc.press("MR");
    assert_eq!(calc.get_display(), "456");
    
    calc.press("MC");
    calc.press("MR");
    assert_eq!(calc.get_display(), "0");
}

#[test]
fn test_enter_evaluation() {
    let mut calc = Calculator::new();
    calc.press("2").press("+").press("3");
    calc.enter();
    assert_eq!(calc.get_display(), "5");
}

#[test]
fn test_arithmetic_operations() {
    let calc = Calculator::new();
    assert_eq!(calc.add(2.0, 3.0), 5.0);
    assert_eq!(calc.subtract(5.0, 3.0), 2.0);
    assert_eq!(calc.multiply(2.0, 3.0), 6.0);
    assert_eq!(calc.divide(6.0, 3.0).unwrap(), 2.0);
}

#[test]
fn test_division_by_zero() {
    let calc = Calculator::new();
    assert!(calc.divide(1.0, 0.0).is_err());
}

#[test]
fn test_value_storage() {
    let mut calc = Calculator::new();
    calc.set_value("x", 42.0);
    assert_eq!(calc.get_value("x"), Some(42.0));
    assert_eq!(calc.get_value("y"), None);
}
