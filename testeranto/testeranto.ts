import { ITestconfigV2 } from "testeranto/src/Types";

export const golangciLintCommand = (files: string[]): string => {
  if (files.length === 0) return "golangci-lint run ./...";

  // Escape dots and join files into apru regex: (file1\.go|file2\.go)
  const pattern = files.map((f) => f.replace(/\./g, "\\.")).join("|");

  // We use ./... to ensure the linter sees all dependencies,
  // but '--include' ensures it only outputs issues for your list.
  return `golangci-lint run ./... --include "^(${pattern})$" --issues-exit-code=0`;
};

const config: ITestconfigV2 = {
  featureIngestor: function (s: string): Promise<string> {
    throw new Error("Function not implemented.");
  },

  runtimes: {
    javatests: {
      runtime: "java",
      tests: [
        // "src/java/test/java/com/example/calculator/CalculatorTest.java",
        // "src/java/test/java/com/example/calculator/CalculatorDvipaTest.java",
        // "src/java/test/java/com/example/calculator/CalculatorJUnitTest.java", // Standard JUnit test
      ],
      checks: [
        (x: string[]) => `javac -cp ".:lib/*" ${x.join(" ")}`,
        // Run JUnit tests
        (x: string[]) =>
          `java -cp ".:lib/*:." org.junit.platform.console.ConsoleLauncher --select-class=com.example.calculator.CalculatorJUnitTest`,
      ],
      dockerfile: `testeranto/runtimes/java/java.Dockerfile`,
      buildOptions: `testeranto/runtimes/java/java.java`,
      outputs: [],
      buildKitOptions: {
        cacheMounts: ["/root/.m2", "/root/.gradle"],
      },
    },

    rubytests: {
      runtime: "ruby",
      tests: [
        // "src/ruby/Calculator-test.rb",
        // "src/ruby/Calculator.rspec.test.rb", // Standard RSpec test
      ],
      checks: [
        (x) => `bundle exec rubocop ${x.join(" ")}`,
        // Run RSpec tests
        (x) =>
          `bundle exec rspec ${x.filter((f) => f.includes("rspec.test")).join(" ")}`,
      ],
      dockerfile: `testeranto/runtimes/ruby/ruby.Dockerfile`,
      buildOptions: `testeranto/runtimes/ruby/ruby.rb`,
      buildKitOptions: {
        // Single-stage Dockerfile, no targetStage needed
      },
      outputs: [],
    },

    nodetests: {
      runtime: "node",
      tests: [
        // "src/ts/Calculator.test.node.ts",
        // "src/ts/Calculator.jest.test.ts", // Standard Jest test
      ],
      checks: [
        (x) => `yarn eslint ${x.join(" ")} `,
        (x) => `yarn tsc --noEmit ${x.join(" ")}`,
        // Run Jest tests
        (x) =>
          `yarn jest ${x.filter((f) => f.includes("jest.test")).join(" ")} --passWithNoTests`,
      ],
      dockerfile: `testeranto/runtimes/node/node.Dockerfile`,
      buildOptions: `testeranto/runtimes/node/node.mjs`,
      buildKitOptions: {
        // Single-stage Dockerfile, no targetStage needed
      },
      outputs: [],
    },

    webtests: {
      runtime: "web",
      tests: [
        "src/ts/Calculator.test.web.ts",
        // We could add a standard web test framework like Vitest here
      ],
      checks: [
        (x) => `yarn eslint ${x.join(" ")} `,
        (x) => `yarn tsc --noEmit ${x.join(" ")}`,
      ],
      dockerfile: `testeranto/runtimes/web/web.Dockerfile`,
      buildOptions: `testeranto/runtimes/web/web.ts`,
      buildKitOptions: {
        // Single-stage Dockerfile, no targetStage needed
      },
      outputs: [],
    },

    pythontests: {
      runtime: "python",
      tests: [
        // "src/python/Calculator.pitono.test.py",
        // "src/python/pythonic/Calculator.pitono.test.py",
        // "src/python/Calculator.unittest.test.py", // Standard unittest test
      ],
      checks: [
        // Python syntax check
        (x) => `python -m py_compile ${x.join(" ")}`,
        // Run unittest tests
        // (x) =>
        //   `python -m unittest ${x.filter((f) => f.includes("unittest.test")).join(" ")}`,
      ],
      dockerfile: `testeranto/runtimes/python/python.Dockerfile`,
      buildOptions: `testeranto/runtimes/python/python.py`,
      buildKitOptions: {
        // Single-stage Dockerfile, no targetStage needed
      },
      outputs: [],
    },

    golangtests: {
      runtime: "golang",
      tests: [
        // "src/golang/cmd/calculator-test/main.go",
        // "src/golang/cmd/calculator-native-test/main.go", // Standard Go test
      ],
      checks: [
        // (x) => `tree`,
        (x) => `go vet ./...`,
        // // Run Go tests
        // (x) =>
        //   `go test ${x.filter((f) => f.includes("native-test")).join(" ")}`,
        // golangciLintCommand
      ],
      dockerfile: `testeranto/runtimes/golang/golang.Dockerfile`,
      buildOptions: `testeranto/runtimes/golang/golang.ts`,
      buildKitOptions: {
        // Single-stage Dockerfile, no targetStage needed
      },
      outputs: [],
    },

    rusttests: {
      runtime: "rust",
      tests: [
        // "src/rust/testeranto/Calculator.rusto.test.rs",
        // "src/rust/testeranto/ruga/Calculator.rusto.test.rs",
        // "src/rust/testeranto/Calculator.native.test.rs", // Standard Rust test
      ],
      checks: [
        // Run Rust tests
        // (x) =>
        //   `cargo test --manifest-path=${x[0].split("/src/")[0]}/Cargo.toml`,
      ],
      dockerfile: `testeranto/runtimes/rust/rust.Dockerfile`,
      buildOptions: `testeranto/runtimes/rust/rust.ts`,
      buildKitOptions: {
        // Single-stage Dockerfile, no targetStage needed
      },
      outputs: [],
    },
  },

  documentationGlob: "./**/*.md",
};

export default config;
