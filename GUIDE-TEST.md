# Guide de test — PayKal Messagerie

> **En résumé** : tu peux voir l'interface tout de suite, mais pour tester *vraiment*
> (connexion, paiement, validation), il faut d'abord appliquer le schéma SQL dans Supabase.
> Compte **10 minutes** de préparation, puis **10 minutes** de test.

---

## 1. Ce que tu peux tester MAINTENANT (sans rien faire)

L'application tourne déjà. Ouvre le lien de prévisualisation affiché dans ton environnement
(ou http://localhost:4173 si tu la lances en local).

Tu dois voir la **page de connexion PayKal** (fond bleu, formulaire e-mail / mot de passe).
Clique sur « Créer un compte » : le formulaire d'inscription s'affiche aussi.

⚠️ **Mais tu ne pourras pas te connecter** : les tables n'existent pas encore dans ta base
Supabase. Passe à l'étape 2.

---

## 2. Préparer Supabase (5 min) — OBLIGATOIRE

### 2.1 Appliquer le schéma

1. Va sur https://supabase.com/dashboard et ouvre ton projet
2. Menu de gauche → **SQL Editor** → **New query**
3. Dans ce dépôt, ouvre le fichier [`supabase/schema.sql`](supabase/schema.sql),
   **sélectionne tout** (Ctrl+A) et copie
4. Colle dans l'éditeur SQL de Supabase
5. Clique sur **Run** (en bas à droite, ou Ctrl+Entrée)
6. Tu dois voir : ✅ *Success. No rows returned*

### 2.2 Vérifier que tout est créé

| Où regarder | Ce que tu dois voir |
|---|---|
| **Table Editor** | 5 tables : `profiles`, `paiements`, `conversations`, `conversation_participants`, `messages` |
| **Storage** | 1 bucket : `preuves_paiement` (avec un cadenas = privé) |

Si le bucket n'apparaît pas, exécute juste la section 6 du fichier `schema.sql` à part.

### 2.3 Désactiver la confirmation par e-mail (pour tester vite)

1. **Authentication** → **Providers** → **Email**
2. Décoche **« Confirm email »**
3. Enregistre

> Sans ça, Supabase envoie un e-mail de confirmation à chaque inscription et tu ne pourras
> pas te connecter sans cliquer sur le lien. (À réactiver avant la mise en production.)

---

## 3. Créer ton compte administrateur

1. Dans l'application, va sur **/inscription** et crée un compte
   (ex. `admin@test.com` / mot de passe `admin123`)
2. Retourne dans Supabase → **SQL Editor** → exécute :

```sql
update public.profiles
   set role = 'admin'
 where email = 'admin@test.com';
```

3. **Recharge la page** de l'application → l'entrée **« Administration »** apparaît dans le menu.

---

## 4. Scénario de test complet

Tu vas tester avec **deux comptes** : un parent et un admin.

### ✅ Test 1 — Inscription et connexion (parent)

1. Ouvre l'app dans un navigateur, va sur `/inscription`
2. Crée un compte : `parent@test.com` / `parent123`
3. Tu arrives directement sur la page **Discussions**

> 💡 Astuce : pour tester avec 2 comptes en même temps, utilise une **fenêtre de navigation
> privée** pour le deuxième compte.

### ✅ Test 2 — Messagerie

1. Avec le compte **admin**, va sur **Discussions** → bouton **« Nouvelle »**
2. Choisis le contact **parent** (ou `parent@test.com`)
3. Écris un message → **Envoyer**
4. Dans l'autre navigateur (compte **parent**), le message doit apparaître **sans recharger**
   (temps réel)
5. Réponds depuis le compte parent → le message arrive chez l'admin

### ✅ Test 3 — Déclarer un paiement (parent)

1. Compte **parent** → menu **Paiement**
2. Tu dois voir le numéro **074452674** en grand, avec un bouton « Copier »
3. Saisis un montant (ex. `75000`), choisis **Orange Money**
4. Importe une **capture d'écran** (n'importe quelle image de ton téléphone ou une capture
   d'écran de SMS — pour le test, une photo suffit)
5. Clique sur **« Envoyer ma preuve de paiement »**
6. Tu dois voir un message de succès, puis être redirigé vers **Mes paiements**
7. Le paiement apparaît avec le badge **« En attente »**

### ✅ Test 4 — Valider le paiement (admin)

1. Compte **admin** → menu **Administration**
2. L'onglet **« En attente (1) »** affiche la demande avec :
   la **capture**, le **montant**, le **nom du parent**, la **date**
3. Clique sur la capture pour l'agrandir et la vérifier
4. Clique sur **« Valider »**
5. La demande passe dans l'onglet **« Validés »**

### ✅ Test 5 — Télécharger le reçu (parent)

1. Compte **parent** → **Mes paiements**
2. Le badge est maintenant **« Validé »** en vert
3. Clique sur **« Télécharger mon reçu (PDF) »**
4. Un fichier `recu-paykal-xxxx.pdf` se télécharge, avec le montant, la date,
   la référence et le numéro 074452674

---

## 5. Test de sécurité (optionnel mais recommandé)

C'est le test le plus important : **vérifier qu'un parent ne peut pas tricher**.

1. Connecte-toi en **parent** dans l'application
2. Ouvre la console du navigateur (**F12**) → onglet **Application** → **Local Storage**
   → clique sur l'adresse du site
3. Trouve la clé **`paykal-auth`** → ouvre-la → copie la valeur de **`access_token`**
4. Dans un terminal, exécute (remplace `COLLE_TON_TOKEN` et l'`ID_DU_PAIEMENT`) :

```bash
# Tentative de s'auto-valider un paiement → DOIT ÉCHOUER
curl -X PATCH "https://sxtlttaswhodbtcjjdyn.supabase.co/rest/v1/paiements?id=eq.ID_DU_PAIEMENT" \
  -H "apikey: sb_publishable_52fS1oqVHBvScTshCyU2lQ_dWruxGkn" \
  -H "Authorization: Bearer COLLE_TON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"statut":"valide"}'

# Tentative de se donner le rôle admin → DOIT ÉCHOUER
curl -X PATCH "https://sxtlttaswhodbtcjjdyn.supabase.co/rest/v1/profiles?id=eq.TON_ID" \
  -H "apikey: sb_publishable_52fS1oqVHBvScTshCyU2lQ_dWruxGkn" \
  -H "Authorization: Bearer COLLE_TON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'
```

**Résultat attendu dans les deux cas :** une erreur du type
`new row violates row-level security policy` ou
`Modification du rôle ou du solde interdite`.

👉 Si l'une des deux commandes **réussit**, la sécurité est cassée : dis-le moi immédiatement.

---

## 6. Tester en local chez toi

```bash
cd pwa
npm install
cp .env.example .env      # .env contient déjà les bons identifiants
npm run dev               # http://localhost:5173
```

Pour tester la version de production (celle qui sera déployée) :

```bash
npm run build
npm run preview           # http://localhost:4173
```

---

## 7. Dépannage

| Problème | Cause | Solution |
|---|---|---|
| « Identifiants Supabase absents » (console) | `.env` manquant | `cp .env.example .env` puis relancer `npm run dev` |
| Connexion impossible / erreur 400 | Schéma SQL non appliqué | Refaire l'étape 2.1 |
| « Email logins are disabled » | Confirmation e-mail activée | Étape 2.3 |
| Inscription OK mais page blanche | Trigger `handle_new_user` absent | Revérifier que tout le `schema.sql` a bien été exécuté |
| Menu « Administration » absent | Rôle pas encore `admin` | Étape 3, puis **recharger** la page |
| Capture d'image invisible | URL signée expirée (1 h) | Recharger la page |
| Image refusée à l'import | Fichier > 5 Mo ou pas une image | Réduire la taille / convertir en PNG-JPG |
| `/admin` en 404 au rechargement | Réécriture SPA absente | Voir `pwa/README.md` § 8 (déploiement) |
| Paiement validé mais pas de solde | Fonction `valider_paiement` non créée | Revérifier la section 4 du `schema.sql` |

---

## 8. Checklist finale

- [ ] Le schéma SQL s'exécute sans erreur
- [ ] Les 5 tables et le bucket existent
- [ ] Un parent peut s'inscrire et se connecter
- [ ] Deux comptes peuvent se messager en temps réel
- [ ] Un parent peut déclarer un paiement avec capture
- [ ] L'admin voit la demande et peut Valider / Rejeter
- [ ] Le parent peut télécharger son reçu PDF après validation
- [ ] Un parent **ne peut pas** s'auto-valider un paiement (test § 5)
