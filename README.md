# PayKal

Payer la scolarité de ses enfants **sans se déplacer**.

Ce dépôt contient **deux projets** :

| Dossier | Technologie | Description |
|---|---|---|
| [`pwa/`](pwa/) | React + Vite + TypeScript + Supabase | **Messagerie PWA** (parents ↔ écoles) et **paiement manuel par capture d'écran** avec tableau de bord administrateur |
| [`lib/`](lib/) | Flutter / Dart | Application mobile PayKal (connexion, enfants, paiement, historique, reçu) |

## Démarrer la messagerie PWA

```bash
cd pwa
npm install
cp .env.example .env     # .env n'est jamais commité
npm run dev              # http://localhost:5173
```

Puis appliquez le schéma Supabase : [`supabase/schema.sql`](supabase/schema.sql) dans le SQL Editor
de votre projet Supabase, et passez votre compte en administrateur (voir [`pwa/README.md`](pwa/README.md)).

## Démarrer l'application Flutter

```bash
flutter pub get
flutter run
```

## Numéro officiel de réception des transferts

**07452674** (Orange Money / Moov Money)

## Documentation

- [`pwa/README.md`](pwa/README.md) — installation, sécurité RLS, mode hors-ligne, déploiement
- [`supabase/schema.sql`](supabase/schema.sql) — schéma commenté de la base
- [`ROADMAP.md`](ROADMAP.md) — feuille de route et recommandations

## Sécurité

Aucun identifiant n'est commité. `.env` est ignoré par Git (`.gitignore`), seul `.env.example` est
versionné. La sécurité des données repose sur les politiques RLS du schéma SQL, pas sur la clé
publique Supabase exposée dans le navigateur.
