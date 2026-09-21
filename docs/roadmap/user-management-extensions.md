# Nutzer-Management Erweiterungen

Mögliche zukünftige Verbesserungen für das CMS Nutzer- und Authentifizierungs-System.

---

## Aktuelles Verhalten

### Limitation: Mehrere Geräte / Redakteure

**Wenn ein Redakteur sich auf seinem eigenen Gerät anmelden will → funktioniert NICHT automatisch.**

#### Der Grund:

- `.cms-users.json` (mit allen Redakteur-Konten) ist eine **lokale Datei** auf dem Gerät, wo das CMS läuft
- Sie wird `.gitignore`d und niemals zu GitHub gepusht
- Wenn der Redakteur das CMS auf seinem Laptop startet, ist diese `.cms-users.json` dort nicht vorhanden → die Konten kennt sein CMS nicht

---

## Workarounds (derzeit nötig)

### Option 1: Gemeinsamer Server (zentral) ✅ Empfohlen für Teams

Das CMS läuft auf **einem zentralen Gerät** (z. B. kleine VM, RaspberryPi, Docker-Container, oder Laptop, der immer erreichbar ist)

**Vorteile:**
- Alle Redakteure greifen via `http://gerät-ip:3000/admin` zu
- `.cms-users.json` liegt zentral vor – keine Synchronisationsprobleme
- Inhalte sind immer aktuell für alle
- Content-Commits zu GitHub erfolgen zentralisiert

**Setup:**
```bash
# Auf dem zentralen Gerät
npm run dev -- -p 3000 --host

# Von anderen Geräten aus
# Browser: http://[zentral-gerät-ip]:3000/admin
```

### Option 2: `.cms-users.json` manuell synchen ⚠️ Umständlich

Der Admin exportiert `.cms-users.json` vom einen Gerät und kopiert sie manuell auf andere Laptops

**Nachteile:**
- Fehleranfällig (vergessene Updates)
- Keine zentralen Benutzerrechte-Verwaltung
- Passwort-Änderungen sind nicht synchron

---

## Bessere Lösungen (Roadmap)

### 🚀 Lösung 1: `.cms-users.json` zu GitHub synchen (mittel-aufwendig)

Optional `.cms-users.json` zu GitHub pushen/pullen mit ähnlicher Logik wie `cms-update.sh` für Content.

**Umsetzung:**
```typescript
// src/lib/cms/user-sync.ts (neu)
// - Lädt .cms-users.json von GitHub (mit Branch-Abgleich)
// - Erkennt lokale Änderungen automatisch
// - Optional: konfliktfreies Mergen (z.B. neue lokale Konten + GitHub-Konten)
```

**Vorteile:**
- Redakteure arbeiten auf unterschiedlichen Geräten, Konten sind überall gleich
- Automatische Synchronisierung beim Start (wie Content-Sync)
- GitHub als Single Source of Truth für Benutzerverwaltung

**Nachteile:**
- `.cms-users.json` wird versioniert (optional – separate Branch möglich)
- Leichte Komplexität beim Conflict-Handling

---

### 🚀 Lösung 2: GitHub-basierte Benutzerverwaltung (aufwendiger)

Die Benutzer direkt aus GitHub-Daten auslesen (z. B. Repo-Collaborators, CODEOWNERS, oder Discussions)

**Konzept:**
```typescript
// Variante A: GitHub Collaborators
// - CMS liest Collaborators aus dem Repo
// - Redakteur-Rolle = Collaborator mit bestimmtem Permission-Level
// - Passwörter könnten über GitHub OAuth laufen

// Variante B: CODEOWNERS-Datei als Rollen-Definition
// - docs/*: redakteur1, redakteur2
// - content/news/*: redakteur3
// - Einträge = erlaubte Bereiche pro Redakteur
```

**Vorteile:**
- Keine separate Benutzerdatenbank nötig
- Rollen mit Bereichs-Beschränkung möglich (z. B. "darf nur News bearbeiten")
- OAuth statt Passwort-Hashing möglich

**Nachteile:**
- Größere Umstrukturierung nötig
- GitHub API Rate Limits beachten
- Weniger Kontrolle über Passwörter (wenn lokal gehashed)

---

### 🚀 Lösung 3: Optionaler Cloud-Backend (z.B. Supabase, Firebase) (sehr aufwendig)

CMS hat die Wahl zwischen lokal und Cloud für Benutzerverwaltung.

**Konzept:**
```typescript
// .env.local
CMS_AUTH_MODE=local   // oder: github, supabase, firebase
SUPABASE_URL=...
SUPABASE_KEY=...
```

**Vorteile:**
- Beliebig skalierbar (bei Bedarf)
- Keine lokale Datei-Synchronisierung nötig
- Mobile-Apps könnten auf gleiche Datenbank zugreifen

**Nachteile:**
- Externe Abhängigkeit (kein Offline-Modus mehr)
- Kosten bei Scale-Up
- Komplexität nimmt deutlich zu

---

## Empfohlene Priorität

| Lösung | Aufwand | Nutzen | Priorität |
|--------|---------|--------|-----------|
| Option 1: Shared Server | **Minimal** (nur Netzwerk-Setup) | **Hoch** | 🔴 **JETZT** - für Multi-Device Teams |
| Option 2.1: GitHub-Sync | **Mittel** (1-2 Tage) | **Hoch** | 🟡 **Phase 2** - wenn mehrere Geräte produktiv sind |
| Option 2.2: GitHub Auth | **Hoch** (3-5 Tage) | **Mittel-Hoch** | 🟡 **Phase 3** - langfristig schöner |
| Option 3: Cloud Backend | **Sehr Hoch** (1-2 Wochen) | **Mittel** | ⚪ **Später** - nur bei großem Scale |

---

## Nächste Schritte

1. **Kurzfristig:** Team auf **Option 1 (Shared Server)** migrieren, falls mehrere Geräte arbeiten
2. **Mittelfristig:** **Option 2.1 (GitHub-Sync)** implementieren für bessere Bedienbarkeit
3. **Langfristig:** Falls nötig, zu **Option 2.2 (GitHub OAuth)** oder Cloud-Backend wechseln
