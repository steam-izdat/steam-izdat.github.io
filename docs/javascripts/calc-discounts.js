// Планировщик скидок и кулдаунов Steam. Всё считается в браузере.
// Кулдаун 30 дней считается от точного момента (Steam оперирует временем):
// скидки/распродажи переключаются в 10:00 по тихоокеанскому времени (PT).

var IZD_EVENTS = [
  { n: "Летняя распродажа", s: "2026-06-25", e: "2026-07-09", t: "sale" },
  { n: "Фестиваль соц. дедукции", s: "2026-07-13", e: "2026-07-16", t: "fest" },
  { n: "Фестиваль поездов", s: "2026-07-20", e: "2026-07-27", t: "fest" },
  { n: "Фестиваль киберпанка", s: "2026-08-03", e: "2026-08-10", t: "fest" },
  { n: "Фестиваль кеглей и колышков", s: "2026-08-17", e: "2026-08-20", t: "fest" },
  { n: "Фестиваль выживания (PvE)", s: "2026-08-31", e: "2026-09-07", t: "fest" },
  { n: "Фестиваль программирования", s: "2026-09-10", e: "2026-09-14", t: "fest" },
  { n: "Фестиваль групповых RPG", s: "2026-09-14", e: "2026-09-21", t: "fest" },
  { n: "Осенняя распродажа", s: "2026-10-01", e: "2026-10-08", t: "sale" },
  { n: "Кулинарный фестиваль", s: "2026-10-12", e: "2026-10-19", t: "fest" },
  { n: "Steam Next Fest", s: "2026-10-19", e: "2026-10-26", t: "nextfest" },
  { n: "Steam Scream (хоррор)", s: "2026-10-26", e: "2026-11-02", t: "fest" },
  { n: "Фестиваль авто-баттлеров", s: "2026-11-16", e: "2026-11-23", t: "fest" },
  { n: "Зимняя распродажа", s: "2026-12-17", e: "2027-01-04", t: "sale" }
];
var DAY = 86400000;

function izdDate(str) { return str ? new Date(str + "T00:00:00") : null; }
function izdAddDays(d, n) { return new Date(d.getTime() + n * DAY); }
function izdFmt(d) { var p = function (x) { return (x < 10 ? "0" : "") + x; }; return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear(); }
function izdFmtS(d) { var p = function (x) { return (x < 10 ? "0" : "") + x; }; return p(d.getDate()) + "." + p(d.getMonth() + 1); }
function izdFmtDT(d) { return izdFmt(d) + " в " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }
function izdToday() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }

// абсолютный момент «10:00 PT» в день y-m-d (PT = America/Los_Angeles, учитывает PDT/PST)
function izdPtInstant(y, m, d) {
  var probe = new Date(Date.UTC(y, m, d, 18, 0));
  var name = probe.toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" });
  var off = name.indexOf("PDT") >= 0 ? 7 : 8;
  return new Date(Date.UTC(y, m, d, 10 + off, 0));
}
function izdEvStart(ev) { var p = ev.s.split("-"); return izdPtInstant(+p[0], +p[1] - 1, +p[2]); }

// 10:00 PT → местное время читателя и МСК
function izdPtNote() {
  try {
    var now = new Date();
    var utc = izdPtInstant(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    var loc = utc.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    var msk = utc.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "местное";
    return '<p class="izd-disc__time">⏰ Скидки и распродажи Steam переключаются в <b>10:00 по тихоокеанскому времени</b> — у тебя это <b>' + loc + "</b> (" + tz + "), " + msk + " по Москве. Зимой (PST) на час позже. В этот же момент — дедлайн снять скидку (opt-out) в день старта.</p>";
  } catch (e) { return ""; }
}

function izdFillTargets(root) {
  var sel = root.querySelector(".izd-disc__target");
  if (!sel || sel.dataset.filled) return;
  var today = izdToday();
  IZD_EVENTS.forEach(function (ev, i) {
    if (izdDate(ev.e) < today) return;
    var o = document.createElement("option");
    o.value = i;
    o.textContent = ev.n + " (" + izdFmtS(izdDate(ev.s)) + ")";
    sel.appendChild(o);
  });
  sel.dataset.filled = "1";
}

function izdDiscPlan(root) {
  var q = function (s) { return root.querySelector(s); };
  var lv = q(".izd-disc__last").value;
  var last = lv ? new Date(lv) : null;
  var pv = q(".izd-disc__priceinc").value;
  var priceInc = pv ? (function () { var p = pv.split("-"); return izdPtInstant(+p[0], +p[1] - 1, +p[2]); })() : null;
  var target = q(".izd-disc__target").value;
  var now = new Date();
  var futureRelease = last && last > now;

  var gates = [now.getTime()];
  if (last) gates.push(last.getTime() + 30 * DAY);
  if (priceInc) gates.push(priceInc.getTime() + 30 * DAY);
  var nextAllowed = new Date(Math.max.apply(null, gates));

  function saleBlock(es) {
    if (futureRelease && es.getTime() < last.getTime() + 30 * DAY) return "до релиза ещё +30 дней";
    if (priceInc && es.getTime() < priceInc.getTime() + 30 * DAY) return "повышение цены блокирует до " + izdFmtDT(new Date(priceInc.getTime() + 30 * DAY)) + " (без исключений)";
    return null;
  }
  function festBlock(es) { return es < nextAllowed; }
  function nextOk() {
    for (var i = 0; i < IZD_EVENTS.length; i++) {
      var e = IZD_EVENTS[i], es = izdEvStart(e);
      if (e.t === "nextfest" || izdDate(e.e) < izdToday()) continue;
      if (e.t === "sale") { if (!saleBlock(es)) return e.n + " (" + izdFmt(izdDate(e.s)) + ")"; }
      else if (!festBlock(es)) return e.n + " (" + izdFmt(izdDate(e.s)) + ")";
    }
    return null;
  }

  var head;
  if (futureRelease) head = "Релиз ещё впереди — " + izdFmt(last) + ". До него настрой <b>launch-скидку</b> (7–14 дней, ≤40%). Обычные скидки — с <b>" + izdFmtDT(nextAllowed) + "</b>.";
  else if (nextAllowed <= now) head = "Обычную скидку можно ставить <b>уже сейчас</b>.";
  else head = "Следующую скидку можно ставить с <b>" + izdFmtDT(nextAllowed) + "</b>.";

  var body = "";
  if (target !== "") {
    var ev = IZD_EVENTS[+target], es = izdEvStart(ev), sd = izdFmt(izdDate(ev.s));
    if (ev.t === "sale") {
      var b = saleBlock(es);
      body = b
        ? '<p class="izd-disc__verdict izd-disc__v--no">✗ К «' + ev.n + '» (' + sd + ') скидку нельзя: ' + b + ".</p>"
        : '<p class="izd-disc__verdict izd-disc__v--ok">✓ К «' + ev.n + '» (' + sd + ') скидку поставить можно — это распродажа, она вне кулдауна между скидками. Включи скидку, когда откроется опт-ин.</p>';
    } else if (ev.t === "nextfest") {
      body = '<p class="izd-disc__verdict izd-disc__v--mute">«' + ev.n + '» (' + sd + ") — это про демо для нерелизных игр, не про скидки.</p>";
    } else if (festBlock(es)) {
      var nx = nextOk();
      body = '<p class="izd-disc__verdict izd-disc__v--no">✗ К фесту «' + ev.n + '» (' + sd + ") скидку не успеваешь — кулдаун до " + izdFmtDT(nextAllowed) + ". Но участвовать по тегу без скидки можно." + (nx ? " Ближайшее, куда успеешь со скидкой: <b>" + nx + "</b>." : "") + "</p>";
    } else {
      body = '<p class="izd-disc__verdict izd-disc__v--ok">✓ К фесту «' + ev.n + '» (' + sd + ") скидку поставить можно. Чтобы успеть, прошлая скидка должна закончиться не позже <b>" + izdFmtDT(new Date(es.getTime() - 30 * DAY)) + "</b>.</p>";
    }
  } else {
    var rows = "", cnt = 0, today = izdToday();
    for (var i = 0; i < IZD_EVENTS.length && cnt < 5; i++) {
      var e = IZD_EVENTS[i], es2 = izdEvStart(e);
      if (izdDate(e.e) < today) continue;
      cnt++;
      var badge, cls, extra = "", dd = izdFmt(izdDate(e.s));
      if (e.t === "nextfest") { badge = "демо"; cls = "mute"; extra = " — не про скидки"; }
      else if (e.t === "sale") { var sb = saleBlock(es2); if (sb) { badge = "нельзя"; cls = "no"; extra = " — " + sb; } else { badge = "можно"; cls = "ok"; extra = " — вне кулдауна"; } }
      else if (festBlock(es2)) { badge = "кулдаун"; cls = "warn"; extra = " — по тегу без скидки"; }
      else { badge = "можно"; cls = "ok"; }
      rows += '<li><span class="izd-disc__b izd-disc__b--' + cls + '">' + badge + "</span> <b>" + e.n + "</b> (" + dd + ")" + extra + "</li>";
    }
    body = '<p class="izd-disc__sub">Ближайшие распродажи и фесты:</p><ul class="izd-disc__list">' + rows + "</ul>";
  }

  q(".izd-disc__out").innerHTML = '<p class="izd-calc__headline">' + head + "</p>" + izdPtNote() + body;
}

function izdInitDisc() {
  document.querySelectorAll('.izd-disc[data-calc="discounts"]').forEach(function (root) {
    izdFillTargets(root);
    izdDiscPlan(root);
  });
}
if (typeof document$ !== "undefined" && document$.subscribe) {
  document$.subscribe(izdInitDisc);
} else {
  document.addEventListener("DOMContentLoaded", izdInitDisc);
}
document.addEventListener("input", function (e) {
  var r = e.target.closest('.izd-disc[data-calc="discounts"]');
  if (r) izdDiscPlan(r);
});
document.addEventListener("change", function (e) {
  var r = e.target.closest('.izd-disc[data-calc="discounts"]');
  if (r) izdDiscPlan(r);
});
