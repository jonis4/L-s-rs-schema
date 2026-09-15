const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");

const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "storage.js"), "utf8"), ctx, { filename: "storage.js" });
const { parseEvents, serializeEvents, mergeEvents } = vm.runInContext("({ parseEvents, serializeEvents, mergeEvents })", ctx);

const ev = (id, title = "Labb") => ({ id, date: Date.UTC(2026, 9, 1), title, desc: "" });
const plain = x => JSON.parse(JSON.stringify(x));   // objekt från vm-kontexten jämförs som vanlig data

test("inget sparat ger tom lista utan att något behöver sparas undan", () => {
  assert.deepEqual(plain(parseEvents(null)), { events: [], intact: true });
});

test("det gamla formatet, en ren lista, läses in", () => {
  const { events, intact } = parseEvents(JSON.stringify([ev("a"), ev("b")]));
  assert.equal(intact, true);
  assert.deepEqual(plain(events), [ev("a"), ev("b")]);
});

test("det versionerade formatet läses in, och det som skrivs går att läsa tillbaka", () => {
  const raw = serializeEvents([ev("a")]);
  assert.equal(JSON.parse(raw).version, 1);
  assert.deepEqual(plain(parseEvents(raw)), { events: [ev("a")], intact: true });
});

test("trasig data markeras så att originalet sparas undan", () => {
  assert.equal(parseEvents("{inte json").intact, false);
  assert.equal(parseEvents(JSON.stringify({ version: 99, events: [] })).intact, false);
  assert.equal(parseEvents(JSON.stringify("text")).intact, false);
});

test("ogiltiga poster tas bort och markeras, giltiga behålls", () => {
  const { events, intact } = parseEvents(JSON.stringify([ev("a"), { title: "utan datum" }, null, ev("b", "  ")]));
  assert.equal(intact, false);
  assert.deepEqual(plain(events), [ev("a")]);
});

test("poster utan id eller beskrivning kompletteras", () => {
  const [e] = parseEvents(JSON.stringify([{ date: 1, title: "X" }])).events;
  assert.equal(typeof e.id, "string");
  assert.ok(e.id.length > 0);
  assert.equal(e.desc, "");
});

test("import lägger till det som saknas och skriver aldrig över", () => {
  const current = [ev("a", "Min titel")];
  const r = mergeEvents(current, [ev("a", "Annan titel"), ev("b")]);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 1);
  assert.deepEqual(plain(r.events), [ev("a", "Min titel"), ev("b")]);
});
