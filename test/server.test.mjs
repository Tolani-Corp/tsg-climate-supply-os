import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createStaticServer, getMcpProxyConfig, resolveMcpProxyPath } from "../scripts/server.mjs";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, () => {
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}

test("server resolves local MCP proxy paths", () => {
  assert.equal(resolveMcpProxyPath("/api/mcp/health"), "/health");
  assert.equal(resolveMcpProxyPath("/api/mcp/tools"), "/api/tools");
  assert.equal(resolveMcpProxyPath("/api/mcp/tools/call"), "/api/tools/call");
  assert.equal(resolveMcpProxyPath("/src/app.js"), null);
});

test("server MCP proxy config reads server-side environment", () => {
  const config = getMcpProxyConfig({
    CHINA_MCP_BASE_URL: "http://mcp.internal:3001/",
    CHINA_MCP_API_KEY: "secret"
  });

  assert.equal(config.baseUrl, "http://mcp.internal:3001");
  assert.equal(config.apiKey, "secret");
});

test("static server proxies MCP calls with server-side API key", async () => {
  const previousBase = process.env.CHINA_MCP_BASE_URL;
  const previousKey = process.env.CHINA_MCP_API_KEY;
  const seen = [];

  const upstream = createServer(async (req, res) => {
    seen.push({ url: req.url, authorization: req.headers.authorization });
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "healthy" }));
      return;
    }

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, result: { proxied: true }, metadata: {} }));
  });
  const upstreamUrl = await listen(upstream);
  process.env.CHINA_MCP_BASE_URL = upstreamUrl;
  process.env.CHINA_MCP_API_KEY = "server-secret";

  const app = createStaticServer();
  const appUrl = await listen(app);

  try {
    const health = await fetch(`${appUrl}/api/mcp/health`);
    const call = await fetch(`${appUrl}/api/mcp/tools/call`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "tariff_lookup", arguments: { hsCode: "8415" } })
    });
    const callBody = await call.json();

    assert.equal(health.status, 200);
    assert.equal(call.status, 200);
    assert.equal(callBody.result.proxied, true);
    assert.ok(seen.some((request) => request.url === "/health"));
    assert.ok(seen.some((request) => request.url === "/api/tools/call" && request.authorization === "Bearer server-secret"));
  } finally {
    process.env.CHINA_MCP_BASE_URL = previousBase;
    process.env.CHINA_MCP_API_KEY = previousKey;
    await close(app);
    await close(upstream);
  }
});
