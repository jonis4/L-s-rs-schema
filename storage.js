// ============ Händelser: format, migrering och import ============
// Rena funktioner utan DOM, så att de kan testas med node --test.
// Själva läsningen och skrivningen mot lagringen sker i app.js (loadEvents/saveEvents).

const STORE = "lasar-handelser";          // { version, events }
const LEGACY_STORE = "hjul-handelser";    // äldre format: en ren lista
const STORE_VERSION = 1;

const newId = () => String(Date.now()) + Math.random().toString(36).slice(2, 7);

function normalizeEvent(e) {
  if (!e || typeof e !== "object" || !Number.isFinite(e.date) || typeof e.title !== "string" || !e.title.trim()) return null;
  return {
    id: typeof e.id === "string" && e.id ? e.id : newId(),
    date: e.date,
    title: e.title,
    desc: typeof e.desc === "string" ? e.desc : "",
  };
}

// Tolkar sparad eller importerad text. intact är falskt när något inte gick att läsa,
// och då ska originaltexten sparas undan innan något skrivs över.
function parseEvents(raw) {
  if (raw == null) return { events: [], intact: true };
  let data;
  try { data = JSON.parse(raw); } catch { return { events: [], intact: false }; }
  const list = Array.isArray(data) ? data
    : data && data.version === STORE_VERSION && Array.isArray(data.events) ? data.events
    : null;
  if (!list) return { events: [], intact: false };
  const events = list.map(normalizeEvent).filter(Boolean);
  return { events, intact: events.length === list.length };
}

const serializeEvents = (events, extra = {}) => JSON.stringify({ version: STORE_VERSION, ...extra, events });

// Import lägger bara till det som saknas och skriver aldrig över befintliga händelser
function mergeEvents(current, incoming) {
  const ids = new Set(current.map(e => e.id));
  const added = incoming.filter(e => !ids.has(e.id) && ids.add(e.id));
  return { events: [...current, ...added], added: added.length, skipped: incoming.length - added.length };
}
