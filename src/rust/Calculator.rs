//! Calculator implementation
//! 
//! This module contains the Calculator struct and its implementation.

use std::collections::HashMap;

/// A simple calculator for demonstration purposes.
#[derive(Debug, Clone)]
pub struct Calculator {
    display: String,
    memory: f64,
    values: HashMap<String, f64>,
}

impl Calculator {
    /// Creates a new Calculator instance.
    pub fn new() -> Self {
        Calculator {
            display: String::new(),
            memory: 0.0,
            values: HashMap::new(),
        }
    }

    /// Press a button on the calculator.
    pub fn press(&mut self, button: &str) -> &mut Self {
        match button {
            "C" => {
                self.display.clear();
                self
            }
            "MS" => self.memory_store(),
            "MR" => self.memory_recall(),
            "MC" => self.memory_clear(),
            "M+" => self.memory_add(),
            _ => {
                self.display.push_str(button);
                self
            }
        }
    }

    /// Evaluate the expression on the display.
    pub fn enter(&mut self) -> &mut Self {
        match self.evaluate_expression() {
            Ok(result) => {
                self.display = result.to_string();
            }
            Err(_) => {
                self.display = "Error".to_string();
            }
        }
        self
    }

    /// Store the current display value in memory.
    pub fn memory_store(&mut self) -> &mut Self {
        if let Ok(value) = self.display.parse::<f64>() {
            self.memory = value;
            self.display.clear();
        }
        self
    }

    /// Recall the value from memory to the display.
    pub fn memory_recall(&mut self) -> &mut Self {
        self.display = self.memory.to_string();
        self
    }

    /// Clear the memory value.
    pub fn memory_clear(&mut self) -> &mut Self {
        self.memory = 0.0;
        self
    }

    /// Add the current display value to memory.
    pub fn memory_add(&mut self) -> &mut Self {
        if let Ok(value) = self.display.parse::<f64>() {
            self.memory += value;
            self.display.clear();
        }
        self
    }

    /// Get the current display value.
    pub fn get_display(&self) -> String {
        self.display.clone()
    }

    /// Clear the display.
    pub fn clear(&mut self) -> &mut Self {
        self.display.clear();
        self
    }

    /// Basic arithmetic operations for compatibility.
    pub fn add(&self, a: f64, b: f64) -> f64 {
        a + b
    }

    /// Subtract b from a.
    pub fn subtract(&self, a: f64, b: f64) -> f64 {
        a - b
    }

    /// Multiply a and b.
    pub fn multiply(&self, a: f64, b: f64) -> f64 {
        a * b
    }

    /// Divide a by b.
    pub fn divide(&self, a: f64, b: f64) -> Result<f64, &'static str> {
        if b == 0.0 {
            Err("Cannot divide by zero")
        } else {
            Ok(a / b)
        }
    }

    /// Set a value in the calculator's storage.
    pub fn set_value(&mut self, identifier: &str, value: f64) {
        self.values.insert(identifier.to_string(), value);
    }

    /// Get a value from the calculator's storage.
    pub fn get_value(&self, identifier: &str) -> Option<f64> {
        self.values.get(identifier).copied()
    }

    /// Simple expression evaluation.
    fn evaluate_expression(&self) -> Result<f64, Box<dyn std::error::Error>> {
        if self.display.is_empty() {
            return Ok(0.0);
        }
        
        // Try to parse as a single number
        if let Ok(num) = self.display.parse::<f64>() {
            return Ok(num);
        }
        
        // Try basic arithmetic operations
        if self.display.contains('+') {
            let parts: Vec<&str> = self.display.split('+').collect();
            if parts.len() == 2 {
                let a = parts[0].parse::<f64>()?;
                let b = parts[1].parse::<f64>()?;
                return Ok(a + b);
            }
        } else if self.display.contains('-') {
            let parts: Vec<&str> = self.display.split('-').collect();
            if parts.len() == 2 {
                let a = parts[0].parse::<f64>()?;
                let b = parts[1].parse::<f64>()?;
                return Ok(a - b);
            }
        } else if self.display.contains('*') {
            let parts: Vec<&str> = self.display.split('*').collect();
            if parts.len() == 2 {
                let a = parts[0].parse::<f64>()?;
                let b = parts[1].parse::<f64>()?;
                return Ok(a * b);
            }
        } else if self.display.contains('/') {
            let parts: Vec<&str> = self.display.split('/').collect();
            if parts.len() == 2 {
                let a = parts[0].parse::<f64>()?;
                let b = parts[1].parse::<f64>()?;
                if b == 0.0 {
                    return Err("Division by zero".into());
                }
                return Ok(a / b);
            }
        }
        
        Err("Invalid expression".into())
    }
}

impl Default for Calculator {
    fn default() -> Self {
        Self::new()
    }
}
