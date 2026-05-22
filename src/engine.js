import {
  complianceLibrary,
  destinations,
  origins,
  products,
  routes,
  suppliers,
  syncTargets
} from "./data.js";

export const defaultScenario = {
  productId: "smart-vrf",
  destinationId: "panama-city",
  originId: "shenzhen",
  routeId: "ocean-balanced",
  units: 24,
  coolingTons: 60,
  baselineSeer: 13,
  targetSeer: 22,
  monthlyCoolingHours: 260,
  smartControlSavingsRate: 0.14,
  inspectionRate: 0.025,
  contingencyRate: 0.06
};

const EXPECTED_MCP_SIGNALS = ["tariff", "compliance", "route", "knowledge"];

export function clamp(value, min, max) {
  return Math.min(Math.max(Number(value), min), max);
}

export function round(value, places = 2) {
  const scale = 10 ** places;
  return Math.round((Number(value) + Number.EPSILON) * scale) / scale;
}

export function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function percent(value) {
  return `${round(value * 100, 1)}%`;
}

function byId(list, id, fallbackId) {
  return list.find((item) => item.id === id) || list.find((item) => item.id === fallbackId) || list[0];
}

function parsePercentRate(value) {
  if (typeof value === "number") return value > 1 ? value / 100 : value;
  if (typeof value !== "string") return null;
  const match = value.match(/([\d.]+)%/);
  return match ? Number(match[1]) / 100 : null;
}

function normalizeMcpContext(context = {}) {
  const presentSignals = EXPECTED_MCP_SIGNALS.filter((key) => Boolean(context[key]));
  const fallbackReasons = [...(context.fallbackReasons || [])];
  let dataSource = "static-fallback";

  if (context.status === "live" && presentSignals.length === EXPECTED_MCP_SIGNALS.length) {
    dataSource = "mcp-live";
  } else if (presentSignals.length > 0 || context.status === "partial") {
    dataSource = "mcp-partial";
    for (const key of EXPECTED_MCP_SIGNALS) {
      if (!context[key]) fallbackReasons.push(`Missing MCP ${key} data`);
    }
  } else if (!fallbackReasons.length) {
    fallbackReasons.push("No MCP context provided");
  }

  return {
    ...context,
    dataSource,
    fallbackReasons: [...new Set(fallbackReasons)],
    dataSourceLastUpdated:
      context.metadata?.dataLastUpdated ||
      context.health?.dataLastUpdated ||
      null,
    mcpHealth: context.health || {
      status: context.status === "offline" ? "offline" : "not-configured"
    }
  };
}

function resolveTariffRate(product, source) {
  const hsHeading = product.hsCode.split(".")[0];
  const tariff = source.tariff?.results?.find((item) => hsHeading.startsWith(item.hsCode) || item.hsCode.startsWith(hsHeading));
  const duty = tariff?.duties?.PA;
  const rate = parsePercentRate(duty);
  return rate === null ? null : rate;
}

function resolveMcpRoute(source) {
  return source.route?.recommendation || source.route?.routes?.[0] || null;
}

function scoreSupplier(supplier, product, units) {
  const supportsProduct = supplier.supports.includes(product.id);
  const certificationFit = supplier.certifications.some((cert) => /ISO 14001|RoHS|Cyber|IEC|BACnet/.test(cert)) ? 92 : 72;
  const leadScore = clamp(110 - supplier.leadTimeDays * 1.6, 35, 100);
  const moqScore = units >= supplier.moq ? 100 : clamp(55 + (units / supplier.moq) * 45, 35, 95);
  const supportPenalty = supportsProduct ? 0 : 38;

  const score = (
    supplier.reliability * 0.28 +
    supplier.esgScore * 0.23 +
    certificationFit * 0.16 +
    leadScore * 0.14 +
    moqScore * 0.11 +
    supplier.warrantyMonths * 0.8
  ) - supportPenalty;

  return {
    ...supplier,
    supportsProduct,
    score: round(clamp(score, 0, 100), 1),
    quotedUnitCost: round(product.unitCost * supplier.unitCostMultiplier, 2),
    certificationFit,
    leadScore: round(leadScore, 1),
    moqScore: round(moqScore, 1)
  };
}

function calculateEnergyImpact(input, destination, product) {
  const coolingTons = clamp(input.coolingTons, 1, 10000);
  const baselineSeer = clamp(input.baselineSeer || product.baselineSeer || 13, 8, 30);
  const targetSeer = clamp(input.targetSeer || product.targetSeer || baselineSeer, 8, 35);
  const monthlyCoolingHours = clamp(input.monthlyCoolingHours, 1, 744);
  const smartControlSavingsRate = clamp(input.smartControlSavingsRate, 0, 0.45);

  const annualHours = monthlyCoolingHours * 12;
  const baselineKw = (coolingTons * 12000) / baselineSeer / 1000;
  const targetKwBeforeControls = (coolingTons * 12000) / targetSeer / 1000;
  const targetKw = targetKwBeforeControls * (1 - smartControlSavingsRate);

  const baselineKwh = baselineKw * annualHours;
  const projectedKwh = targetKw * annualHours;
  const avoidedKwh = Math.max(0, baselineKwh - projectedKwh);
  const avoidedCarbonTons = avoidedKwh * destination.gridKgCo2PerKwh / 1000;
  const annualEnergySavings = avoidedKwh * destination.defaultElectricityRate;

  return {
    baselineKwh: round(baselineKwh, 0),
    projectedKwh: round(projectedKwh, 0),
    avoidedKwh: round(avoidedKwh, 0),
    avoidedCarbonTons: round(avoidedCarbonTons, 1),
    annualEnergySavings: round(annualEnergySavings, 0),
    efficiencyGain: round((baselineKwh - projectedKwh) / baselineKwh, 3)
  };
}

export function calculateScenario(overrides = {}, mcpContext = {}) {
  const input = { ...defaultScenario, ...overrides };
  const source = normalizeMcpContext(overrides.mcpContext || mcpContext);
  const product = byId(products, input.productId, defaultScenario.productId);
  const destination = byId(destinations, input.destinationId, defaultScenario.destinationId);
  const origin = byId(origins, input.originId, defaultScenario.originId);
  const route = byId(routes, input.routeId, defaultScenario.routeId);
  const units = Math.round(clamp(input.units, 1, 100000));
  const mcpDutyRate = resolveTariffRate(product, source);
  const dutyRate = mcpDutyRate ?? product.importDutyPa;
  const mcpRoute = resolveMcpRoute(source);

  const supplierOptions = suppliers
    .map((supplier) => scoreSupplier(supplier, product, units))
    .filter((supplier) => supplier.supportsProduct)
    .sort((a, b) => b.score - a.score);

  const recommendedSupplier = supplierOptions[0] || scoreSupplier(suppliers[0], product, units);
  const goodsCost = recommendedSupplier.quotedUnitCost * units;
  const totalCbm = product.cbm * units;
  const totalWeightKg = product.weightKg * units;
  const mcpFreight = Number.isFinite(mcpRoute?.estimatedCost) ? Number(mcpRoute.estimatedCost) : null;
  const freight = (mcpFreight ?? (route.baseFreight + totalCbm * route.cbmRate)) + origin.exportDocFee;
  const insurance = goodsCost * 0.009;
  const cif = goodsCost + freight + insurance;
  const duty = cif * dutyRate;
  const customsBuffer = cif * destination.customsBufferRate;
  const ftzHandling = cif * destination.ftzHandlingRate;
  const inspection = Math.max(850, goodsCost * clamp(input.inspectionRate, 0, 0.2) + origin.qualityLeadDays * 45);
  const contingency = (cif + duty + customsBuffer + ftzHandling + inspection) * clamp(input.contingencyRate, 0, 0.25);
  const landedCost = cif + duty + customsBuffer + ftzHandling + inspection + contingency;
  const freightCarbonTons = totalCbm * route.kgCo2PerCbm / 1000;
  const energyImpact = calculateEnergyImpact(input, destination, product);

  const riskLevel = recommendedSupplier.score >= 86 && route.reliability >= 84
    ? "Low"
    : recommendedSupplier.score >= 76
      ? "Medium"
      : "High";

  const routeDaysMax = Number.isFinite(mcpRoute?.totalTransitDays?.max)
    ? Number(mcpRoute.totalTransitDays.max)
    : route.daysMax;
  const timelineDays = routeDaysMax + recommendedSupplier.leadTimeDays + origin.qualityLeadDays + 5;

  const checklist = complianceLibrary.map((item, index) => ({
    ...item,
    status: index < 2 ? "ready" : "needed",
    dueInDays: Math.max(3, timelineDays - (index + 1) * 4)
  }));

  if (source.compliance?.compliance?.requiredDocuments?.length) {
    checklist.push({
      id: "mcp-required-documents",
      label: `Attach MCP-required documents: ${source.compliance.compliance.requiredDocuments.slice(0, 4).join(", ")}`,
      owner: "TSG customs",
      evidence: "MCP compliance_check output",
      status: "needed",
      dueInDays: Math.max(3, timelineDays - 10)
    });
  }

  const bom = [
    {
      sku: product.id,
      name: product.name,
      quantity: units,
      unitCost: recommendedSupplier.quotedUnitCost,
      extendedCost: round(recommendedSupplier.quotedUnitCost * units, 2),
      hsCode: product.hsCode
    },
    {
      sku: "qa-factory-audit",
      name: "Factory QA and sample validation",
      quantity: 1,
      unitCost: round(inspection, 2),
      extendedCost: round(inspection, 2),
      hsCode: "service"
    }
  ];

  return {
    input,
    product,
    origin,
    destination,
    route,
    units,
    supplierOptions,
    recommendedSupplier,
    cost: {
      goodsCost: round(goodsCost, 2),
      freight: round(freight, 2),
      insurance: round(insurance, 2),
      cif: round(cif, 2),
      duty: round(duty, 2),
      customsBuffer: round(customsBuffer, 2),
      ftzHandling: round(ftzHandling, 2),
      inspection: round(inspection, 2),
      contingency: round(contingency, 2),
      landedCost: round(landedCost, 2),
      landedCostPerUnit: round(landedCost / units, 2)
    },
    logistics: {
      totalCbm: round(totalCbm, 2),
      totalWeightKg: round(totalWeightKg, 1),
      timelineDays,
      freightCarbonTons: round(freightCarbonTons, 2),
      reliability: route.reliability,
      riskLevel
    },
    impact: energyImpact,
    checklist,
    bom,
    recommendation: buildRecommendation(recommendedSupplier, product, route, riskLevel),
    dataSource: source.dataSource,
    dataSourceLastUpdated: source.dataSourceLastUpdated,
    mcpHealth: source.mcpHealth,
    fallbackReasons: source.fallbackReasons,
    mcpInsights: {
      tariffDutyRate: round(dutyRate, 4),
      tariffDutySource: mcpDutyRate === null ? "static-product-default" : "mcp-tariff_lookup",
      routeSource: mcpRoute ? "mcp-route_optimizer" : "static-route-default",
      complianceRiskFlags: source.compliance?.compliance?.riskFlags || [],
      knowledgeResults: source.knowledge?.results || []
    }
  };
}

function buildRecommendation(supplier, product, route, riskLevel) {
  const parts = [
    `Use ${supplier.name} for ${product.name.toLowerCase()} because it scores ${supplier.score}/100 and supports this product family.`,
    `Route through ${route.name.toLowerCase()} for a ${route.daysMin}-${route.daysMax} day logistics window.`,
    `Risk level is ${riskLevel.toLowerCase()}; close the audit, cybersecurity, and Panama customs tasks before purchase order release.`
  ];
  return parts.join(" ");
}

export function createSyncManifest(result) {
  const stableId = [
    result.product.id,
    result.destination.id,
    result.origin.id,
    result.route.id,
    result.units
  ].join(":");

  return {
    schema: "tsg.climate-supply-os.sync.v1",
    syncId: `tsg-cso-${stableId}`,
    generatedAt: new Date().toISOString(),
    targets: syncTargets,
    project: {
      name: `${result.product.name} to ${result.destination.name}`,
      lane: `${result.origin.port} to ${result.destination.port}`,
      ownerSystem: "TSG Climate Supply OS",
      status: "planning"
    },
    recommendedSupplier: {
      id: result.recommendedSupplier.id,
      name: result.recommendedSupplier.name,
      score: result.recommendedSupplier.score,
      warrantyMonths: result.recommendedSupplier.warrantyMonths,
      leadTimeDays: result.recommendedSupplier.leadTimeDays
    },
    landedCost: result.cost,
    logistics: result.logistics,
    impact: result.impact,
    dataSource: result.dataSource,
    dataSourceLastUpdated: result.dataSourceLastUpdated,
    mcpHealth: result.mcpHealth,
    fallbackReasons: result.fallbackReasons,
    billOfMaterials: result.bom,
    tasks: result.checklist.map((item) => ({
      id: item.id,
      title: item.label,
      owner: item.owner,
      status: item.status,
      dueInDays: item.dueInDays,
      evidence: item.evidence
    }))
  };
}
