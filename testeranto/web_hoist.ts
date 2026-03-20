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
  page.on("close", () => {
  });
  await page.exposeFunction(
    "__writeFile",
    (filePath, content) => {
      const fullPath = path.join(process.cwd(), reportBaseDir, filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content);
      console.log(`[hoist] Wrote file: ${fullPath}`);
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
  console.log(`[hoist] Reading bundle from: ${testBundlePath}`);
  const bundleAbsolutePath = path.join(process.cwd(), testBundlePath);
  if (!fs.existsSync(bundleAbsolutePath)) {
    throw new Error(`Bundle file not found at ${bundleAbsolutePath}`);
  }
  const bundleContent = fs.readFileSync(bundleAbsolutePath, "utf-8");
  console.log(`[hoist] Bundle size: ${bundleContent.length} characters`);
  const testResourceConfig2 = process.argv[3] ? JSON.parse(process.argv[3]) : {};
  console.log(`[hoist] Test resource config:`, testResourceConfig2);
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
    </script>
    <script type="module">
      // Create a blob with the bundle content
      const bundleContent = ${JSON.stringify(bundleContent)};
      const blob = new Blob([bundleContent], { type: 'application/javascript' });
      const blobUrl = URL.createObjectURL(blob);
      
      // Import the bundle
      import(blobUrl).then(module => {
        console.log('Test bundle loaded successfully from blob');
        // Check if the module has a default export
        if (module && module.default) {
          // If it's a function, call it with the test resource config
          if (typeof module.default === 'function') {
            // Pass the config to the test function
            return module.default(window.testResourceConfig);
          }
          // Otherwise, just use it as is
          console.log('Module loaded:', module);
        } else {
          console.log('Module loaded, but no default export:', module);
        }
      }).catch(error => {
        console.error('Failed to load test bundle:', error);
        console.error('Error stack:', error.stack);
      });
    </script>
</body>
</html>`;
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`;
  console.log(`[hoist] Navigating to data URL with embedded bundle`);
  try {
    await page.goto(dataUrl, { waitUntil: "networkidle0", timeout: 1e4 });
    console.log(`[hoist] Successfully navigated to data URL`);
    console.log(`[hoist] Waiting for tests to execute...`);
    await new Promise((resolve) => setTimeout(resolve, 5e3));
    const pageTitle = await page.title();
    console.log(`[hoist] Page title: ${pageTitle}`);
  } catch (e) {
    console.error(`[hoist] Failed to navigate to data URL: ${e.message}`);
    throw e;
  }
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
