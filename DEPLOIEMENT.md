# Tester et publier PayKal

---

## Pourquoi le lien de prévisualisation ne marchait plus

Le lien `…e2b.app` est un **lien temporaire** fourni par mon environnement de travail : il
change à chaque nouvelle session. Il n'est pas fait pour durer, et il ne faut pas le donner à
tes utilisateurs.

Pour tester durablement, tu as **deux chemins** : en local chez toi, ou publié sur un hébergeur.

---

## 1. Tester en local chez toi (2 minutes)

C'est la méthode la plus fiable, elle ne dépend d'aucun lien externe.

```bash
# 1. Récupère le projet
git clone https://github.com/sanonbinance-oss/paykal.git
cd paykal/pwa

# 2. Installe
npm install

# 3. Configure (le fichier contient déjà les bons identifiants)
cp .env.example .env

# 4. Lance
npm run dev
```

Ouvre **http://localhost:5173** dans ton navigateur.

> Sur ton téléphone, sur le même Wi-Fi : `npm run dev -- --host` puis va sur
> `http://<adresse-ip-de-ton-pc>:5173` — utile pour tester l'import de photo depuis la galerie.

### Vérifier d'abord la configuration

Va sur **http://localhost:5173/diagnostic** et clique sur **« Lancer le diagnostic »**.
Tu dois obtenir **8 / 8**. Sinon, chaque ligne ❌ t'indique quoi corriger.

### Ensuite le parcours complet

| # | Action | Résultat attendu |
|---|---|---|
| 1 | `/inscription` → crée un compte | Tu arrives sur **Discussions** |
| 2 | Ouvre une **fenêtre de navigation privée**, crée un 2e compte | Second compte créé |
| 3 | Dans Supabase → SQL Editor : `update public.profiles set role='admin' where email='…';` | 2e compte promu admin |
| 4 | Compte **admin** → Discussions → « Nouvelle » → choisis le 1er compte → envoie un message | Message reçu **sans recharger** chez le parent |
| 5 | Compte **parent** → **Paiement** → numéro **07452674** → saisis `75000` → importe une capture → envoie | Badge « En attente » |
| 6 | Compte **admin** → **Administration** → vérifie la capture → **Valider** | Demande déplacée dans « Validés » |
| 7 | Compte **parent** → **Mes paiements** → **Télécharger mon reçu (PDF)** | Fichier PDF téléchargé 📄 |

---

## 2. Publier en ligne

> ⚠️ Je ne peux pas publier à ta place : je n'ai pas accès à tes comptes Netlify / Vercel /
> GitHub. Mais tout est déjà préparé dans le dépôt — il te reste 3 clics par option.

### Option A — Netlify (la plus simple, 1 minute) ✅ recommandée pour démarrer

Le build est déjà fait dans `pwa/dist/` (il contient tes identifiants Supabase, compilés).

1. Va sur **https://app.netlify.com/drop**
2. **Glisse-dépose** le dossier `pwa/dist/` dans la zone prévue
3. Tu obtiens immédiatement un lien public (`https://xxx.netlify.app`)
4. Pour le garder : crée un compte gratuit et clique sur « Claim site »

✅ Aucune configuration nécessaire : les redirections SPA sont déjà dans
`pwa/public/_redirects` et `pwa/netlify.toml`.

### Option B — Vercel (lien permanent + mises à jour automatiques)

1. Va sur **https://vercel.com** → « Add New Project »
2. Importe le dépôt **sanonbinance-oss/paykal**
3. **Root Directory** : clique sur « Edit » et choisis **`pwa`**
4. Dans **Environment Variables**, ajoute :
   - `VITE_SUPABASE_URL` = `https://sxtlttaswhodbtcjjdyn.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_52fS1oqVHBvScTshCyU2lQ_dWruxGkn`
5. « Deploy »

✅ Chaque `git push` redéploiera automatiquement. Les redirections SPA sont dans
`pwa/vercel.json`.

### Option C — GitHub Pages (gratuit, lié à ton dépôt)

1. Sur GitHub → ton dépôt → **Settings** → **Pages** → *Source* : **GitHub Actions**
2. **Settings** → **Secrets and variables** → **Actions** → onglet **Variables**, ajoute :
   - `VITE_SUPABASE_URL` = `https://sxtlttaswhodbtcjjdyn.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_52fS1oqVHBvScTshCyU2lQ_dWruxGkn`
3. Fusionne la pull request dans `main` → le workflow `.github/workflows/deploy-pwa.yml`
   se déclenche tout seul
4. Ton site sera sur `https://sanonbinance-oss.github.io/paykal/`

✅ Le workflow gère déjà le sous-dossier (`VITE_BASE=/paykal/`) pour que la PWA fonctionne.

---

## 3. Après la publication — à vérifier

| Vérification | Comment |
|---|---|
| La page de connexion s'affiche | Ouvre le lien publié |
| `/diagnostic` donne 8 / 8 | `https://ton-lien/diagnostic` |
| Recharger `/admin` ne donne PAS une 404 | Recharge la page admin (test des redirections SPA) |
| L'app est installable | Sur Chrome mobile : « Ajouter à l'écran d'accueil » |
| Une capture s'importe bien | Teste depuis un téléphone réel (bouton appareil photo) |

---

## 4. Avant de donner l'app à de vrais parents

- [ ] **Réactiver** « Confirm email » dans Supabase (Authentication → Providers → Email)
- [ ] Créer un **vrai** compte administrateur et supprimer les comptes de test
- [ ] Vérifier que le schéma RLS est bien appliqué (test de sécurité du `GUIDE-TEST.md` § 5)
- [ ] Retirer ou protéger la page `/diagnostic` (elle est publique)
- [ ] Définir qui paie les frais de transaction Mobile Money (~2 à 3,5 %)

---

## Récapitulatif des fichiers de déploiement

| Fichier | Rôle |
|---|---|
| `pwa/netlify.toml` + `pwa/public/_redirects` | build + redirections SPA pour Netlify |
| `pwa/vercel.json` | build + redirections SPA pour Vercel |
| `.github/workflows/deploy-pwa.yml` | build + déploiement GitHub Pages |
| `pwa/vite.config.ts` | `base` configurable (`VITE_BASE`) selon l'hébergeur |
