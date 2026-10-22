#!/usr/bin/env bash
# Redraw hive.svg (the essay's figure) and hive-thumb.svg (the front page's banner) from hive.tex.
# Needs XeLaTeX and dvisvgm (TeX Live). Each SVG carries its own subset of the fonts (WOFF2), each
# glyph placed on its own (--no-merge) so a browser's spacing never runs words together, and the
# size is rewritten in px with double quotes, the form scripts/writing.js reads.
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -r "${tmp:?}"' EXIT
xelatex -no-pdf -interaction=nonstopmode -halt-on-error -output-directory "$tmp" -jobname hive "\\def\\pgfsysdriver{pgfsys-dvisvgm.def}\\input{$here/hive.tex}" > "$tmp/log" || { tail -20 "$tmp/log"; exit 1; }
for page in 1:hive 2:hive-thumb; do
  out="$here/${page#*:}.svg"
  dvisvgm --font-format=woff2 --no-merge --precision=3 --optimize --page="${page%%:*}" --stdout "$tmp/hive.xdv" 2>/dev/null \
    | perl -0pe "s/width='([\d.]+)pt' height='([\d.]+)pt'/sprintf('width=\"%d\" height=\"%d\"', \$1*4\/3+0.5, \$2*4\/3+0.5)/e" > "$out"
  echo "$out: $(wc -c < "$out") bytes"
done
