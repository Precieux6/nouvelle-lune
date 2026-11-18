# Nouvelle Lune – Plateforme de billetterie

Plateforme de vente de tickets en ligne avec parcours client en trois étapes, paiement via **FedaPay** (Mobile Money et cartes bancaires), reçu avec QR code et espace administrateur.

## Fonctionnalités

### Espace client (`/`)
1. **Tickets** : un ticket adulte, des adultes accompagnants et des enfants (maximum configurable, 9 par défaut).
2. **Produits du mois** (facultatif, activable par événement) : produits de chance et de protection.
3. **Paiement** : récapitulatif, nom, prénom(s), téléphone, e-mail, code promo, puis redirection vers FedaPay.

Pas de création de compte pour le client.

### Reçu (`/recu/...`)
Généré uniquement après confirmation du paiement par FedaPay. Il contient l'événement, les informations de l'acheteur, les places, les produits, le montant, un **numéro d'identification unique** (ex. `NL-2026-8F3K2Q`), un **QR code**, la citation de l'auteur, le nom de l'organisateur et sa signature. Téléchargeable en **PDF** et en **PNG**, et envoyé par e-mail si le service d'e-mail est configuré.

### Espace administrateur (`/admin`)
- Connexion par identifiant et mot de passe.
- **Tableau de bord** : recettes, tickets vendus et ventes de la semaine (cartes avec détails), clients qui dépensent le plus.
- **Événements** : création, modification, archivage, réactivation, suppression (bloquée si l'événement a déjà des commandes).
- **Codes promo** : pourcentage ou montant fixe, événement concerné, date limite, nombre d'utilisations ; même gestion que les événements.
- **Reçu** : nom de l'organisateur, signature (texte ou image).
- **Vérification** : recherche par numéro d'identification (identité de l'acheteur, paiement, état du ticket) et bouton « Valider l'entrée » pour empêcher une double entrée.
- **Profil** (fenêtre à droite) : nom, photo, citation de l'auteur, changement de mot de passe (actuel et nouveau), déconnexion.

## Règles de prix

| Élément | Prix |
|---|---|
| Ticket adulte | 1 000 F (modifiable par événement) |
| Adulte accompagnant | 1 000 F chacun |
| Enfant | 500 F chacun, 9 maximum (modifiable) |
| Produits du mois (chance + protection cumulés) | 1 = 2 000 F, 2 = 3 500 F, 3 = 5 000 F, soit `1 500 × n + 500` |

Les prix des tickets se règlent dans l'espace administrateur. Le prix des produits est défini dans `lib/pricing.js`. Tous les montants sont recalculés côté serveur ; le navigateur ne peut pas les imposer.

## Technologies
- **Next.js 14** (App Router) et React 18
- **PostgreSQL** (Supabase ou Neon) via `postgres`
- **FedaPay** (API REST, devise XOF)
- `jose` et `bcryptjs` pour la session et les mots de passe, `qrcode` pour le QR code
- Hébergement conseillé : **Vercel**

## Structure du projet
```
app/
  page.js                    site d'achat
  recu/[code]/page.js        reçu après paiement
  admin/page.js              espace administrateur
  api/checkout               création de la commande et du paiement FedaPay
  api/promo                  vérification d'un code promo
  api/webhook/fedapay        confirmation de paiement par FedaPay
  api/admin/[action]         API de l'administration
  api/setup                  installation initiale (à utiliser une seule fois)
components/                  Wizard (achat), Receipt (reçu), Admin
lib/                         base de données, prix, session, FedaPay, commandes
GUIDE.md                     guide de déploiement pas à pas
```

## Variables d'environnement

| Nom | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL (« Transaction pooler » avec Supabase) |
| `AUTH_SECRET` | Phrase aléatoire de 40 caractères minimum (signature des sessions) |
| `NEXT_PUBLIC_SITE_URL` | Adresse publique du site, sans `/` final |
| `FEDAPAY_SECRET_KEY` | Clé secrète FedaPay (test ou réelle) |
| `FEDAPAY_ENV` | `sandbox` (test) ou `live` (réel) |
| `SETUP_KEY` | Code temporaire pour l'installation, à supprimer ensuite |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Compte administrateur créé à l'installation, mot de passe à supprimer ensuite |
| `RESEND_API_KEY` / `EMAIL_FROM` | Facultatif : envoi des reçus par e-mail |

Un modèle se trouve dans `.env.example`. Ne publiez **jamais** de vraies valeurs sur GitHub.

## Installation en local (facultatif)
```bash
npm install
cp .env.example .env.local    # puis renseignez les valeurs
npm run dev
```
Ouvrez ensuite `http://localhost:3000/api/setup?key=VOTRE_SETUP_KEY` une seule fois pour créer les tables et le compte administrateur.
En local, mettez `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Le webhook FedaPay ne peut pas joindre votre ordinateur, mais la page de reçu vérifie quand même le paiement auprès de FedaPay.

## Déploiement
Suivez **GUIDE.md** : base de données, GitHub, FedaPay, Vercel, installation, webhook, e-mails, tests puis passage en réel.

## Circuit d'un paiement
1. Le client valide son panier : le serveur recalcule le total et crée une commande « en attente ».
2. Le serveur crée la transaction FedaPay et redirige le client vers la page de paiement sécurisée.
3. Après le paiement, FedaPay prévient le serveur (webhook) et ramène le client sur son reçu.
4. Dans les deux cas, le serveur redemande l'état de la transaction à FedaPay avec la clé secrète, vérifie le montant, puis marque la commande payée et affiche le reçu.

## Sécurité
- Les clés secrètes restent côté serveur (variables d'environnement Vercel).
- Mots de passe chiffrés (bcrypt) et session par cookie `httpOnly`.
- Le lien de reçu contient un jeton aléatoire ; la vérification du QR code exige d'être connecté comme administrateur.
- À prévoir en production : sauvegardes de la base, pages légales (conditions de vente, confidentialité), limitation des tentatives de connexion.

## Limites connues
Pas de limite de places par événement, pas d'export des commandes, pas de gestion des remboursements, pas de scan par caméra intégré (le QR s'ouvre avec l'appareil photo du téléphone).

## Licence
Projet privé. Tous droits réservés à l'organisateur.
