@echo off
REM Starter Styrkeprogresjon lokalt paa http://localhost:8000
REM Bruk: dobbeltklikk denne fila i Windows.
cd /d "%~dp0"

echo Starter Styrkeprogresjon paa http://localhost:8000
echo La dette vinduet staa aapent mens du bruker appen. Lukk det for aa stoppe.

start "" http://localhost:8000

python -m http.server 8000
if %errorlevel% neq 0 py -m http.server 8000
if %errorlevel% neq 0 (
  echo.
  echo Fant ikke Python. Installer Python fra https://www.python.org/ og proev igjen.
  pause
)
