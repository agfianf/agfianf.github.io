"""MkDocs hook: lazy-load images in page content.

Adds loading="lazy" and decoding="async" to every <img> in a page's rendered Markdown that does not set loading itself. It runs on page content only (on_page_content), so the header logo and other theme images are left alone. The glightbox plugin wraps images in links afterwards and reads only src and alt, so the lightbox keeps working.
"""

import re

# An <img ...> tag; attributes are matched loosely, which is enough for the HTML that Python-Markdown emits
IMG = re.compile(r"<img\b([^>]*?)(\s*/?)>", re.IGNORECASE)
HAS_LOADING = re.compile(r"\sloading\s*=", re.IGNORECASE)
HAS_DECODING = re.compile(r"\sdecoding\s*=", re.IGNORECASE)


def _lazy(match: re.Match) -> str:
    attrs, end = match.group(1), match.group(2)
    if HAS_LOADING.search(attrs):
        return match.group(0)
    attrs += ' loading="lazy"'
    if not HAS_DECODING.search(attrs):
        attrs += ' decoding="async"'
    return f"<img{attrs}{end}>"


def on_page_content(html, page, config, files):
    return IMG.sub(_lazy, html)
