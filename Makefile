
run-server:
	uv run mkdocs serve -a localhost:8000

build:
	uv run mkdocs build --strict

# Same as CI: includes social cards (needs `brew install cairo`).
# Calls the venv python directly because `uv run` (and /bin/sh launchers) strip DYLD_* vars on macOS.
build-ci:
	uv sync --locked -q
	CI=true DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib .venv/bin/python -m mkdocs build --strict
