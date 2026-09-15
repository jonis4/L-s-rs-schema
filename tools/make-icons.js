// Ritar appikonerna utifrån läsårsdatan: de officiella läsperioderna som en ring.
// Kör: node tools/make-icons.js   (skriver till icons/)
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), zlib = require("node:zlib");

const root = path.join(__dirname, "..");
const ctx = vm.createContext({});
for (const f of ["data.js", "time.js"]) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
const { OFF, dayAt, angT, DAY } = vm.runInContext("({ OFF, dayAt, angT, DAY })", ctx);

const COLORS = { "var(--nolle)": "#af52de", "var(--lp1)": "#ff9500", "var(--lp2)": "#4da3ff", "var(--lp3)": "#30b0c7", "var(--lp4)": "#34c759" };
const BG = "#f5f5f7", TRACK = "#e8e8ed";
// Radier som andel av ikonens sida. Ytterkanten ryms i maskable-ikonens säkra zon (radie 0,4).
const R_TRACK = .38, R_OUT = .345, R_IN = .225, R_HOLE = .19;
const GAP = 1.2 * DAY;                     // luft mellan perioderna, i tid

const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

function colorAt(x, y) {                   // x, y i [-0.5, 0.5]
  const r = Math.hypot(x, y);
  if (r > R_TRACK || r < R_HOLE) return BG;
  if (r > R_OUT || r < R_IN) return TRACK;
  const t = dayAt(Math.atan2(x, -y));
  const o = OFF.find(p => t >= p.t0 + GAP / 2 && t < p.t1 - GAP / 2);
  return o ? COLORS[o.c] : TRACK;
}

function png(size) {
  const SS = 4, raw = Buffer.alloc((size * 3 + 1) * size);
  for (let py = 0; py < size; py++) {
    raw[py * (size * 3 + 1)] = 0;
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const c = rgb(colorAt((px + (sx + .5) / SS) / size - .5, (py + (sy + .5) / SS) / size - .5));
        sum[0] += c[0]; sum[1] += c[1]; sum[2] += c[2];
      }
      const o = py * (size * 3 + 1) + 1 + px * 3;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(sum[i] / (SS * SS));
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;   // 8 bitar, RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const CRC = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function svg() {
  const S = 100, c = S / 2, p = (r, a) => [(c + r * S * Math.sin(a)).toFixed(2), (c - r * S * Math.cos(a)).toFixed(2)];
  const sector = (a0, a1) => {
    const large = a0 - a1 > Math.PI ? 1 : 0, [x0, y0] = p(R_OUT, a0), [x1, y1] = p(R_OUT, a1), [x2, y2] = p(R_IN, a1), [x3, y3] = p(R_IN, a0);
    return `M${x0} ${y0}A${R_OUT * S} ${R_OUT * S} 0 ${large} 0 ${x1} ${y1}L${x2} ${y2}A${R_IN * S} ${R_IN * S} 0 ${large} 1 ${x3} ${y3}Z`;
  };
  const arcs = OFF.map(o => `<path d="${sector(angT(o.t0 + GAP / 2), angT(o.t1 - GAP / 2))}" fill="${COLORS[o.c]}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" rx="22" fill="${BG}"/>`
    + `<circle cx="${c}" cy="${c}" r="${R_TRACK * S}" fill="${TRACK}"/>${arcs}<circle cx="${c}" cy="${c}" r="${R_HOLE * S}" fill="${BG}"/></svg>\n`;
}

const out = path.join(root, "icons");
fs.mkdirSync(out, { recursive: true });
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["apple-touch-icon.png", 180]])
  fs.writeFileSync(path.join(out, name), png(size));
fs.writeFileSync(path.join(out, "icon.svg"), svg());
console.log("Ikoner skrivna till", out);
