# testeranto-example-project

This demonstrates how to use all 6 runtimes against a common class.

## Prerequisites

1. Install the testeranto server as a bun executable globally or locally
2. Install all required language runtimes:
   - Node.js (with bun)
   - Go
   - Rust (with cargo)
   - Java (with Gradle)
   - Ruby (with bundler)
   - Python (with pip)

## Quick Setup

Run the installation script to install all dependencies from their respective package managers:

```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

## Manual Setup

If you prefer to install dependencies manually:

1. Install dependencies for each language:

   ```bash
   # JavaScript/TypeScript
   bun install

   # Go
   go mod download

   # Rust
   cargo build

   # Java (Kafe)
   ./gradlew build

   # Ruby
   bundle install

   # Python
   pip install -r requirements.txt
   ```

2. Run tests using the testeranto server:

   ```bash
   bun run test
   ```

   Or directly:
   ```bash
   testeranto once
   ```

## Configuration

The test configuration is in `testeranto/testeranto.ts`. Edit this file to adjust test settings.

## Dependencies

This project uses the following published packages:
- JavaScript/TypeScript: testeranto.tiposkripto@0.1.4 (npm)
- Go: github.com/testeranto-dev/testeranto/src/lib/golingvu@v0.1.10
- Rust: testeranto_rusto@0.1.4 (crates.io)
- Java: com.testeranto:testeranto.kafe:0.1.5 (Maven Central)
- Ruby: testeranto.rubeno@0.1.4 (RubyGems)
- Python: testeranto.pitono@0.1.4 (PyPI)

## Note on Go Module

The Go module uses version v0.1.10. For Go modules in subdirectories, tags must include the full path (e.g., `src/lib/golingvu/v0.1.10`). The publish script has been updated to handle this correctly. Make sure to publish the module with the correct tag format before using.
