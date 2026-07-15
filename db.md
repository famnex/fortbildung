# Datenbank-Dokumentation (MongoDB)

Dieses Dokument beschreibt die Struktur der MongoDB-Datenbank für das Fortbildungssystem.

## Collections

### 1. `users`
Enthält alle Benutzerdaten (lokale Benutzer, LDAP-Benutzer und JWT-Benutzer).

| Feld | Typ | Beschreibung |
| :--- | :--- | :--- |
| `user_id` | String (UUID) | Eindeutige ID des Benutzers |
| `email` | String | E-Mail-Adresse des Benutzers |
| `name` | String | Vollständiger Name |
| `password_hash` | String (Optional) | Bcrypt-Hash des Passworts (nur für `auth_source: "local"`) |
| `role` | String | Rolle des Benutzers (`admin` oder `user`) |
| `auth_source` | String | Quelle der Authentifizierung (`local`, `ldap` oder `jwt`) |
| `created_at` | String (ISO Date) | Erstellungszeitpunkt |
| `last_login` | String (ISO Date) | Letzter Login-Zeitpunkt |

---

### 2. `settings`
Globale Systemeinstellungen (LDAP, SMTP, Schul-Informationen).

| Feld | Typ | Beschreibung |
| :--- | :--- | :--- |
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
| **School Info** | | |
| `school_name` | String | Name der Schule |
| `school_logo_base64`| String | Schul-Logo als Base64-String |


---

### 3. `trainings`
Fortbildungsangebote.

| Feld | Typ | Beschreibung |
| :--- | :--- | :--- |
| `training_id` | String (UUID) | Eindeutige ID |
| `title` | String | Titel der Fortbildung |
| `description` | String | Beschreibung |
| `requirements` | String | Voraussetzungen |
| `materials` | String | Benötigte Materialien |
| `location` | String | Veranstaltungsort |
| `dates` | Array (Object) | Liste von Terminen (start_datetime, end_datetime) |
| `max_participants` | Integer | Maximale Teilnehmeranzahl |
| `registration_deadline`| String (ISO Date)| Anmeldefrist |
| `created_by` | String (UUID) | ID des Erstellers |
| `created_by_name` | String | Name des Erstellers |
| `status` | String | Status (`draft` oder `published`) |
| `form_fields` | Array (Object) | Benutzerdefinierte Formularfelder |
| `created_at` | String (ISO Date)| Erstellungszeitpunkt |
| `updated_at` | String (ISO Date)| Letztes Update |
| `current_participants`| Integer | Aktuelle Teilnehmeranzahl |

---

### 4. `registrations`
Anmeldungen zu Fortbildungen.

| Feld | Typ | Beschreibung |
| :--- | :--- | :--- |
| `registration_id` | String (UUID) | Eindeutige ID |
| `training_id` | String (UUID) | ID der Fortbildung |
| `user_id` | String (UUID) | ID des Benutzers |
| `user_name` | String | Name des angemeldeten Benutzers |
| `user_email` | String | E-Mail-Adresse des angemeldeten Benutzers |
| `status` | String | Status (`registered`, `waitlist`, `cancelled`) |
| `form_responses` | Dict | Antworten auf benutzerdefinierte Formularfelder |
| `registered_at` | String (ISO Date)| Anmeldezeitpunkt |
| `cancelled_at` | String (ISO Date)| Stornierungszeitpunkt |

---

### 5. `participations`
Teilnahmebestätigungen.

| Feld | Typ | Beschreibung |
| :--- | :--- | :--- |
| `participation_id` | String (UUID) | Eindeutige ID |
| `training_id` | String (UUID) | ID der Fortbildung |
| `user_id` | String (UUID) | ID des Benutzers |
| `user_name` | String | Name des Teilnehmers |
| `confirmed` | Boolean | Teilnahme bestätigt |
| `certificate_generated`| Boolean | Zertifikat generiert |
| `confirmed_at` | String (ISO Date)| Bestätigungszeitpunkt |

---

### 6. `change_logs`
Verlauf von Änderungen an Fortbildungen.

| Feld | Typ | Beschreibung |
| :--- | :--- | :--- |
| `log_id` | String (UUID) | Eindeutige ID |
| `training_id` | String (UUID) | ID der Fortbildung |
| `user_id` | String (UUID) | ID des Verursachers |
| `user_name` | String | Name des Verursachers |
| `action` | String | Durchgeführte Aktion |
| `changes` | Dict | Geänderte Felder |
| `created_at` | String (ISO Date)| Protokollzeitpunkt |

---

## Versions-Historie & Migrationen

### Update 2026-07-15
* **Collection `users`**: Das Feld `auth_source` unterstützt nun zusätzlich den Wert `"jwt"`, um Benutzer zu kennzeichnen, die sich über ein externes JWT-Token authentifiziert haben.
* **User-Merging**: Falls ein Benutzer mit der übermittelten E-Mail bereits existiert (z.B. per LDAP angelegt), wird kein Duplikat erzeugt. Stattdessen wird der Benutzer aktualisiert (Anzeigename) und eingeloggt.
* **Collection `settings`**: Die Felder `jwt_sso_enabled` (Boolean) und `jwt_sso_secret` (String) wurden hinzugefügt, um die SSO-Konfiguration über die Administrationsoberfläche zu verwalten.

