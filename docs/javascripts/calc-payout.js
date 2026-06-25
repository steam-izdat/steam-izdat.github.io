// Калькулятор «сколько реально дойдёт до счёта». Всё считается в браузере.
function izdR2(x) { return Math.round(x * 100) / 100; }
function izdMoney(x) { return "$" + izdR2(x).toFixed(2); }
function izdPct(f) { return Math.round(f * 100) + "%"; }

function izdCalcPayout(root) {
  var q = function (s) { return root.querySelector(s); };
  var price = parseFloat(q(".izd-calc__price").value) || 0;
  var sel = q(".izd-calc__country");
  var manualWrap = q(".izd-calc__manual");
  var rate;
  if (sel.value === "manual") {
    manualWrap.hidden = false;
    rate = (parseFloat(q(".izd-calc__rate").value) || 0) / 100;
  } else {
    manualWrap.hidden = true;
    rate = (parseFloat(sel.value) || 0) / 100;
  }
  var devV = (parseFloat(q(".izd-calc__devvat").value) || 0) / 100; // НДС развитых
  var otV = (parseFloat(q(".izd-calc__ovat").value) || 0) / 100;    // НДС развивающихся
  var regF = (parseFloat(q(".izd-calc__regf").value) || 0) / 100;   // цена развивающихся, % от базовой

  function reg(net, isUS) {
    net = izdR2(net);
    var steam = izdR2(net * 0.30);
    var dev = izdR2(net * 0.70);
    var wh = isUS ? izdR2(dev * rate) : 0;
    return { net: net, steam: steam, dev: dev, wh: wh, bank: izdR2(dev - wh) };
  }
  var us = reg(price, true);
  var ad = reg(price / (1 + devV), false);
  var otPrice = izdR2(price * regF);
  var ot = reg(otPrice / (1 + otV), false);

  var wUS = parseFloat(q(".izd-calc__us").value) || 0;
  var wAD = parseFloat(q(".izd-calc__eu").value) || 0;
  var wOT = parseFloat(q(".izd-calc__ot").value) || 0;
  var tot = wUS + wAD + wOT;
  var nUS = tot ? wUS / tot : 0, nAD = tot ? wAD / tot : 0, nOT = tot ? wOT / tot : 0;
  q(".izd-calc__usv").textContent = izdPct(nUS);
  q(".izd-calc__euv").textContent = izdPct(nAD);
  q(".izd-calc__otv").textContent = izdPct(nOT);

  var blended = izdR2(nUS * us.bank + nAD * ad.bank + nOT * ot.bank);
  var refund = (parseFloat(q(".izd-calc__refund").value) || 0) / 100;
  var finalBank = izdR2(blended * (1 - refund));
  var effPct = price ? Math.round(finalBank / price * 100) : 0;

  var out = q(".izd-calc__out");
  if (!tot) {
    out.innerHTML = '<p class="izd-calc__headline">Подвигай ползунки долей продаж выше.</p>';
    return;
  }
  var devVpct = Math.round(devV * 100), otVpct = Math.round(otV * 100), regFpct = Math.round(regF * 100);
  out.innerHTML =
    '<p class="izd-calc__headline">В среднем с продажи тебе дойдёт <b>' + izdMoney(finalBank) + '</b> — ≈ ' + effPct + '% от базовой цены ' + izdMoney(price) + '.</p>' +
    '<div class="izd-calc__steps"><p class="izd-calc__stepstitle">Как посчитано:</p><ul>' +
    '<li><b>США</b> (' + izdPct(nUS) + ' продаж): ' + izdMoney(price) + ' → Valve −' + izdMoney(us.steam) + ' → твои ' + izdMoney(us.dev) +
      (us.wh > 0 ? ' → налог США ' + Math.round(rate * 100) + '% −' + izdMoney(us.wh) : ' → налог США 0%') + ' → <b>' + izdMoney(us.bank) + '</b></li>' +
    '<li><b>Развитые</b> (' + izdPct(nAD) + '): ' + izdMoney(price) + ' ÷ ' + (1 + devV).toFixed(2) + ' (НДС ~' + devVpct + '% внутри) = ' + izdMoney(ad.net) + ' → Valve −' + izdMoney(ad.steam) + ' → <b>' + izdMoney(ad.bank) + '</b></li>' +
    '<li><b>Развивающиеся</b> (' + izdPct(nOT) + '): региональная цена ' + izdMoney(otPrice) + ' (' + regFpct + '% от базовой) ÷ ' + (1 + otV).toFixed(2) + ' (НДС ~' + otVpct + '%) = ' + izdMoney(ot.net) + ' → Valve −' + izdMoney(ot.steam) + ' → <b>' + izdMoney(ot.bank) + '</b></li>' +
    '<li><b>Среднее по долям</b>: ' + nUS.toFixed(2) + '×' + izdMoney(us.bank) + ' + ' + nAD.toFixed(2) + '×' + izdMoney(ad.bank) + ' + ' + nOT.toFixed(2) + '×' + izdMoney(ot.bank) + ' = <b>' + izdMoney(blended) + '</b></li>' +
    (refund > 0 ? '<li><b>Возвраты −' + Math.round(refund * 100) + '%</b>: ' + izdMoney(blended) + ' × ' + (1 - refund).toFixed(2) + ' = <b>' + izdMoney(finalBank) + '</b></li>' : '') +
    '</ul></div>';
}

function izdInitPayout() {
  document.querySelectorAll('.izd-calc[data-calc="payout"]').forEach(izdCalcPayout);
}
if (typeof document$ !== "undefined" && document$.subscribe) {
  document$.subscribe(izdInitPayout);
} else {
  document.addEventListener("DOMContentLoaded", izdInitPayout);
}
document.addEventListener("input", function (e) {
  var r = e.target.closest('.izd-calc[data-calc="payout"]');
  if (r) izdCalcPayout(r);
});
document.addEventListener("change", function (e) {
  var r = e.target.closest('.izd-calc[data-calc="payout"]');
  if (r) izdCalcPayout(r);
});
document.addEventListener("click", function (e) {
  var b = e.target.closest(".izd-calc__preset");
  if (!b) return;
  var root = b.closest(".izd-calc");
  if (!root) return;
  root.querySelector(".izd-calc__price").value = b.getAttribute("data-price");
  root.querySelectorAll(".izd-calc__preset").forEach(function (p) { p.classList.remove("is-on"); });
  b.classList.add("is-on");
  izdCalcPayout(root);
});
