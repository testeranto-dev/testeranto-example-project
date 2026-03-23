// src/server/runtimes/web/hoist.ts
import puppeteer from "puppeteer-core";
import http from "http";
import fs from "fs";
import path from "path";
var testResourceConfig = process.argv[3] ? JSON.parse(process.argv[3]) : {};
var reportBaseDir = testResourceConfig.fs || "testeranto/reports/webtests";
async function launchPuppeteer(browserWSEndpoint) {
  const browser = await puppeteer.connect({
    browserWSEndpoint
  });
  const page = await browser.newPage();
  page.on("console", (log) => {
    const msg = `${log.text()}
`;
    switch (log.type()) {
      case "info":
        break;
      case "warn":
        break;
      case "error":
        break;
      case "debug":
        break;
      default:
        break;
    }
  });
  page.on("close", async () => {
    console.log(`[hoist] Page closing, current screencast path:`, currentScreencastPath);
  });
  await page.exposeFunction(
    "__writeFile",
    (filePath, content) => {
      const fullPath = path.join(process.cwd(), filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content);
      console.log(`[hoist] Wrote file: ${fullPath}`);
    }
  );
  await page.exposeFunction(
    "__screenshot",
    async (filePath) => {
      console.log("__screenshot", filePath);
      const absolutePath = path.join(process.cwd(), filePath);
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      await page.screenshot({
        path: absolutePath
      });
      console.log(`[hoist] Saved screenshot to: ${absolutePath}`);
    }
  );
  let currentScreencastPath = null;
  const screencastRecorders = /* @__PURE__ */ new Map();
  await page.exposeFunction(
    "__openScreencast",
    async (filePath) => {
      console.log("__openScreencast called with:", filePath);
      console.log(`[hoist] Current screencast path:`, currentScreencastPath);
      const absolutePath = path.join(process.cwd(), filePath);
      const dir = path.dirname(absolutePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (currentScreencastPath === filePath) {
        throw "you can't screen multiple times to the same file";
      }
      if (currentScreencastPath) {
        console.log(`[hoist] Stopping current screencast at ${currentScreencastPath} before starting new one`);
        const existingRecorder = screencastRecorders.get(currentScreencastPath);
        if (existingRecorder) {
          if (typeof existingRecorder.stop === "function") {
            await existingRecorder.stop();
          } else if (typeof page.stopScreencast === "function") {
            await page.stopScreencast();
          }
          screencastRecorders.delete(currentScreencastPath);
        }
      }
      let recorder;
      if (typeof page.screencast === "function") {
        recorder = await page.screencast({ path: absolutePath });
      } else if (typeof page.startScreencast === "function") {
        await page.startScreencast({
          format: "png",
          quality: 80,
          maxWidth: 1920,
          maxHeight: 1080
        });
        recorder = {
          stop: async () => {
            await page.stopScreencast();
          }
        };
      } else {
        throw new Error("Neither page.screencast() nor page.startScreencast() methods are available");
      }
      currentScreencastPath = filePath;
      if (recorder) {
        screencastRecorders.set(filePath, recorder);
      }
    }
  );
  await page.exposeFunction(
    "__closeScreencast",
    async (filePath) => {
      console.log("__closeScreencast called with:", filePath);
      console.log(`[hoist] Current screencast path:`, currentScreencastPath);
      if (currentScreencastPath !== filePath) {
        console.log(`[hoist] No screencast session found for ${filePath} (current is ${currentScreencastPath})`);
        return;
      }
      const absolutePath = path.join(process.cwd(), filePath);
      console.log(`[hoist] Stopping screencast to: ${absolutePath}`);
      const recorder = screencastRecorders.get(filePath);
      if (recorder) {
        if (typeof recorder.stop === "function") {
          await recorder.stop();
        } else if (typeof page.stopScreencast === "function") {
          await page.stopScreencast();
        }
        screencastRecorders.delete(filePath);
      }
      currentScreencastPath = null;
    }
  );
  const close = () => {
  };
  page.on("pageerror", (err) => {
    console.error("Page error in web test:", err);
    close();
    throw err;
  });
  page.on("console", (msg) => {
    const text = msg.text();
    console.log(
      `Browser console [${msg.type()}]: ${text} ${JSON.stringify(msg.stackTrace())}`
    );
  });
  const testBundlePath = process.argv[2];
  if (!testBundlePath) {
    throw new Error("Test bundle path not provided");
  }
  const testResourceConfig2 = process.argv[3] ? JSON.parse(process.argv[3]) : {};
  console.log(`[hoist] Test resource config:`, testResourceConfig2);
  const bundleAbsolutePath = path.join(process.cwd(), testBundlePath);
  console.log(`[hoist] Reading bundle from: ${bundleAbsolutePath}`);
  if (!fs.existsSync(bundleAbsolutePath)) {
    throw new Error(`Bundle file not found at ${bundleAbsolutePath}`);
  }
  const bundleContent = fs.readFileSync(bundleAbsolutePath, "utf-8");
  console.log(`[hoist] Bundle size: ${bundleContent.length} characters`);
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test Runner</title>

</head>
<body>
    <div id="root"></div>
    <script>
      // Inject the test resource configuration as a global variable
      window.testResourceConfig = ${JSON.stringify(testResourceConfig2)};
      console.log('Test resource config injected:', window.testResourceConfig);
      
      // This will be populated by page.evaluate
      window.bundleContent = null;
    </script>
</body>
</html>`;
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  console.log(`[hoist] Navigating to data URL`);
  try {
    await page.goto(dataUrl, { waitUntil: "networkidle0", timeout: 6e4 });
    console.log(`[hoist] Successfully navigated to data URL`);
    console.log(`[hoist] Injecting and executing bundle...`);
    await page.evaluate(async (content) => {
      try {
        const blob = new Blob([content], { type: "application/javascript" });
        const blobUrl = URL.createObjectURL(blob);
        console.log("Starting to load bundle from blob URL");
        const module = await import(blobUrl);
        console.log("Test bundle loaded successfully from blob");
        if (module && module.default) {
          if (typeof module.default === "function") {
            await module.default(window.testResourceConfig);
          } else {
            console.log("Module loaded:", module);
          }
        } else {
          console.log("Module loaded, but no default export:", module);
        }
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("Failed to load test bundle:", error);
        console.error("Error stack:", error.stack);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        throw error;
      }
    }, bundleContent);
    console.log(`[hoist] Waiting for tests to execute...`);
    await new Promise((resolve) => setTimeout(resolve, 15e3));
    const pageTitle = await page.title();
    console.log(`[hoist] Page title: ${pageTitle}`);
  } catch (e) {
    console.error(`[hoist] Failed to navigate to data URL: ${e.message}`);
    throw e;
  }
  console.log(`[hoist] Waiting for pending operations...`);
  await new Promise((resolve) => setTimeout(resolve, 2e3));
  console.log(`[hoist] Active screencast sessions before closing: ${screencastRecorders.size}`);
  await page.close();
  await browser.disconnect();
}
async function connectWithRetry(retries = 30, delay = 2e3) {
  for (let i = 0; i < retries; i++) {
    try {
      const url = `http://chrome-service:3000/json/version`;
      console.log(
        `[CLIENT] Attempt ${i + 1}/${retries}: Attempting to reach Chrome service at ${url}...`
      );
      const data = await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          let data2 = "";
          console.log(`[CLIENT] HTTP Status: ${res.statusCode}`);
          res.on("data", (chunk) => data2 += chunk);
          res.on("end", () => resolve(data2));
        });
        req.on("error", reject);
        req.setTimeout(1e4, () => {
          req.destroy();
          reject(new Error("Timeout"));
        });
      });
      const json = JSON.parse(data);
      console.log(
        `[CLIENT] Successfully fetched WS URL: ${json.webSocketDebuggerUrl}`
      );
      await launchPuppeteer(json.webSocketDebuggerUrl);
      return;
    } catch (e) {
      console.error(`[CLIENT] Attempt ${i + 1} failed:`, e.message);
      if (i < retries - 1) {
        console.log(`[CLIENT] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error("[CLIENT] All connection attempts failed");
        throw e;
      }
    }
  }
}
connectWithRetry();
