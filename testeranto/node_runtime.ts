// src/server/runtimes/node/node.ts
import esbuild from "esbuild";

// src/server/runtimes/common.ts
import path from "path";
import fs from "fs";
async function processMetafile(config, metafile, runtime, configKey) {
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
    const isTestFile = /\.(test|spec)\.(ts|js)$/.test(entryPoint);
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
    const outputBaseName = entryPoint.split(".").slice(0, -1).join(".");
    const inputFilesPath = `testeranto/bundles/${configKey}/${outputBaseName}.mjs-inputFiles.json`;
    fs.writeFileSync(inputFilesPath, JSON.stringify(relativeFiles, null, 2));
    console.log(`[${runtime} Builder] Wrote ${relativeFiles.length} input files to ${inputFilesPath}`);
  }
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

// src/server/runtimes/node/esbuild.ts
var esbuild_default = (nodeConfig, testName2, projectConfig) => {
  const entryPoints = projectConfig.runtimes[testName2].tests;
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
      ENV: `"node"`
    },
    bundle: true,
    format: "esm",
    absWorkingDir: process.cwd(),
    platform: "node",
    packages: "external",
    entryPoints,
    plugins: [
      featuresPlugin_default,
      inputFilesPluginFactory,
      rebuildPlugin_default("node"),
      ...nodeConfig.plugins?.map((p) => p(register2, entryPoints)) || []
    ]
  };
};

// src/server/runtimes/node/node.ts
console.log(`[NODE BUILDER] hello:  ${process.argv}`);
var projectConfigPath = process.argv[2];
var nodeConfigPath = process.argv[3];
var testName = process.argv[4];
console.log(`[NODE BUILDER] projectConfigPath:  ${projectConfigPath}`);
console.log(`[NODE BUILDER] nodeConfig:  ${nodeConfigPath}`);
console.log(`[NODE BUILDER] testName:  ${testName}`);
async function startBundling(nodeConfigs, projectConfig) {
  console.log(`[NODE BUILDER] is now bundling:  ${testName}`);
  const n = esbuild_default(nodeConfigs, testName, projectConfig);
  const buildResult = await esbuild.build(n);
  if (buildResult.metafile) {
    await processMetafile(projectConfig, buildResult.metafile, "node", testName);
  } else {
    console.warn("No metafile generated by esbuild");
  }
}
async function main() {
  try {
    const nodeConfigs = (await import(nodeConfigPath)).default;
    const projectConfigs = (await import(projectConfigPath)).default;
    await startBundling(nodeConfigs, projectConfigs);
  } catch (error) {
    console.error("NODE BUILDER: Error importing config:", nodeConfigPath, error);
    console.error(error);
    process.exit(1);
  }
}
main();
