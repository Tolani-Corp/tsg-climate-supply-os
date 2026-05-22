import assert from "node:assert/strict";
import test from "node:test";
import { calculateScenario, createSyncManifest, defaultScenario } from "../src/engine.js";

test("scenario calculation returns a positive landed cost and impact", () => {
  const result = calculateScenario(defaultScenario);

  assert.ok(result.cost.landedCost > result.cost.goodsCost);
  assert.ok(result.cost.landedCostPerUnit > 0);
  assert.ok(result.impact.avoidedKwh > 0);
  assert.equal(result.recommendedSupplier.supportsProduct, true);
});

test("unit volume scales landed cost", () => {
  const small = calculateScenario({ units: 5 });
  const large = calculateScenario({ units: 50 });

  assert.ok(large.cost.landedCost > small.cost.landedCost);
  assert.ok(large.logistics.totalCbm > small.logistics.totalCbm);
});

test("supplier options only include suppliers that support selected product", () => {
  const result = calculateScenario({ productId: "smart-meter-pack", units: 75 });

  assert.ok(result.supplierOptions.length >= 2);
  assert.ok(result.supplierOptions.every((supplier) => supplier.supportsProduct));
});

test("sync manifest exposes stable schema and required work targets", () => {
  const result = calculateScenario({ productId: "retrofit-gateway", destinationId: "colon-ftz" });
  const manifest = createSyncManifest(result);

  assert.equal(manifest.schema, "tsg.climate-supply-os.sync.v1");
  assert.ok(manifest.syncId.includes("retrofit-gateway"));
  assert.equal(manifest.platform.brand.name, "Tolani Supply Group");
  assert.equal(manifest.platform.brand.productName, "TSG Climate Supply OS");
  assert.ok(manifest.platform.dynamics.some((dynamic) => dynamic.id === "tsg-ops"));
  assert.ok(manifest.targets.some((target) => target.id === "tccg-work"));
  assert.ok(manifest.targets.some((target) => target.id === "tolani-lab"));
  assert.ok(manifest.tasks.length >= 4);
  assert.equal(manifest.dataSource, "static-fallback");
  assert.ok(Array.isArray(manifest.fallbackReasons));
});

test("scenario can use MCP tariff, route, and compliance context", () => {
  const staticResult = calculateScenario({ productId: "smart-vrf", units: 24 });
  const liveResult = calculateScenario(
    { productId: "smart-vrf", units: 24 },
    {
      status: "live",
      health: { status: "healthy", dataLastUpdated: "2026-02-21T00:00:00Z" },
      metadata: { dataLastUpdated: "2026-02-21T00:00:00Z" },
      tariff: { results: [{ hsCode: "8415", duties: { PA: "4%" } }] },
      route: { recommendation: { estimatedCost: 2600, totalTransitDays: { max: 28 } } },
      compliance: { compliance: { requiredDocuments: ["Commercial Invoice"], riskFlags: ["CHECK: firmware evidence"] } },
      knowledge: { results: [{ title: "Climate device compliance" }] }
    }
  );

  assert.equal(liveResult.dataSource, "mcp-live");
  assert.equal(liveResult.mcpInsights.tariffDutySource, "mcp-tariff_lookup");
  assert.equal(liveResult.mcpInsights.routeSource, "mcp-route_optimizer");
  assert.ok(liveResult.checklist.some((item) => item.id === "mcp-required-documents"));
  assert.ok(liveResult.cost.duty < staticResult.cost.duty);
});

test("partial MCP context is labeled and records fallback reasons", () => {
  const result = calculateScenario(
    { productId: "smart-meter-pack" },
    {
      status: "partial",
      tariff: { results: [{ hsCode: "9028", duties: { PA: "2%" } }] },
      fallbackReasons: ["route_optimizer failed"]
    }
  );

  assert.equal(result.dataSource, "mcp-partial");
  assert.ok(result.fallbackReasons.includes("route_optimizer failed"));
  assert.ok(result.fallbackReasons.some((reason) => reason.includes("compliance")));
});
