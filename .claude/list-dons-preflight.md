============== PRÉ-FLIGHT LIST-DONS — CONSIGNES OBLIGATOIRES ==============
(injecté automatiquement à chaque session par le hook SessionStart)

0. SOCLE COMMUN — ~/.claude/standards/ (valable pour TOUS les projets)
   Routage « quel standard avant quelle tâche » : ~/.claude/CLAUDE.md §1 (source
   unique, déjà en contexte). Mode d'emploi du socle : standards/INDEX.md.
   Charger AU MINIMUM standards/01-methode-travail.md, quelle que soit la tâche.
   Le CLAUDE.md de ce dépôt ne contient QUE l'instanciation List-dons.

1. DÉJÀ EN CONTEXTE (auto-chargés) — à relire, pas à ignorer :
   • CLAUDE.md — stack, état, isolation rpi2, moteur fiscal, résilience
   • MEMORY.md — index des mémoires propres à List-dons

2. À CHARGER SELON LA TÂCHE :
   • Spécifications      → SPECIFICATIONS.md (index) + specs/
   • Déploiement rpi2    → standards/03-securite.md §7 + deploy/deploy-rpi2.sh
   • Moteur fiscal       → specs/ + standards/06-donnees-et-integrite.md §7
   • Code / UI           → standards/02-factorisation.md + 11-interface-et-ux.md
   • Avant tout commit   → skill `avant-commit`

3. RÈGLES NON NÉGOCIABLES :
   • ISOLATION rpi2 : 5Hostachy est co-hébergé et PRIORITAIRE. Préfixes listdons_*,
     port 8080 (jamais 80/443), ~/list-dons (pas /opt, pas de sudo), ressources
     plafonnées, aucun couplage à bascule.sh / health-watch.sh.
     ⛔ `docker system prune` INTERDIT sur ce nœud (détruirait les volumes du voisin).
     Le script de déploiement contrôle 5Hostachy AVANT et APRÈS — ne pas le contourner.
   • Montants en CENTIMES (entiers), jamais en flottant.
   • Aucun chiffre fiscal non sourcé : référence Légifrance + date d'effet à côté de
     la valeur. Principe de prudence : en cas de doute, l'estimation SOUS-ESTIME.
   • Dépôt public (depuis le 06/11/2026) : aucune donnée personnelle, exemples fictifs, IP LAN masquées.
   • Décision : agir sans demander sur le réversible ; ne solliciter que pour
     l'irréversible (données, push/PR sur main, envoi, action prod durable).
   • Langue : français exclusif (interface + nommage des champs).

4. CONFORMITÉ (obligatoire) : au début de ta 1ʳᵉ réponse impliquant du travail sur
   List-dons, écris « ✅ Consignes List-dons chargées » suivi de la liste des
   standards/mémoires/specs réellement lus. Si une consigne n'a pas pu être chargée,
   écris « ⚠️ NON CONFORME : <raison> » et corrige AVANT d'agir.
=========================================================================
