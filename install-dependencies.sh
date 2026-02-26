#!/bin/bash
set -e

echo "Installing dependencies for all 6 package managers..."

# Get the absolute path of the project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Project root: $PROJECT_ROOT"

# 1. JavaScript/TypeScript (tiposkripto)
echo "=== Installing JavaScript/TypeScript dependencies ==="
cd "$PROJECT_ROOT"
if command -v bun &> /dev/null; then
    bun install
else
    echo "Warning: bun not found, skipping JavaScript dependencies"
fi

# 2. Go (golingvu)
echo "=== Installing Go dependencies ==="
cd "$PROJECT_ROOT"
if command -v go &> /dev/null; then
    go mod download
else
    echo "Warning: go not found, skipping Go dependencies"
fi

# 3. Rust (rusto)
echo "=== Installing Rust dependencies ==="
cd "$PROJECT_ROOT"
if command -v cargo &> /dev/null; then
    cargo fetch
else
    echo "Warning: cargo not found, skipping Rust dependencies"
fi

# 4. Java (kafe) - using Gradle
echo "=== Installing Java (kafe) dependencies ==="
cd "$PROJECT_ROOT"
if command -v ./gradlew &> /dev/null || command -v gradle &> /dev/null; then
    if [ -f "./gradlew" ]; then
        echo "Downloading Java dependencies..."
        ./gradlew build --dry-run 2>&1 | grep -q "Download" && echo "Dependencies downloaded" || true
        ./gradlew dependencies --configuration compileClasspath
    elif command -v gradle &> /dev/null; then
        echo "Downloading Java dependencies..."
        gradle build --dry-run 2>&1 | grep -q "Download" && echo "Dependencies downloaded" || true
        gradle dependencies --configuration compileClasspath
    else
        echo "Warning: gradle not found, skipping Java dependencies"
    fi
else
    echo "Warning: gradle not found, skipping Java dependencies"
fi

# 5. Ruby (rubeno)
echo "=== Installing Ruby dependencies ==="
cd "$PROJECT_ROOT"
if command -v bundle &> /dev/null; then
    bundle install
else
    echo "Warning: bundle not found, skipping Ruby dependencies"
fi

# 6. Python (pitono)
echo "=== Installing Python dependencies ==="
cd "$PROJECT_ROOT"
if command -v pip &> /dev/null; then
    pip install -r requirements.txt
else
    echo "Warning: pip not found, skipping Python dependencies"
fi

echo "=== All dependencies installed successfully ==="
