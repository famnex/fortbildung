# Datenbank-Dokumentation (SQLite / Sequelize)

Dieses Dokument beschreibt die Struktur der SQLite-Datenbank für das Fortbildungssystem. Die Datenbankdatei liegt unter `server/database.sqlite` und wird über Sequelize verwaltet.

## Tabellen und Modelle

### 1. `users` (User Model)
Enthält alle Benutzerdaten (lokale Benutzer, LDAP-Benutzer und JWT-Benutzer).

| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `user_id` | UUID (Primary Key) | Eindeutige ID des Benutzers |
| `email` | String (Unique) | E-Mail-Adresse des Benutzers |
| `name` | String | Vollständiger Name |
| `password_hash` | String (Null/Optional)| Bcrypt-Hash des Passworts (nur für `auth_source: "local"`) |
| `role` | String | Rolle des Benutzers (`admin` oder `user`) |
| `auth_source` | String | Quelle der Authentifizierung (`local`, `ldap` oder `jwt`) |
| `created_at` | String (ISO Date) | Erstellungszeitpunkt |
| `last_login` | String (ISO Date) | Letzter Login-Zeitpunkt |

---

### 2. `settings` (Setting Model)
Globale Systemeinstellungen (LDAP, SMTP, Schul-Informationen).

| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `id` | Integer (Primary Key) | Auto-Increment ID |
| **LDAP Settings** | | |
| `ldap_enabled` | Boolean | Aktiviert/Deaktiviert LDAP-Login |
| `ldap_server` | String | Server-Adresse |
| `ldap_port` | Integer | Server-Port |
| `ldap_use_ssl` | Boolean | Verbindungsverschlüsselung aktivieren |
| `ldap_base_dn` | String | Base DN für Benutzersuche |
| `ldap_bind_dn` | String | Bind DN für Service-Account |
| `ldap_bind_password`| String | Passwort für Service-Account |
| `ldap_group_filter` | String | Gruppen-Filter |
| `ldap_user_attr` | String | Benutzer-Attribut (z. B. `sAMAccountName`) |
| `ldap_mail_attr` | String | E-Mail-Attribut (z. B. `mail`) |
| `ldap_display_attr` | String | Anzeigename-Attribut (z. B. `displayName`) |
| `ldap_upn_suffix` | String | UPN-Suffix |
| **SMTP Settings** | | |
| `smtp_enabled` | Boolean | Aktiviert/Deaktiviert E-Mail-Versand |
| `smtp_server` | String | SMTP-Serveradresse |
| `smtp_port` | Integer | SMTP-Port |
| `smtp_username` | String | SMTP-Benutzername |
| `smtp_password` | String | SMTP-Passwort |
| `smtp_from_email` | String | Absender-E-Mail |
| `smtp_from_name` | String | Absender-Name |
| `smtp_use_tls` | Boolean | TLS erzwingen |
| **JWT SSO Settings** | | |
| `jwt_sso_enabled` | Boolean | Aktiviert/Deaktiviert Single Sign-On via JWT |
| `jwt_sso_secret` | String | Secret/Schlüssel zur Signaturvalidierung |
| `jwt_sso_url` | String | Redirect-URL zur Anmeldung am Identity Provider |
| **School Info** | | |
| `school_name` | String | Name der Schule |
| `school_logo_base64`| Text | Schul-Logo als Base64-String |

---

### 3. `trainings` (Training Model)
Fortbildungsangebote.

| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `training_id` | UUID (Primary Key) | Eindeutige ID |
| `title` | String | Titel der Fortbildung |
| `description` | Text | Beschreibung |
| `requirements` | Text | Voraussetzungen |
| `materials` | Text | Benötigte Materialien |
| `location` | String | Veranstaltungsort |
| `dates` | Text (JSON-String) | Liste von Terminen (start_datetime, end_datetime) |
| `max_participants` | Integer (Nullable) | Maximale Teilnehmeranzahl (optional für externe) |
| `registration_deadline`| String (ISO Date / Nullable)| Anmeldefrist (optional für externe) |
| `type` | String | Art der Fortbildung (`internal` oder `external`) |
| `external_link` | String (Nullable) | Anmelde-Link (nur für `type: "external"`) |
| `external_provider` | String (Nullable) | Custom Anbietername (nur für `type: "external"`) |
| `costs` | String (Nullable) | Kursgebühren / Kosten (nur für `type: "external"`) |
| `created_by` | String | ID des Erstellers |
| `created_by_name` | String | Name des Erstellers |
| `status` | String | Status (`draft` oder `published`) |
| `form_fields` | Text (JSON-String) | Benutzerdefinierte Formularfelder |
| `created_at` | String (ISO Date)| Erstellungszeitpunkt |
| `updated_at` | String (ISO Date)| Letztes Update |

---

### 4. `registrations` (Registration Model)
Anmeldungen zu Fortbildungen.

| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `registration_id` | UUID (Primary Key) | Eindeutige ID |
| `training_id` | String | ID der Fortbildung |
| `user_id` | String | ID des Benutzers |
| `user_name` | String | Name des angemeldeten Benutzers |
| `user_email` | String | E-Mail-Adresse des angemeldeten Benutzers |
| `status` | String | Status (`registered`, `waitlist`, `cancelled`) |
| `form_responses` | Text (JSON-String) | Antworten auf benutzerdefinierte Formularfelder |
| `registered_at` | String (ISO Date)| Anmeldezeitpunkt |
| `cancelled_at` | String (ISO Date)| Stornierungszeitpunkt |

---

### 5. `participations` (Participation Model)
Teilnahmebestätigungen.

| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `participation_id` | UUID (Primary Key) | Eindeutige ID |
| `training_id` | String | ID der Fortbildung |
| `user_id` | String | ID des Benutzers |
| `user_name` | String | Name des Teilnehmers |
| `confirmed` | Boolean | Teilnahme bestätigt |
| `certificate_generated`| Boolean | Zertifikat generiert |
| `confirmed_at` | String (ISO Date)| Bestätigungszeitpunkt |

---

### 6. `change_logs` (ChangeLog Model)
Verlauf von Änderungen an Fortbildungen.

| Spalte | Typ | Beschreibung |
| :--- | :--- | :--- |
| `log_id` | UUID (Primary Key) | Eindeutige ID |
| `training_id` | String | ID der Fortbildung |
| `user_id` | String | ID des Verursachers |
| `user_name` | String | Name des Verursachers |
| `action` | String | Durchgeführte Aktion |
| `changes` | Text (JSON-String) | Geänderte Felder |
| `created_at` | String (ISO Date)| Protokollzeitpunkt |

---

## Versions-Historie & Migrationen

### Update 2026-07-17
* **JWT SSO Redirect URL**: Spalte `jwt_sso_url` (Typ: `TEXT`) zur Tabelle `settings` hinzugefügt. Wird beim Serverstart automatisch über eine rohe SQL-Query angelegt, falls noch nicht vorhanden (`ALTER TABLE settings ADD COLUMN jwt_sso_url TEXT;`).
* **Veranstaltungstypen (Interne/Externe)**: Spalten `type` (Typ: `TEXT DEFAULT 'internal'`), `external_link` (Typ: `TEXT DEFAULT ''`), `external_provider` (Typ: `TEXT DEFAULT ''`) und `costs` (Typ: `TEXT DEFAULT ''`) zur Tabelle `trainings` hinzugefügt. Wird beim Serverstart automatisch angelegt. Spalten `description`, `location`, `max_participants` und `registration_deadline` wurden auf optional gesetzt.



### Update 2026-07-15
* **Migration auf SQLite & Sequelize (Node.js)**: Die Datenbank wurde vollständig von MongoDB auf eine relationale SQLite-Struktur umgestellt.
* **JSON-Serialisierung**: Komplexe Felder (wie `dates`, `form_fields`, `form_responses` und `changes`) werden in SQLite als serialisierte JSON-Strings (`TEXT`) abgelegt und im Sequelize-Modell über Getter/Setter automatisch konvertiert.
