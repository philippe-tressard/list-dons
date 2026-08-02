#!/bin/bash
# env-report.sh — Rapport d'environnement injecté au démarrage de session.
# Objectif : rendre IMPOSSIBLE de travailler sur le mauvais projet sans le voir.
# L'étiquette de session et la banque de mémoire découlent du répertoire de
# lancement, pas du contenu de la demande : une session ouverte ici et pilotée
# en chemins absolus vers 5Hostachy reste étiquetée « list-dons », n'exécute pas
# le pré-flight de 5Hostachy et écrit ses mémoires dans la mauvaise banque
# (constaté le 31/07/2026).
ATTENDU="/c/Dev/List-dons"
COURANT=$(pwd)
echo "═══════════════ ENVIRONNEMENT DE TRAVAIL ═══════════════"
echo "  Projet        : List-dons (dons & réduction d'impôt — MVP Node/Express)"
echo "  Étiquette     : List-dons — <sujet>"
echo "  Répertoire    : $COURANT"
echo "  Dépôt/branche : $(git config --get remote.origin.url 2>/dev/null) [$(git branch --show-current 2>/dev/null)]"
echo "  Mémoire       : ~/.claude/projects/C--Dev-List-dons/memory/"
echo "  Autre projet  : 5Hostachy → C:\\Dev\\5hostachy (NE PAS y toucher depuis ici)"
if [ "${COURANT,,}" != "${ATTENDU,,}" ]; then
  echo "  ⚠️  RÉPERTOIRE INATTENDU (attendu $ATTENDU) — signale-le à l'utilisateur"
  echo "      AVANT d'agir : mémoires et étiquette partiront au mauvais endroit."
fi
echo "  → Reprends cette ligne en tête de ta 1ʳᵉ réponse ; si la demande porte"
echo "    sur 5Hostachy, dis-le et propose de relancer depuis C:\\Dev\\5hostachy"
echo "    (son hook de pré-flight ne se déclenchera pas depuis ici)."
echo "════════════════════════════════════════════════════════"
