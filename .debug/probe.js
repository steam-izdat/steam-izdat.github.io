// временный диагностический скрипт: логирует все ресурсы с кодом >= 400
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) {
    if (e.responseStatus >= 400) console.log('[probe-bad] ' + e.name + ' -> ' + e.responseStatus);
  }
}).observe({ type: 'resource', buffered: true });
