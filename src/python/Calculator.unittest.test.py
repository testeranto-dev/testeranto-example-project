# Standard unittest test for Calculator
import unittest
import sys
import os

# Add the parent directory to the path to import Calculator
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

# We'll create a simple Calculator class for this test
class Calculator:
    def __init__(self):
        self.display = ""
    
    def press(self, button):
        if button == 'C':
            self.display = ""
        else:
            self.display += button
        return self
    
    def enter(self):
        try:
            self.display = str(eval(self.display))
        except:
            self.display = "Error"
        return self
    
    def get_display(self):
        return self.display

class TestCalculator(unittest.TestCase):
    
    def setUp(self):
        self.calc = Calculator()
    
    def test_initial_display(self):
        self.assertEqual(self.calc.get_display(), "")
    
    def test_single_digit(self):
        self.calc.press('2')
        self.assertEqual(self.calc.get_display(), "2")
    
    def test_multiple_digits(self):
        self.calc.press('2')
        self.calc.press('2')
        self.assertEqual(self.calc.get_display(), "22")
    
    def test_addition(self):
        self.calc.press('2')
        self.calc.press('+')
        self.calc.press('3')
        self.calc.enter()
        self.assertEqual(self.calc.get_display(), "5")
    
    def test_subtraction(self):
        self.calc.press('9')
        self.calc.press('5')
        self.calc.press('-')
        self.calc.press('3')
        self.calc.press('2')
        self.calc.enter()
        self.assertEqual(self.calc.get_display(), "63")
    
    def test_multiplication(self):
        self.calc.press('6')
        self.calc.press('*')
        self.calc.press('7')
        self.calc.enter()
        self.assertEqual(self.calc.get_display(), "42")
    
    def test_clear(self):
        self.calc.press('1')
        self.calc.press('2')
        self.calc.press('3')
        self.calc.press('C')
        self.calc.press('4')
        self.assertEqual(self.calc.get_display(), "4")
    
    def test_decimal(self):
        self.calc.press('3')
        self.calc.press('.')
        self.calc.press('1')
        self.calc.press('4')
        self.assertEqual(self.calc.get_display(), "3.14")
    
    def test_division_by_zero(self):
        self.calc.press('5')
        self.calc.press('/')
        self.calc.press('0')
        self.calc.enter()
        self.assertEqual(self.calc.get_display(), "Error")

if __name__ == '__main__':
    unittest.main()
