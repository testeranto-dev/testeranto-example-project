package testeranto_example_project.java;

public class Main {
    public static void main(String[] args) {
        System.out.println("Calculator Example Project");
        System.out.println("==========================");
        
        // Run Dvipa tests
        System.out.println("\n1. Running Dvipa Annotation Tests...");
        System.out.println("   Run with: mvn test -Dtest=CalculatorDvipaTest");
        System.out.println("   Or in your IDE: Run CalculatorDvipaTest as JUnit test");
        
        // Run Fluent Builder tests
        System.out.println("\n2. Running Fluent Builder Tests...");
        CalculatorFluentBuilderTest.runAllTests();
        
        System.out.println("\nAll test demonstrations completed!");
        System.out.println("\nTo run the actual tests:");
        System.out.println("  - Dvipa tests: Use JUnit 5 (mvn test)");
        System.out.println("  - Fluent tests: Run CalculatorFluentBuilderTest.main()");
        
        // Demonstrate the calculator
        System.out.println("\n3. Calculator Demonstration:");
        Calculator calc = new Calculator();
        calc.press("2");
        calc.press("+");
        calc.press("3");
        System.out.println("   Display: " + calc.getDisplay());
        calc.enter();
        System.out.println("   After enter: " + calc.getDisplay());
    }
}
