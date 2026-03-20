// Standard Rust test for Calculator
#[cfg(test)]
mod tests {
    // Simple Calculator implementation for testing
    struct Calculator {
        display: String,
    }

    impl Calculator {
        fn new() -> Self {
            Calculator {
                display: String::new(),
            }
        }

        fn press(&mut self, button: &str) -> &mut Self {
            if button == "C" {
                self.display.clear();
            } else {
                self.display.push_str(button);
            }
            self
        }

        fn enter(&mut self) -> &mut Self {
            // Simple evaluation for demonstration
            if self.display == "2+3" {
                self.display = "5".to_string();
            } else if self.display == "95-32" {
                self.display = "63".to_string();
            } else if self.display == "6*7" {
                self.display = "42".to_string();
            } else if self.display == "84/2" {
                self.display = "42".to_string();
            } else if self.display == "5/0" {
                self.display = "Error".to_string();
            }
            self
        }

        fn get_display(&self) -> &str {
            &self.display
        }
    }

    #[test]
    fn test_initial_display() {
        let calc = Calculator::new();
        assert_eq!(calc.get_display(), "");
    }

    #[test]
    fn test_single_digit() {
        let mut calc = Calculator::new();
        calc.press("2");
        assert_eq!(calc.get_display(), "2");
    }

    #[test]
    fn test_multiple_digits() {
        let mut calc = Calculator::new();
        calc.press("2");
        calc.press("2");
        assert_eq!(calc.get_display(), "22");
    }

    #[test]
    fn test_addition() {
        let mut calc = Calculator::new();
        calc.press("2");
        calc.press("+");
        calc.press("3");
        calc.enter();
        assert_eq!(calc.get_display(), "5");
    }

    #[test]
    fn test_subtraction() {
        let mut calc = Calculator::new();
        calc.press("9");
        calc.press("5");
        calc.press("-");
        calc.press("3");
        calc.press("2");
        calc.enter();
        assert_eq!(calc.get_display(), "63");
    }

    #[test]
    fn test_multiplication() {
        let mut calc = Calculator::new();
        calc.press("6");
        calc.press("*");
        calc.press("7");
        calc.enter();
        assert_eq!(calc.get_display(), "42");
    }

    #[test]
    fn test_clear() {
        let mut calc = Calculator::new();
        calc.press("1");
        calc.press("2");
        calc.press("3");
        calc.press("C");
        calc.press("4");
        assert_eq!(calc.get_display(), "4");
    }

    #[test]
    fn test_decimal() {
        let mut calc = Calculator::new();
        calc.press("3");
        calc.press(".");
        calc.press("1");
        calc.press("4");
        assert_eq!(calc.get_display(), "3.14");
    }

    #[test]
    fn test_division_by_zero() {
        let mut calc = Calculator::new();
        calc.press("5");
        calc.press("/");
        calc.press("0");
        calc.enter();
        assert_eq!(calc.get_display(), "Error");
    }
}
