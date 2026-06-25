// Шеринг: копирование ссылки + плавающий док.
// Делегирование на document — переживает мгновенные переходы (navigation.instant).

function izdCopy(btn) {
  var url = btn.getAttribute("data-url") || window.location.href;
  var done = function () {
    btn.classList.add("is-copied");
    setTimeout(function () { btn.classList.remove("is-copied"); }, 1600);
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done, done);
  } else {
    var ta = document.createElement("textarea");
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (err) {}
    document.body.removeChild(ta);
    done();
  }
}

document.addEventListener("click", function (e) {
  // 1) тоггл плавающего дока
  var toggle = e.target.closest(".izd-sharedock__toggle");
  if (toggle) {
    e.preventDefault();
    var dock = toggle.closest(".izd-sharedock");
    var url = dock.getAttribute("data-url") || window.location.href;
    // на сенсорных устройствах с нативным share — открываем системное меню
    if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
      navigator.share({ title: document.title, url: url }).catch(function () {});
      return;
    }
    var open = dock.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    return;
  }

  // 2) кнопка «скопировать ссылку» (и в баре, и в доке)
  var copyBtn = e.target.closest(".izd-share__btn--copy");
  if (copyBtn) {
    e.preventDefault();
    izdCopy(copyBtn);
    return;
  }

  // 3) клик вне открытого дока — закрыть
  var openDock = document.querySelector(".izd-sharedock.is-open");
  if (openDock && !e.target.closest(".izd-sharedock")) {
    openDock.classList.remove("is-open");
    var t = openDock.querySelector(".izd-sharedock__toggle");
    if (t) t.setAttribute("aria-expanded", "false");
  }
});
