// Standard Jest test for Calculator
import { Calculator } from "./Calculator.js";

describe('Calculator - Jest Tests', () => {
  let calc: Calculator;

  beforeEach(() => {
    calc = new Calculator();
  });

  test('should initialize with empty display', () => {
    expect(calc.getDisplay()).toBe('');
  });

  test('should display single digit', () => {
    calc.press('2');
    expect(calc.getDisplay()).toBe('2');
  });

  test('should concatenate multiple digits', () => {
    calc.press('2');
    calc.press('2');
    expect(calc.getDisplay()).toBe('22');
  });

  test('should handle addition', () => {
    calc.press('2');
    calc.press('+');
    calc.press('3');
    calc.enter();
    expect(calc.getDisplay()).toBe('5');
  });

  test('should handle subtraction', () => {
    calc.press('9');
    calc.press('5');
    calc.press('-');
    calc.press('3');
    calc.press('2');
    calc.enter();
    expect(calc.getDisplay()).toBe('63');
  });

  test('should handle multiplication', () => {
    calc.press('6');
    calc.press('*');
    calc.press('7');
    calc.enter();
    expect(calc.getDisplay()).toBe('42');
  });

  test('should handle division', () => {
    calc.press('8');
    calc.press('4');
    calc.press('/');
    calc.press('2');
    calc.enter();
    expect(calc.getDisplay()).toBe('42');
  });

  test('should clear display', () => {
    calc.press('1');
    calc.press('2');
    calc.press('3');
    calc.press('C');
    calc.press('4');
    expect(calc.getDisplay()).toBe('4');
  });

  test('should handle decimal numbers', () => {
    calc.press('3');
    calc.press('.');
    calc.press('1');
    calc.press('4');
    expect(calc.getDisplay()).toBe('3.14');
  });

  test('division by zero should show Error', () => {
    calc.press('5');
    calc.press('/');
    calc.press('0');
    calc.enter();
    expect(calc.getDisplay()).toBe('Error');
  });
});
