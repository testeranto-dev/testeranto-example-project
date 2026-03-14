//! Calculator library
//! 
//! This library provides a Calculator implementation that can be used in applications
//! and tested with both regular Rust tests and Testeranto tests.

mod calculator;

// Re-export the main Calculator type
pub use calculator::Calculator;

// Unit tests for the Calculator
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_calculator() {
        let calc = Calculator::new();
        assert_eq!(calc.get_display(), "");
    }

    #[test]
    fn test_press_numbers() {
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
    fn test_memory_store_recall() {
        let mut calc = Calculator::new();
        calc.press("4").press("5").press("6");
        calc.press("MS");
        assert_eq!(calc.get_display(), "");
        calc.press("MR");
        assert_eq!(calc.get_display(), "456");
    }

    #[test]
    fn test_simple_addition() {
        let mut calc = Calculator::new();
        calc.press("2").press("+").press("3");
        calc.enter();
        assert_eq!(calc.get_display(), "5");
    }
}
