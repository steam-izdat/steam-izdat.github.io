---
title: "Сколько реально дойдёт до счёта"
hide:
  - toc
---

# 💵 Сколько реально дойдёт до счёта

Укажи цену, своё налоговое резидентство и примерную долю продаж по группам рынков — калькулятор покажет, сколько в **среднем** дойдёт до счёта с одной продажи (после доли Valve, НДС и налога США), и распишет, как он это посчитал.

<div class="cl cl-warn" markdown>

🧪 **Калькулятор в бете.** Логика свежая — возможны ошибки и упрощения. Бери результат как ориентир, а не как точную бухгалтерию. Нашёл ошибку или недочёт — напиши в [чат STEAMиздат](https://t.me/+qWcZc4g1arRhMGY6), поправим.

</div>

<div class="izd-calc" data-calc="payout">
<div class="izd-calc__controls">
<label>Цена игры (база, США), $<br><input type="number" class="izd-calc__price" value="9.99" min="0" step="0.01"></label>
<label>Налоговое резидентство <small class="izd-calc__hint">(где платишь налоги — обычно где живёшь, не гражданство)</small><br>
<select class="izd-calc__country">
<option value="30">Россия — 30%</option>
<option value="10">Казахстан — 10%</option>
<option value="10">Украина — 10%</option>
<option value="0">Армения — 0%</option>
<option value="0">Грузия — 0%</option>
<option value="0">Узбекистан — 0%</option>
<option value="0">Азербайджан — 0%</option>
<option value="0">Киргизия — 0%</option>
<option value="0">Таджикистан — 0%</option>
<option value="0">Беларусь — 0%</option>
<option value="manual">Другая (ввести ставку)</option>
</select></label>
<label class="izd-calc__manual" hidden>Ставка налога США, %<br><input type="number" class="izd-calc__rate" value="0" min="0" max="30" step="1"></label>
</div>
<div class="izd-calc__presets">
<span class="izd-calc__presetlbl">Быстрый выбор цены:</span>
<button type="button" class="izd-calc__preset" data-price="4.99">$4.99</button>
<button type="button" class="izd-calc__preset" data-price="7.99">$7.99</button>
<button type="button" class="izd-calc__preset is-on" data-price="9.99">$9.99</button>
<button type="button" class="izd-calc__preset" data-price="14.99">$14.99</button>
<button type="button" class="izd-calc__preset" data-price="19.99">$19.99</button>
<button type="button" class="izd-calc__preset" data-price="24.99">$24.99</button>
</div>
<div class="izd-calc__mix">
<p class="izd-calc__mixtitle">Откуда твои покупатели — примерная доля продаж:</p>
<label><span class="izd-calc__mixname">США</span><input type="range" class="izd-calc__us" min="0" max="100" step="5" value="30"><span class="izd-calc__usv">30%</span></label>
<label><span class="izd-calc__mixname">Развитые</span><input type="range" class="izd-calc__eu" min="0" max="100" step="5" value="40"><span class="izd-calc__euv">40%</span></label>
<span class="izd-calc__mixex">ЕС, Великобритания, Канада, Австралия, Япония</span>
<label><span class="izd-calc__mixname">Развивающиеся</span><input type="range" class="izd-calc__ot" min="0" max="100" step="5" value="30"><span class="izd-calc__otv">30%</span></label>
<span class="izd-calc__mixex">СНГ, Латинская Америка, Юго-Восточная Азия, Турция</span>
</div>
<details class="izd-faq izd-calc__adv">
<summary>Тонкая настройка: НДС и региональные цены</summary>
<div class="izd-calc__advbody">
<label>Процент возвратов, %<br><input type="number" class="izd-calc__refund" value="10" min="0" max="50" step="1"></label>
<label>НДС в развитых, %<br><input type="number" class="izd-calc__devvat" value="18" min="0" max="30" step="1"></label>
<label>Цена в развивающихся, % от базовой<br><input type="number" class="izd-calc__regf" value="55" min="0" max="100" step="5"></label>
<label>НДС в развивающихся, %<br><input type="number" class="izd-calc__ovat" value="10" min="0" max="30" step="1"></label>
</div>
</details>
<div class="izd-calc__out"></div>
</div>

<details class="izd-faq" markdown>
<summary>Что такое «налоговое резидентство» и какую страну выбрать?</summary>

Это страна, в которой ты по закону платишь налоги со своего дохода — **не гражданство**. Обычно её определяют так:

- где ты живёшь **больше 183 дней в году**, и/или
- где зарегистрированы твои **ИП или компания**, через которые принимаешь выплаты.

Как выбрать в калькуляторе:

- Живёшь в РФ и никуда не переезжал → **Россия**.
- Переехал и оформил ИП в Армении / Грузии / Казахстане / Узбекистане и т.д. → выбирай **эту страну** (от неё и зависит ставка налога США).
- Гражданство и страна твоего банка тут не важны — важно, где ты налоговый резидент.

Подробно про правило 183 дней и смену резидентства — в разделе [«Релокация и нерезидентство»](../03-other-countries/index.md).

</details>

<div class="cl cl-note" markdown>

**Как это считается и что учесть:**

- **Термины Steam.** Полная сумма покупки (с НДС, до возвратов и доли Valve) в финотчётах Steamworks называется **gross**; после вычета НДС и возвратов — **net**, с него Valve берёт свою долю; твоя итоговая сумма — строка **Revenue Share / Total**. Калькулятор идёт по этой же цепочке.
- **Доля Valve — 30%** (для накопленного оборота игры до $10M; дальше 25% и 20%).
- **Налог США (withholding)** бьёт **только по продажам в США** и зависит от твоего резидентства: 0% по договору США–СССР (Армения, Грузия, Узбекистан и др.), 10% (Казахстан, Украина), 30% (Россия). Откуда ставки и как указать TIN — [в разделе «Старт»](../01-start/index.md).
- **Три группы рынков:**
    - **США** — платят базовую цену, НДС в цене нет (sales tax идёт сверху); здесь же налог США.
    - **Развитые** (ЕС, Великобритания, Канада, Австралия, Япония) — платят примерно базовую цену в своей валюте, НДС/GST внутри (по умолчанию 18% — в основном вес ЕС; подкрути в «тонкой настройке»).
    - **Развивающиеся** (СНГ, Латинская Америка, ЮВ Азия, Турция) — Steam-цена обычно ниже (по умолчанию 55% от базовой, ориентир «на 40–70% дешевле США»), НДС варьируется (по умолчанию 10%). Без этого калькулятор завышал бы выплату с дешёвых рынков.
- **Доля продаж по регионам** — прикидка для усреднения; своё реальное распределение смотри в финотчётах Steamworks.
- **Возвраты** учтены — по умолчанию 10% (средний ориентир по Steam), крутится в «тонкой настройке»: с возвращённых покупок ты денег не получаешь, поэтому они уменьшают итог.
- Это сумма **до подоходного налога в твоей стране** — его ты платишь сам.

Точные НДС и региональные цены крутятся в «тонкой настройке» под ползунками. Про корзины цен — в разделе [«Цены, скидки, финансы»](../05-pricing/index.md).

</div>
