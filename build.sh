#!/usr/bin/env bash
# build.sh — package the extension for Chrome Web Store submission.
#
# Produces dist/ga-optout-persite-<version>.zip, where <version> is read
# from manifest.json. CWS accepts ZIP only (not CRX) — Google re-signs the
# extension server-side and serves it with their own key.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Whitelist of files that ship to end users.
# Anything not in this list — README.md, PRIVACY.md, CLAUDE.md, LICENSE,
# build.sh, icon source SVGs, .git, .claude, dist — is excluded by design.
FILES=(
  manifest.json
  background.js
  content.js
  popup.html
  popup.js
  options.html
  options.js
  null-hit-sink.txt
  icons/icon16.png
  icons/icon32.png
  icons/icon48.png
  icons/icon128.png
  icons/icon16-off.png
  icons/icon32-off.png
)

# Validate the manifest is well-formed JSON, then pull the version.
if command -v jq >/dev/null 2>&1; then
  if ! jq empty manifest.json 2>/dev/null; then
    echo "ERROR: manifest.json is not valid JSON" >&2
    exit 1
  fi
  VERSION=$(jq -r '.version' manifest.json)
else
  # Fallback for environments without jq. Manifest is hand-written
  # so a simple line scan is sufficient.
  VERSION=$(grep -E '"version"[[:space:]]*:' manifest.json | head -1 \
    | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
fi

if [ -z "${VERSION:-}" ] || [ "$VERSION" = "null" ]; then
  echo "ERROR: could not read version from manifest.json" >&2
  exit 1
fi

# Verify every file in the whitelist actually exists before zipping.
missing=0
for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "ERROR: missing file referenced by build whitelist: $f" >&2
    missing=1
  fi
done
[ "$missing" -eq 0 ] || exit 1

OUT_DIR="dist"
OUT_FILE="$OUT_DIR/ga-optout-persite-$VERSION.zip"
mkdir -p "$OUT_DIR"
rm -f "$OUT_FILE"

# -X strips extra macOS / extended-attribute metadata (cleaner ZIP, no
# __MACOSX entries when unpacked on other platforms). -q for quiet.
zip -X -q -r "$OUT_FILE" "${FILES[@]}"

size=$(wc -c < "$OUT_FILE" | tr -d ' ')
echo "Built: $OUT_FILE (${size} bytes)"
echo
echo "Contents:"
unzip -l "$OUT_FILE"
