"""
Генератор per-page Open Graph карточек в Steam-стиле.

Зачем: при шаринге ссылки на конкретную страницу гайда в Telegram/Discord/X
должна показываться превью-картинка с текстом ИМЕННО этой страницы (метка
раздела + заголовок + подзаголовок из первого абзаца), а не одна общая обложка.
Функционально — как богатые карточки mapi.ge/sea, но в арт-дирекшене гайда
(тёмно-синий Steam + голубой акцент + маскот + Oswald).

Как: на этапе сборки собираем по каждой не-главной странице (заголовок, метку
раздела, первый абзац) и одним запуском headless-Chromium (Playwright — он уже
стоит в пайплайне ради PDF-версии) рендерим HTML-шаблон карточки и снимаем
скриншот 1200×630 в site/<путь-страницы>/og.png. Картинка ложится РЯДОМ с
index.html страницы — тогда в шаблоне og:image = canonical_url + "og.png"
без дублирующей логики слагификации, всегда в синхроне.

Главная страница сохраняет рукодельную обложку assets/og-cover.png (это и есть
«обложка бренда»).

Отключить генерацию (быстрый локальный serve):  MKDOCS_OG_CARDS=false mkdocs serve
"""

from __future__ import annotations

import base64
import html as _html
import os
import re
import threading

# ---- собранные за сборку карточки: [{dir, title, section, subtitle}] ----------
_CARDS: list[dict] = []
_ENABLED = True
_LOGO_DATA_URI = ""  # data:image/png;base64,... — маскот, встраиваем в шаблон

_ASSETS = os.path.join(os.path.dirname(__file__), "..", "docs", "assets")


def _truthy(val: str | None, default: bool = True) -> bool:
    if val is None:
        return default
    return val.strip().lower() not in ("0", "false", "no", "off", "")


def _load_logo() -> str:
    """Маскот logo.png → data-URI (чтобы не зависеть от путей/CORS в headless)."""
    path = os.path.normpath(os.path.join(_ASSETS, "logo.png"))
    try:
        with open(path, "rb") as fh:
            b64 = base64.b64encode(fh.read()).decode("ascii")
        return f"data:image/png;base64,{b64}"
    except OSError:
        return ""


def _first_paragraph(html: str) -> str:
    """Первый СОДЕРЖАТЕЛЬНЫЙ абзац рендера → чистый инлайн-текст для подзаголовка.

    Идём по <p> подряд и возвращаем первый непустой после чистки — так абзац,
    состоящий из одного статус-штампа, не даёт пустой подзаголовок (берём следующий).
    """
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", html, re.S | re.I):
        frag = m.group(1)
        # 1) статус-штампы — ЦЕЛИКОМ вон (тег + их текст «актуально на Июнь 2026»,
        #    «⚠ санкции»): это метаданные, не проза. Прочие акценты (ink-red / hl)
        #    не трогаем — у них снимется лишь тег ниже, осмысленный текст останется.
        frag = re.sub(r'<span[^>]*class="[^"]*stamp[^"]*"[^>]*>.*?</span>', "", frag, flags=re.S | re.I)
        # 2) ведущий жирный ярлык-зачин в начале абзаца — короткий <strong>…</strong>
        #    с точкой/двоеточием на конце («Кому эта страница.», «Два пути.», «Что это.»):
        #    это мини-заголовок секции, а не тизер — берём прозу после него.
        frag = re.sub(r"^\s*<strong>[^<]{1,40}[.:]</strong>\s*", "", frag, flags=re.I)
        text = re.sub(r"<[^>]+>", "", frag)
        text = _html.unescape(text)
        text = re.sub(r"\s+", " ", text).strip()
        if text:
            return text
    return ""


def _truncate(text: str, limit: int = 150) -> str:
    if len(text) <= limit:
        return text
    cut = text[:limit].rsplit(" ", 1)[0]
    return cut.rstrip(" ,.:;—–-") + "…"


# ---------------------------------------------------------------------------
# события MkDocs
# ---------------------------------------------------------------------------
def on_config(config, **kwargs):
    global _ENABLED, _LOGO_DATA_URI
    _CARDS.clear()
    _ENABLED = _truthy(os.environ.get("MKDOCS_OG_CARDS"), default=True)
    if _ENABLED:
        _LOGO_DATA_URI = _load_logo()
    return config


def on_page_content(html, page, config, files, **kwargs):
    """Собираем данные страницы (после рендера — page.title уже проставлен)."""
    if not _ENABLED or getattr(page, "is_homepage", False):
        return html
    # приоритет front-matter title (полный, как в <title> вкладки: «Грузия — ИП,
    # банки, налоги»), иначе page.title (H1, часто короче: «Грузия»)
    meta = getattr(page, "meta", None) or {}
    title = meta.get("title") or getattr(page, "title", None)
    if not title:
        return html

    dest = page.file.dest_path.replace(os.sep, "/")
    card_dir = dest.rsplit("/", 1)[0] if "/" in dest else ""

    section = ""
    ancestors = getattr(page, "ancestors", None)
    if ancestors:
        # верхняя категория-таб (Деньги и страны / Продвижение / …)
        section = getattr(ancestors[-1], "title", "") or ""

    _CARDS.append(
        {
            "dir": card_dir,
            "title": str(title),
            "section": section,
            "subtitle": _truncate(_first_paragraph(html)),
        }
    )
    return html


def on_post_build(config, **kwargs):
    if not _ENABLED or not _CARDS:
        return
    site_dir = config["site_dir"]
    # sync-Playwright нельзя запускать внутри активного asyncio-loop (его может
    # оставить PDF-экспортёр). Рендерим в отдельном потоке — там свой чистый loop.
    err: list[BaseException] = []

    def _worker():
        try:
            _render_all(site_dir)
        except BaseException as exc:  # noqa: BLE001 — пробрасываем в основной поток
            err.append(exc)

    t = threading.Thread(target=_worker, name="og-cards")
    t.start()
    t.join()
    if err:
        raise err[0]


def _render_all(site_dir: str) -> None:
    from playwright.sync_api import sync_playwright

    made = 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1200, "height": 630})
        try:
            for card in _CARDS:
                page.set_content(_card_html(card), wait_until="networkidle")
                page.evaluate("() => document.fonts.ready")  # дождаться шрифтов
                page.evaluate(_FIT_JS)                        # ужать заголовок под бокс
                out_dir = os.path.join(site_dir, *card["dir"].split("/")) if card["dir"] else site_dir
                os.makedirs(out_dir, exist_ok=True)
                page.screenshot(
                    path=os.path.join(out_dir, "og.png"),
                    clip={"x": 0, "y": 0, "width": 1200, "height": 630},
                )
                made += 1
        finally:
            browser.close()
    print(f"[og_cards] сгенерировано карточек: {made}")


# ---------------------------------------------------------------------------
# HTML-шаблон карточки (Steam-арт-дирекшн, повторяет язык og-cover.png)
# ---------------------------------------------------------------------------
_FIT_JS = """
() => {
  const t = document.querySelector('.title');
  if (!t) return;
  let size = parseInt(getComputedStyle(t).fontSize, 10);
  // ужимаем заголовок, пока не влезет в отведённую высоту (макс ~3 строки)
  while (t.scrollHeight > 300 && size > 34) { size -= 2; t.style.fontSize = size + 'px'; }
}
"""


def _card_html(card: dict) -> str:
    esc = lambda s: _html.escape(s or "", quote=True)
    section_html = (
        f'<div class="section">{esc(card["section"])}</div>' if card["section"] else ""
    )
    subtitle_html = (
        f'<div class="subtitle">{esc(card["subtitle"])}</div>' if card["subtitle"] else ""
    )
    mascot_html = (
        f'<img class="mascot__img" src="{_LOGO_DATA_URI}" alt="">' if _LOGO_DATA_URI else ""
    )
    return f"""<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ width: 1200px; height: 630px; overflow: hidden; }}
  body {{
    display: flex; align-items: center; gap: 60px; padding: 64px 72px;
    background:
      radial-gradient(680px 520px at 18% 50%, rgba(102,192,244,0.16), transparent 62%),
      linear-gradient(135deg, #1b2838 0%, #1a2634 46%, #14202c 100%);
    font-family: "IBM Plex Sans", system-ui, sans-serif;
  }}
  .mascot {{
    flex: 0 0 auto; width: 396px; height: 396px; border-radius: 30px;
    background: radial-gradient(circle at 50% 42%, #241a3a 0%, #0e1524 78%);
    border: 1px solid rgba(102,192,244,0.22);
    box-shadow: 0 0 0 1px rgba(0,0,0,0.35), 0 22px 60px rgba(0,0,0,0.5);
    display: flex; align-items: center; justify-content: center;
  }}
  .mascot__img {{ width: 356px; height: 356px; object-fit: contain;
    filter: drop-shadow(0 0 34px rgba(126,90,224,0.45)); }}
  .text {{ flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column;
    justify-content: center; height: 100%; position: relative; padding: 40px 0 60px; }}
  .accent {{ width: 66px; height: 8px; border-radius: 2px; background: #66c0f4;
    margin-bottom: 26px; }}
  .section {{ font-size: 23px; font-weight: 600; letter-spacing: 0.16em;
    text-transform: uppercase; color: #66c0f4; margin-bottom: 16px; }}
  .title {{ font-family: "Oswald", sans-serif; font-weight: 600; font-size: 70px;
    line-height: 1.04; letter-spacing: 0.004em; color: #ffffff; }}
  .subtitle {{ font-size: 27px; line-height: 1.42; color: #9fb2c6; margin-top: 24px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden; }}
  .footer {{ position: absolute; left: 0; bottom: 8px; display: flex; align-items: center;
    gap: 14px; }}
  .footer__mark {{ font-family: "Oswald", sans-serif; font-weight: 700; font-size: 22px;
    letter-spacing: 0.04em; color: #c7d5e0; }}
  .footer__mark b {{ color: #66c0f4; font-weight: 700; }}
  .footer__url {{ font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 20px;
    color: #6f8598; }}
  .footer__sep {{ width: 6px; height: 6px; border-radius: 50%; background: #34506a; }}
</style></head>
<body>
  <div class="mascot">{mascot_html}</div>
  <div class="text">
    <div class="accent"></div>
    {section_html}
    <div class="title">{esc(card["title"])}</div>
    {subtitle_html}
    <div class="footer">
      <span class="footer__mark">STEAM<b>ИЗДАТ</b></span>
      <span class="footer__sep"></span>
      <span class="footer__url">steam-izdat.github.io</span>
    </div>
  </div>
</body></html>"""
