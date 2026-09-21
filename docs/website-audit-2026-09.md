# Website-Audit – E-Motion Rennteam Aalen (Stand 09/2026)

Analyse des `main`-Branches. Next.js 16 / React 19, Content via Markdown+Decap CMS,
gute Basis (Security-Header, CSP, A11y-Grundlagen, Tests, strukturierte Daten).

## 1. Inhaltliche Lücken

- **Blog/News sehr dünn**: nur 2 Blog-Posts, 2 News-Einträge. Wirkt wie Platzhalter,
  nicht wie aktiv gepflegte Seite.
- ~~**Sitemap unvollständig**~~ – korrigiert: `src/app/sitemap.ts` listet `/blog/[slug]`
  und `/news/[slug]` bereits über `getBlogPosts()`/`getNews()`.
- **Keine Erfolge/Ergebnisse-Historie vor 2025**: `content/results/` hat nur 4 Einträge
  (Gründung, FSG 2025, FS Alpe Adria 2025, FS Czech 2025) – frühere Saisons fehlen.
- **Keine englischsprachige Version**: internationale Sponsoren/Partner, Wettbewerbs-Jury
  und ausländische Bewerber:innen finden nur Deutsch (`lang="de"` fest im Root-Layout).
- **Kein Downloadbereich**: kein Sponsoring-Booklet/Mediakit (PDF) zum Download für
  potenzielle Sponsoren – Formular allein reicht selten für B2B-Akquise.
- **Kein Alumni-/Ehemaligen-Bereich**: viele FS-Teams pflegen Alumni-Netzwerk-Seiten
  (Karriere-Sponsoring, Mentoring) – hier nicht vorhanden.
- **Keine FAQ-Seite** für Bewerber:innen (`/mitmachen`) – Fragen zu Zeitaufwand,
  Vorwissen, Studiengang-Kompatibilität würden Conversion erhöhen.
- **Ansprechpartner fehlen auf Sponsoren-Seite**: kein direkter Kontakt (Name/Foto)
  für Sponsoring-Verantwortliche, nur allgemeines Formular.
- **Fahrzeug-Historie**: nur 3 Fahrzeuge dokumentiert (ERT-12/24, ERT-13/25, ERT-14/26) –
  ältere Boliden fehlen, obwohl Team laut Footer "12+ Jahre Erfahrung" hat.
- **Keine Team-Erfolge/Presse-Zitate** (Pressespiegel, Zeitungsartikel, Auszeichnungen)
  eingebunden.
- **Kein Veranstaltungskalender** (Rollout-Termine, Wettbewerbstermine, Tag der offenen
  Werkstatt) – wäre für Sponsoren/Interessierte relevant.

## 2. Technische Lücken / Ausbaubedarf

- **`FORM_WEBHOOK_URL` optional** – ohne konfigurierten Webhook landen Formular-
  Einsendungen nur im Server-Log (`console.log`) und gehen verloren. Kritisch für
  Kontakt-/Bewerbungs-/Sponsoring-Formular in Produktion.
- **Rate-Limiting nur In-Memory** (`src/lib/rateLimit.ts`) – funktioniert nicht über
  mehrere Serverless-Instanzen hinweg. Bei Multi-Instance-Hosting (Vercel Edge/Regionen)
  wirkungslos.
- **Kein CI/CD-Workflow sichtbar** außer `.github/` (nicht geprüft im Detail) –
  sicherstellen, dass Lint/Test/Build bei jedem PR automatisch laufen.
- **Keine Bildkompressions-/Optimierungspipeline** für CMS-Uploads: Dateien in
  `public/uploads/single-bilder-upload/` sind 1–2 MB JPEGs direkt aus der Kamera,
  ungeeignet fürs Web (siehe Task 3, Performance).
- **Keine E2E-Tests** (Playwright ist als Dependency vorhanden, aber ungenutzt für
  echte Browser-Flows – nur für A11y-Check `scripts/a11y-check.mjs`).
- **Kein Monitoring/Error-Tracking** (z.B. Sentry) – Fehler in Produktion bleiben
  unsichtbar.
- **Kein Uptime-/Formular-Health-Check** – falls Webhook ausfällt, merkt es niemand.
- **`SPONSOR_TIERS`/`MEMBER_DEPARTMENTS`-Listen hart codiert** in `validation.ts`,
  dupliziert vermutlich CMS-Konfiguration – Single-Source-of-Truth fehlt.
- **Kein automatisierter Lighthouse-/Bundle-Size-Check** in CI, um Performance-
  Regressionen frühzeitig zu erkennen.
- **Keine Suche** auf der Website (Team, Blog, Sponsoren) – bei wachsendem Content
  relevant.

## 3. Sicherheits-/Formular-Status (Kontext für Task 2)

Bereits vorhanden: Honeypot, In-Memory-Rate-Limit, Input-Sanitizing, striktes CSP,
Security-Header, `consent`-Pflichtfeld. Ausbaufähig: CSRF-Schutz, robustere
E-Mail-Validierung (Einwegdomains, Syntax-Edgecases), CRLF-/Header-Injection-Schutz
bei Webhook-Payload, Content-Type-Erzwingung, verteiltes Rate-Limiting.

## 4. Priorisierte Empfehlung

1. Sitemap um `/blog/[slug]` und `/news/[slug]` ergänzen (schnell, hoher SEO-Nutzen).
2. `FORM_WEBHOOK_URL` in Produktion verpflichtend dokumentieren/prüfen (kein Datenverlust).
3. Bildpipeline für Uploads (Kompression/Resize) – siehe Task 3.
4. Content-Nachschub: mind. 4–6 weitere Blog-/News-Posts, ältere Ergebnisse/Fahrzeuge
   nachpflegen.
5. Sponsoring-Mediakit (PDF) + Ansprechpartner ergänzen.
