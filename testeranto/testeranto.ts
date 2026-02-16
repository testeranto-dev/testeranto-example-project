import { ITestconfigV2 } from "testeranto/src/Types";

export const golangciLintCommand = (files: string[]): string => {
  if (files.length === 0) return "golangci-lint run ./...";

  // Escape dots and join files into apru regex: (file1\.go|file2\.go)
  const pattern = files
    .map(f => f.replace(/\./g, '\\.'))
    .join('|');

  // We use ./... to ensure the linter sees all dependencies,
  // but '--include' ensures it only outputs issues for your list.
  return `golangci-lint run ./... --include "^(${pattern})$" --issues-exit-code=0`;
};
const config: ITestconfigV2 = {
  featureIngestor: function (s: string): Promise<string> {
    throw new Error("Function not implemented.");
  },

  runtimes: {

    rubytests: (
      {
        runtime: "ruby",
        tests: ["src/ruby/Calculator-test.rb"],
        checks: [
          (x) => `bundle exec rubocop ${x.join(' ')}`,
          // (x) => `cat Gemfile`,
        ],
        dockerfile: `testeranto/runtimes/ruby/ruby.Dockerfile`,
        buildOptions: `testeranto/runtimes/ruby/ruby.rb`
      }
    ),
    
    nodetests: (
      {
        runtime: "node",
        tests: ["src/ts/Calculator.test.ts"],
        checks: [
          (x) => `yarn eslint ${x.join(' ')} `,
          (x) => `yarn tsc --noEmit ${x.join(' ')}`,
        ],
        dockerfile: `testeranto/runtimes/node/node.Dockerfile`,
        buildOptions: `testeranto/runtimes/node/node.mjs`
      }
    ),

    // webtests: (
    //   {
    //     runtime: "web",
    //     tests: ["src/Calculator.test.ts"],
    //     checks: [
    //       (x) => `yarn eslint`,
    //       (x) => `yarn tsc --noEmit`,
    //     ],
    //     dockerfile: `testeranto/runtimes/web/web.Dockerfile`,
    //     buildOptions: `testeranto/runtimes/web/web.ts`
    //   }
    // ),

    // pythontests: (
    //   {
    //     runtime: "python",
    //     tests: ["src/Calculator.test.py"],
    //     checks: [
    //       (x) => `yarn eslint`,
    //       (x) => `yarn tsc --noEmit`,
    //     ],
    //     dockerfile: `testeranto/runtimes/python/python.Dockerfile`,
    //     buildOptions: `testeranto/runtimes/python/python.ts`
    //   }
    // ),

    // golangtests: (
    //   {
    //     runtime: "golang",
    //     tests: ["src/Calculator.test.go"],
    //     checks: [
    //       (x) => `go tool vet ${x.join(' ')}`,
    //       golangciLintCommand
    //     ],
    //     dockerfile: `testeranto/runtimes/golang/golang.Dockerfile`,
    //     buildOptions: `testeranto/runtimes/golang/golang.ts`
    //   }
    // ),

    // rusttests: (
    //   {
    //     runtime: "rust",
    //     tests: ["src/Calculator.test.rs"],
    //     checks: [
    //       (x) => `yarn eslint`,
    //       (x) => `yarn tsc --noEmit`,
    //     ],
    //     dockerfile: `testeranto/runtimes/rust/rust.Dockerfile`,
    //     buildOptions: `testeranto/runtimes/rust/rust.ts`
    //   }
    // ),

    
  },

};

export default config;
