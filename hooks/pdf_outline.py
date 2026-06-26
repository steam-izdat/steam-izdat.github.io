"""
MkDocs-хук: добавляет закладки (PDF outline) в сводный steam-izdat-guide.pdf.

mkdocs-exporter склеивает гайд из постраничных PDF в порядке навигации (nav), но
навигационных закладок не ставит — по 140-страничному файлу тяжело
ориентироваться. Хук после сборки проходит страницы в порядке nav, считает, с
какой страницы начинается каждая, и строит иерархическое оглавление
(Раздел → страница), повторяющее меню сайта.

Защита: если суммарное число постраничных PDF не сходится с числом страниц в
сводном файле — порядок/набор разошлись, закладки не пишем (чтобы не увести
ссылки не туда), только предупреждаем в лог.
"""

import os
import logging

from pypdf import PdfReader, PdfWriter
from mkdocs.plugins import event_priority

log = logging.getLogger("mkdocs.plugins.pdf_outline")

OUTPUT = "steam-izdat-guide.pdf"

_nav = None


def on_nav(nav, config, files):
    """Запоминаем навигацию — её порядок совпадает с порядком склейки PDF."""
    global _nav
    _nav = nav
    return nav


def _pdf_path(site_dir, dest_path):
    """Путь к постраничному PDF рядом с HTML страницы (a/b/index.html → a/b/index.pdf)."""
    if not dest_path.endswith(".html"):
        return None
    return os.path.join(site_dir, dest_path[:-5] + ".pdf")


def _in_pdf(page, site_dir):
    """Страница попала в PDF? (не помечена pdf:false и постраничный файл существует)"""
    if page is None or page.file is None:
        return None
    if (page.meta or {}).get("pdf") is False:
        return None
    path = _pdf_path(site_dir, page.file.dest_path)
    return path if path and os.path.exists(path) else None


# отрицательный приоритет → хук выполняется среди последних, уже ПОСЛЕ того,
# как mkdocs-exporter склеил сводный PDF
@event_priority(-100)
def on_post_build(config):
    site_dir = config["site_dir"]
    combined = os.path.join(site_dir, OUTPUT)

    if not _nav or not os.path.exists(combined):
        # PDF-генерация отключена (напр. MKDOCS_EXPORTER_PDF=false) — это норма,
        # не роняем --strict предупреждением
        log.info("[pdf_outline] сводный PDF не найден (PDF-генерация отключена?) — пропуск")
        return

    # стартовая страница каждой страницы — в порядке nav (= порядок склейки)
    starts = {}
    offset = 0
    for page in _nav.pages:
        path = _in_pdf(page, site_dir)
        if not path:
            continue
        starts[id(page)] = offset
        offset += len(PdfReader(path).pages)

    reader = PdfReader(combined)
    if offset != len(reader.pages):
        log.warning(
            "[pdf_outline] страницы разошлись (%d посчитано против %d в PDF) — "
            "закладки не добавлены", offset, len(reader.pages)
        )
        return

    writer = PdfWriter()
    writer.append(reader)

    def first_start(item):
        """Минимальная стартовая страница среди потомков элемента nav."""
        if getattr(item, "is_page", False):
            return starts.get(id(item))
        best = None
        for child in (item.children or []):
            s = first_start(child)
            if s is not None and (best is None or s < best):
                best = s
        return best

    def walk(items, parent=None):
        for item in items:
            if getattr(item, "is_section", False):
                start = first_start(item)
                ref = parent
                if start is not None:
                    ref = writer.add_outline_item(item.title, start, parent=parent)
                walk(item.children, ref)
            elif getattr(item, "is_page", False):
                start = starts.get(id(item))
                if start is not None:
                    writer.add_outline_item((item.title or "").strip(), start, parent=parent)

    walk(_nav.items)

    with open(combined, "wb") as fh:
        writer.write(fh)

    log.info("[pdf_outline] закладок добавлено: %d", len(starts))
