// src/server/runtimes/web/hoist.ts
import puppeteer from "puppeteer-core";
import http from "http";
var esbuildUrlDomain = `http://webtests:8000/`;
async function launchPuppeteer(browserWSEndpoint) {
  const browser = await puppeteer.connect({
    browserWSEndpoint
  });
  const page = await browser.newPage();
  try {
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
    const close = () => {
    };
    page.on("pageerror", (err) => {
      console.error("Page error in web test:", err);
      close();
      throw err;
    });
    page.on("console", (msg) => {
      const text = msg.text();
      console.log(`Browser console [${msg.type()}]: ${text} ${JSON.stringify(msg.stackTrace())}`);
    });
    const htmlUrl = `${esbuildUrlDomain}testeranto/bundles/webtests/src/ts/Calculator.test.ts.html`;
    console.log("htmlUrl", htmlUrl);
    await page.goto(htmlUrl, { waitUntil: "networkidle0" });
    await page.close();
    close();
  } catch (error) {
    console.error(`Error in web test:`, error);
    throw error;
  }
}
async function connect() {
  const url = `http://chrome-service:9222/json/version`;
  console.log(`[CLIENT] Attempting to reach Chrome service at ${url}...`);
  const req = http.get(url, (res) => {
    let data = "";
    console.log(`[CLIENT] HTTP Status: ${res.statusCode}`);
    res.on("data", (chunk) => data += chunk);
    res.on("end", async () => {
      try {
        const json = JSON.parse(data);
        console.log(`[CLIENT] Successfully fetched WS URL: ${json.webSocketDebuggerUrl}`);
        await launchPuppeteer(json.webSocketDebuggerUrl);
      } catch (e) {
        console.error("[CLIENT] Failed to parse JSON or connect:", e.message);
        console.log("[CLIENT] Raw Data received:", data);
        throw e;
      }
    });
  });
  req.on("error", (err) => {
    console.error("[CLIENT] HTTP Request Failed:", err.message);
    throw err;
  });
  req.setTimeout(5e3, () => {
    console.log("[CLIENT] Request timeout");
    req.destroy();
    throw new Error("Timeout");
  });
}
connect();
