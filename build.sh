#!/bin/bash
set -e

echo "Building Calculator Example..."
echo "=============================="

# Create output directory
mkdir -p target/classes
mkdir -p target/test-classes

# Find all Java files
find src/java/main/java -name "*.java" > sources.txt
find src/java/test/java -name "*.java" > test-sources.txt

# Compile main classes
echo "Compiling main classes..."
javac -d target/classes @sources.txt

# Compile test classes
echo "Compiling test classes..."
javac -d target/test-classes -cp "target/classes:lib/*" @test-sources.txt

# Run tests
echo "Running tests..."
java -cp "target/test-classes:target/classes:lib/*" \
    org.junit.platform.console.ConsoleLauncher \
    --scan-classpath

echo "Build completed successfully!"
