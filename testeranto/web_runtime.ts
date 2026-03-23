// src/server/runtimes/web/web.ts
import esbuild from "esbuild";
import "puppeteer-core";

// src/esbuildConfigs/featuresPlugin.ts
import path from "path";
var featuresPlugin_default = {
  name: "feature-markdown",
  setup(build) {
    build.onResolve({ filter: /\.md$/ }, (args) => {
      if (args.resolveDir === "") return;
      return {
        path: path.isAbsolute(args.path) ? args.path : path.join(args.resolveDir, args.path),
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
import fs from "fs";
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
          fs.writeFileSync(f, JSON.stringify(result, null, 2));
        });
      }
    }
  };
};

// src/esbuildConfigs/rebuildPlugin.ts
import fs2 from "fs";
var rebuildPlugin_default = (r) => {
  return {
    name: "rebuild-notify",
    setup: (build) => {
      build.onEnd((result) => {
        console.log(`${r} > build ended with ${result.errors.length} errors`);
        if (result.errors.length > 0) {
          fs2.writeFileSync(
            `./testeranto/reports${r}_build_errors`,
            JSON.stringify(result, null, 2)
          );
        }
      });
    }
  };
};

// src/server/runtimes/web/esbuild.ts
var esbuild_default = (config, testName2, projectConfig, entryPoints2) => {
  const { inputFilesPluginFactory, register: register2 } = inputFilesPlugin_default(
    "web",
    testName2
  );
  return {
    ...esbuildConfigs_default(config),
    outdir: `testeranto/bundles/${testName2}`,
    outbase: ".",
    metafile: true,
    supported: {
      "dynamic-import": true
    },
    define: {
      "process.env.FLUENTFFMPEG_COV": "0",
      ENV: `web`
    },
    bundle: true,
    format: "esm",
    absWorkingDir: process.cwd(),
    platform: "browser",
    // Disable code splitting to avoid chunk files
    splitting: false,
    entryPoints: entryPoints2,
    plugins: [
      featuresPlugin_default,
      inputFilesPluginFactory,
      rebuildPlugin_default("web"),
      ...config.web?.plugins?.map((p) => p(register2, entryPoints2)) || []
    ]
  };
};

// src/server/runtimes/common.ts
import path2 from "path";
import fs3 from "fs";
import crypto from "crypto";
async function computeFilesHash(files) {
  const hash = crypto.createHash("md5");
  for (const file of files) {
    try {
      const stats = fs3.statSync(file);
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
      (filePath) => path2.isAbsolute(filePath) ? filePath : path2.resolve(process.cwd(), filePath)
    );
    const workspaceRoot = "/workspace";
    const relativeFiles = allInputFiles.map((file) => {
      const absolutePath = path2.isAbsolute(file) ? file : path2.resolve(process.cwd(), file);
      if (absolutePath.startsWith(workspaceRoot)) {
        return absolutePath.slice(workspaceRoot.length);
      }
      return path2.relative(process.cwd(), absolutePath);
    }).filter(Boolean);
    const hash = await computeFilesHash(allInputFiles);
    allTestsInfo[entryPoint] = {
      hash,
      files: relativeFiles
    };
    console.log(`[${runtime} Builder] Processed ${entryPoint}: ${relativeFiles.length} files, hash: ${hash}`);
  }
  const bundlesDir = `testeranto/bundles/${configKey}`;
  if (!fs3.existsSync(bundlesDir)) {
    fs3.mkdirSync(bundlesDir, { recursive: true });
    console.log(`[${runtime} Builder] Created directory: ${bundlesDir}`);
  }
  const inputFilesPath = path2.join(bundlesDir, "inputFiles.json");
  fs3.writeFileSync(inputFilesPath, JSON.stringify(allTestsInfo, null, 2));
  console.log(`[${runtime} Builder] Wrote inputFiles.json for ${Object.keys(allTestsInfo).length} tests to ${inputFilesPath}`);
}

// src/server/runtimes/web/web.ts
import * as fs4 from "fs";
import * as path3 from "path";
var projectConfigPath = process.argv[2];
var nodeConfigPath = process.argv[3];
var testName = process.argv[4];
var entryPoints = process.argv.slice(5);
var reportDir = path3.join(process.cwd(), "testeranto", "reports", testName);
if (!fs4.existsSync(reportDir)) {
  fs4.mkdirSync(reportDir, { recursive: true });
}
var logFilePath = path3.join(reportDir, "build.log");
var logStream = fs4.createWriteStream(logFilePath, { flags: "a" });
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
  const message = args.map(
    (arg) => typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)
  ).join(" ");
  logStream.write(`[${timestamp}] ERROR: ${message}
`);
  originalConsoleError.apply(console, args);
};
console.warn = (...args) => {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const message = args.map(
    (arg) => typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)
  ).join(" ");
  logStream.write(`[${timestamp}] WARN: ${message}
`);
  originalConsoleWarn.apply(console, args);
};
console.log(`[WEB BUILDER] projectConfigPath:  ${projectConfigPath}`);
console.log(`[WEB BUILDER] nodeConfig:  ${nodeConfigPath}`);
console.log(`[WEB BUILDER] testName:  ${testName}`);
console.log(`[WEB BUILDER] Log file: ${logFilePath}`);
console.log(`[WEB BUILDER] CWD: ${process.cwd()}`);
process.on("exit", () => {
  console.log("[WEB BUILDER] Process exiting");
  logStream.end();
});
process.on("SIGINT", () => {
  console.log("[WEB BUILDER] Received SIGINT");
  logStream.end();
  process.exit(0);
});
process.on("uncaughtException", (error) => {
  console.error("[WEB BUILDER] Uncaught exception:", error);
  logStream.end();
});
async function startBundling(webConfigs, projectConfig, entryPoints2) {
  console.log(`[WEB BUILDER] is now bundling: ${testName}`);
  console.log(`[WEB BUILDER] Entry points: ${entryPoints2.join(", ")}`);
  const w = esbuild_default(webConfigs, testName, projectConfig, entryPoints2);
  const isDevMode = process.env.MODE === "dev" || process.argv.includes("dev");
  if (isDevMode) {
    console.log(`[WEB BUILDER] Running in dev mode - starting watch mode`);
    const ctx = await esbuild.context({
      ...w,
      plugins: [
        ...w.plugins || [],
        {
          name: "testeranto-web-rebuild-notifier",
          setup(build) {
            build.onEnd(async (result) => {
              if (result.metafile) {
                await processMetafile(
                  projectConfig,
                  result.metafile,
                  "web",
                  testName
                );
                console.log(`[WEB BUILDER] Metafile updated`);
                const inputFilesPath = `testeranto/bundles/${testName}/inputFiles.json`;
                try {
                  if (fs4.existsSync(inputFilesPath)) {
                    const stats = fs4.statSync(inputFilesPath);
                    fs4.utimesSync(inputFilesPath, stats.atime, /* @__PURE__ */ new Date());
                    console.log(
                      `[WEB BUILDER] Triggered inputFiles.json update at ${inputFilesPath}`
                    );
                  } else {
                    console.log(
                      `[WEB BUILDER] inputFiles.json doesn't exist yet at ${inputFilesPath}`
                    );
                  }
                } catch (error) {
                  console.error(
                    `[WEB BUILDER] Failed to trigger inputFiles.json update:`,
                    error
                  );
                }
              }
            });
          }
        }
      ]
    });
    const buildResult = await ctx.rebuild();
    if (buildResult.metafile) {
      await processMetafile(
        projectConfig,
        buildResult.metafile,
        "web",
        testName
      );
    } else {
      console.warn("No metafile generated by esbuild");
    }
    let { hosts, port } = await ctx.serve({
      host: "0.0.0.0",
      servedir: "/workspace",
      onRequest: ({ method, path: path4, remoteAddress, status, timeInMS }) => {
        console.log(
          `[esbuild] ${remoteAddress} - ${method} ${path4} -> ${status} [${timeInMS}ms]`
        );
      }
    });
    console.log(
      `[WEB BUILDER]: esbuild server listening on ${hosts}, port ${port}, ${process.cwd()}`
    );
    await ctx.watch();
    console.log(
      `[WEB BUILDER] Watch mode active - waiting for file changes...`
    );
    console.log(`[WEB BUILDER] Using onEnd plugin for rebuild detection`);
    process.on("SIGINT", async () => {
      console.log("WEB BUILDER: Shutting down...");
      await ctx.dispose();
      process.exit(0);
    });
    console.log("Chrome is a separate service, not launched in builder");
  } else {
    const buildResult = await esbuild.build(w);
    if (buildResult.metafile) {
      await processMetafile(
        projectConfig,
        buildResult.metafile,
        "web",
        testName
      );
    } else {
      console.warn("No metafile generated by esbuild");
    }
    console.log("WEB BUILDER: Metafiles have been generated");
  }
}
async function main() {
  try {
    const nodeConfigs = (await import(nodeConfigPath)).default;
    const projectConfigs = (await import(projectConfigPath)).default;
    await startBundling(nodeConfigs, projectConfigs, entryPoints);
  } catch (error) {
    console.error(
      "WEB BUILDER: Error importing config:",
      nodeConfigPath,
      error
    );
    console.error(error);
    process.exit(1);
  }
}
main();
