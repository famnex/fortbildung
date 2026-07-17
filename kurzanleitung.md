# Kurzanleitung: Fortbildungsverwaltung

Dieses System dient zur Verwaltung, Veröffentlichung und Buchung von Fortbildungsveranstaltungen. Es unterstützt sowohl interne Veranstaltungen mit vollständigem Teilnehmermanagement und Urkundengenerierung als auch Verweise auf externe Angebote.

---

## 1. Rollen & Berechtigungen

*   **Teilnehmer (Standard-User)**:
    *   Kann den Fortbildungskatalog durchsuchen und filtern.
    *   Kann sich zu internen Fortbildungen anmelden (inkl. Wartelisten-Funktion) oder externe Anmeldelinks aufrufen.
    *   Kann seine eigenen Anmeldungen verwalten (Stornierung).
    *   Kann Teilnahmebescheinigungen (PDF) für absolvierte Veranstaltungen herunterladen.
*   **Referent / Ersteller**:
    *   Kann neue Fortbildungen anlegen, bearbeiten, kopieren oder zurückziehen.
    *   Kann benutzerdefinierte Abfragefelder für Anmeldungen konfigurieren.
    *   Verwaltet die Teilnehmerliste seiner eigenen Angebote.
    *   Bestätigt die Teilnahme nach Durchführung der Fortbildung (schaltet Urkunden-PDFs frei).
*   **Administrator**:
    *   Besitzt alle Rechte der Referenten für alle Angebote.
    *   Verwaltet die globalen Systemeinstellungen (SSO, E-Mail-Server).
    *   Kann Benutzerkonten anlegen, bearbeiten und löschen.
    *   Sieht das System-Protokoll (Änderungs-Logs).
    *   Kann Ein-Klick-System-Updates ausführen.

---

## 2. Die zwei Veranstaltungstypen

### Typ A: Interne Fortbildung
*   **Zweck**: Fortbildungen, die über dieses Portal organisiert und durchgeführt werden.
*   **Features**:
    *   Automatische Platzvergabe mit Warteliste bei Überschreiten der Teilnehmergrenze.
    *   Benutzerdefiniertes Anmeldeformular (FormBuilder) für zusätzliche Abfragen (z.B. Essenswünsche, Vorkenntnisse).
    *   Automatische Generierung und Zusendung einer Teilnahmebescheinigung (PDF) nach Bestätigung durch den Referenten.

### Typ B: Hinweis auf externe Veranstaltung
*   **Zweck**: Bewerbung externer Kurse (z.B. von anderen Instituten).
*   **Features**:
    *   Keine Anmeldung oder Belegung über dieses System.
    *   Direkte Weiterleitung per Button zum externen Anmeldelink.
    *   Optionale Angabe von **Veranstalter/Anbieter** und **Kosten** in der Katalog-Kachel.
    *   Keine Teilnehmerbegrenzung, keine Wartelisten und keine Urkundenerstellung im System.

---

## 3. Wichtige Workflows für Referenten

### Fortbildung anlegen (Veröffentlichen vs. Entwurf)
1.  Gehen Sie auf **"Neues Angebot"**.
2.  Wählen Sie den **Veranstaltungstyp** (Intern oder Extern) aus.
3.  Füllen Sie die Felder aus.
4.  **Terminauswahl-Tipp**: Wenn Sie die Startzeit eines Termins setzen, springt das Enddatum automatisch auf denselben Tag.
5.  Speichern:
    *   **Als Entwurf speichern**: Speichert das Angebot im Status "Entwurf". **Praktisch**: Pflichtfelder müssen hierbei noch nicht ausgefüllt sein.
    *   **Veröffentlichen**: Das Angebot ist sofort für alle Teilnehmer im Katalog sichtbar und buchbar.

### Fortbildung kopieren (Vorlage nutzen)
*   In der Liste **"Meine Angebote"** finden Sie bei jedem Angebot ein **Kopieren-Symbol** (zwei überlappende Quadrate).
*   Ein Klick öffnet das Formular mit den exakten Daten des ausgewählten Angebots als Kopie. Sie müssen nur noch die Termine anpassen und speichern.

### Teilnahme bestätigen & Urkunden freischalten
1.  Nachdem Ihre Fortbildung stattgefunden hat, gehen Sie auf **"Meine Angebote"**.
2.  Klicken Sie beim entsprechenden Kurs auf **"Teilnehmer"**.
3.  Wählen Sie die anwesenden Personen über die Checkboxen aus (oder nutzen Sie "Alle auswählen").
4.  Klicken Sie auf **"Teilnahme bestätigen"**.
    *   Die Teilnehmer erhalten automatisch eine E-Mail-Benachrichtigung.
    *   Die Teilnahmebescheinigung (PDF) wird generiert und ist für die bestätigten Teilnehmer im Dashboard unter "Meine Anmeldungen" abrufbar.

---

## 4. Administration & Wartung

### Single Sign-On (SSO)
Das System kann über einen JWT-Token an Drittsysteme (wie IServ oder andere Schulportale) angebunden werden. Die Konfiguration erfolgt unter **Einstellungen -> SSO**.

### Ein-Klick-System-Update
Wenn Updates auf GitHub veröffentlicht werden, kann ein Administrator das Update mit einem Klick einspielen:
1.  Navigieren Sie zu **Einstellungen -> Update**.
2.  Klicken Sie auf **"Update jetzt ausführen"**.
3.  Das System lädt die Änderungen, installiert Abhängigkeiten, kompiliert das Frontend neu und startet den Server im Hintergrund neu. Die Benutzeroberfläche entsperrt sich nach erfolgreichem Neustart automatisch.
