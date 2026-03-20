// Standard JUnit test for Calculator
package com.example.calculator;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class CalculatorJUnitTest {
    private Calculator calculator;

    @BeforeEach
    public void setUp() {
        calculator = new Calculator();
    }

    @Test
    public void testInitialDisplay() {
        assertEquals("", calculator.getDisplay());
    }

    @Test
    public void testSingleDigit() {
        calculator.press("2");
        assertEquals("2", calculator.getDisplay());
    }

    @Test
    public void testMultipleDigits() {
        calculator.press("2");
        calculator.press("2");
        assertEquals("22", calculator.getDisplay());
    }

    @Test
    public void testAddition() {
        calculator.press("2");
        calculator.press("+");
        calculator.press("3");
        calculator.enter();
        assertEquals("5", calculator.getDisplay());
    }

    @Test
    public void testSubtraction() {
        calculator.press("9");
        calculator.press("5");
        calculator.press("-");
        calculator.press("3");
        calculator.press("2");
        calculator.enter();
        assertEquals("63", calculator.getDisplay());
    }

    @Test
    public void testMultiplication() {
        calculator.press("6");
        calculator.press("*");
        calculator.press("7");
        calculator.enter();
        assertEquals("42", calculator.getDisplay());
    }

    @Test
    public void testClear() {
        calculator.press("1");
        calculator.press("2");
        calculator.press("3");
        calculator.press("C");
        calculator.press("4");
        assertEquals("4", calculator.getDisplay());
    }

    @Test
    public void testDecimal() {
        calculator.press("3");
        calculator.press(".");
        calculator.press("1");
        calculator.press("4");
        assertEquals("3.14", calculator.getDisplay());
    }

    @Test
    public void testDivisionByZero() {
        calculator.press("5");
        calculator.press("/");
        calculator.press("0");
        calculator.enter();
        assertEquals("Error", calculator.getDisplay());
    }
}
