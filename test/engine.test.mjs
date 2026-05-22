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
  assert.ok(manifest.targets.some((target) => target.id === "tccg-work"));
  assert.ok(manifest.targets.some((target) => target.id === "tolani-lab"));
  assert.ok(manifest.tasks.length >= 4);
});
