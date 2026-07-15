# Authentification

> **L'utilisateur doit s'authentifier** pour accéder à l'application. Contexte : **mono-foyer**, **LAN uniquement**. Donc **un seul compte** (le foyer), **pas d'inscription publique**.

## Provisionnement du compte
- **Au premier lancement**, un écran d'**initialisation** invite à créer le compte unique : identifiant (email ou nom d'utilisateur) + mot de passe (avec indicateur de robustesse).
- Aucune page « Créer un compte » ensuite (un seul foyer). La gestion du mot de passe se fait depuis les **Paramètres**.

## Fenêtre de connexion (écran `Connexion`)

**Inspirée de la fenêtre de connexion de 5Hostachy**, instanciée à List-dons (mono-foyer, sans inscription publique). Mise en page sobre et centrée :

```
┌───────────────────────────────┐
│            [logo]              │
│          List-dons            │
│   Vos dons, votre imposition   │   ← sous-titre
│                                │
│  Identifiant *  [___________]  │
│  Mot de passe * [________][👁] │   ← afficher/masquer
│  ⚠️ Verr. Maj activée          │   ← alerte si CapsLock
│                                │
│        [ Se connecter ]        │   ← état « Connexion… » pendant l'appel
│                                │
│      Mot de passe oublié ?     │
│  Mentions légales · Confident. │
└───────────────────────────────┘
```

**Éléments (repris de la charte)**
- Carte centrée `max-width: 400px`, logo + titre `List-dons` + sous-titre.
- Champs **Identifiant \*** et **Mot de passe \*** (labels suffixés ` *`).
- **Afficher/masquer** le mot de passe (icône œil) + **alerte Verr. Maj** (CapsLock).
- Bouton primaire **« Se connecter »**, désactivé + libellé « Connexion… » pendant la requête.
- Lien **« Mot de passe oublié ? »** ; pied **Mentions légales · Politique de confidentialité**.
- `autocomplete="username"` / `autocomplete="current-password"` pour les gestionnaires de mots de passe.

**Messages d'erreur**
- Génériques et **non énumérants** : « Identifiant ou mot de passe incorrect » (ne jamais révéler si l'identifiant existe).
- Accessibilité : erreur dans un bloc `role="alert"`, focus géré, navigation clavier.

## Sécurité (voir aussi [exigences non fonctionnelles](exigences-non-fonctionnelles.md))
- Hachage du mot de passe avec **Argon2id** (paramètres à jour).
- Session par **JWT en cookie `HttpOnly` + `Secure` + `SameSite=Strict`** (jamais `localStorage`). Protection CSRF assurée par `SameSite=Strict`.
- **Rate limiting** sur la connexion (ex. 5 tentatives/min) + **verrouillage temporaire** après plusieurs échecs.
- **Expiration de session** + **déconnexion** explicite ; option « expiration après inactivité ».
- Politique de mot de passe minimale (longueur, indicateur de robustesse) sans exigences absurdes.

## Réinitialisation du mot de passe
- **Sans domaine ni SMTP (par défaut)** : réinitialisation **locale** — jeton à usage unique généré par l'opérateur via une **commande de maintenance** (accès à la machine = preuve de légitimité pour un usage mono-foyer auto-hébergé).
- **Si SMTP configuré** (optionnel) : lien de réinitialisation par email.

## Hors périmètre MVP (simplicité)
- Multi-utilisateur / rôles, inscription publique, OAuth/SSO.
- **MFA** : envisageable plus tard (option), pas dans le MVP.

## Exigences fonctionnelles associées
`EF-070` connexion · `EF-071` déconnexion · `EF-072` initialisation du compte au 1er lancement · `EF-073` changement / réinitialisation du mot de passe. Voir [exigences-fonctionnelles.md](exigences-fonctionnelles.md).
