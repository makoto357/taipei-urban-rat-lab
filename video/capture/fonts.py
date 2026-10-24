"""Build small Google Fonts subsets for the characters used by the video.

Generated WOFF2 files are licensed under the SIL Open Font License. Run this
script again whenever the on-screen copy changes substantially.
"""

from pathlib import Path
import re
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
SOURCE = "".join(path.read_text(encoding="utf-8") for path in (ROOT / "src").glob("*.tsx"))
TEXT = "".join(sorted(set(SOURCE + "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")))
HEADERS = {"User-Agent": "Mozilla/5.0 Chrome/124 Safari/537.36"}

for family, weight, output in [
    ("Noto Sans TC", 700, "noto-700"),
    ("Noto Sans TC", 900, "noto-900"),
]:
    query = urllib.parse.urlencode({"family": f"{family}:wght@{weight}", "text": TEXT})
    css_url = f"https://fonts.googleapis.com/css2?{query}"
    request = urllib.request.Request(css_url, headers=HEADERS)
    css = urllib.request.urlopen(request).read().decode()
    urls = re.findall(r"url\((https://[^)]+)\)", css)
    assert len(urls) == 1, (family, weight, len(urls))
    font_request = urllib.request.Request(urls[0], headers=HEADERS)
    target = ROOT / "public" / "fonts" / f"{output}.woff2"
    target.write_bytes(urllib.request.urlopen(font_request).read())
    print(output, len(TEXT), "characters")
