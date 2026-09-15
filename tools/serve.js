// Lokal server för att prova appen på telefonen i samma nätverk.
// Kör: npm run serve   (eller: node tools/serve.js 8080)
// Obs: över http registreras ingen service worker, så offline och installation går inte att prova här.
const http = require("node:http"), fs = require("node:fs"), path = require("node:path"), os = require("node:os");

const root = path.join(__dirname, "..");
const port = Number(process.argv[2]) || 8080;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png",
};

http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = path.join(root, url.endsWith("/") ? url + "index.html" : url);
  // Bara filer inuti projektet, och inga dolda mappar som .git
  if (!file.startsWith(root + path.sep) || file.split(path.sep).some(p => p.startsWith("."))) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404).end("Hittades inte"); return; }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
}).listen(port, "0.0.0.0", () => {
  console.log(`Appen körs. Öppna någon av de här adresserna på telefonen (samma nätverk som datorn):`);
  for (const list of Object.values(os.networkInterfaces()))
    for (const a of list) if (a.family === "IPv4" && !a.internal) console.log(`  http://${a.address}:${port}/`);
  console.log(`På datorn: http://localhost:${port}/   Stoppa med Ctrl+C.`);
});
