@echo off
echo ==============================================
echo       Fortbildungssystem - Auto-Update
echo ==============================================

echo.
echo [1/5] Hole neueste Aenderungen von GitHub...
git pull

echo.
echo [2/5] Installiere Server-Abhaengigkeiten...
cd server
call npm install --production=false
cd ..

echo.
echo [3/5] Installiere Client-Abhaengigkeiten...
cd client
call npm install --production=false --legacy-peer-deps
cd ..

echo.
echo [4/5] Baue React Frontend (Vite)...
cd client
call npm run build
cd ..

echo.
echo [5/5] Starte Server per PM2 neu...
cd server
call pm2 restart ecosystem.config.js || call pm2 start ecosystem.config.js
cd ..

echo.
echo ==============================================
echo   Update-Skript erfolgreich abgeschlossen!
echo ==============================================
