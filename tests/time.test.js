const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

const root = path.join(__dirname, "..");
// Kör skripten som webbläsaren gör: i samma globala scope, i ordning
function load(files, prelude = "") {
  const ctx = vm.createContext({});
  if (prelude) vm.runInContext(prelude, ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), ctx, { filename: f });
  return expr => vm.runInContext(expr, ctx);
}

const plain = x => JSON.parse(JSON.stringify(x));   // värden från vm-kontexten jämförs som vanlig data
const get = load(["data.js", "time.js"]);
const { toT, DAY, START, END, DAYS, isoWeek, dayAt, centerAngle, describe, range, fromToday, until } =
  get("({ toT, DAY, START, END, DAYS, isoWeek, dayAt, centerAngle, describe, range, fromToday, until })");

test("läsåret 26/27 har 365 dagar och slutar 31 juli", () => {
  assert.equal(DAYS, 365);
  assert.equal(END, toT([2027, 8, 1]));
});

test("veckonummer vid årsskiftet och skottdag", () => {
  assert.equal(isoWeek(toT([2026, 8, 31])), 36);
  assert.equal(isoWeek(toT([2026, 12, 28])), 53);
  assert.equal(isoWeek(toT([2027, 1, 1])), 53);
  assert.equal(isoWeek(toT([2027, 1, 4])), 1);
  assert.equal(isoWeek(toT([2028, 2, 29])), 9);
});

test("vinkel och dag går att räkna fram och tillbaka för varje dag", () => {
  for (let t = START; t < END; t += DAY) assert.equal(dayAt(centerAngle(t)), t);
});

test("progress räknas över hela läsperioden", () => {
  assert.deepEqual(plain(describe(toT([2026, 11, 2])).prog), [1, 68]);
  assert.deepEqual(plain(describe(toT([2027, 1, 4])).prog), [64, 68]);
  assert.deepEqual(plain(describe(toT([2027, 5, 7])).prog), [39, 57]);
  assert.deepEqual(plain(describe(toT([2026, 10, 21])).prog), [2, 3]);   // omtenta räknas för sig
});

test("härnäst hoppar över omtentor", () => {
  const r = describe(toT([2026, 9, 15]));
  assert.equal(r.title, "LP1 · Lektioner");
  assert.deepEqual(plain(r.next), ["LP1 · Tenta-P", "om 5 veckor"]);
  assert.equal(describe(toT([2026, 10, 20])).next[0], "LP1 · Tenta-P");
});

test("datumintervall", () => {
  assert.equal(range({ t0: toT([2027, 5, 6]), t1: toT([2027, 5, 7]) }), "6 maj");
  assert.equal(range({ t0: toT([2026, 10, 20]), t1: toT([2026, 10, 23]) }), "20–22 okt");
  assert.equal(range({ t0: toT([2026, 12, 23]), t1: toT([2027, 1, 4]) }), "23 dec – 3 jan");
});

test("avstånd från idag", () => {
  const from = toT([2026, 9, 15]);
  assert.equal(fromToday(from, from), "");
  assert.equal(fromToday(from + DAY, from), "imorgon");
  assert.equal(fromToday(from - DAY, from), "igår");
  assert.equal(fromToday(from + 23 * DAY, from), "om 23 dagar");
  assert.equal(fromToday(from - 14 * DAY, from), "för 14 dagar sedan");
  assert.equal(until(0), "idag");
  assert.equal(until(13), "om 13 dagar");
});

test("ett läsår med 29 februari får 366 dagar och alla dagar hittas", () => {
  const leap = load(["time.js"], `
    const YEAR = { label: "27/28", full: "2027/28", start: [2027,8,1], end: [2028,7,31], top: [2028,1,15] };
    const student = [], breaks = [], official = [];`);
  const { DAYS, START, END, DAY, dayAt, centerAngle, toT } = leap("({ DAYS, START, END, DAY, dayAt, centerAngle, toT })");
  assert.equal(DAYS, 366);
  for (let t = START; t < END; t += DAY) assert.equal(dayAt(centerAngle(t)), t);
  assert.equal(dayAt(centerAngle(toT([2028, 2, 29]))), toT([2028, 2, 29]));
});
