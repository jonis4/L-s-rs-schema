// ============ Tid och datum ============
// Rena funktioner utan DOM, så att de kan testas med node --test. Kräver data.js.

const DAY = 864e5;
const toT = ([y,m,d]) => Date.UTC(y, m - 1, d);
const START = toT(YEAR.start), END = toT(YEAR.end) + DAY;
const DAYS = (END - START) / DAY;                // 365, eller 366 när läsåret innehåller 29 februari
const REF = toT(YEAR.top);                       // står rakt upp
const DPD = 2 * Math.PI / DAYS;                  // radianer per dag
const MONTHS = ["jan","feb","mar","apr","maj","jun","jul","aug","sep","okt","nov","dec"];

const wrapAngle = a => ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;   // till [−π, π)
const angT = t => -((t - REF) / DAY) * DPD;      // tiden går moturs
const centerAngle = t => angT(t + DAY / 2);
const dayAt = a => START + ((Math.floor((REF - START) / DAY - a / DPD) % DAYS + DAYS) % DAYS) * DAY;
const nDays = x => (x.t1 - x.t0) / DAY;

const today = (now = new Date()) => Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
const TODAY = today();
const todayInYear = TODAY >= START && TODAY < END;

const prep = x => ({ ...x, t0: toT(x.from), t1: toT(x.to) + DAY });
const SEG = student.map(prep), BRK = breaks.map(prep), OFF = official.map(prep);
const within = (list, t) => list.find(x => t >= x.t0 && t < x.t1);

function range(x) {
  const f = new Date(x.t0), l = new Date(x.t1 - DAY);
  const fd = f.getUTCDate(), fm = MONTHS[f.getUTCMonth()], ld = l.getUTCDate(), lm = MONTHS[l.getUTCMonth()];
  if (x.t1 - x.t0 === DAY) return `${fd} ${fm}`;
  return fm === lm ? `${fd}–${ld} ${lm}` : `${fd} ${fm} – ${ld} ${lm}`;
}
function isoWeek(t) {
  const d = new Date(t + (3 - (new Date(t).getUTCDay() + 6) % 7) * DAY);
  return Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
}
const segTitle = s => s.type === "lekt" ? `LP${s.lp} · Lektioner` : s.type === "tenta" ? `LP${s.lp} · Tenta-P` : "Omtenta-P";
const segColor = s => s.type === "omtenta" ? "var(--re)" : `var(--lp${s.lp})`;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Vad händer en viss dag, och vad kommer härnäst
function describe(t) {
  const s = within(SEG, t), b = within(BRK, t), o = within(OFF, t);
  const wd = new Date(t).getUTCDay(), weekend = wd === 0 || wd === 6;
  const r = { week: isoWeek(t), color: "var(--tertiary)", prog: null, next: null };
  if (s) {
    r.title = weekend && s.type === "lekt" ? `LP${s.lp} · Helg` : segTitle(s);
    r.color = segColor(s);
    // En läsperiods lektioner kan vara uppdelade i flera poster; räkna över hela perioden
    const parts = s.lp ? SEG.filter(x => x.type === s.type && x.lp === s.lp) : [s];
    const t0 = Math.min(...parts.map(x => x.t0)), t1 = Math.max(...parts.map(x => x.t1));
    r.prog = [(t - t0) / DAY + 1, (t1 - t0) / DAY];
  } else if (b) {
    r.title = b.name; r.prog = [(t - b.t0) / DAY + 1, nDays(b)];
  } else {
    r.title = weekend ? "Helg" : "Ingen undervisning";
  }
  if (o && o.name.startsWith("Läs")) r.lasvecka = Math.floor((t - o.t0) / (7 * DAY)) + 1;
  // Omtentor hoppas över: de flesta skriver dem inte, och de skymmer den egna tentaperioden
  const nx = SEG.find(x => x.t0 > t && x.type !== "omtenta" && !(s && x.type === s.type && x.lp === s.lp));
  if (nx) r.next = [segTitle(nx), until((nx.t0 - t) / DAY)];
  return r;
}
const until = n => n === 0 ? "idag" : n === 1 ? "imorgon"
  : n < 14 ? `om ${plural(n, "dag", "dagar")}` : `om ${plural(Math.round(n / 7), "vecka", "veckor")}`;
// Hur långt en dag ligger från idag, i dagar
function fromToday(t, from = TODAY) {
  const n = (t - from) / DAY;
  if (n === 0) return "";
  if (n === 1) return "imorgon";
  if (n === -1) return "igår";
  return n > 0 ? `om ${plural(n, "dag", "dagar")}` : `för ${plural(-n, "dag", "dagar")} sedan`;
}
