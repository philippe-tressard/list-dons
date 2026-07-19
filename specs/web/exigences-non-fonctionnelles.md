# Exigences non fonctionnelles

**Calibrées pour un usage personnel, mono-foyer, en LAN.**

## Performance
- Chargement rapide (app légère, backend Node.js, front JS vanilla sans build).
- Images optimisées (WebP/AVIF) + lazy-loading ; cache HTTP des assets statiques.

## Accessibilité
- **WCAG 2.2 AA** : clavier, focus visible, ARIA, contrastes ≥ 4,5:1, `prefers-reduced-motion`, `prefers-color-scheme`.

## Compatibilité
- Navigateurs récents (Chrome/Firefox/Edge 120+, Safari 16.4+). Responsive dès 320 px. Pas d'IE.

## Sécurité
- **Accès LAN uniquement**, **aucune exposition Internet** (pas de tunnel/redirection de port).
- HTTPS via Caddy **`tls internal`** (TLS auto-signé, certificat racine à installer sur les appareils du foyer).
- JWT en cookie **HttpOnly/Secure/SameSite=strict** ; hachage **bcrypt** ; rate limiting auth.
- **CSP stricte** + headers `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS.
- Validation serveur systématique ; protection **path traversal** sur les uploads ; secrets hors code (`.env`).
- **Audit OWASP Top 10** avant release.

## Éco-conception
- Pas de framework CSS lourd ni CDN ; polices système ; animations limitées/désactivables ; aucun tracker.

## RGPD & juridique
- **Responsable de traitement** : l'utilisateur (usage personnel, auto-hébergé).
- **Donnée sensible** : les dons (cultuels, politiques) peuvent révéler des convictions → **chiffrement au repos recommandé**, minimisation.
- Droits : **export** (portabilité), **suppression** complète, transparence.
- **Conservation** des justificatifs au moins la durée de reprise fiscale.
- **Souveraineté** : stockage local, aucun transfert hors UE.
- **Licences** : dépendances permissives (MIT/Apache-2.0/BSD/ISC) ; inventaire au build si besoin (`license-checker` ou équivalent npm) ; page « À propos / Licences » ; conformité **REUSE**. Projet sous **MIT**.
- **Avertissement légal** permanent : estimation indicative, non un conseil fiscal.

## Résilience & exploitation
- **Niveau simple** : `restart: unless-stopped`. Pas de monitoring/alerting/failover.
- **Sauvegarde quotidienne automatique** (base JSON + uploads) + **restauration testée** et documentée.
- **Isolation stricte vis-à-vis de 5Hostachy (co-hébergé sur le RPi2) = exigence non négociable** : projet/réseau/volumes/conteneurs `listdons_*`, ports ≠ 80/443, cron propre, limites de ressources, garde-fou de déploiement (état de 5Hostachy inchangé avant/après).

## MEP / DevOps
- Git (`main`/`dev`), SemVer + CHANGELOG.
- CI (à mettre en place si besoin) : lint/format JS, auto-test du moteur fiscal (`node lib/fiscal.selftest.js`), `npm audit`.
- Docker Compose (projet `listdons`), `/api/health`.

> Détail : [`../../SPECIFICATIONS.md`](../../SPECIFICATIONS.md) §8, §10, §11.
