// ============ Gränssnitt ============
// Kräver data.js, time.js och storage.js.

// ============ Geometri ============
const cx = 400, cy = 400;
const pt = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ============ SVG-bygge ============
const NS = "http://www.w3.org/2000/svg", svg = document.getElementById("cal");
document.title = `Läsår ${YEAR.label}`;
svg.setAttribute("aria-label", `Cirkelkalender över läsåret ${YEAR.full}. Vinter upp, höst höger, sommar ner, vår vänster.`);
function el(parent, tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (text != null) e.textContent = text;
  parent.appendChild(e);
  return e;
}
function sectorD(r1, r2, a0, a1) {
  const large = (a0 - a1) > Math.PI ? 1 : 0;
  const [x0,y0] = pt(r2,a0), [x1,y1] = pt(r2,a1), [x2,y2] = pt(r1,a1), [x3,y3] = pt(r1,a0);
  return `M${x0} ${y0}A${r2} ${r2} 0 ${large} 0 ${x1} ${y1}L${x2} ${y2}A${r1} ${r1} 0 ${large} 1 ${x3} ${y3}Z`;
}
const NSS = { "vector-effect": "non-scaling-stroke" };
function line(g, r1, r2, a, attrs) {
  const [x1,y1] = pt(r1,a), [x2,y2] = pt(r2,a);
  return el(g, "line", { x1, y1, x2, y2, ...NSS, ...attrs });
}

// Text har fast storlek i pixlar och döljs när den inte får plats i sin yta.
// lines: [text, px, vikt, färg]
let labels = [], callouts = [];
function makeText(g, x, y, lines, fill) {
  const t = el(g, "text", { x, y, "text-anchor": "middle", "dominant-baseline": "central", fill });
  const px = lines[0][1], hs = lines.map(l => l[1] * 1.25), H = hs.reduce((a, b) => a + b, 0);
  let wpx = 0, acc = -H / 2, prev = 0;
  lines.forEach(([text, size, weight = 400, lineFill], i) => {
    const c = acc + hs[i] / 2; acc += hs[i];
    const s = el(t, "tspan", { x, "font-weight": weight, style: `font-size:${size / px}em`, dy: `${(c - prev) / size}em` }, text);
    if (lineFill) s.setAttribute("fill", lineFill);
    prev = c;
    const upper = /[A-ZÅÄÖ]/.test(text) && text === text.toUpperCase();
    // Uppskattad bredd per tecken. Versaler uppmätta med getBBox: 0,57–0,63 · storlek, så 0,65 är på säkra sidan.
    wpx = Math.max(wpx, text.length * size * (upper ? .65 : weight >= 600 ? .6 : .55));
  });
  const l = { el: t, px, wpx, hpx: H, kMax: Infinity };
  labels.push(l);
  return l;
}
function moveText(l, x, y) {
  l.el.setAttribute("x", x); l.el.setAttribute("y", y);
  l.el.querySelectorAll("tspan").forEach(s => s.setAttribute("x", x));
}
// orient: etikettens vinkel på skärmen. Dag-lägets etiketter visas alltid vid FOCUS_A.
function label(g, r, a, lines, { arc = Infinity, thick = Infinity, fill = "var(--fg)", orient = a } = {}) {
  const l = makeText(g, ...pt(r, a), lines, fill);
  const c = Math.abs(Math.cos(orient)), s = Math.abs(Math.sin(orient));
  l.kMax = Math.min(arc * .9 / (l.wpx * c + l.hpx * s), thick * .88 / (l.wpx * s + l.hpx * c));
  return l;
}
// Rubrik utanför ringen med streck in till perioden, när den inte får plats inuti
function callout(inside, a, lines, color, { r0 = THICK_OUT, isEvent = false } = {}) {
  const l = makeText(calloutG, 0, 0, lines, "var(--fg)");
  l.kMax = -1;
  l.isEvent = isEvent;
  callouts.push({ l, inside, a, color, r0, isEvent });
}

// Radier
const INNER = 183, THIN_IN = 187, THIN_OUT = 195, THICK_IN = 205, THICK_OUT = 291, THICK_MID = 248, OUTER = 342;
const R = 285, RC = 368;     // inzoomad vy centreras på R; utflyttade rubriker börjar vid RC
// I dag-läget vrids hjulet så att fokusdagen ligger här på skärmen: vågrätt, till vänster om mitten.
// Senare dagar hamnar då nedanför fokuslinjen.
const FOCUS_A = -Math.PI / 2;
const DAY_VIEW = { orient: FOCUS_A };
const CALLOUT_PX = 140;             // bredd som rubrikerna utanför ringen får när de visas
// Telefon (stående): dagarna är stora nog att sikta på, dagnumren ligger vid vänsterkanten och bandet
// beskärs åt höger. Rubriker utanför ringen får inte plats; kortet visar vad som gäller för dagen.
const narrow = () => innerWidth < 600;
const DAY_PX = 16;                  // höjd per dag vid dagnumren
const DAY_EDGE = 362;               // radien som hamnar vid skärmens vänsterkant

// Allt som vrids med hjulet. Texten vrids tillbaka i CSS (--unrot) och står alltid upprätt.
const world = el(svg, "g", { id: "world" });
const base = el(world, "g", {});
const detail = el(world, "g", {});
const detailBg = el(detail, "g", {}), detailText = el(detail, "g", {});
const leaderG = el(detail, "g", {}), calloutG = el(detail, "g", {});
const eventG = el(world, "g", {});
const overview = el(world, "g", {});
const topG = el(world, "g", {});

// Spår
el(base, "circle", { cx, cy, r: OUTER, fill: "var(--track)" });
el(base, "circle", { cx, cy, r: INNER, fill: "var(--bg)" });

// Månader
const y0 = new Date(START).getUTCFullYear(), m0 = new Date(START).getUTCMonth();
for (let i = 0; i < 12; i++) {
  const d0 = new Date(Date.UTC(y0, m0 + i, 1)), d1 = Date.UTC(y0, m0 + i + 1, 1);
  line(base, THICK_OUT, OUTER, angT(+d0), { stroke: "var(--separator)", "stroke-width": 1 });
  // Bara i årsvyn: i dag-läget hamnar namnet mitt i veckokolumnen, och kortet visar redan månaden
  label(overview, 317, (angT(+d0) + angT(d1)) / 2, [[MONTHS[d0.getUTCMonth()].toUpperCase(), 12, 600]], { fill: "var(--secondary)" });
}

// Dagar, helger och veckor (månadsvy)
let todayNum = null;
const dayLabels = [];   // dagnummer i datumordning; vald dag markeras i updateCard
for (let t = START; t < END; t += DAY) {
  const d = new Date(t), wd = d.getUTCDay(), a = angT(t), weekend = wd === 0 || wd === 6;
  if (weekend) el(detailBg, "path", { d: sectorD(330, OUTER, a, angT(t + DAY)), fill: "var(--weekend)" });
  line(detailBg, wd === 1 ? THICK_OUT : 335, OUTER, a, { stroke: "var(--separator)", "stroke-width": wd === 1 ? 1 : .75 });
  if (wd === 1) label(detailText, 302, angT(t + 3.5 * DAY), [["v" + isoWeek(t), 11, 600]], { arc: 302 * 7 * DPD, thick: 20, fill: "var(--secondary)", ...DAY_VIEW });
  const isToday = t === TODAY;
  // Helger skiljs ut av bakgrundstonen; numren behöver full läsbar kontrast
  const fit = { arc: 353 * DPD, thick: 18, fill: isToday ? "#fff" : "var(--secondary)", ...DAY_VIEW };
  if (isToday) {
    const [x, y] = pt(353, centerAngle(t));
    todayNum = { circle: el(detailText, "circle", { cx: x, cy: y, r: 9, fill: "var(--today-ink)" }) };
  }
  const l = label(detailText, 353, centerAngle(t), [[String(d.getUTCDate()), 11, isToday ? 700 : 500]], fit);
  dayLabels.push(l);
  if (isToday) todayNum.label = l;
}

// Studentringen (tjock)
for (const s of SEG) {
  const a0 = angT(s.t0), a1 = angT(s.t1), mid = (a0 + a1) / 2, d = sectorD(THICK_IN, THICK_OUT, a0, a1);
  s.g = el(base, "g", { class: "seg" });
  el(s.g, "path", { d, fill: segColor(s) });
  if (s.type === "tenta") el(s.g, "path", { d, fill: "#000", "fill-opacity": .2 });
  if (s.type !== "lekt") el(s.g, "path", { d, fill: "url(#stripes)" });
  el(s.g, "path", { d, fill: "none", stroke: "var(--track)", "stroke-width": 2, ...NSS });

  const fit = { arc: THICK_MID * nDays(s) * DPD, thick: THICK_OUT - THICK_IN, fill: "var(--on-fill)" };
  const title = s.type === "lekt" ? `LP${s.lp} · Lektioner` : s.type === "tenta" ? "Tenta-P" : "Omtenta-P";
  label(overview, THICK_MID, mid, [[s.type === "lekt" ? `LP${s.lp}` : title.replace("-P", ""), s.type === "lekt" ? 17 : 11, 700]], fit);
  const inside = label(detailText, THICK_MID, mid, [[title, 13, 700], [range(s), 11, 500]], { ...fit, ...DAY_VIEW });
  callout(inside, mid, [[segTitle(s), 12, 600], [range(s), 11, 400, "var(--secondary)"]], segColor(s));
}

// Uppehåll
for (const b of BRK) {
  const mid = (angT(b.t0) + angT(b.t1)) / 2;
  const fit = { arc: THICK_MID * nDays(b) * DPD, thick: THICK_OUT - THICK_IN, fill: "var(--secondary)" };
  label(overview, THICK_MID, mid, [[b.name, 12, 600]], fit);
  const inside = label(detailText, THICK_MID, mid, [[b.name, 13, 600], [range(b), 11, 400, "var(--secondary)"]], { ...fit, ...DAY_VIEW });
  callout(inside, mid, [[b.name, 12, 600], [range(b), 11, 400, "var(--secondary)"]], "var(--tertiary)");
}

// Officiella läsperioder (tunn)
for (const o of OFF) {
  const a0 = angT(o.t0), a1 = angT(o.t1);
  o.g = el(base, "g", { class: "seg" });
  el(o.g, "path", { d: sectorD(THIN_IN, THIN_OUT, a0, a1), fill: o.c, stroke: "var(--track)", "stroke-width": 1.5, ...NSS });
  label(detailText, 172, (a0 + a1) / 2, [[o.short, 11, 600, "var(--fg)"], [range(o), 10, 400, "var(--secondary)"]],
        { arc: 172 * nDays(o) * DPD, thick: 26, ...DAY_VIEW });
}

// Idag-status i mitten (årsvy). Byggs om när händelser ändras, eftersom nästa egna händelse visas här
let centerLabel = null;
function buildCenter() {
  if (centerLabel) { centerLabel.el.remove(); labels = labels.filter(l => l !== centerLabel); }
  lastK = NaN;
  if (!todayInYear) {
    const status = TODAY >= END ? "Läsåret är slut" : `Börjar ${until((START - TODAY) / DAY)}`;
    centerLabel = makeText(overview, cx, cy, [
      ["LÄSÅR", 11, 700, "var(--secondary)"], [YEAR.label, 34, 700], [status, 13, 600, "var(--secondary)"],
    ], "var(--fg)");
    return;
  }
  const info = describe(TODAY);
  const lines = [
    ["IDAG", 11, 700, "var(--today-ink)"],
    [`v. ${info.week}`, 34, 700],
    [info.title, 15, 600],
    [info.next ? `${info.next[0]} ${info.next[1]}` : "", 12, 400, "var(--secondary)"],
  ];
  const ev = events.filter(e => e.date >= TODAY && e.date < END).sort((a, b) => a.date - b.date)[0];
  if (ev) lines.push([`${trunc(ev.title, 18)} ${until((ev.date - TODAY) / DAY)}`, 12, 400, "var(--secondary)"]);
  centerLabel = makeText(overview, cx, cy, lines, "var(--fg)");
}

// Dagfält (dag-läget): ett tonat fält en dag högt som står still medan dagarna glider igenom
const dayField = el(topG, "path", { fill: "var(--fg)", "fill-opacity": .08 });
// Idag-markör: kontur i bakgrundsfärg så att linjen skiljer sig mot alla LP-färger.
// Linjen slutar vid bandet, så att månadsnamnet utanför inte korsas.
if (todayInYear) {
  const a = centerAngle(TODAY);
  line(topG, INNER, THICK_OUT, a, { stroke: "var(--bg)", "stroke-width": 4, "stroke-linecap": "round" });
  line(topG, INNER, THICK_OUT, a, { stroke: "var(--today)", "stroke-width": 2, "stroke-linecap": "round" });
}

// ============ Vy, zoom och rörelse ============
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
// f: fokusvinkeln på hjulet. off: hela varv som gör att vridningen går kortaste vägen (se zoomTo).
const view = { z: 0, f: todayInYear ? centerAngle(TODAY) : 0, off: 0 };
let mode = "year", K = 1, VB = [0, 0, 800, 800], rot = 0;
let lastK = NaN;   // etiketternas storlek och synlighet skrivs bara om när skalan har ändrats
const ui = { top: 64, cardTop: innerHeight - 200 };   // mäts i measureUI

// Inzoomad skala är konstant (beror bara på skärmstorlek). Telefon: en dag är DAY_PX hög vid dagnumren.
// Bredare skärmar: bredden rymmer ringen och rubrikerna utanför, höjden ett rimligt antal dagar.
const kZoom = () => narrow()
  ? 353 * DPD / DAY_PX
  : Math.max((RC - INNER + 12) / Math.max(innerWidth - CALLOUT_PX, 160), 300 / innerHeight);

function layoutCallouts(k) {
  leaderG.replaceChildren();
  lastK = NaN;
  for (const c of callouts) c.l.kMax = -1;
  if (narrow()) return;
  const out = callouts.filter(c => k > c.inside.kMax).sort((p, q) => q.a - p.a);
  // Rubrikerna visas bara i dag-läget, där de alltid har samma riktning på skärmen
  const cs = () => [Math.abs(Math.cos(FOCUS_A)), Math.abs(Math.sin(FOCUS_A))];
  const tHalf = c => { const [co, si] = cs(); return ((c.l.wpx * co + c.l.hpx * si) / 2 + 6) * k; };

  out.forEach(c => c.la = c.a);
  for (let it = 0; it < 300; it++) {
    let moved = false;
    for (let i = 0; i < out.length - 1; i++) {
      const p = out[i], q = out[i + 1];
      const need = (tHalf(p) + tHalf(q)) / RC, gap = p.la - q.la;
      if (gap < need - 1e-6) { const d = (need - gap) / 2; p.la += d; q.la -= d; moved = true; }
    }
    if (!moved) break;
  }
  for (const c of out) {
    const [co, si] = cs();
    moveText(c.l, ...pt(RC + 3 * k + (c.l.wpx * si + c.l.hpx * co) / 2 * k, c.la));
    c.l.kMax = Infinity;
    const p0 = pt(c.r0, c.a);
    // Står rubriken i samma höjd som sin dag räcker en stump; ett helt streck skulle korsa dagnumren
    const beside = Math.abs(c.la - c.a) < DPD / 2;
    el(leaderG, "polyline", { points: (beside ? [p0, pt(OUTER + 4, c.a)] : [p0, pt(OUTER + 4, c.a), pt(RC, c.la)]).join(" "), fill: "none",
                              stroke: c.isEvent ? "var(--secondary)" : "var(--tertiary)", "stroke-width": 1, "stroke-linejoin": "round", ...NSS });
    if (!c.isEvent)
      el(leaderG, "circle", { cx: p0[0], cy: p0[1], r: 3.5 * k, fill: c.color, stroke: "var(--bg)", "stroke-width": 1.5, ...NSS });
  }
}

const stripes = document.getElementById("stripes");
function render() {
  const W = innerWidth, H = innerHeight, z = view.z;
  // Årsvyn: hela ringen ryms med 12 px marginal på bredden, och i höjd som tidigare
  const k0 = Math.max(2 * OUTER / Math.max(W - 24, 100), 790 / H), k1 = kZoom();
  K = k0 * Math.pow(k1 / k0, z);

  // Hjulet vrids i takt med zoomen, så att fokusdagen hamnar vid FOCUS_A. Utzoomat är vintern uppåt.
  rot = z * (FOCUS_A - view.f + view.off);
  const deg = rot * 180 / Math.PI;
  world.setAttribute("transform", `rotate(${deg} ${cx} ${cy})`);
  world.style.setProperty("--unrot", `${-deg}deg`);

  // Kameran: fokuslinjen mitt i ytan mellan verktygsfältet och kortet. Telefonen har dagnumren vid
  // vänsterkanten; bredare skärmar centrerar bandet och rubrikerna på bredden.
  const outer = narrow() ? DAY_EDGE : RC + (CALLOUT_PX + 8) * k1;
  const inner = narrow() ? DAY_EDGE - W * k1 : INNER - 6;
  const focusY = (ui.top + ui.cardTop) / 2;
  const x = cx - (inner + outer) / 2 * z, y = cy - (focusY - H / 2) * K * z;
  VB = [x - W * K / 2, y - H * K / 2, W * K, H * K];
  svg.setAttribute("viewBox", VB.join(" "));

  const zo = clamp((view.z - .35) / .4, 0, 1);
  detail.style.opacity = zo; detail.style.display = zo > 0 ? "" : "none";
  overview.style.opacity = 1 - zo; overview.style.display = zo < 1 ? "" : "none";
  // Under drag och glid i dag-läget är K oförändrad, och då behöver ingen etikett röras
  if (K !== lastK) {
    lastK = K;
    // Texten i mitten har fast pixelstorlek; i ett stort hål (desktop) skalas den upp, högst 1,5 gånger
    const centerScale = clamp(2 * INNER / k0 / 196, 1, 1.5);
    for (const l of labels) {
      l.el.setAttribute("font-size", l.px * K * (l === centerLabel ? centerScale : 1));
      l.el.style.display = K <= l.kMax ? "" : "none";
    }
    stripes.setAttribute("patternTransform", `rotate(45) scale(${K})`);
    for (const d of eventDots) d.setAttribute("r", 2.5 * K);
    if (todayNum) {
      todayNum.circle.setAttribute("r", 8 * K);
      todayNum.circle.style.display = K <= todayNum.label.kMax ? "" : "none";
    }
  }

  dayField.setAttribute("d", sectorD(THICK_OUT, DAY_EDGE, view.f + DPD / 2, view.f - DPD / 2));
  dayField.style.opacity = zo;
  if (zo > 0) updateCard(dayAt(view.f));
}

// Zoom (z) och fokus (f) animeras var för sig i samma bildrutsloop, så att ett drag kan ta över
// fokus utan att avbryta en pågående zoom.
const ease = k => 1 - Math.pow(1 - k, 4);
const tweens = { z: null, f: null };
let frame = 0;
function tween(key, to, dur) {
  if (reduceMotion || dur <= 0) { tweens[key] = null; view[key] = to; }
  else tweens[key] = { from: view[key], to, t0: performance.now(), dur };
  if (!frame) frame = requestAnimationFrame(tick);
}
function tick(now) {
  frame = 0;
  for (const key of ["z", "f"]) {
    const tw = tweens[key];
    if (!tw) continue;
    const k = clamp((now - tw.t0) / tw.dur, 0, 1);
    view[key] = tw.from + (tw.to - tw.from) * ease(k);
    if (k === 1) tweens[key] = null;
  }
  render();
  if (tweens.z || tweens.f) frame = requestAnimationFrame(tick);
}
const stopFocus = () => { tweens.f = null; };
function animateTo(z, f, dur = 520) {
  tween("z", z, dur);
  tween("f", view.f + wrapAngle(f - view.f), dur);   // kortaste vägen
}
const snap = (dur = 320) => tween("f", centerAngle(dayAt(view.f)), dur);
// Släpp med fart: hjulet rullar ut och stannar mitt på den dag det skulle ha stannat på, i en enda
// rörelse utan ryck tillbaka. Ease-out-kurvan startar med farten 4 · sträcka / tid, så sträckan
// v · 200 ms över 800 ms börjar med samma fart som fingret hade.
const fling = v => tween("f", centerAngle(dayAt(view.f + v * 200)), 800);
const FLING_PX = .35;   // px/ms som krävs för att hjulet ska rulla vidare efter släpp

// ============ Lägen ============
const $ = id => document.getElementById(id);
function setMode(m) {
  mode = m;
  document.body.classList.toggle("month", m === "month");
  $("modeYear").setAttribute("aria-selected", m === "year");
  $("modeMonth").setAttribute("aria-selected", m === "month");
  $("card").inert = m !== "month";
  hideTip();
  if (m === "month") dismissCoach();
}
// Vridningen är z · (FOCUS_A − f + off). off sätts när zoomen börjar, så att hjulet vrids kortaste
// vägen (högst ett halvt varv). Det ändras bara utzoomat eller helt inzoomat, där ett helt varv inte syns.
const turnFor = f => wrapAngle(FOCUS_A - f) - (FOCUS_A - f);
const settled = () => view.z < .001 || view.z > .999;
function zoomTo(t) {
  const f = centerAngle(t);
  if (settled()) view.off = turnFor(view.f + wrapAngle(f - view.f));
  setMode("month"); animateTo(1, f);
}
function zoomOut() {
  if (settled()) view.off = turnFor(view.f);
  setMode("year"); animateTo(0, view.f);
}
const goToday = () => { if (todayInYear) zoomTo(TODAY); };

$("modeYear").onclick = zoomOut;
$("modeMonth").onclick = () => mode === "month" ? snap() : zoomTo(dayAt(view.f));
$("todayBtn").onclick = goToday;
$("todayBtn").hidden = !todayInYear;
document.querySelectorAll(".today-key").forEach(k => k.hidden = !todayInYear);

// ============ Infokort ============
let cardT = null, selectedDay = null;
// Vald dags nummer i fetstil och full textfärg. Idag har redan vit fetstil på röd cirkel.
function markDay(l, on) {
  l.el.setAttribute("fill", on ? "var(--fg)" : "var(--secondary)");
  l.el.firstChild.setAttribute("font-weight", on ? 700 : 500);
}
function updateCard(t) {
  if (t === cardT) return;
  cardT = t;
  if (selectedDay) markDay(selectedDay, false);
  selectedDay = t === TODAY ? null : dayLabels[(t - START) / DAY] ?? null;
  if (selectedDay) markDay(selectedDay, true);
  const info = describe(t);
  $("cDate").textContent = fmtDate(t);
  renderEventList(t);
  $("cWeek").textContent = `Vecka ${info.week}` + (info.lasvecka ? ` · läsvecka ${info.lasvecka}` : "");
  $("cTitle").textContent = info.title;
  $("cDot").style.background = info.color;
  $("cToday").hidden = t !== TODAY;
  $("cBarWrap").style.visibility = info.prog ? "visible" : "hidden";
  if (info.prog) {
    $("cBar").style.width = `${info.prog[0] / info.prog[1] * 100}%`;
    $("cBar").style.background = info.color;
  }
  $("cProg").textContent = info.prog ? `Dag ${info.prog[0]} av ${info.prog[1]}` : "";
  $("cNext").textContent = todayInYear ? fromToday(t) : "";
}

// ============ Introduktion ============
const coach = $("coach");
coach.textContent = matchMedia("(hover: hover)").matches
  ? "Klicka på kalendern för att zooma in" : "Tryck på kalendern för att zooma in";
try { if (localStorage.getItem("hjul-coach") === "1") coach.classList.add("gone"); } catch {}
function dismissCoach() {
  coach.classList.add("gone");
  try { localStorage.setItem("hjul-coach", "1"); } catch {}
}

// ============ Verktygstips (årsvy) ============
const tip = $("tip");
let hovered = null;
function hideTip() {
  tip.classList.remove("show");
  if (hovered && hovered.g) hovered.g.classList.remove("hover");
  hovered = null;
  svg.classList.remove("over-ring");
}
function hit(ev) {
  const x = VB[0] + ev.clientX * K - cx, y = VB[1] + ev.clientY * K - cy;
  const a = Math.atan2(x, -y) - rot;   // räkna bort hjulets vridning
  return { r: Math.hypot(x, y), a, t: dayAt(a) };
}
function hover(ev) {
  if (mode !== "year" || ev.pointerType === "touch") return;
  const h = hit(ev);
  svg.classList.toggle("over-ring", h.r >= INNER && h.r <= OUTER + 20);
  let item = null, title = "";
  if (h.r >= THICK_IN && h.r <= THICK_OUT) {
    item = within(SEG, h.t);
    if (item) title = segTitle(item);
    else if ((item = within(BRK, h.t))) title = item.name;
  } else if (h.r >= INNER && h.r < THICK_IN) {
    item = within(OFF, h.t);
    if (item) title = item.short;
  } else if (h.r > THICK_OUT + 30 && h.r <= OUTER + 12 && eventsOn(h.t).length) {
    const list = eventsOn(h.t);
    item = hovered && hovered.isEvent && hovered.t0 === h.t ? hovered : { isEvent: true, t0: h.t, t1: h.t + DAY };
    title = list.map(e => e.title).join(", ");
  }
  if (item !== hovered) {
    if (hovered && hovered.g) hovered.g.classList.remove("hover");
    if (item && item.g) item.g.classList.add("hover");
    hovered = item;
  }
  if (!item) { tip.classList.remove("show"); return; }
  tip.querySelector("b").textContent = title;
  tip.querySelector("span").textContent = item.isEvent ? fmtDate(item.t0) : `${range(item)} · ${plural(nDays(item), "dag", "dagar")}`;
  const w = tip.offsetWidth, hgt = tip.offsetHeight;
  const left = ev.clientX + 16 + w > innerWidth - 8 ? ev.clientX - 16 - w : ev.clientX + 16;
  const top = clamp(ev.clientY + 16, 8, innerHeight - hgt - 8);
  tip.style.transform = `translate(${left}px, ${top}px)`;
  tip.classList.add("show");
}

// ============ Pekare, hjul och tangentbord ============
let drag = null;
svg.addEventListener("pointerdown", ev => {
  if (ev.button !== 0) return;
  // Ett andra finger får inte ta över draget, och gör att släppet inte räknas som tryck
  if (!ev.isPrimary) { if (drag) drag.multi = true; return; }
  drag = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, lx: ev.clientX, ly: ev.clientY, lt: ev.timeStamp,
           moved: false, multi: false, v: 0, r: clamp(hit(ev).r, 200, 360) };
  svg.setPointerCapture(ev.pointerId);
});
svg.addEventListener("pointermove", ev => {
  if (!drag) return hover(ev);
  if (ev.pointerId !== drag.id) return;
  if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) > 6) {
    drag.moved = true;
    if (mode === "month") { stopFocus(); svg.classList.add("dragging"); }
  }
  if (drag.moved && mode === "month") {
    const mx = ev.clientX - drag.lx, my = ev.clientY - drag.ly, dt = Math.max(1, ev.timeStamp - drag.lt);
    // Bandet står lodrätt: svep uppåt snurrar hjulet så att senare dagar kommer upp till fokuslinjen
    const df = my * K / drag.r;
    view.f += df;
    drag.v = .6 * (my / dt) + .4 * drag.v;   // px/ms, så att tröskeln inte beror på skalan
    render();
  }
  drag.lx = ev.clientX; drag.ly = ev.clientY; drag.lt = ev.timeStamp;
});
function endDrag(ev, cancelled) {
  if (!drag || ev.pointerId !== drag.id) return;
  svg.classList.remove("dragging");
  const d = drag; drag = null;
  if (!d.moved && !cancelled && !d.multi) {
    const h = hit(ev);
    if (h.r < INNER) { if (mode === "month") zoomOut(); }
    else if (h.r <= OUTER + 30) zoomTo(h.t);
  } else if (mode === "month") {
    if (!reduceMotion && Math.abs(d.v) > FLING_PX && ev.timeStamp - d.lt < 80) fling(d.v * K / d.r); else snap();
  }
}
svg.addEventListener("pointerup", ev => endDrag(ev, false));
svg.addEventListener("pointercancel", ev => endDrag(ev, true));
svg.addEventListener("pointerleave", () => { if (!drag) hideTip(); });

let wheelTimer = null, pinch = 0;
svg.addEventListener("wheel", ev => {
  ev.preventDefault();
  if (ev.ctrlKey) {                       // nyp på styrplatta
    pinch += ev.deltaY;
    if (pinch < -30 && mode === "year") { pinch = 0; zoomTo(hit(ev).t); }
    else if (pinch > 30 && mode === "month") { pinch = 0; zoomOut(); }
    clearTimeout(wheelTimer); wheelTimer = setTimeout(() => pinch = 0, 200);
    return;
  }
  if (mode !== "month") return;
  stopFocus();
  const delta = Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
  view.f -= delta * (ev.deltaMode === 1 ? 16 : 1) * K / R;
  render();
  clearTimeout(wheelTimer); wheelTimer = setTimeout(() => snap(), 160);
}, { passive: false });

addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey || document.querySelector("dialog[open]") || e.target.closest?.("input, textarea")) return;
  if (e.key === "Escape") zoomOut();
  else if (e.key === "t" || e.key === "T") goToday();
  else if (mode === "month" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
    e.preventDefault();
    const step = (e.shiftKey ? 7 : 1) * (e.key === "ArrowRight" ? 1 : -1);
    animateTo(1, centerAngle(dayAt(view.f) + step * DAY), 260);
  }
});
addEventListener("resize", () => { layoutCallouts(kZoom()); measureUI(); });

// Mät hur mycket verktygsfältet och kortet täcker. Kortets händelselista räknas inte in,
// annars skulle fokuslinjen flytta sig när man bläddrar förbi en dag med händelser.
function measureUI() {
  const card = $("card"), list = $("cEvents");
  const listH = list.childElementCount ? list.offsetHeight + parseFloat(getComputedStyle(list).marginTop) : 0;
  ui.top = document.querySelector(".toolbar").getBoundingClientRect().bottom;
  ui.cardTop = innerHeight - parseFloat(getComputedStyle(card).bottom) - (card.offsetHeight - listH);
  render();
}
const uiObserver = new ResizeObserver(measureUI);
uiObserver.observe(document.querySelector(".toolbar"));
uiObserver.observe($("card"));

// ============ Händelser ============
// All läsning och skrivning av händelser går genom loadEvents och saveEvents,
// så att lagringen kan bytas (till exempel mot native-lagring) på ett ställe.
let storeLocked = false;   // trasig data som inte gick att spara undan får inte skrivas över
function loadEvents() {
  let raw, legacy = false;
  try {
    raw = localStorage.getItem(STORE);
    if (raw == null) { raw = localStorage.getItem(LEGACY_STORE); legacy = raw != null; }
  } catch { return []; }
  const { events, intact } = parseEvents(raw);
  if (!intact) {
    try { localStorage.setItem(`${STORE}-backup-${Date.now()}`, raw); } catch { storeLocked = true; }
  }
  // Flytta till det versionerade formatet. Den gamla nyckeln lämnas orörd.
  if (legacy && !storeLocked) try { localStorage.setItem(STORE, serializeEvents(events)); } catch {}
  return events;
}
// Byter bara ut listan om den gick att spara
function saveEvents(next) {
  if (storeLocked) return false;
  try { localStorage.setItem(STORE, serializeEvents(next)); } catch { return false; }
  events = next;
  return true;
}
let events = loadEvents();
const eventsOn = t => events.filter(e => e.date === t);
const EV_R = 345;             // händelsepricken ligger vid dagnumret, fri från månadsnamnen i årsvyn
let eventDots = [];

function fmtDate(t) {
  const s = new Date(t).toLocaleDateString("sv-SE", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return s[0].toUpperCase() + s.slice(1);
}
const trunc = (s, n = 26) => s.length > n ? s.slice(0, n - 1) + "…" : s;

// Prickar på hjulet + rubriker utanför ringen (månadsvy)
function drawEvents() {
  eventG.replaceChildren();
  for (const c of callouts) if (c.isEvent) c.l.el.remove();
  callouts = callouts.filter(c => !c.isEvent);
  labels = labels.filter(l => !l.isEvent);
  eventDots = [];
  const byDay = new Map();
  for (const e of events) if (e.date >= START && e.date < END) byDay.set(e.date, [...(byDay.get(e.date) || []), e]);
  for (const [t, list] of byDay) {
    const a = centerAngle(t), [x, y] = pt(EV_R, a);
    eventDots.push(el(eventG, "circle", { cx: x, cy: y, r: 2.5, fill: "var(--accent)", stroke: "var(--track)", "stroke-width": 1.5, ...NSS }));
    const text = trunc(list[0].title, 19) + (list.length > 1 ? ` +${list.length - 1}` : "");   // ryms i CALLOUT_PX
    callout({ kMax: -Infinity }, a, [[text, 12, 600]], "var(--fg)", { r0: EV_R, isEvent: true });
  }
  layoutCallouts(kZoom());
}

// Lista i infokortet
function renderEventList(t) {
  const list = $("cEvents");
  list.replaceChildren();
  for (const ev of eventsOn(t)) {
    const row = document.createElement("div");
    row.className = "ev";
    const h = document.createElement("h3");
    h.textContent = ev.title;
    const b = document.createElement("button");
    b.textContent = "Redigera";
    b.onclick = () => openSheet(t, ev);
    row.append(h, b);
    if (ev.desc) {
      const p = document.createElement("p");
      p.textContent = ev.desc;
      row.append(p);
    }
    list.append(row);
  }
}

// Ark för att skapa/redigera
const sheet = $("sheet"), fTitle = $("fTitle"), fDesc = $("fDesc"), fSave = $("fSave"), fDelete = $("fDelete"), sheetError = $("sheetError");
let editing = null, editDate = null;
function openSheet(t, ev = null) {
  editing = ev; editDate = t;
  $("sheetTitle").textContent = ev ? "Redigera händelse" : "Ny händelse";
  $("sheetDate").textContent = fmtDate(t);
  fTitle.value = ev ? ev.title : "";
  fDesc.value = ev ? ev.desc : "";
  fSave.textContent = ev ? "Spara" : "Lägg till";
  fSave.disabled = !fTitle.value.trim();
  fDelete.hidden = !ev;
  fDelete.classList.remove("confirm");
  fDelete.textContent = "Ta bort händelse";
  sheetError.hidden = true;
  sheet.showModal();
  fTitle.focus();
}
const dirty = () => fTitle.value !== (editing?.title ?? "") || fDesc.value !== (editing?.desc ?? "");
function applyEvents(next) {
  if (!saveEvents(next)) return false;
  drawEvents();
  buildCenter();
  cardT = null;
  render();
  return true;
}
function commitEvents(next) {
  const ok = applyEvents(next);
  sheetError.hidden = ok;
  return ok;
}
function saveSheet(title, desc) {
  const next = editing
    ? events.map(e => e === editing ? { ...e, title, desc } : e)
    : [...events, { id: newId(), date: editDate, title, desc }];
  return commitEvents(next);
}
fTitle.addEventListener("input", () => fSave.disabled = !fTitle.value.trim());
fDesc.addEventListener("keydown", e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) $("sheetForm").requestSubmit(); });
$("sheetForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = fTitle.value.trim(), desc = fDesc.value.trim();
  if (!title) return;
  if (saveSheet(title, desc)) sheet.close();
});
// Esc behåller det man skrivit. Utan titel blir beskrivningens första rad titel.
// Sparandet sker direkt, eftersom webbläsaren inte alltid låter oss hindra att arket stängs.
sheet.addEventListener("cancel", e => {
  if (fDelete.classList.contains("confirm")) {
    e.preventDefault();
    fDelete.classList.remove("confirm");
    fDelete.textContent = "Ta bort händelse";
    return;
  }
  if (!dirty()) return;
  const desc = fDesc.value.trim();
  const title = fTitle.value.trim() || trunc(desc.split("\n")[0].trim(), 80);
  if (title && !saveSheet(title, desc)) e.preventDefault();
});
$("fCancel").onclick = () => sheet.close();
fDelete.onclick = () => {
  if (!fDelete.classList.contains("confirm")) {
    fDelete.classList.add("confirm");
    fDelete.textContent = "Bekräfta borttagning";
    return;
  }
  if (commitEvents(events.filter(e => e !== editing))) sheet.close();
};
// Klick utanför arket stänger bara om klicket började där och inget har skrivits
let downOutside = false;
sheet.addEventListener("pointerdown", e => downOutside = e.target === sheet);
sheet.addEventListener("click", e => { if (e.target === sheet && downOutside && !dirty()) sheet.close(); });
$("addBtn").onclick = () => { snap(); openSheet(dayAt(view.f)); };

// ============ Säkerhetskopia ============
// Händelserna finns bara på enheten. Export och import är det som räddar dem vid byte av telefon eller rensad data.
const backup = $("backup"), backupStatus = $("backupStatus"), importFile = $("importFile");
$("menuBtn").onclick = () => { backupStatus.textContent = ""; backup.showModal(); };
$("backupClose").onclick = () => backup.close();
backup.addEventListener("click", e => { if (e.target === backup) backup.close(); });

$("exportBtn").onclick = async () => {
  const name = `lasar-handelser-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([serializeEvents(events, { exported: new Date().toISOString() })], name, { type: "application/json" });
  // På telefon öppnas delningsmenyn (Spara i Filer, AirDrop, mejl). Annars laddas filen ner.
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); backupStatus.textContent = plural(events.length, "händelse exporterad", "händelser exporterade"); }
    catch (err) { if (err.name !== "AbortError") backupStatus.textContent = "Kunde inte dela filen."; }
    return;
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  backupStatus.textContent = plural(events.length, "händelse exporterad", "händelser exporterade");
};
$("importBtn").onclick = () => importFile.click();
importFile.onchange = async () => {
  const f = importFile.files[0];
  importFile.value = "";
  if (!f) return;
  const { events: incoming } = parseEvents(await f.text());
  if (!incoming.length) { backupStatus.textContent = "Filen innehöll inga händelser som gick att läsa."; return; }
  const merged = mergeEvents(events, incoming);
  if (!applyEvents(merged.events)) { backupStatus.textContent = "Kunde inte spara. Webbläsaren tillåter inte lagring just nu."; return; }
  backupStatus.textContent = plural(merged.added, "händelse importerad", "händelser importerade")
    + (merged.skipped ? `, ${merged.skipped} fanns redan` : "");
};

// ============ Livscykel ============
// Dagens läge ritas in när sidan byggs. En app i bakgrunden kan leva över midnatt,
// så sidan laddas om när datumet har bytts, men aldrig mitt i en redigering.
let reloadPending = false;
function checkDate() {
  if (document.hidden || today() === TODAY) return;
  const open = document.querySelector("dialog[open]");
  if (!open) return location.reload();
  if (!reloadPending) { reloadPending = true; open.addEventListener("close", () => { reloadPending = false; checkDate(); }, { once: true }); }
}
document.addEventListener("visibilitychange", checkDate);
addEventListener("pageshow", checkDate);
setInterval(checkDate, 60e3);

// ============ Offline ============
// Inte lokalt: service workern cachar filerna, och då syns ändringar inte förrän versionen i sw.js höjs.
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js");

drawEvents();
buildCenter();
render();
