#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const root = process.cwd();
const artifactDir = path.join(root, "artifacts", "browser-smoke");
const artifactPath = path.join(artifactDir, "projects-console-smoke.json");
const defaultPort = Number(process.env.PROJECTS_SMOKE_PORT ?? "31097");
const localPath = "/dashboard/projects?office=LDN&from=2026-01-01&to=2026-03-31";
const smokeUrl =
  process.env.PROJECTS_SMOKE_URL ??
  (process.env.PROJECTS_SMOKE_BASE_URL === undefined
    ? `http://127.0.0.1:${defaultPort}${localPath}`
    : `${process.env.PROJECTS_SMOKE_BASE_URL.replace(/\/$/, "")}${localPath}`);
const shouldStartLocalServer = process.env.PROJECTS_SMOKE_URL === undefined && process.env.PROJECTS_SMOKE_BASE_URL === undefined;

const missingAssetAllowlist = [/favicon\.ico/i, /apple-touch-icon/i, /site\.webmanifest/i];
const appErrorEntries = [];
const ignoredErrorEntries = [];
const allConsoleEntries = [];
const assertions = [];
const nextEnvPath = path.join(root, "next-env.d.ts");
const originalNextEnv = fs.existsSync(nextEnvPath) ? fs.readFileSync(nextEnvPath, "utf8") : undefined;
let nextProcess;
let chromeProcess;
let chromeUserDataDir;

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode === undefined || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GET ${url} returned ${response.statusCode}: ${body}`));
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", reject);
  });
}

async function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    try {
      await requestJson(url);
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message ?? "no response"}`);
}

async function waitForText(url, timeoutMs) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    try {
      const text = await new Promise((resolve, reject) => {
        const request = http.get(url, (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.on("end", () => {
            if (response.statusCode === undefined || response.statusCode >= 500) {
              reject(new Error(`GET ${url} returned ${response.statusCode}: ${body.slice(0, 200)}`));
              return;
            }
            resolve(body);
          });
        });
        request.on("error", reject);
      });

      if (text.includes("Projects") || text.includes("__next")) return;
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(`Timed out waiting for app page ${url}: ${lastError?.message ?? "no response"}`);
}

function startNextServer() {
  const nextBin = path.join(root, "node_modules", ".bin", "next");
  nextProcess = spawn(nextBin, ["dev", "--hostname", "127.0.0.1", "--port", String(defaultPort)], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" }
  });

  nextProcess.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk}`));
  nextProcess.stderr.on("data", (chunk) => process.stderr.write(`[next] ${chunk}`));

  nextProcess.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`next dev exited with code ${code}`);
    } else if (signal !== null) {
      console.error(`next dev exited with signal ${signal}`);
    }
  });
}

function chromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter(Boolean);

  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (found === undefined) {
    throw new Error("No Chrome/Chromium executable found. Set CHROME_PATH to run the browser console smoke.");
  }
  return found;
}

function startChrome(port) {
  chromeUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ucs-projects-smoke-"));
  chromeProcess = spawn(
    chromeExecutable(),
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-sync",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${chromeUserDataDir}`,
      "about:blank"
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  chromeProcess.stderr.on("data", (chunk) => process.stderr.write(`[chrome] ${chunk}`));
}

function consoleText(entry) {
  return [entry.text, entry.url, entry.args?.join(" ")].filter(Boolean).join(" ");
}

function isAllowlisted(entry) {
  if (entry.source !== "network") return false;
  return missingAssetAllowlist.some((pattern) => pattern.test(consoleText(entry)));
}

function recordError(entry) {
  allConsoleEntries.push(entry);
  if (isAllowlisted(entry)) {
    ignoredErrorEntries.push(entry);
  } else {
    appErrorEntries.push(entry);
  }
}

async function runSmoke() {
  if (shouldStartLocalServer) {
    startNextServer();
    await waitForText(smokeUrl, 60_000);
  }

  const chromeDebugPort = Number(process.env.CHROME_DEBUG_PORT ?? "9223");
  startChrome(chromeDebugPort);
  await waitForHttp(`http://127.0.0.1:${chromeDebugPort}/json/version`, 20_000);

  const pages = await requestJson(`http://127.0.0.1:${chromeDebugPort}/json/list`);
  const page = pages.find((target) => target.type === "page");
  if (page?.webSocketDebuggerUrl === undefined) {
    throw new Error("Chrome did not expose a debuggable page target.");
  }

  let cdp;
  try {
    cdp = await CdpClient.connect(page.webSocketDebuggerUrl);
    cdp.on("Runtime.consoleAPICalled", (event) => {
      if (event.type !== "error") return;
      recordError({
        channel: "Runtime.consoleAPICalled",
        source: "console",
        level: event.type,
        text: event.args?.map((arg) => arg.value ?? arg.description ?? arg.type).join(" "),
        args: event.args?.map((arg) => arg.value ?? arg.description ?? arg.type),
        stackTrace: event.stackTrace
      });
    });
    cdp.on("Runtime.exceptionThrown", (event) => {
      recordError({
        channel: "Runtime.exceptionThrown",
        source: "runtime",
        level: "error",
        text: event.exceptionDetails?.text,
        url: event.exceptionDetails?.url,
        lineNumber: event.exceptionDetails?.lineNumber,
        columnNumber: event.exceptionDetails?.columnNumber,
        stackTrace: event.exceptionDetails?.stackTrace
      });
    });
    cdp.on("Log.entryAdded", (event) => {
      if (event.entry?.level !== "error") return;
      recordError({
        channel: "Log.entryAdded",
        source: event.entry.source,
        level: event.entry.level,
        text: event.entry.text,
        url: event.entry.url,
        lineNumber: event.entry.lineNumber
      });
    });

    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await cdp.send("Page.enable");

    const loadPromise = cdp.waitFor("Page.loadEventFired", 45_000);
    await cdp.send("Page.navigate", { url: smokeUrl });
    await loadPromise;
    await delay(1_000);

    const domResult = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const rows = [...document.querySelectorAll("tbody tr")].map((row) => row.innerText);
        const cells = [...document.querySelectorAll("tbody td")].map((cell) => cell.innerText.trim());
        return {
          title: document.title,
          bodyText: document.body.innerText,
          rows,
          cells,
          sourceOnlyCount: document.body.innerText.match(/Source-only/g)?.length ?? 0,
          noSourceRowCount: document.body.innerText.match(/No source row/g)?.length ?? 0,
          duplicateFloatRows: rows.filter((row) => row.includes("UCS05186")),
          falseZeroCells: cells.filter((cell) => cell === "£0" || cell === "0h")
        };
      })()`,
      returnByValue: true
    });
    const dom = domResult.result.value;

    assert("Projects page rendered", dom.bodyText.includes("Projects"), "Expected Projects heading in rendered page.");
    assert("Source-only presentation visible", dom.sourceOnlyCount > 0, "Expected at least one Source-only label.");
    assert("No source row presentation visible", dom.noSourceRowCount > 0, "Expected at least one No source row label.");
    assert(
      "Duplicate Float rows remain visible",
      dom.duplicateFloatRows.length >= 2,
      `Expected at least two UCS05186 rows, saw ${dom.duplicateFloatRows.length}.`
    );
    assert(
      "No false zero cells on source-only/no-source presentation",
      dom.falseZeroCells.length === 0,
      `Unexpected false zero cells: ${dom.falseZeroCells.join(", ")}`
    );

    return { dom };
  } finally {
    await cdp?.close();
  }
}

function assert(name, pass, message) {
  assertions.push({ name, status: pass ? "pass" : "fail", ...(pass ? {} : { message }) });
}

async function main() {
  fs.mkdirSync(artifactDir, { recursive: true });
  let smokeDetails = {};
  let blocker;

  try {
    smokeDetails = await runSmoke();
  } catch (error) {
    blocker = error instanceof Error ? error.stack ?? error.message : String(error);
    assertions.push({ name: "Smoke runner completed", status: "fail", message: blocker });
  } finally {
    cleanup();
  }

  const failedAssertions = assertions.filter((entry) => entry.status === "fail");
  const artifact = {
    generatedAt: new Date().toISOString(),
    url: smokeUrl,
    mode: shouldStartLocalServer ? "local-next-dev" : "external-url",
    allowlistedMissingAssets: missingAssetAllowlist.map((pattern) => pattern.source),
    assertions,
    consoleErrors: appErrorEntries,
    ignoredConsoleErrors: ignoredErrorEntries,
    allConsoleErrorLikeEntries: allConsoleEntries,
    ...smokeDetails,
    ...(blocker === undefined ? {} : { blocker })
  };
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`Projects console smoke artifact: ${path.relative(root, artifactPath)}`);

  if (appErrorEntries.length > 0 || failedAssertions.length > 0) {
    if (appErrorEntries.length > 0) {
      console.error(`Projects console smoke found ${appErrorEntries.length} app console error(s).`);
    }
    for (const failure of failedAssertions) {
      console.error(`FAIL ${failure.name}: ${failure.message}`);
    }
    process.exit(1);
  }

  console.log("Projects console smoke passed.");
}

function cleanup() {
  if (chromeProcess !== undefined && chromeProcess.exitCode === null) chromeProcess.kill("SIGTERM");
  if (nextProcess !== undefined && nextProcess.exitCode === null) nextProcess.kill("SIGTERM");
  if (chromeUserDataDir !== undefined) {
    try {
      fs.rmSync(chromeUserDataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    } catch (error) {
      console.warn(`WARN could not remove temporary Chrome profile ${chromeUserDataDir}: ${error.message}`);
    }
  }
  restoreNextEnvDevRewrite();
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function restoreNextEnvDevRewrite() {
  if (originalNextEnv === undefined || !fs.existsSync(nextEnvPath)) return;

  const current = fs.readFileSync(nextEnvPath, "utf8");
  const nextDevRewrite = originalNextEnv.replace("./.next/types/routes.d.ts", "./.next/dev/types/routes.d.ts");
  if (current === nextDevRewrite) {
    fs.writeFileSync(nextEnvPath, originalNextEnv);
  }
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.handlers = new Map();
    this.buffer = Buffer.alloc(0);

    socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.readFrames();
    });
    socket.on("close", () => {
      for (const { reject } of this.pending.values()) reject(new Error("CDP socket closed."));
      this.pending.clear();
    });
  }

  static async connect(webSocketUrl) {
    const url = new URL(webSocketUrl);
    const key = randomBytes(16).toString("base64");
    const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
    return await new Promise((resolve, reject) => {
      socket.once("error", reject);
      socket.once("connect", () => {
        socket.write(
          [
            `GET ${url.pathname}${url.search} HTTP/1.1`,
            `Host: ${url.host}`,
            "Upgrade: websocket",
            "Connection: Upgrade",
            `Sec-WebSocket-Key: ${key}`,
            "Sec-WebSocket-Version: 13",
            "",
            ""
          ].join("\r\n")
        );
      });
      socket.once("data", (chunk) => {
        const response = chunk.toString("utf8");
        if (!response.includes(" 101 ")) {
          reject(new Error(`CDP WebSocket upgrade failed: ${response.slice(0, 200)}`));
          return;
        }
        const headerEnd = chunk.indexOf("\r\n\r\n");
        const client = new CdpClient(socket);
        if (headerEnd !== -1 && headerEnd + 4 < chunk.length) {
          client.buffer = Buffer.from(chunk.subarray(headerEnd + 4));
          client.readFrames();
        }
        resolve(client);
      });
    });
  }

  on(method, handler) {
    const handlers = this.handlers.get(method) ?? [];
    handlers.push(handler);
    this.handlers.set(method, handlers);
  }

  waitFor(method, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${method}.`)), timeoutMs);
      const handler = (params) => {
        clearTimeout(timeout);
        resolve(params);
      };
      this.on(method, handler);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = JSON.stringify({ id, method, params });
    this.socket.write(encodeClientFrame(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  async close() {
    this.socket.end();
  }

  readFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      let offset = 2;
      let length = second & 0x7f;

      if (length === 126) {
        if (this.buffer.length < offset + 2) return;
        length = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (this.buffer.length < offset + 8) return;
        const bigLength = this.buffer.readBigUInt64BE(offset);
        if (bigLength > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("CDP frame too large.");
        length = Number(bigLength);
        offset += 8;
      }

      const masked = Boolean(second & 0x80);
      let mask;
      if (masked) {
        if (this.buffer.length < offset + 4) return;
        mask = this.buffer.subarray(offset, offset + 4);
        offset += 4;
      }

      if (this.buffer.length < offset + length) return;
      let payload = this.buffer.subarray(offset, offset + length);
      this.buffer = this.buffer.subarray(offset + length);

      if ((first & 0x0f) === 8) return;
      if (masked && mask !== undefined) {
        payload = Buffer.from(payload.map((byte, index) => byte ^ mask[index % 4]));
      }

      const message = JSON.parse(payload.toString("utf8"));
      if (message.id !== undefined) {
        const pending = this.pending.get(message.id);
        if (pending !== undefined) {
          this.pending.delete(message.id);
          if (message.error !== undefined) pending.reject(new Error(JSON.stringify(message.error)));
          else pending.resolve(message.result);
        }
        continue;
      }

      const handlers = this.handlers.get(message.method) ?? [];
      for (const handler of handlers) handler(message.params);
    }
  }
}

function encodeClientFrame(text) {
  const payload = Buffer.from(text);
  const mask = randomBytes(4);
  const headerLength = payload.length < 126 ? 2 : payload.length <= 0xffff ? 4 : 10;
  const frame = Buffer.alloc(headerLength + 4 + payload.length);
  frame[0] = 0x81;

  if (payload.length < 126) {
    frame[1] = 0x80 | payload.length;
    mask.copy(frame, 2);
    writeMaskedPayload(frame, payload, mask, 6);
  } else if (payload.length <= 0xffff) {
    frame[1] = 0x80 | 126;
    frame.writeUInt16BE(payload.length, 2);
    mask.copy(frame, 4);
    writeMaskedPayload(frame, payload, mask, 8);
  } else {
    frame[1] = 0x80 | 127;
    frame.writeBigUInt64BE(BigInt(payload.length), 2);
    mask.copy(frame, 10);
    writeMaskedPayload(frame, payload, mask, 14);
  }

  return frame;
}

function writeMaskedPayload(frame, payload, mask, offset) {
  for (let index = 0; index < payload.length; index += 1) {
    frame[offset + index] = payload[index] ^ mask[index % 4];
  }
}

await main();
