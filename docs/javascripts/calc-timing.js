// Тайминг события в Steam по часовым поясам и пикам активности. Всё в браузере.
// Вечерние пики по регионам — оценка (Valve гео-разрез не публикует); веса по
// долям аудитории Steam (Китай ~33%, англ. ~33%, рус. ~9%, исп. — Латам).

var IZD_REGIONS = [
  { n: "Китай", tz: "Asia/Shanghai", w: 0.30, p: [19, 23] },
  { n: "Европа (Зап.)", tz: "Europe/Berlin", w: 0.18, p: [18, 22] },
  { n: "СНГ (Москва)", tz: "Europe/Moscow", w: 0.12, p: [19, 23] },
  { n: "США восток", tz: "America/New_York", w: 0.12, p: [19, 23] },
  { n: "США запад", tz: "America/Los_Angeles", w: 0.10, p: [19, 23] },
  { n: "Латам (Бразилия)", tz: "America/Sao_Paulo", w: 0.08, p: [19, 23] },
  { n: "Япония/Корея", tz: "Asia/Tokyo", w: 0.06, p: [19, 23] },
  { n: "ЮВ Азия", tz: "Asia/Bangkok", w: 0.04, p: [19, 23] }
];

function izdPad(x) { return (x < 10 ? "0" : "") + x; }
function izdLocalTime(tz, dt) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(dt);
}
function izdHourAt(tz, dt) { return parseInt(izdLocalTime(tz, dt).slice(0, 2), 10); }
function izdPeak(r, h) {
  var a = r.p[0], b = r.p[1];
  if (h >= a && h < b) return "peak";
  if (h >= a - 1 && h < b + 1) return "near";
  return "off";
}
function izdPtOff() {
  var now = new Date();
  var probe = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 18, 0));
  var name = probe.toLocaleString("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "short" });
  return { off: name.indexOf("PDT") >= 0 ? 7 : 8, lbl: name.indexOf("PDT") >= 0 ? "PDT" : "PST" };
}
// момент «сегодня, hh:mm в выбранном референсе» → абсолютный Date
function izdInstant(ref, hh, mm) {
  var t = new Date(), y = t.getUTCFullYear(), mo = t.getUTCMonth(), d = t.getUTCDate();
  if (ref === "utc") return new Date(Date.UTC(y, mo, d, hh, mm));
  if (ref === "local") { var l = new Date(); return new Date(l.getFullYear(), l.getMonth(), l.getDate(), hh, mm); }
  return new Date(Date.UTC(y, mo, d, hh + izdPtOff().off, mm)); // pt
}

function izdTiming(root) {
  var q = function (s) { return root.querySelector(s); };
  var ref = q(".izd-tm__ref").value;
  var mins = parseInt(q(".izd-tm__slider").value, 10) || 0;
  var hh = Math.floor(mins / 60), mm = mins % 60;
  var dt = izdInstant(ref, hh, mm);
  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "местное";
  var ptName = izdPtOff().lbl;
  var loc = izdLocalTime(tz, dt), pt = izdLocalTime("America/Los_Angeles", dt), utc = izdLocalTime("UTC", dt);
  var refShort = ref === "pt" ? "PT" : ref === "local" ? "местн." : "UTC";
  q(".izd-tm__val").textContent = izdPad(hh) + ":" + izdPad(mm) + " " + refShort;

  var rows = "", cov = 0, maxW = 0.30;
  IZD_REGIONS.forEach(function (r) {
    var h = izdHourAt(r.tz, dt), st = izdPeak(r, h);
    if (st === "peak") cov += r.w;
    var badge = st === "peak" ? '<span class="izd-tm__b izd-tm__b--peak">пик</span>'
      : st === "near" ? '<span class="izd-tm__b izd-tm__b--near">близко</span>'
        : '<span class="izd-tm__b izd-tm__b--off">тихо</span>';
    var bw = Math.round(r.w / maxW * 100);
    rows += '<div class="izd-tm__r' + (st === "peak" ? " is-peak" : "") + '">' +
      '<span class="izd-tm__rn">' + r.n + "</span>" +
      '<span class="izd-tm__rw"><span class="izd-tm__rwtrack"><span class="izd-tm__rwfill" style="width:' + bw + '%"></span></span><span class="izd-tm__rwval">' + Math.round(r.w * 100) + "%</span></span>" +
      '<span class="izd-tm__rt">' + izdLocalTime(r.tz, dt) + "</span>" +
      '<span class="izd-tm__rb">' + badge + "</span></div>";
  });
  var covPct = Math.round(cov * 100);
  var uh = parseInt(utc.slice(0, 2), 10);
  var sweet = (uh >= 16 && uh < 20) ? ' <span class="izd-tm__sweet">★ глобальное окно 16–20 UTC</span>' : "";

  q(".izd-tm__out").innerHTML =
    '<p class="izd-calc__headline">Событие: <b>' + utc + " UTC</b> = " + loc + " у тебя (" + tz + ") = " + pt + " " + ptName + "." + sweet + "</p>" +
    '<p class="izd-tm__sw">📋 В Steamworks (<i>Intended release date</i>) введи <b>' + loc + '</b> в своём поясе — Steam рядом покажет <b>' + pt + " " + ptName + "</b>.</p>" +
    '<div class="izd-tm__cov"><div class="izd-tm__covbar"><span style="width:' + covPct + '%"></span></div>' +
    '<p class="izd-tm__covlbl">≈ <b>' + covPct + "%</b> активной аудитории Steam в вечернем пике <small>(оценка; больше одним моментом не собрать — вечера регионов разнесены)</small></p></div>" +
    '<div class="izd-tm__regions"><div class="izd-tm__r izd-tm__rhead"><span>Регион</span><span>Доля аудитории</span><span>Местное</span><span>Актив.</span></div>' + rows + "</div>";
}

function izdInitTiming() {
  document.querySelectorAll('.izd-tm[data-calc="timing"]').forEach(izdTiming);
}
if (typeof document$ !== "undefined" && document$.subscribe) {
  document$.subscribe(izdInitTiming);
} else {
  document.addEventListener("DOMContentLoaded", izdInitTiming);
}
document.addEventListener("input", function (e) {
  var r = e.target.closest('.izd-tm[data-calc="timing"]');
  if (r) izdTiming(r);
});
document.addEventListener("change", function (e) {
  var r = e.target.closest('.izd-tm[data-calc="timing"]');
  if (r) izdTiming(r);
});
document.addEventListener("click", function (e) {
  var b = e.target.closest(".izd-tm__slot");
  if (!b) return;
  var root = b.closest(".izd-tm");
  if (!root) return;
  root.querySelector(".izd-tm__ref").value = "pt";
  root.querySelector(".izd-tm__slider").value = 600;
  izdTiming(root);
});
