#!/usr/bin/env bash
# Starter Styrkeprogresjon lokalt på http://localhost:8000
# Bruk: dobbeltklikk (Mac: start.command) eller kjør ./start.sh i terminalen.
cd "$(dirname "$0")" || exit 1
URL="http://localhost:8000"

echo "Starter Styrkeprogresjon på $URL"
echo "La dette vinduet stå åpent mens du bruker appen. Lukk det for å stoppe."

# Åpne nettleseren automatisk etter et lite øyeblikk.
( sleep 1; (open "$URL" || xdg-open "$URL") >/dev/null 2>&1 ) &

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server 8000
else
  echo
  echo "Fant ikke Python. Installer Python fra https://www.python.org/ og prøv igjen."
  read -r -p "Trykk Enter for å lukke..."
fi
