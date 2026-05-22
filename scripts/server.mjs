import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

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

createServer((req, res) => {
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
}).listen(port, () => {
  console.log(`TSG Climate Supply OS running at http://localhost:${port}`);
});
