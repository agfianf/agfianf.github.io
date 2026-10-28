"""Copy icons from the free Hugeicons set (MIT) into overrides/.icons/hugeicons/ so Material can use them.

Usage: uv run python scripts/hugeicons.py ArrowLeft02 Github01 ...

Names are the package's PascalCase names without the "Icon" suffix (browse them at https://hugeicons.com/icons). Each one is written as kebab-case, so ArrowLeft02 becomes overrides/.icons/hugeicons/arrow-left-02.svg and is used as "hugeicons/arrow-left-02" in mkdocs.yml or ":hugeicons-arrow-left-02:" in Markdown. The icon data is read as text and never executed.
"""

import io
import json
import re
import sys
import tarfile
import urllib.request
from pathlib import Path

PACKAGE = "@hugeicons/core-free-icons"
OUT = Path(__file__).resolve().parent.parent / "overrides" / ".icons" / "hugeicons"

ELEMENT = re.compile(r'\[\s*"(\w+)"\s*,\s*\{(.*?)\}\s*\]', re.S)
ATTRIBUTE = re.compile(r'(\w+)\s*:\s*"([^"]*)"')


def kebab(name: str) -> str:
    name = re.sub(r"(?<=[a-z])(?=[A-Z0-9])|(?<=[0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])", "-", name)
    return name.lower()


def to_svg(source: str) -> str:
    parts = []
    for tag, body in ELEMENT.findall(source):
        attrs = {kebab(key): value for key, value in ATTRIBUTE.findall(body) if key != "key"}
        # Material fills icon <svg> elements with currentColor, so stroke-only shapes need an explicit fill="none"
        attrs.setdefault("fill", "none")
        parts.append(f"<{tag} " + " ".join(f'{key}="{value}"' for key, value in attrs.items()) + "/>")
    if not parts:
        raise ValueError("no SVG elements found")
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">' + "".join(parts) + "</svg>\n"


def main(names: list[str]) -> None:
    if not names:
        sys.exit(__doc__)
    with urllib.request.urlopen(f"https://registry.npmjs.org/{PACKAGE}/latest") as response:
        meta = json.load(response)
    with urllib.request.urlopen(meta["dist"]["tarball"]) as response:
        archive = tarfile.open(fileobj=io.BytesIO(response.read()), mode="r:gz")
    OUT.mkdir(parents=True, exist_ok=True)
    licence = archive.extractfile("package/LICENSE.md")
    if licence:
        (OUT / "LICENSE.md").write_bytes(licence.read())
    for name in names:
        try:
            member = archive.extractfile(f"package/dist/esm/{name}Icon.js")
        except KeyError:
            print(f"skip {name}: not in {PACKAGE} {meta['version']}")
            continue
        target = OUT / f"{kebab(name)}.svg"
        target.write_text(to_svg(member.read().decode()))
        print(f"{name} -> {target.relative_to(OUT.parent.parent.parent)}")


if __name__ == "__main__":
    main(sys.argv[1:])
