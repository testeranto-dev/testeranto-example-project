var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/server/runtimes/node/native_detection.js
var native_detection_exports = {};
var fs9, path8, parse, traverse, generate, types, NodeNativeTestDetection;
var init_native_detection = __esm({
  "src/server/runtimes/node/native_detection.js"() {
    "use strict";
    fs9 = __require("fs");
    path8 = __require("path");
    ({ parse } = __require("@babel/parser"));
    traverse = __require("@babel/traverse").default;
    generate = __require("@babel/generator").default;
    types = __require("@babel/types");
    NodeNativeTestDetection = class {
      /**
       * Detect if a JavaScript/TypeScript file contains native tests and identify the framework.
       * @param {string} filePath - Path to the test file
       * @returns {Object} Detection result
       */
      static detectNativeTest(filePath) {
        if (!fs9.existsSync(filePath)) {
          return {
            isNativeTest: false,
            frameworkType: null,
            testStructure: {}
          };
        }
        try {
          const content = fs9.readFileSync(filePath, "utf-8");
          const ext = path8.extname(filePath);
          const isTypeScript = ext === ".ts" || ext === ".tsx";
          const filename = path8.basename(filePath);
          const isNamedTest = filename.includes(".test.") || filename.includes(".spec.");
          const hasJestImport = content.includes("jest") || content.includes("@jest/");
          const hasMochaImport = content.includes("mocha") || content.includes("@types/mocha");
          const hasJasmineImport = content.includes("jasmine") || content.includes("@types/jasmine");
          const hasVitestImport = content.includes("vitest") || content.includes("@vitest/");
          const ast = this.parseAST(content, isTypeScript);
          const astPatterns = this.analyzeAST(ast);
          const isNativeTest = isNamedTest || hasJestImport || hasMochaImport || hasJasmineImport || hasVitestImport || astPatterns.hasTestFunctions || astPatterns.hasTestClasses;
          if (!isNativeTest) {
            return {
              isNativeTest: false,
              frameworkType: null,
              testStructure: {}
            };
          }
          const frameworkType = this.identifyFramework(
            content,
            hasJestImport,
            hasMochaImport,
            hasJasmineImport,
            hasVitestImport,
            astPatterns
          );
          const testStructure = this.extractTestStructure(ast, frameworkType);
          return {
            isNativeTest: true,
            frameworkType,
            testStructure
          };
        } catch (error) {
          console.error(`Error detecting native test in ${filePath}:`, error);
          return {
            isNativeTest: false,
            frameworkType: null,
            testStructure: {}
          };
        }
      }
      /**
       * Parse JavaScript/TypeScript code to AST
       */
      static parseAST(content, isTypeScript) {
        try {
          return parse(content, {
            sourceType: "module",
            plugins: isTypeScript ? ["typescript", "decorators-legacy"] : ["jsx", "decorators-legacy"]
          });
        } catch (error) {
          try {
            return parse(content, {
              sourceType: "module",
              plugins: ["jsx", "decorators-legacy"]
            });
          } catch (fallbackError) {
            throw new Error(`Failed to parse AST: ${fallbackError.message}`);
          }
        }
      }
      /**
       * Analyze AST for test patterns
       */
      static analyzeAST(ast) {
        const result = {
          hasTestFunctions: false,
          hasTestClasses: false,
          testFunctionNames: [],
          testClassNames: []
        };
        try {
          traverse(ast, {
            FunctionDeclaration(path10) {
              const node = path10.node;
              if (node.id && node.id.name && node.id.name.startsWith("test")) {
                result.hasTestFunctions = true;
                result.testFunctionNames.push(node.id.name);
              }
            },
            FunctionExpression(path10) {
              const parent = path10.parent;
              if (parent.key && parent.key.name && parent.key.name.startsWith("test")) {
                result.hasTestFunctions = true;
                result.testFunctionNames.push(parent.key.name);
              }
            },
            ArrowFunctionExpression(path10) {
              const parent = path10.parent;
              if (parent.key && parent.key.name && parent.key.name.startsWith("test")) {
                result.hasTestFunctions = true;
                result.testFunctionNames.push(parent.key.name);
              }
            },
            CallExpression(path10) {
              const node = path10.node;
              if (node.callee && node.callee.name) {
                const calleeName = node.callee.name;
                if (["describe", "it", "test", "beforeEach", "afterEach", "beforeAll", "afterAll"].includes(calleeName)) {
                  result.hasTestFunctions = true;
                }
              }
            },
            ClassDeclaration(path10) {
              const node = path10.node;
              if (node.id && node.id.name && (node.id.name.endsWith("Test") || node.id.name.endsWith("Spec"))) {
                result.hasTestClasses = true;
                result.testClassNames.push(node.id.name);
              }
            }
          });
        } catch (error) {
        }
        return result;
      }
      /**
       * Identify the specific test framework
       */
      static identifyFramework(content, hasJestImport, hasMochaImport, hasJasmineImport, hasVitestImport, astPatterns) {
        if (hasJestImport || content.includes("jest.mock") || content.includes("jest.fn")) {
          return "jest";
        } else if (hasVitestImport) {
          return "vitest";
        } else if (hasMochaImport) {
          return "mocha";
        } else if (hasJasmineImport) {
          return "jasmine";
        } else if (astPatterns.hasTestFunctions || astPatterns.hasTestClasses) {
          return "jest";
        } else {
          return "unknown";
        }
      }
      /**
       * Extract test structure based on framework type
       */
      static extractTestStructure(ast, frameworkType) {
        const structure = {
          testSuites: [],
          testCases: [],
          hooks: []
        };
        try {
          traverse(ast, {
            CallExpression(path10) {
              const node = path10.node;
              if (node.callee && node.callee.name === "describe") {
                const suiteName = node.arguments[0] && node.arguments[0].value;
                if (suiteName) {
                  structure.testSuites.push({
                    name: suiteName,
                    line: node.loc ? node.loc.start.line : null
                  });
                }
              }
              if (node.callee && (node.callee.name === "it" || node.callee.name === "test")) {
                const testName2 = node.arguments[0] && node.arguments[0].value;
                if (testName2) {
                  structure.testCases.push({
                    name: testName2,
                    line: node.loc ? node.loc.start.line : null
                  });
                }
              }
              if (node.callee && ["beforeEach", "afterEach", "beforeAll", "afterAll"].includes(node.callee.name)) {
                structure.hooks.push({
                  type: node.callee.name,
                  line: node.loc ? node.loc.start.line : null
                });
              }
            },
            ClassDeclaration(path10) {
              const node = path10.node;
              if (node.id && node.id.name && (node.id.name.endsWith("Test") || node.id.name.endsWith("Spec"))) {
                const className = node.id.name;
                const methods = [];
                node.body.body.forEach((classMember) => {
                  if (classMember.type === "ClassMethod" || classMember.type === "MethodDefinition") {
                    const methodName = classMember.key.name;
                    if (methodName && methodName.startsWith("test")) {
                      methods.push({
                        name: methodName,
                        line: classMember.loc ? classMember.loc.start.line : null
                      });
                    }
                  }
                });
                if (methods.length > 0) {
                  structure.testSuites.push({
                    name: className,
                    line: node.loc ? node.loc.start.line : null,
                    methods
                  });
                }
              }
            }
          });
        } catch (error) {
        }
        return structure;
      }
      /**
       * Generate testeranto's three canonical components from native test detection
       */
      static translateToTesteranto(detectionResult) {
        if (!detectionResult.isNativeTest) {
          return {
            specification: "",
            implementation: "",
            adapter: ""
          };
        }
        const framework = detectionResult.frameworkType;
        const structure = detectionResult.testStructure;
        if (framework === "jest") {
          return this.generateJestComponents(structure);
        } else if (framework === "mocha") {
          return this.generateMochaComponents(structure);
        } else if (framework === "vitest") {
          return this.generateVitestComponents(structure);
        } else {
          return this.generateGenericComponents(structure);
        }
      }
      /**
       * Generate testeranto components for Jest tests
       */
      static generateJestComponents(structure) {
        const specLines = [
          "// Generated specification for Jest tests",
          "const specification = (Suite, Given, When, Then) => ["
        ];
        structure.testSuites.forEach((suite) => {
          specLines.push(`  Suite("${suite.name}", {`);
          specLines.push(`    "${suite.name} setup": Given(`);
          specLines.push(`      ["${suite.name}"],`);
          specLines.push(`      [`);
          structure.testCases.forEach((testCase) => {
            specLines.push(`        When("${testCase.name}", /* ... */),`);
          });
          specLines.push(`      ],`);
          specLines.push(`      [`);
          specLines.push(`        Then("assertions pass", /* ... */),`);
          specLines.push(`      ]`);
          specLines.push(`    ),`);
          specLines.push(`  }),`);
        });
        specLines.push("];");
        const specification = specLines.join("\n");
        const implementation = `// Generated implementation for Jest tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};`;
        const adapter = `// Generated adapter for Jest tests
const adapter = {
  beforeAll: (input, testResource) => {
    // Jest global setup
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // Jest beforeEach hook
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute Jest test
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute Jest assertions
    return thenCB(store);
  }
};`;
        return {
          specification,
          implementation,
          adapter
        };
      }
      /**
       * Generate testeranto components for Mocha tests
       */
      static generateMochaComponents(structure) {
        const specification = `// Generated specification for Mocha tests
const specification = (Suite, Given, When, Then) => [
  // Mocha test suites would be generated here
];`;
        const implementation = `// Generated implementation for Mocha tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};`;
        const adapter = `// Generated adapter for Mocha tests
const adapter = {
  beforeAll: (input, testResource) => {
    // Mocha before() hook
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // Mocha beforeEach() hook
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute Mocha test
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute Mocha assertions
    return thenCB(store);
  }
};`;
        return {
          specification,
          implementation,
          adapter
        };
      }
      /**
       * Generate testeranto components for Vitest tests
       */
      static generateVitestComponents(structure) {
        const specification = `// Generated specification for Vitest tests
const specification = (Suite, Given, When, Then) => [
  // Vitest test suites would be generated here
];`;
        const implementation = `// Generated implementation for Vitest tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};`;
        const adapter = `// Generated adapter for Vitest tests
const adapter = {
  beforeAll: (input, testResource) => {
    // Vitest setup
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    // Vitest beforeEach hook
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    // Execute Vitest test
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    // Execute Vitest assertions
    return thenCB(store);
  }
};`;
        return {
          specification,
          implementation,
          adapter
        };
      }
      /**
       * Generate testeranto components for generic tests
       */
      static generateGenericComponents(structure) {
        const specification = `// Generated specification for generic JavaScript tests
const specification = (Suite, Given, When, Then) => [
  // Generic test structure
];`;
        const implementation = `// Generated implementation for generic JavaScript tests
const implementation = {
  suites: {},
  givens: {},
  whens: {},
  thens: {}
};`;
        const adapter = `// Generated adapter for generic JavaScript tests
const adapter = {
  beforeAll: (input, testResource) => {
    return input;
  },
  beforeEach: (subject, initializer, testResource, initialValues) => {
    return subject;
  },
  andWhen: (store, whenCB, testResource) => {
    return whenCB(store);
  },
  butThen: (store, thenCB, testResource) => {
    return thenCB(store);
  }
};`;
        return {
          specification,
          implementation,
          adapter
        };
      }
    };
    module.exports = NodeNativeTestDetection;
  }
});

// src/server/runtimes/node/node.ts
import esbuild from "esbuild";

// src/server/runtimes/common.ts
import path from "path";
import fs from "fs";
import crypto from "crypto";
async function computeFilesHash(files) {
  const hash = crypto.createHash("md5");
  for (const file of files) {
    try {
      const stats = fs.statSync(file);
      hash.update(file);
      hash.update(stats.mtimeMs.toString());
      hash.update(stats.size.toString());
    } catch (error) {
      hash.update(file);
      hash.update("missing");
    }
  }
  return hash.digest("hex");
}
async function processMetafile(config, metafile, runtime, configKey) {
  if (!metafile || !metafile.outputs) {
    return;
  }
  const allTestsInfo = {};
  for (const [outputFile, outputInfo] of Object.entries(metafile.outputs)) {
    let collectFileDependencies2 = function(filePath) {
      if (collectedFiles.has(filePath)) {
        return;
      }
      collectedFiles.add(filePath);
      const fileInfo = metafile.inputs?.[filePath];
      if (fileInfo?.imports) {
        for (const importInfo of fileInfo.imports) {
          const importPath = importInfo.path;
          if (metafile.inputs?.[importPath]) {
            collectFileDependencies2(importPath);
          }
        }
      }
    };
    var collectFileDependencies = collectFileDependencies2;
    const outputInfoTyped = outputInfo;
    if (!outputInfoTyped.entryPoint) {
      console.log(`[${runtime} Builder] Skipping output without entryPoint: ${outputFile}`);
      continue;
    }
    const entryPoint = outputInfoTyped.entryPoint;
    const isTestFile = /\.(test|spec)\.[^.]+\.(ts|js)$/.test(entryPoint) || /\.(test|spec)\.(ts|js)$/.test(entryPoint) || entryPoint.includes(".test.") || entryPoint.includes(".spec.");
    if (!isTestFile) {
      console.log(`[${runtime} Builder] Skipping non-test entryPoint: ${entryPoint}`);
      continue;
    }
    const outputInputs = outputInfoTyped.inputs || {};
    const collectedFiles = /* @__PURE__ */ new Set();
    for (const inputFile of Object.keys(outputInputs)) {
      collectFileDependencies2(inputFile);
    }
    const allInputFiles = Array.from(collectedFiles).map(
      (filePath) => path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath)
    );
    const workspaceRoot = "/workspace";
    const relativeFiles = allInputFiles.map((file) => {
      const absolutePath = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
      if (absolutePath.startsWith(workspaceRoot)) {
        return absolutePath.slice(workspaceRoot.length);
      }
      return path.relative(process.cwd(), absolutePath);
    }).filter(Boolean);
    const hash = await computeFilesHash(allInputFiles);
    allTestsInfo[entryPoint] = {
      hash,
      files: relativeFiles
    };
    console.log(`[${runtime} Builder] Processed ${entryPoint}: ${relativeFiles.length} files, hash: ${hash}`);
  }
  const bundlesDir = `testeranto/bundles/${configKey}`;
  if (!fs.existsSync(bundlesDir)) {
    fs.mkdirSync(bundlesDir, { recursive: true });
    console.log(`[${runtime} Builder] Created directory: ${bundlesDir}`);
  }
  const inputFilesPath = path.join(bundlesDir, "inputFiles.json");
  fs.writeFileSync(inputFilesPath, JSON.stringify(allTestsInfo, null, 2));
  console.log(`[${runtime} Builder] Wrote inputFiles.json for ${Object.keys(allTestsInfo).length} tests to ${inputFilesPath}`);
}

// src/esbuildConfigs/featuresPlugin.ts
import path2 from "path";
var featuresPlugin_default = {
  name: "feature-markdown",
  setup(build) {
    build.onResolve({ filter: /\.md$/ }, (args) => {
      if (args.resolveDir === "") return;
      return {
        path: path2.isAbsolute(args.path) ? args.path : path2.join(args.resolveDir, args.path),
        namespace: "feature-markdown"
      };
    });
    build.onLoad(
      { filter: /.*/, namespace: "feature-markdown" },
      async (args) => {
        return {
          contents: `file://${args.path}`,
          loader: "text"
          // contents: JSON.stringify({ path: args.path }),
          // loader: "json",
          // contents: JSON.stringify({
          //   // html: markdownHTML,
          //   raw: markdownContent,
          //   filename: args.path, //path.basename(args.path),
          // }),
          // loader: "json",
        };
      }
    );
  }
};

// src/esbuildConfigs/index.ts
import "esbuild";
var esbuildConfigs_default = (config) => {
  return {
    // packages: "external",
    target: "esnext",
    format: "esm",
    splitting: true,
    outExtension: { ".js": ".mjs" },
    outbase: ".",
    jsx: "transform",
    bundle: true,
    // minify: config.minify === true,
    write: true,
    loader: {
      ".js": "jsx",
      ".png": "binary",
      ".jpg": "binary"
    }
  };
};

// src/esbuildConfigs/inputFilesPlugin.ts
import fs2 from "fs";
var otherInputs = {};
var register = (entrypoint, sources) => {
  if (!otherInputs[entrypoint]) {
    otherInputs[entrypoint] = /* @__PURE__ */ new Set();
  }
  sources.forEach((s) => otherInputs[entrypoint].add(s));
};
var inputFilesPlugin_default = (platform, testName2) => {
  const f = `${testName2}`;
  return {
    register,
    inputFilesPluginFactory: {
      name: "metafileWriter",
      setup(build) {
        build.onEnd((result) => {
          fs2.writeFileSync(f, JSON.stringify(result, null, 2));
        });
      }
    }
  };
};

// src/esbuildConfigs/rebuildPlugin.ts
import fs3 from "fs";
var rebuildPlugin_default = (r) => {
  return {
    name: "rebuild-notify",
    setup: (build) => {
      build.onEnd((result) => {
        console.log(`${r} > build ended with ${result.errors.length} errors`);
        if (result.errors.length > 0) {
          fs3.writeFileSync(
            `./testeranto/reports${r}_build_errors`,
            JSON.stringify(result, null, 2)
          );
        }
      });
    }
  };
};

// src/server/runtimes/node/esbuildLoggingPlugin.ts
import * as fs4 from "fs";
import * as path3 from "path";
function testLoggingPlugin(options) {
  return {
    name: "testeranto-test-logging",
    setup(build) {
      const { configKey, runtime } = options;
      const testLogsDir = path3.join(
        process.cwd(),
        "testeranto",
        "reports",
        configKey,
        "test-logs"
      );
      if (!fs4.existsSync(testLogsDir)) {
        fs4.mkdirSync(testLogsDir, { recursive: true });
        console.log(`[${runtime} Builder] Created test logs directory: ${testLogsDir}`);
      }
      const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug
      };
      const allLogs = [];
      const overrideConsole = (type) => {
        return (...args) => {
          const timestamp = (/* @__PURE__ */ new Date()).toISOString();
          const message = args.map(
            (arg) => typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)
          ).join(" ");
          allLogs.push({ type, message, timestamp });
          switch (type) {
            case "log":
              originalConsole.log(...args);
              break;
            case "error":
              originalConsole.error(...args);
              break;
            case "warn":
              originalConsole.warn(...args);
              break;
            case "info":
              originalConsole.info?.(...args);
              break;
            case "debug":
              originalConsole.debug?.(...args);
              break;
          }
        };
      };
      console.log = overrideConsole("log");
      console.error = overrideConsole("error");
      console.warn = overrideConsole("warn");
      if (console.info) console.info = overrideConsole("info");
      if (console.debug) console.debug = overrideConsole("debug");
      build.onEnd(async (result) => {
        console.log = originalConsole.log;
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        if (originalConsole.info) console.info = originalConsole.info;
        if (originalConsole.debug) console.debug = originalConsole.debug;
        const reportsDir = path3.join(
          process.cwd(),
          "testeranto",
          "reports",
          configKey
        );
        if (!fs4.existsSync(reportsDir)) {
          fs4.mkdirSync(reportsDir, { recursive: true });
        }
        const generalLogPath = path3.join(reportsDir, "build.log");
        const generalLogStream = fs4.createWriteStream(generalLogPath, { flags: "a" });
        allLogs.forEach((log) => {
          generalLogStream.write(`[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}
`);
        });
        generalLogStream.end();
        if (result.metafile && result.metafile.outputs) {
          for (const [outputPath, outputInfo] of Object.entries(result.metafile.outputs)) {
            const entryPoint = outputInfo.entryPoint;
            if (entryPoint) {
              const testName2 = path3.basename(entryPoint, path3.extname(entryPoint));
              const testLogPath = path3.join(testLogsDir, `${testName2}.build.log`);
              const timestamp = (/* @__PURE__ */ new Date()).toISOString();
              const header = `[${timestamp}] Build log for test: ${entryPoint}
`;
              const buildInfo = `Output: ${outputPath}
Entry point: ${entryPoint}
`;
              const testLogStream = fs4.createWriteStream(testLogPath, { flags: "w" });
              testLogStream.write(header + buildInfo + "\n");
              allLogs.forEach((log) => {
                testLogStream.write(`[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}
`);
              });
              const footer = `
[${timestamp}] Build completed for: ${entryPoint}
`;
              testLogStream.write(footer);
              testLogStream.end();
              originalConsole.log(
                `[${runtime} Builder] Created build log for ${entryPoint} at ${testLogPath}`
              );
            }
          }
        } else {
          const genericLogPath = path3.join(testLogsDir, `generic.build.log`);
          const genericStream = fs4.createWriteStream(genericLogPath, { flags: "w" });
          allLogs.forEach((log) => {
            genericStream.write(`[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}
`);
          });
          genericStream.end();
        }
      });
      build.onStart(() => {
        allLogs.length = 0;
        const timestamp = (/* @__PURE__ */ new Date()).toISOString();
        allLogs.push({ type: "info", message: `Build started for ${configKey}`, timestamp });
      });
    }
  };
}

// src/server/runtimes/node/esbuild.ts
var esbuild_default = (nodeConfig, testName2, projectConfig, entryPoints2) => {
  const { inputFilesPluginFactory, register: register2 } = inputFilesPlugin_default(
    "node",
    testName2
  );
  return {
    ...esbuildConfigs_default(nodeConfig),
    outdir: `testeranto/bundles/${testName2}`,
    outbase: ".",
    // Preserve directory structure relative to outdir
    metafile: true,
    supported: {
      "dynamic-import": true
    },
    define: {
      "process.env.FLUENTFFMPEG_COV": "0",
      ENV: `node`
    },
    bundle: true,
    format: "esm",
    absWorkingDir: process.cwd(),
    platform: "node",
    packages: "external",
    entryPoints: entryPoints2,
    plugins: [
      featuresPlugin_default,
      inputFilesPluginFactory,
      rebuildPlugin_default("node"),
      testLoggingPlugin({ configKey: testName2, runtime: "node" }),
      ...nodeConfig.plugins?.map((p) => p(register2, entryPoints2)) || []
    ]
  };
};

// src/server/runtimes/node/node.ts
import * as fs10 from "fs";
import * as path9 from "path";

// src/server/runtimes/node/framework-converters/jest.ts
import * as path4 from "path";
import * as fs5 from "fs";
var JestConverter = {
  name: "jest",
  detect(filePath) {
    if (!fs5.existsSync(filePath)) return false;
    const content = fs5.readFileSync(filePath, "utf-8");
    const filename = path4.basename(filePath);
    const isNamedTest = filename.includes(".test.") || filename.includes(".spec.");
    const hasJestImport = content.includes("jest") || content.includes("@jest/") || content.includes("jest.mock") || content.includes("jest.fn");
    const hasJestGlobals = content.includes("describe(") && (content.includes("it(") || content.includes("test("));
    return isNamedTest || hasJestImport || hasJestGlobals;
  },
  generateWrapper(entryPointPath, detectionResult, translationResult, filesHash) {
    const originalTestAbs = path4.resolve(entryPointPath);
    return `// Jest test wrapper generated by testeranto
// Hash: ${filesHash}
// Framework: jest
// This file loads and executes Jest tests

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import Jest and configure it
import { jest } from '@jest/globals';

// We need to run Jest programmatically
// For now, we'll import the original test file which should trigger Jest
// when the test runner is Jest

console.log('Running Jest test: ${originalTestAbs}');

// Import the test file - Jest will pick it up if we're in a Jest environment
// If not, we need to manually run the tests
const testModule = await import('${originalTestAbs}');

// If we're not in Jest environment, we need to provide a basic runner
if (typeof jest === 'undefined') {
  console.warn('Jest not found in global scope. Tests may not run properly.');
  
  // Try to detect test functions and run them manually
  const testExports = Object.keys(testModule);
  console.log('Test exports found:', testExports);
  
  // For simple cases, we can try to execute describe/it blocks
  // This is a fallback mechanism
  if (typeof describe === 'function') {
    // Mocha-like environment is available
    console.log('Using describe/it environment for Jest tests');
  }
}

console.log('Jest test import completed');
`;
  },
  translateToTesteranto(detectionResult) {
    const structure = detectionResult.testStructure || {};
    return {
      specification: `// Generated specification for Jest tests
const specification = (Suite, Given, When, Then) => [
  ${structure.testSuites?.map(
        (suite) => `Suite("${suite.name || "Jest Suite"}", {
      "${suite.name || "test"}": Given(
        ["Jest test suite: ${suite.name || "unnamed"}"],
        [
          ${structure.testCases?.map(
          (testCase) => `When("${testCase.name || "unnamed test"}", (store) => {
              // Jest test: ${testCase.name}
              return store;
            })`
        ).join(",\n          ") || 'When("placeholder", (store) => store)'}
        ],
        [
          Then("Jest assertions pass", async (store) => {
            // Jest assertions would be verified here
            return store;
          })
        ]
      )
    })`
      ).join(",\n  ") || 'Suite("Jest Tests", {})'}
];`,
      implementation: `// Generated implementation for Jest tests
const implementation = {
  suites: {
    Default: "Jest test suite"
  },
  givens: {
    Default: () => ({ /* Jest test context */ })
  },
  whens: {
    runTest: (testName) => (store) => {
      console.log('Running Jest test:', testName);
      return store;
    }
  },
  thens: {
    verify: (expected) => (store) => {
      // Verify Jest assertions
      return store;
    }
  }
};`,
      adapter: `// Generated adapter for Jest tests
const adapter = {
  beforeAll: async (input, testResource) => {
    // Jest global setup
    console.log('Jest beforeAll');
    return input;
  },
  beforeEach: async (subject, initializer, testResource, initialValues) => {
    // Jest beforeEach hook
    console.log('Jest beforeEach');
    return subject;
  },
  execute: async (store, actionCB, testResource) => {
    // Execute Jest test action
    return actionCB(store);
  },
  verify: async (store, checkCB, testResource) => {
    // Verify Jest assertions
    return checkCB(store);
  },
  cleanupEach: async (store, key) => {
    // Jest afterEach hook
    console.log('Jest cleanupEach');
    return store;
  },
  cleanupAll: async (store) => {
    // Jest afterAll hook
    console.log('Jest cleanupAll');
    return store;
  },
  assert: (x) => !!x
};`
    };
  }
};

// src/server/runtimes/node/framework-converters/mocha.ts
import * as path5 from "path";
import * as fs6 from "fs";
var MochaConverter = {
  name: "mocha",
  detect(filePath) {
    if (!fs6.existsSync(filePath)) return false;
    const content = fs6.readFileSync(filePath, "utf-8");
    const hasMochaImport = content.includes("mocha") || content.includes("@types/mocha");
    const hasMochaPatterns = content.includes("describe(") && content.includes("it(") && !content.includes("jest");
    return hasMochaImport || hasMochaPatterns;
  },
  generateWrapper(entryPointPath, detectionResult, translationResult, filesHash) {
    const originalTestAbs = path5.resolve(entryPointPath);
    return `// Mocha test wrapper generated by testeranto
// Hash: ${filesHash}
// Framework: mocha
// This file loads and executes Mocha tests

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Running Mocha test: ${originalTestAbs}');

// Mocha tests typically use describe/it syntax
// We'll import the test file which should register tests with Mocha
const testModule = await import('${originalTestAbs}');

// If Mocha is not running, we might need to manually execute
if (typeof describe === 'function' && typeof it === 'function') {
  console.log('Mocha describe/it functions available');
} else {
  console.warn('Mocha environment not detected. Tests may need manual execution.');
  
  // Try to find and run test functions
  const testExports = Object.keys(testModule);
  console.log('Available exports:', testExports);
}

console.log('Mocha test import completed');
`;
  },
  translateToTesteranto(detectionResult) {
    return {
      specification: `// Generated specification for Mocha tests
const specification = (Suite, Given, When, Then) => [
  Suite("Mocha Tests", {
    "mocha-test": Given(
      ["Mocha test suite"],
      [
        When("run mocha test", (store) => {
          // Mocha test execution
          return store;
        })
      ],
      [
        Then("verify mocha assertions", async (store) => {
          // Mocha assertions
          return store;
        })
      ]
    )
  })
];`,
      implementation: `// Generated implementation for Mocha tests
const implementation = {
  suites: {
    Default: "Mocha test suite"
  },
  givens: {
    Default: () => ({ /* Mocha test context */ })
  },
  whens: {
    runTest: (testName) => (store) => {
      console.log('Running Mocha test:', testName);
      return store;
    }
  },
  thens: {
    verify: (expected) => (store) => {
      // Verify Mocha assertions
      return store;
    }
  }
};`,
      adapter: `// Generated adapter for Mocha tests
const adapter = {
  beforeAll: async (input, testResource) => {
    // Mocha before() hook
    console.log('Mocha beforeAll');
    return input;
  },
  beforeEach: async (subject, initializer, testResource, initialValues) => {
    // Mocha beforeEach() hook
    console.log('Mocha beforeEach');
    return subject;
  },
  execute: async (store, actionCB, testResource) => {
    // Execute Mocha test action
    return actionCB(store);
  },
  verify: async (store, checkCB, testResource) => {
    // Verify Mocha assertions
    return checkCB(store);
  },
  cleanupEach: async (store, key) => {
    // Mocha afterEach() hook
    console.log('Mocha cleanupEach');
    return store;
  },
  cleanupAll: async (store) => {
    // Mocha after() hook
    console.log('Mocha cleanupAll');
    return store;
  },
  assert: (x) => !!x
};`
    };
  }
};

// src/server/runtimes/node/framework-converters/vitest.ts
import * as path6 from "path";
import * as fs7 from "fs";
var VitestConverter = {
  name: "vitest",
  detect(filePath) {
    if (!fs7.existsSync(filePath)) return false;
    const content = fs7.readFileSync(filePath, "utf-8");
    const hasVitestImport = content.includes("vitest") || content.includes("@vitest/");
    const hasVitestPatterns = content.includes("import { test") && content.includes("from 'vitest'");
    return hasVitestImport || hasVitestPatterns;
  },
  generateWrapper(entryPointPath, detectionResult, translationResult, filesHash) {
    const originalTestAbs = path6.resolve(entryPointPath);
    return `// Vitest test wrapper generated by testeranto
// Hash: ${filesHash}
// Framework: vitest
// This file loads and executes Vitest tests

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Running Vitest test: ${originalTestAbs}');

// Vitest uses similar syntax to Jest but with different imports
// We'll import the test file which should register with Vitest
const testModule = await import('${originalTestAbs}');

// Check for Vitest environment
if (typeof import.meta !== 'undefined' && import.meta.vitest) {
  console.log('Vitest environment detected');
} else {
  console.warn('Vitest environment not detected. Tests may need manual execution.');
}

console.log('Vitest test import completed');
`;
  },
  translateToTesteranto(detectionResult) {
    return {
      specification: `// Generated specification for Vitest tests
const specification = (Suite, Given, When, Then) => [
  Suite("Vitest Tests", {
    "vitest-test": Given(
      ["Vitest test suite"],
      [
        When("run vitest test", (store) => {
          // Vitest test execution
          return store;
        })
      ],
      [
        Then("verify vitest assertions", async (store) => {
          // Vitest assertions
          return store;
        })
      ]
    )
  })
];`,
      implementation: `// Generated implementation for Vitest tests
const implementation = {
  suites: {
    Default: "Vitest test suite"
  },
  givens: {
    Default: () => ({ /* Vitest test context */ })
  },
  whens: {
    runTest: (testName) => (store) => {
      console.log('Running Vitest test:', testName);
      return store;
    }
  },
  thens: {
    verify: (expected) => (store) => {
      // Verify Vitest assertions
      return store;
    }
  }
};`,
      adapter: `// Generated adapter for Vitest tests
const adapter = {
  beforeAll: async (input, testResource) => {
    // Vitest setup
    console.log('Vitest beforeAll');
    return input;
  },
  beforeEach: async (subject, initializer, testResource, initialValues) => {
    // Vitest beforeEach hook
    console.log('Vitest beforeEach');
    return subject;
  },
  execute: async (store, actionCB, testResource) => {
    // Execute Vitest test action
    return actionCB(store);
  },
  verify: async (store, checkCB, testResource) => {
    // Verify Vitest assertions
    return checkCB(store);
  },
  cleanupEach: async (store, key) => {
    // Vitest afterEach hook
    console.log('Vitest cleanupEach');
    return store;
  },
  cleanupAll: async (store) => {
    // Vitest teardown
    console.log('Vitest cleanupAll');
    return store;
  },
  assert: (x) => !!x
};`
    };
  }
};

// src/server/runtimes/node/framework-converters/generic.ts
import * as path7 from "path";
import * as fs8 from "fs";
var GenericConverter = {
  name: "generic",
  detect(filePath) {
    if (!fs8.existsSync(filePath)) return false;
    const content = fs8.readFileSync(filePath, "utf-8");
    const filename = path7.basename(filePath);
    const isNamedTest = filename.includes(".test.") || filename.includes(".spec.");
    const hasTestPatterns = content.includes("describe(") || content.includes("it(") || content.includes("test(");
    return isNamedTest || hasTestPatterns;
  },
  generateWrapper(entryPointPath, detectionResult, translationResult, filesHash) {
    const originalTestAbs = path7.resolve(entryPointPath);
    const framework = detectionResult.frameworkType || "unknown";
    return `// Generic test wrapper generated by testeranto
// Hash: ${filesHash}
// Framework: ${framework}
// This file loads the test file

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generic execution for unknown frameworks
try {
  await import('${originalTestAbs}');
  console.log('Test imported successfully');
} catch (error) {
  console.error('Failed to run test:', error);
  process.exit(1);
}
`;
  },
  translateToTesteranto(detectionResult) {
    const framework = detectionResult.frameworkType || "unknown";
    return {
      specification: `// Generated specification for ${framework} tests
const specification = (Suite, Given, When, Then) => [
  Suite("${framework} Tests", {
    "test": Given(
      ["${framework} test suite"],
      [
        When("run test", (store) => {
          // Test execution
          return store;
        })
      ],
      [
        Then("verify assertions", async (store) => {
          // Assertions
          return store;
        })
      ]
    )
  })
];`,
      implementation: `// Generated implementation for ${framework} tests
const implementation = {
  suites: {
    Default: "${framework} test suite"
  },
  givens: {
    Default: () => ({ /* Test context */ })
  },
  whens: {
    runTest: (testName) => (store) => {
      console.log('Running test:', testName);
      return store;
    }
  },
  thens: {
    verify: (expected) => (store) => {
      // Verify assertions
      return store;
    }
  }
};`,
      adapter: `// Generated adapter for ${framework} tests
const adapter = {
  beforeAll: async (input, testResource) => {
    console.log('${framework} beforeAll');
    return input;
  },
  beforeEach: async (subject, initializer, testResource, initialValues) => {
    console.log('${framework} beforeEach');
    return subject;
  },
  execute: async (store, actionCB, testResource) => {
    return actionCB(store);
  },
  verify: async (store, checkCB, testResource) => {
    return checkCB(store);
  },
  cleanupEach: async (store, key) => {
    console.log('${framework} cleanupEach');
    return store;
  },
  cleanupAll: async (store) => {
    console.log('${framework} cleanupAll');
    return store;
  },
  assert: (x) => !!x
};`
    };
  }
};

// src/server/runtimes/node/node.ts
var NodeNativeTestDetection2;
try {
  const detectionModulePath = path9.join(__dirname, "native_detection.js");
  if (fs10.existsSync(detectionModulePath)) {
    NodeNativeTestDetection2 = (init_native_detection(), __toCommonJS(native_detection_exports));
  } else {
    NodeNativeTestDetection2 = class {
      static detectNativeTest(filePath) {
        return { isNativeTest: false, frameworkType: null, testStructure: {} };
      }
      static translateToTesteranto(detectionResult) {
        return { specification: "", implementation: "", adapter: "" };
      }
    };
  }
} catch (error) {
  NodeNativeTestDetection2 = class {
    static detectNativeTest(filePath) {
      return { isNativeTest: false, frameworkType: null, testStructure: {} };
    }
    static translateToTesteranto(detectionResult) {
      return { specification: "", implementation: "", adapter: "" };
    }
  };
}
var frameworkConverters = [
  JestConverter,
  MochaConverter,
  VitestConverter,
  JasmineConverter,
  GenericConverter
];
function detectFrameworkWithConverters(filePath) {
  for (const converter of frameworkConverters) {
    if (converter.detect(filePath)) {
      return converter;
    }
  }
  return GenericConverter;
}
var projectConfigPath = process.argv[2];
var nodeConfigPath = process.argv[3];
var testName = process.argv[4];
var entryPoints = process.argv.slice(5);
var reportDir = path9.join(process.cwd(), "testeranto", "reports", testName);
if (!fs10.existsSync(reportDir)) {
  fs10.mkdirSync(reportDir, { recursive: true });
  console.log(`[NODE BUILDER] Created report directory: ${reportDir}`);
}
var logFilePath = path9.join(reportDir, "build.log");
var logStream = fs10.createWriteStream(logFilePath, { flags: "a" });
var originalConsoleLog = console.log;
var originalConsoleError = console.error;
var originalConsoleWarn = console.warn;
function logToFile(message, ...optionalParams) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const formattedMessage = typeof message === "string" ? message : JSON.stringify(message, null, 2);
  const fullMessage = `[${timestamp}] ${formattedMessage}`;
  logStream.write(fullMessage + "\n");
  if (optionalParams.length > 0) {
    optionalParams.forEach((param) => {
      const paramStr = typeof param === "string" ? param : JSON.stringify(param, null, 2);
      logStream.write(`  ${paramStr}
`);
    });
  }
  originalConsoleLog.apply(console, [message, ...optionalParams]);
}
console.log = (...args) => {
  logToFile(...args);
};
console.error = (...args) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const message = args.map((arg) => typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)).join(" ");
  logStream.write(`[${timestamp}] ERROR: ${message}
`);
  originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const message = args.map((arg) => typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)).join(" ");
  logStream.write(`[${timestamp}] WARN: ${message}
`);
  originalConsoleWarn.apply(console, args);
};
console.log(`[NODE BUILDER] projectConfigPath:  ${projectConfigPath}`);
console.log(`[NODE BUILDER] nodeConfig:  ${nodeConfigPath}`);
console.log(`[NODE BUILDER] testName:  ${testName}`);
console.log(`[NODE BUILDER] Log file: ${logFilePath}`);
process.on("exit", () => {
  console.log("[NODE BUILDER] Process exiting");
  logStream.end();
});
process.on("SIGINT", () => {
  console.log("[NODE BUILDER] Received SIGINT");
  logStream.end();
  process.exit(0);
});
process.on("uncaughtException", (error) => {
  console.error("[NODE BUILDER] Uncaught exception:", error);
  logStream.end();
});
async function startBundling(nodeConfigs, projectConfig, entryPoints2) {
  console.log(`[NODE BUILDER] is now bundling:  ${testName}`);
  console.log(`[NODE BUILDER] Entry points: ${entryPoints2.join(", ")}`);
  const entryPointInfo = /* @__PURE__ */ new Map();
  for (const entryPoint of entryPoints2) {
    const entryPointPath = path9.resolve(entryPoint);
    if (fs10.existsSync(entryPointPath)) {
      const detectionResult = NodeNativeTestDetection2.detectNativeTest(entryPointPath);
      const converter = detectFrameworkWithConverters(entryPointPath);
      const enhancedResult = {
        ...detectionResult,
        converterName: converter.name,
        // If native detection didn't find a framework but converter did, update it
        frameworkType: detectionResult.frameworkType || (detectionResult.isNativeTest ? converter.name : null)
      };
      entryPointInfo.set(entryPoint, enhancedResult);
      if (detectionResult.isNativeTest || converter.name !== "generic") {
        console.log(`[NODE BUILDER] Detected native ${enhancedResult.frameworkType || converter.name} test: ${entryPoint}`);
        console.log(`[NODE BUILDER] Using converter: ${converter.name}`);
      }
    }
  }
  const n = esbuild_default(nodeConfigs, testName, projectConfig, entryPoints2);
  const isDevMode = process.env.MODE === "dev" || process.argv.includes("dev");
  if (isDevMode) {
    console.log(`[NODE BUILDER] Running in dev mode - starting watch mode`);
    const ctx = await esbuild.context({
      ...n,
      plugins: [
        ...n.plugins || [],
        {
          name: "testeranto-rebuild-notifier",
          setup(build) {
            build.onEnd(async (result) => {
              if (result.metafile) {
                await processMetafile(projectConfig, result.metafile, "node", testName);
                console.log(`[NODE BUILDER] Metafile updated`);
                const inputFilesPath = `testeranto/bundles/${testName}/inputFiles.json`;
                try {
                  const fs11 = await import("fs");
                  if (fs11.existsSync(inputFilesPath)) {
                    const stats = fs11.statSync(inputFilesPath);
                    fs11.utimesSync(inputFilesPath, stats.atime, /* @__PURE__ */ new Date());
                    console.log(`[NODE BUILDER] Triggered inputFiles.json update`);
                  } else {
                    console.log(`[NODE BUILDER] inputFiles.json doesn't exist yet at ${inputFilesPath}`);
                  }
                } catch (error) {
                  console.error(`[NODE BUILDER] Failed to trigger inputFiles.json update:`, error);
                }
              }
            });
          }
        }
      ]
    });
    const buildResult = await ctx.rebuild();
    if (buildResult.metafile) {
      await processMetafile(projectConfig, buildResult.metafile, "node", testName);
    } else {
      console.warn("No metafile generated by esbuild");
    }
    await ctx.watch();
    console.log(`[NODE BUILDER] Watch mode active - waiting for file changes...`);
    process.on("SIGINT", async () => {
      console.log("[NODE BUILDER] Shutting down...");
      await ctx.dispose();
      process.exit(0);
    });
    console.log(`[NODE BUILDER] Using onEnd plugin for rebuild detection`);
    console.log(`[NODE BUILDER] Keeping process alive for continuous watching...`);
    const keepAliveInterval = setInterval(() => {
    }, 6e4);
    process.on("SIGINT", () => {
      clearInterval(keepAliveInterval);
    });
  } else {
    const buildResult = await esbuild.build(n);
    if (buildResult.metafile) {
      await processMetafile(projectConfig, buildResult.metafile, "node", testName);
    } else {
      console.warn("No metafile generated by esbuild");
    }
  }
}
async function main() {
  try {
    const nodeConfigs = (await import(nodeConfigPath)).default;
    const projectConfigs = (await import(projectConfigPath)).default;
    await startBundling(nodeConfigs, projectConfigs, entryPoints);
    const isDevMode = process.env.MODE === "dev" || process.argv.includes("dev");
    if (isDevMode) {
      process.on("unhandledRejection", (reason, promise) => {
        console.error("[NODE BUILDER] Unhandled Rejection at:", promise, "reason:", reason);
      });
      process.on("uncaughtException", (error) => {
        console.error("[NODE BUILDER] Uncaught Exception:", error);
      });
      setInterval(() => {
        console.log("[NODE BUILDER] Still watching for changes...");
      }, 3e4);
    }
  } catch (error) {
    console.error("NODE BUILDER: Error:", error);
    const isDevMode = process.env.MODE === "dev" || process.argv.includes("dev");
    if (isDevMode) {
      console.error("[NODE BUILDER] Error occurred but keeping process alive in dev mode");
      setInterval(() => {
      }, 1e3);
    } else {
      process.exit(1);
    }
  }
}
main();
