import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

function resolvePath(urlPath) {
  const rawPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = rawPath === "/" ? "index.html" : rawPath.replace(/^[/\\]+/, "");
  const cleanPath = normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = resolve(join(root, cleanPath));
  if (!filePath.startsWith(root)) return null;
  if (existsSync(filePath) && statSync(filePath).isFile()) return filePath;
  return null;
}

export function getMcpProxyConfig(env = process.env) {
  const apiKey = env.CHINA_MCP_API_KEY || env.MCP_API_KEY || (env.MCP_API_KEYS || "").split(",")[0]?.trim() || "dev-key-local";
  return {
    baseUrl: (env.CHINA_MCP_BASE_URL || env.MCP_BASE_URL || "http://localhost:3001").replace(/\/+$/, ""),
    apiKey
  };
}

export function resolveMcpProxyPath(urlPath) {
  const pathname = new URL(urlPath, "http://localhost").pathname;
  if (pathname === "/api/mcp/health") return "/health";
  if (pathname === "/api/mcp/tools") return "/api/tools";
  if (pathname === "/api/mcp/tools/call") return "/api/tools/call";
  return null;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyMcpRequest(req, res, mcpPath) {
  const { baseUrl, apiKey } = getMcpProxyConfig();
  const upstreamUrl = `${baseUrl}${mcpPath}`;
  const body = req.method === "GET" || req.method === "HEAD" ? undefined : await readBody(req);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers: {
        "content-type": req.headers["content-type"] || "application/json",
        accept: req.headers.accept || "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body
    });
    const responseBody = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    res.end(responseBody);
  } catch (error) {
    res.writeHead(502, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    res.end(JSON.stringify({
      ok: false,
      error: {
        code: "MCP_PROXY_UNAVAILABLE",
        message: error instanceof Error ? error.message : String(error)
      }
    }));
  }
}

export function createStaticServer() {
  return createServer(async (req, res) => {
    const mcpPath = resolveMcpProxyPath(req.url || "/");
    if (mcpPath) {
      await proxyMcpRequest(req, res, mcpPath);
      return;
    }

    const filePath = resolvePath(req.url || "/");
    if (!filePath) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    createReadStream(filePath).pipe(res);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createStaticServer().listen(port, () => {
    const proxy = getMcpProxyConfig();
    console.log(`TSG Climate Supply OS running at http://localhost:${port}`);
    console.log(`China MCP proxy: /api/mcp -> ${proxy.baseUrl}`);
  });
}
