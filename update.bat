@echo off
echo ==============================================
echo       Fortbildungssystem - Auto-Update
echo ==============================================

echo [1/2] Hole neueste Änderungen von GitHub...
git pull

echo.
echo [2/2] Installiere Backend-Abhängigkeiten...
python -m pip install -r backend/requirements.txt

echo.
echo ==============================================
echo   Update-Skript erfolgreich abgeschlossen!
echo ==============================================
