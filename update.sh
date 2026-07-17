#!/bin/bash
echo "=============================================="
echo "      Fortbildungssystem - Auto-Update (Linux)"
echo "=============================================="

echo -e "\n[1/5] Hole neueste Aenderungen von GitHub..."
git pull

echo -e "\n[2/5] Installiere Server-Abhaengigkeiten..."
cd server
npm install --production=false
cd ..

echo -e "\n[3/5] Installiere Client-Abhaengigkeiten..."
cd client
npm install --production=false --legacy-peer-deps
cd ..

echo -e "\n[4/5] Baue React Frontend (Vite)..."
cd client
npm run build
cd ..

echo -e "\n[5/5] Starte Server per PM2 neu..."
cd server
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
cd ..

echo "=============================================="
echo "  Update-Skript erfolgreich abgeschlossen!"
echo "=============================================="
