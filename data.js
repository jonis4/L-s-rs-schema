// ============ Läsårsdata ============
// Byt ut den här filen inför ett nytt läsår. Antal dagar, månader och vinklar räknas fram härifrån.

const YEAR = {
  label: "26/27",
  full: "2026/27",
  start: [2026,8,1],     // första dagen på ringen
  end: [2027,7,31],      // sista dagen på ringen
  top: [2027,1,15],      // dagen som står rakt upp (mitten av vintern)
};

// Så som en student upplever året
const student = [
  { type: "omtenta",      from: [2026,8,19],  to: [2026,8,29] },
  { type: "lekt",  lp: 1, from: [2026,8,31],  to: [2026,10,19] },
  { type: "omtenta",      from: [2026,10,20], to: [2026,10,22] },
  { type: "tenta", lp: 1, from: [2026,10,23], to: [2026,10,30] },
  { type: "lekt",  lp: 2, from: [2026,11,2],  to: [2026,12,17] },
  { type: "omtenta",      from: [2026,12,18], to: [2026,12,22] },
  { type: "lekt",  lp: 2, from: [2027,1,4],   to: [2027,1,4] },
  { type: "lekt",  lp: 2, from: [2027,1,7],   to: [2027,1,8] },
  { type: "tenta", lp: 2, from: [2027,1,11],  to: [2027,1,16] },
  { type: "lekt",  lp: 3, from: [2027,1,18],  to: [2027,3,12] },
  { type: "omtenta",      from: [2027,3,15],  to: [2027,3,17] },
  { type: "tenta", lp: 3, from: [2027,3,18],  to: [2027,3,25] },
  { type: "lekt",  lp: 4, from: [2027,3,30],  to: [2027,5,5] },
  { type: "lekt",  lp: 4, from: [2027,5,7],   to: [2027,5,25] },
  { type: "omtenta",      from: [2027,5,26],  to: [2027,5,28] },
  { type: "tenta", lp: 4, from: [2027,5,31],  to: [2027,6,5] },
];
const breaks = [
  { name: "Sommarlov",          from: [2026,8,1],   to: [2026,8,18] },
  { name: "Jullov",             from: [2026,12,23], to: [2027,1,3] },
  { name: "Trettondagen",       from: [2027,1,5],   to: [2027,1,6] },
  { name: "Påsk",               from: [2027,3,26],  to: [2027,3,29] },
  { name: "Kristi himmelsfärd", from: [2027,5,6],   to: [2027,5,6] },
  { name: "Sommarlov",          from: [2027,6,6],   to: [2027,7,31] },
];
// Officiella läsperioder (tunn ring)
const official = [
  { name: "Nolleperiod", short: "Nolleperiod",          c: "var(--nolle)", from: [2026,8,19], to: [2026,8,29] },
  { name: "Läsperiod 1", short: "Läsperiod 1 · v36–44", c: "var(--lp1)",   from: [2026,8,31], to: [2026,11,1] },
  { name: "Läsperiod 2", short: "Läsperiod 2 · v45–02", c: "var(--lp2)",   from: [2026,11,2], to: [2027,1,17] },
  { name: "Läsperiod 3", short: "Läsperiod 3 · v3–12",  c: "var(--lp3)",   from: [2027,1,18], to: [2027,3,28] },
  { name: "Läsperiod 4", short: "Läsperiod 4 · v13–22", c: "var(--lp4)",   from: [2027,3,29], to: [2027,6,6] },
];
