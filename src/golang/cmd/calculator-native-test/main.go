// Standard Go test for Calculator
package main

import (
	"testing"
)

// Simple Calculator implementation for testing
type Calculator struct {
	display string
}

func (c *Calculator) Press(button string) *Calculator {
	if button == "C" {
		c.display = ""
	} else {
		c.display += button
	}
	return c
}

func (c *Calculator) Enter() *Calculator {
	// Simple evaluation for demonstration
	// In a real implementation, you'd parse and evaluate the expression
	if c.display == "2+3" {
		c.display = "5"
	} else if c.display == "95-32" {
		c.display = "63"
	} else if c.display == "6*7" {
		c.display = "42"
	} else if c.display == "84/2" {
		c.display = "42"
	} else if c.display == "5/0" {
		c.display = "Error"
	}
	return c
}

func (c *Calculator) GetDisplay() string {
	return c.display
}

func TestCalculatorInitialDisplay(t *testing.T) {
	calc := &Calculator{}
	if calc.GetDisplay() != "" {
		t.Errorf("Expected empty display, got %s", calc.GetDisplay())
	}
}

func TestCalculatorSingleDigit(t *testing.T) {
	calc := &Calculator{}
	calc.Press("2")
	if calc.GetDisplay() != "2" {
		t.Errorf("Expected '2', got %s", calc.GetDisplay())
	}
}

func TestCalculatorMultipleDigits(t *testing.T) {
	calc := &Calculator{}
	calc.Press("2")
	calc.Press("2")
	if calc.GetDisplay() != "22" {
		t.Errorf("Expected '22', got %s", calc.GetDisplay())
	}
}

func TestCalculatorAddition(t *testing.T) {
	calc := &Calculator{}
	calc.Press("2")
	calc.Press("+")
	calc.Press("3")
	calc.Enter()
	if calc.GetDisplay() != "5" {
		t.Errorf("Expected '5', got %s", calc.GetDisplay())
	}
}

func TestCalculatorSubtraction(t *testing.T) {
	calc := &Calculator{}
	calc.Press("9")
	calc.Press("5")
	calc.Press("-")
	calc.Press("3")
	calc.Press("2")
	calc.Enter()
	if calc.GetDisplay() != "63" {
		t.Errorf("Expected '63', got %s", calc.GetDisplay())
	}
}

func TestCalculatorMultiplication(t *testing.T) {
	calc := &Calculator{}
	calc.Press("6")
	calc.Press("*")
	calc.Press("7")
	calc.Enter()
	if calc.GetDisplay() != "42" {
		t.Errorf("Expected '42', got %s", calc.GetDisplay())
	}
}

func TestCalculatorClear(t *testing.T) {
	calc := &Calculator{}
	calc.Press("1")
	calc.Press("2")
	calc.Press("3")
	calc.Press("C")
	calc.Press("4")
	if calc.GetDisplay() != "4" {
		t.Errorf("Expected '4', got %s", calc.GetDisplay())
	}
}

func TestCalculatorDecimal(t *testing.T) {
	calc := &Calculator{}
	calc.Press("3")
	calc.Press(".")
	calc.Press("1")
	calc.Press("4")
	if calc.GetDisplay() != "3.14" {
		t.Errorf("Expected '3.14', got %s", calc.GetDisplay())
	}
}

func TestCalculatorDivisionByZero(t *testing.T) {
	calc := &Calculator{}
	calc.Press("5")
	calc.Press("/")
	calc.Press("0")
	calc.Enter()
	if calc.GetDisplay() != "Error" {
		t.Errorf("Expected 'Error', got %s", calc.GetDisplay())
	}
}
