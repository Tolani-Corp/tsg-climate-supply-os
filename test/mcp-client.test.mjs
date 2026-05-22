import assert from "node:assert/strict";
import test from "node:test";
import { loadMcpContext, loadMcpSettings, saveMcpSettings } from "../src/mcp-client.js";

function storageStub(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
}

test("MCP settings round-trip through browser storage", () => {
  const storage = storageStub();
  const saved = saveMcpSettings({ baseUrl: "http://localhost:3001/", apiKey: "abc" }, storage);
  const loaded = loadMcpSettings(storage);

  assert.equal(saved.baseUrl, "http://localhost:3001");
  assert.equal(loaded.apiKey, "abc");
});

test("MCP context returns offline fallback when health fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("connection refused");
  };

  try {
    const context = await loadMcpContext({ productId: "smart-vrf" }, { baseUrl: "http://mcp", apiKey: "key" });

    assert.equal(context.status, "offline");
    assert.ok(context.fallbackReasons[0].includes("health check failed"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP context collects live tool results", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/health")) {
      return Response.json({ status: "healthy", dataLastUpdated: "2026-02-21T00:00:00Z" });
    }

    const body = JSON.parse(options.body);
    const resultByTool = {
      tariff_lookup: { results: [{ hsCode: "8415", duties: { PA: "8%" } }] },
      compliance_check: { compliance: { requiredDocuments: ["Commercial Invoice"], riskFlags: [] } },
      route_optimizer: { recommendation: { estimatedCost: 3000, totalTransitDays: { max: 30 } } },
      knowledge_search: { results: [{ title: "Panama climate device evidence" }] }
    };

    return Response.json({
      ok: true,
      result: resultByTool[body.name],
      metadata: { dataLastUpdated: "2026-02-21T00:00:00Z" }
    });
  };

  try {
    const context = await loadMcpContext(
      { productId: "smart-vrf", originId: "shenzhen", destinationId: "panama-city" },
      { baseUrl: "http://mcp", apiKey: "key" }
    );

    assert.equal(context.status, "live");
    assert.equal(context.tariff.results[0].hsCode, "8415");
    assert.equal(context.route.recommendation.estimatedCost, 3000);
    assert.equal(context.knowledge.results[0].title, "Panama climate device evidence");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("MCP context marks partial data when one tool fails", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/health")) {
      return Response.json({ status: "healthy" });
    }

    const body = JSON.parse(options.body);
    if (body.name === "route_optimizer") {
      return Response.json({ ok: false, error: { message: "No route found" } }, { status: 400 });
    }

    return Response.json({ ok: true, result: { ok: body.name }, metadata: {} });
  };

  try {
    const context = await loadMcpContext(
      { productId: "smart-vrf", originId: "shenzhen", destinationId: "panama-city" },
      { baseUrl: "http://mcp", apiKey: "key" }
    );

    assert.equal(context.status, "partial");
    assert.ok(context.fallbackReasons.includes("No route found"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
