// временный диагностический скрипт: логирует ресурсы >= 400 через console.error
(function () {
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (e.responseStatus >= 400) console.error('[probe-bad] ' + e.name + ' -> ' + e.responseStatus);
      }
    }).observe({ type: 'resource', buffered: true });
    console.error('[probe-ready] observer installed');
  } catch (err) {
    console.error('[probe-error] ' + err.message);
  }
})();
