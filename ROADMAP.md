# PayKal — Feuille de route & Recommandations

> **Objectif** : permettre à un parent de payer la scolarité de ses enfants **à distance, sans se déplacer**, et à l'école de suivre les paiements en temps réel.

## 1. Diagnostic de l'existant (ce qui est déjà là)

L'app Flutter actuelle contient déjà un parcours parent complet mais **simulé** :

| Écran | État | Remarque |
|---|---|---|
| Connexion | ✅ fait | Auth fictive (mot de passe `admin123`) |
| Tableau de bord (enfants) | ✅ fait | Liste des enfants de l'utilisateur |
| Ajout d'un enfant | ✅ fait | Nom, classe, école |
| Paiement | ✅ fait | Montant + méthode (simulé) |
| Reçu | ✅ fait | Détails de la transaction |
| Historique | ✅ fait | Liste des paiements |

**Problèmes à régler avant tout :**
- 🐛 Bugs : `orElse: () => dynamic` dans le reçu (plante si la liste est vide), classe `RoundedCornerShape` bancale dans le login, variable inutilisée dans l'historique
- 💱 Devises incohérentes : `€` dans l'historique, `$` dans le reçu → **tout en FCFA (XOF)**
- 🌍 Toute l'interface est en anglais → **passer en français**
- 💾 Aucune persistance : tout est perdu quand on ferme l'app (données en mémoire)
- 🔐 Authentification fictive, pas de comptes réels
- 💰 Paiement simulé : aucun vrai mouvement d'argent

## 2. Feuille de route en 5 phases

### Phase 0 — Fondations (≈ 1 semaine) 🔧
Nettoyer et stabiliser l'existant avant d'ajouter quoi que ce soit.
- Passer **toute l'UI en français**
- **FCFA (XOF)** partout (formatage : `50 000 FCFA`)
- Corriger les bugs listés ci-dessus
- Ajouter la **persistance locale** (`shared_preferences` ou `hive`) : les données survivent à la fermeture de l'app
- Nettoyer la structure : `models/`, `screens/`, `services/`, `widgets/`, `providers/`

**Livrable** : app qui tourne, en français, sans perdre les données au redémarrage.

### Phase 1 — Comptes réels + Backend (≈ 2–3 semaines) 🔐
- Backend : **Firebase** (Auth + Firestore + Cloud Functions) ou **Supabase**
- Inscription / connexion parent par **téléphone + code OTP SMS** (standard en Afrique de l'Ouest)
- Rôles : **Parent** / **École** / **Admin**
- Les enfants et paiements sont stockés côté serveur, pas sur le téléphone

**Livrable** : un vrai compte parent, données synchronisées.

### Phase 2 — Paiement Mobile Money réel (≈ 2–3 semaines) 💳
- Intégration d'un **agrégateur de paiement** (recommandé : **CinetPay** — burkinabè, API documentée, supporte Orange Money + Moov + cartes au Burkina)
- Flux : initier le paiement → redirection/USSD → **webhook de confirmation** → mise à jour du statut → reçu
- Génération du **reçu PDF** + partage (WhatsApp / e-mail)
- Notifications (SMS / push) de confirmation

**Livrable** : un parent paie vraiment la scolarité depuis l'app et reçoit un reçu.

### Phase 3 — Côté école (≈ 2–3 semaines) 🏫
C'est ce qui fait vendre l'app : l'école doit y gagner quelque chose.
- Tableau de bord école : qui a payé, qui doit combien, par classe
- Validation / réconciliation des paiements
- Export (Excel / PDF) pour la comptabilité
- **Relances automatiques** aux parents en retard (SMS / notification)
- Répartition des fonds reversés à l'école

**Livrable** : l'école peut suivre les paiements sans fichier Excel.

### Phase 4 — Finition & lancement (≈ 2 semaines) 🚀
- Notifications push (Firebase Cloud Messaging)
- Mode hors-ligne léger (consultation)
- Tests sur appareils Android réels
- Publication **Google Play** puis App Store
- Icône, écran de démarrage (splash), mentions légales

## 3. Choix techniques recommandés

| Besoin | Recommandation | Pourquoi |
|---|---|---|
| Framework mobile | **Flutter** (déjà en place) | Une seule base de code pour Android + iOS |
| État | **Provider** (déjà en place) | Suffisant ; passer à Riverpod si l'app grossit |
| Backend | **Firebase** (Auth + Firestore + Functions) | Gratuit au démarrage, OTP téléphone intégré, notifications incluses |
| Alternative backend | **Supabase** | Open source, PostgreSQL, si tu veux éviter la dépendance à Google |
| Paiement | **CinetPay** (agrégateur) | Burkina Faso, agrège Orange Money + Moov + cartes en une seule intégration |
| Reçus | PDF généré côté app + stockage cloud | Partageable par WhatsApp |
| Notifications | FCM (push) + SMS (Twilio / agrégateur) | Confirmation de paiement et relances |

## 4. Moyens de paiement — état réel au Burkina Faso

Via **CinetPay** (tableau officiel) :

| Moyen | Disponibilité BF | Code |
|---|---|---|
| 🟠 Orange Money | ✅ | `OMBF` |
| 🔵 Moov Money | ✅ | `MOOVBF` |
| 💳 Carte bancaire (Visa/Mastercard) | ✅ | — |
| 🟡 Wave | ⚠️ pas encore sur les agrégateurs BF | à prévoir plus tard |
| 🟣 Telecel Money | ⚠️ à vérifier selon l'agrégateur | — |

**Contraintes à connaître** : montant minimum **100 XOF**, maximum **1 500 000 XOF** par transaction ; frais d'environ **2 à 3,5 %** par transaction selon l'agrégateur — **décider qui paie les frais** (parent, école, ou inclus dans les frais de service PayKal).

## 5. Points d'attention métier (à trancher tôt)

1. **Qui paie les frais de transaction ?** C'est la question n°1 de ton modèle économique.
2. **Preuve de paiement pour l'école** : l'école doit avoir un document officiel (reçu numéroté, cachet, signature).
3. **Réconciliation** : que se passe-t-il si le webhook de confirmation n'arrive pas ? (prévoir une vérification manuelle du statut).
4. **Données personnelles d'enfants** : mineurs → attention particulière aux données collectées et à leur sécurité.
5. **Modèle éco** : commission PayKal ? Abonnement école ? Les deux ?
6. **Première école pilote** : mieux vaut 1 école partenaire réelle que 100 comptes vides — commence par Bobo-Dioulasso.

## 6. Prochaine étape concrète recommandée

Commencer par la **Phase 0** (fondations) : c'est peu de travail, ça supprime les bugs actuels, et l'app devient présentable à une première école pilote. Ensuite on attaque la Phase 1 (comptes réels) puis la Phase 2 (paiement Mobile Money) — c'est là que ton idée devient réelle.
