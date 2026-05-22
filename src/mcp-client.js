import { products } from "./data.js";

export const defaultMcpSettings = {
  baseUrl: "/api/mcp",
  apiKey: "",
  mode: "proxy"
};

const STORAGE_KEY = "tsg-climate-supply-os.mcp";

const originPortMap = {
  shenzhen: "CNSZX",
  guangzhou: "CNGZG",
  ningbo: "CNNGB"
};

const destinationPortMap = {
  "panama-city": "PABLB",
  "colon-ftz": "PAONX",
  "david-chiriqui": "PABLB"
};

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

export function loadMcpSettings(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    return raw ? { ...defaultMcpSettings, ...JSON.parse(raw) } : { ...defaultMcpSettings };
  } catch {
    return { ...defaultMcpSettings };
  }
}

export function saveMcpSettings(settings, storage = globalThis.localStorage) {
  const baseUrl = trimTrailingSlash(settings.baseUrl || defaultMcpSettings.baseUrl);
  const clean = {
    baseUrl,
    apiKey: settings.apiKey || "",
    mode: settings.mode || (baseUrl.startsWith("/") ? "proxy" : "direct")
  };
  storage?.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
}

function isProxyMode(settings) {
  return settings.mode === "proxy" || settings.baseUrl.startsWith("/");
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

async function callTool(settings, name, args) {
  const headers = {
    "Content-Type": "application/json"
  };
  if (!isProxyMode(settings) && settings.apiKey) {
    headers.Authorization = `Bearer ${settings.apiKey}`;
  }

  const toolPath = isProxyMode(settings) ? "/tools/call" : "/api/tools/call";
  const body = await fetchJson(`${settings.baseUrl}${toolPath}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, arguments: args })
  });
  return body;
}

function hsHeading(productId) {
  const product = products.find((item) => item.id === productId) || products[0];
  return product.hsCode.split(".")[0];
}

export async function loadMcpContext(scenario, settings = loadMcpSettings()) {
  const cleanSettings = {
    ...settings,
    baseUrl: trimTrailingSlash(settings.baseUrl || defaultMcpSettings.baseUrl),
    mode: settings.mode || ((settings.baseUrl || defaultMcpSettings.baseUrl).startsWith("/") ? "proxy" : "direct")
  };

  const fallbackReasons = [];
  let health = null;

  try {
    health = await fetchJson(`${cleanSettings.baseUrl}/health`);
  } catch (error) {
    return {
      status: "offline",
      health: { status: "offline", error: error.message },
      fallbackReasons: [`China MCP health check failed: ${error.message}`]
    };
  }

  if (!isProxyMode(cleanSettings) && !cleanSettings.apiKey) {
    return {
      status: "offline",
      health,
      fallbackReasons: ["China MCP API key is not configured"]
    };
  }

  const hsCode = hsHeading(scenario.productId);
  const origin = originPortMap[scenario.originId] || originPortMap.shenzhen;
  const destination = destinationPortMap[scenario.destinationId] || destinationPortMap["panama-city"];

  const calls = {
    tariff: callTool(cleanSettings, "tariff_lookup", { hsCode, destination: "PA" }),
    compliance: callTool(cleanSettings, "compliance_check", { hsCode, origin: "CN", destination: "PA" }),
    route: callTool(cleanSettings, "route_optimizer", { origin, destination, prioritize: "balanced" }),
    knowledge: callTool(cleanSettings, "knowledge_search", {
      query: `Panama climate device compliance and sourcing guidance for HS ${hsCode}`,
      category: "compliance",
      topK: 3
    })
  };

  const entries = await Promise.allSettled(Object.entries(calls).map(async ([key, promise]) => {
    const response = await promise;
    return [key, response];
  }));

  const context = {
    status: "live",
    health,
    metadata: null,
    fallbackReasons
  };

  for (const entry of entries) {
    if (entry.status === "fulfilled") {
      const [key, response] = entry.value;
      context[key] = response.result;
      context.metadata ||= response.metadata;
    } else {
      context.status = "partial";
      fallbackReasons.push(entry.reason instanceof Error ? entry.reason.message : String(entry.reason));
    }
  }

  if (fallbackReasons.length) context.status = "partial";
  return context;
}
