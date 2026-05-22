import { destinations, origins, products, routes } from "./data.js";
import { calculateScenario, createSyncManifest, defaultScenario, money, percent, round } from "./engine.js";
import { loadMcpContext, loadMcpSettings, saveMcpSettings } from "./mcp-client.js";

const form = document.querySelector("#scenario-form");
const productSelect = document.querySelector("#product");
const destinationSelect = document.querySelector("#destination");
const originSelect = document.querySelector("#origin");
const routeSelect = document.querySelector("#route");
const syncButton = document.querySelector("#copy-sync");
const syncOutput = document.querySelector("#sync-output");
const mcpBaseUrlInput = document.querySelector("#mcp-base-url");
const mcpApiKeyInput = document.querySelector("#mcp-api-key");
const mcpSaveButton = document.querySelector("#save-mcp-settings");
const mcpStatus = document.querySelector("#mcp-status");
let renderSequence = 0;

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function fillSelect(select, items, labelFactory) {
  select.replaceChildren(...items.map((item) => option(item.id, labelFactory(item))));
}

function readScenario() {
  const data = new FormData(form);
  return {
    productId: data.get("productId"),
    destinationId: data.get("destinationId"),
    originId: data.get("originId"),
    routeId: data.get("routeId"),
    units: Number(data.get("units")),
    coolingTons: Number(data.get("coolingTons")),
    baselineSeer: Number(data.get("baselineSeer")),
    targetSeer: Number(data.get("targetSeer")),
    monthlyCoolingHours: Number(data.get("monthlyCoolingHours")),
    smartControlSavingsRate: Number(data.get("smartControlSavingsRate")) / 100,
    contingencyRate: Number(data.get("contingencyRate")) / 100
  };
}

function setText(id, value) {
  document.querySelector(`#${id}`).textContent = value;
}

function metric(label, value, detail) {
  return `
    <div class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${detail}</small>
    </div>
  `;
}

function renderSupplierCards(result) {
  const cards = result.supplierOptions.map((supplier, index) => `
    <article class="supplier-card ${index === 0 ? "selected" : ""}">
      <div>
        <span class="eyebrow">${supplier.region}</span>
        <h3>${supplier.name}</h3>
      </div>
      <div class="score-ring" style="--score:${supplier.score}">${supplier.score}</div>
      <dl>
        <div><dt>Unit quote</dt><dd>${money(supplier.quotedUnitCost)}</dd></div>
        <div><dt>Lead time</dt><dd>${supplier.leadTimeDays} days</dd></div>
        <div><dt>Warranty</dt><dd>${supplier.warrantyMonths} mo</dd></div>
        <div><dt>MOQ fit</dt><dd>${round(supplier.moqScore, 0)}/100</dd></div>
      </dl>
      <p>${supplier.strengths.join(" / ")}</p>
      <small>${supplier.risks.join(" / ")}</small>
    </article>
  `).join("");

  document.querySelector("#suppliers").innerHTML = cards;
}

function renderChecklist(result) {
  document.querySelector("#checklist").innerHTML = result.checklist.map((item) => `
    <li>
      <span class="status ${item.status}">${item.status}</span>
      <div>
        <strong>${item.label}</strong>
        <small>${item.owner} | Evidence: ${item.evidence} | Due in ${item.dueInDays} days</small>
      </div>
    </li>
  `).join("");
}

function renderCostStack(result) {
  const rows = [
    ["Goods", result.cost.goodsCost],
    ["Freight", result.cost.freight],
    ["Insurance", result.cost.insurance],
    ["Duty", result.cost.duty],
    ["Customs buffer", result.cost.customsBuffer],
    ["FTZ handling", result.cost.ftzHandling],
    ["QA inspection", result.cost.inspection],
    ["Contingency", result.cost.contingency]
  ];
  const max = Math.max(...rows.map((row) => row[1]));
  document.querySelector("#cost-stack").innerHTML = rows.map(([label, value]) => `
    <div class="bar-row">
      <span>${label}</span>
      <div class="bar-track"><i style="width:${Math.max(3, (value / max) * 100)}%"></i></div>
      <strong>${money(value)}</strong>
    </div>
  `).join("");
}

function renderBom(result) {
  document.querySelector("#bom").innerHTML = result.bom.map((line) => `
    <tr>
      <td>${line.name}<small>${line.sku}</small></td>
      <td>${line.hsCode}</td>
      <td>${line.quantity}</td>
      <td>${money(line.unitCost)}</td>
      <td>${money(line.extendedCost)}</td>
    </tr>
  `).join("");
}

function statusLabel(result) {
  if (result.dataSource === "mcp-live") return "Live MCP";
  if (result.dataSource === "mcp-partial") return "Partial MCP";
  return "Offline fallback";
}

function setStatus(result) {
  mcpStatus.textContent = statusLabel(result);
  mcpStatus.dataset.state = result.dataSource;
  mcpStatus.title = result.fallbackReasons.length ? result.fallbackReasons.join(" / ") : "China MCP data is active";
}

function renderResult(result) {
  const manifest = createSyncManifest(result);

  setText("hero-cost", money(result.cost.landedCost));
  setText("hero-carbon", `${result.impact.avoidedCarbonTons} tCO2e`);
  setText("hero-supplier", result.recommendedSupplier.name);
  setText("hero-window", `${result.logistics.timelineDays} days`);

  document.querySelector("#snapshot").innerHTML = [
    metric("Landed cost per unit", money(result.cost.landedCostPerUnit), `${result.units} units via ${result.route.mode}`),
    metric("Annual energy savings", money(result.impact.annualEnergySavings), `${result.impact.avoidedKwh.toLocaleString()} kWh avoided`),
    metric("Efficiency gain", percent(result.impact.efficiencyGain), `${result.input.baselineSeer} to ${result.input.targetSeer} SEER equivalent`),
    metric("Freight footprint", `${result.logistics.freightCarbonTons} tCO2e`, `${result.logistics.totalCbm} CBM / ${result.logistics.totalWeightKg.toLocaleString()} kg`),
    metric("Data source", statusLabel(result), result.dataSourceLastUpdated || result.fallbackReasons[0] || "Current session")
  ].join("");

  setText("recommendation", result.recommendation);
  setText("route-notes", result.route.notes);
  setText("product-detail", `${result.product.category} | HS ${result.product.hsCode} | ${result.product.cybersecurityLevel}`);

  renderSupplierCards(result);
  renderCostStack(result);
  renderChecklist(result);
  renderBom(result);
  setStatus(result);

  syncOutput.value = JSON.stringify(manifest, null, 2);
}

async function render() {
  const sequence = ++renderSequence;
  const scenario = readScenario();
  const fallbackResult = calculateScenario(scenario);
  renderResult(fallbackResult);

  try {
    const mcpContext = await loadMcpContext(scenario);
    if (sequence !== renderSequence) return;
    renderResult(calculateScenario(scenario, mcpContext));
  } catch (error) {
    if (sequence !== renderSequence) return;
    renderResult(calculateScenario(scenario, {
      status: "offline",
      fallbackReasons: [error instanceof Error ? error.message : String(error)]
    }));
  }
}

fillSelect(productSelect, products, (item) => item.name);
fillSelect(destinationSelect, destinations, (item) => item.name);
fillSelect(originSelect, origins, (item) => item.name);
fillSelect(routeSelect, routes, (item) => item.name);

productSelect.value = defaultScenario.productId;
destinationSelect.value = defaultScenario.destinationId;
originSelect.value = defaultScenario.originId;
routeSelect.value = defaultScenario.routeId;

const settings = loadMcpSettings();
mcpBaseUrlInput.value = settings.baseUrl;
mcpApiKeyInput.value = settings.apiKey;

form.addEventListener("input", render);
form.addEventListener("change", render);
syncButton.addEventListener("click", async () => {
  syncOutput.select();
  try {
    await navigator.clipboard.writeText(syncOutput.value);
    syncButton.textContent = "Copied manifest";
    setTimeout(() => { syncButton.textContent = "Copy sync manifest"; }, 1400);
  } catch {
    document.execCommand("copy");
  }
});

mcpSaveButton.addEventListener("click", () => {
  saveMcpSettings({
    baseUrl: mcpBaseUrlInput.value,
    apiKey: mcpApiKeyInput.value
  });
  render();
});

render();
