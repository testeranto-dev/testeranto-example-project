# Calculator Example for Kafe (Java)

This example demonstrates how to use the Dvipa flavored API for Testeranto in Java. It includes a Calculator class and two styles of tests:

1. **Dvipa Annotation-based Tests**: Using `@DvipaTest`, `@Given`, `@When`, `@Then` annotations with JUnit 5
2. **Fluent Builder Tests**: Using chainable fluent API similar to TypeScript's flavored API

## Structure

- `Calculator.java`: The calculator implementation
- `CalculatorDvipaTest.java`: Annotation-based BDD tests using Dvipa
- `CalculatorFluentBuilderTest.java`: Fluent builder style tests
- `Main.java`: Main entry point to demonstrate the tests
- `pom.xml`: Maven configuration
