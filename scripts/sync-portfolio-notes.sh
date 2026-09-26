#!/usr/bin/env bash
# Re-copy the portfolio notes from a career checkout into public/docs/notes/.
# career (ihsan-sa/career, portfolio/v2/) is their source: the site copies them
# byte-for-byte and never edits them. After a sync, check each doc's `pages` in
# src/content.json against `pdfinfo`, since a rebuilt note can change length.
#
#   scripts/sync-portfolio-notes.sh [career-checkout]   (default ~/dev/career)
set -euo pipefail

src="${1:-$HOME/dev/career}/portfolio/v2"
dest="$(cd "$(dirname "$0")/.." && pwd)/public/docs/notes"
notes=(overview autobox hwde chip-flow lesson-builder pdf-material-builder)

for n in "${notes[@]}"; do
  [ -f "$src/$n.pdf" ] || { echo "missing $src/$n.pdf" >&2; exit 1; }
done
mkdir -p "$dest"
for n in "${notes[@]}"; do
  cp "$src/$n.pdf" "$dest/$n.pdf"
  cmp -s "$src/$n.pdf" "$dest/$n.pdf"
  echo "$n.pdf: $(pdfinfo "$dest/$n.pdf" 2>/dev/null | awk '/^Pages:/{print $2}') pages"
done
