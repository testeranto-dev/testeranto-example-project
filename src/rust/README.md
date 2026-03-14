# Calculator Rust Project

This is a well-structured Rust project demonstrating best practices for organizing a library with:
1. A reusable Calculator library
2. A standalone application binary
3. Regular Rust tests (unit and integration)
4. Testeranto BDD tests (separate binary)

## Structure

- `src/` - Library source code
  - `lib.rs` - Library root with unit tests, re-exports Calculator
  - `calculator.rs` - Calculator implementation
  - `bin/` - Binary executables
    - `main.rs` - Main application binary
- `tests/` - Integration tests
  - `integration_test.rs` - Regular Rust integration tests
- `testeranto/` - Testeranto BDD tests
  - `Calculator.rusto.test.rs` - Testeranto test binary (compiled separately)
- `Cargo.toml` - Project configuration

## Building and Testing

### Build the library:
```bash
cargo build
```

### Run the main application:
```bash
cargo run --bin calculator_app
```

### Run regular Rust tests (unit and integration):
```bash
cargo test
```

### Run only integration tests:
```bash
cargo test --test integration_test
```

### Build Testeranto test binary:
```bash
cargo build --bin calculator_testeranto_test
```

### Run Testeranto tests (via Testeranto framework):
```bash
# This would be run through the Testeranto test runner, not directly
```

## Library Usage

Add to your `Cargo.toml`:
```toml
[dependencies]
calculator = { path = "./path/to/calculator" }
```

Use in your code:
```rust
use calculator::Calculator;

fn main() {
    let mut calc = Calculator::new();
    calc.press("1").press("2").press("3");
    println!("Display: {}", calc.get_display());
}
```

## Best Practices Followed

1. **Clear separation of concerns**: Library, application, and tests are separate
2. **Proper testing structure**: Unit tests in `src/`, integration tests in `tests/`
3. **Testeranto tests are separate**: Testeranto BDD tests are compiled as a separate binary
   and don't interfere with regular Rust tests
4. **Clean dependencies**: Testeranto dependencies are conditionally included only for the
   Testeranto binary target
5. **Documentation**: Clear comments and README explaining the structure

## Key Distinctions

- **Regular Rust tests**: Run with `cargo test`, use Rust's built-in testing framework
- **Testeranto tests**: BDD-style tests compiled as a separate binary, run through the
  Testeranto test runner framework for cross-language testing consistency
