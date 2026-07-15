# Linux Installationsanleitung

Diese Anleitung beschreibt die Installation, Konfiguration und Ausführung des Fortbildungssystems auf einem Linux-Server (z. B. Ubuntu oder Debian).

---

## 1. Systemvoraussetzungen installieren

Aktualisieren Sie Ihre Paketlisten und installieren Sie Git, Node.js und PM2:

### Node.js (v20 oder v22) & Git installieren:
```bash
# NodeSource Repository hinzufügen (für neuere Node.js-Versionen)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Git, Node.js und Build-Essentials installieren
sudo apt-get install -y git nodejs build-essential
```

### PM2 global installieren:
```bash
sudo npm install -g pm2
```

---

## 2. Projekt klonen & einrichten

1. Klonen Sie Ihr GitHub-Repository auf den Linux-Server:
   ```bash
   git clone <Ihre-Repository-URL> /var/www/fortbildung
   cd /var/www/fortbildung
   ```

2. Installieren Sie die Server-Abhängigkeiten:
   ```bash
   cd server
   npm install
   cd ..
   ```

3. Installieren Sie die Client-Abhängigkeiten und bauen Sie das React-Frontend:
   ```bash
   cd client
   npm install --legacy-peer-deps
   npm run build
   cd ..
   ```

---

## 3. Server mit PM2 starten

Navigieren Sie in den `server/` Ordner und starten Sie die App über das bereitgestellte PM2-Ecosystem-File:
```bash
cd server
pm2 start ecosystem.config.js
```

### Autostart bei Server-Neustart aktivieren:
Damit das Fortbildungssystem nach einem Neustart des Linux-Servers automatisch wieder hochfährt, führen Sie Folgendes aus:
```bash
# Generiert das Startup-Skript für Ihr System (folgen Sie den Anweisungen auf dem Bildschirm)
pm2 startup

# Speichert die aktuelle PM2-Prozessliste
pm2 save
```

---

## 4. Updates einspielen (Linux)

Um den Server unter Linux zu aktualisieren, machen Sie das Shell-Skript ausführbar und starten es:
```bash
# Skript ausführbar machen (einmalig erforderlich)
chmod +x update.sh

# Update ausführen
./update.sh
```
Das Skript lädt den neuesten Stand von GitHub herunter, aktualisiert alle NPM-Pakete (Server/Client), führt den Vite-Produktionsbuild aus und startet den Server über PM2 neu.
