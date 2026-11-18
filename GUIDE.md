# Guide de déploiement – Nouvelle Lune (billetterie)

Temps estimé : 1 h 30 à 2 h. Tout se fait depuis un navigateur. Commencez en mode **test** FedaPay.

## Ce que contient le projet
- Site d'achat : `/` (tickets, produits, code promo, paiement FedaPay)
- Reçu avec QR code et téléchargement PDF/PNG : `/recu/...`
- Espace administrateur : `/admin` (tableau de bord, événements, codes promo, reçu, vérification, profil)
- Serveur : paiement, confirmation FedaPay (webhook), base de données

## Étape 1 – Créer la base de données (Supabase)
1. Créez un compte sur supabase.com, puis **New project** (choisissez un mot de passe de base de données et notez-le).
2. Ouvrez le projet, cliquez sur **Connect** (en haut) et copiez la chaîne **Transaction pooler** (port 6543). Elle ressemble à `postgresql://postgres.xxxx:[YOUR-PASSWORD]@...:6543/postgres`.
3. Remplacez `[YOUR-PASSWORD]` par votre mot de passe. S'il contient des caractères spéciaux (@ # / :), remplacez-les par leur code (ex. `@` devient `%40`).
4. Gardez cette valeur : c'est votre `DATABASE_URL`.

## Étape 2 – Mettre le projet sur GitHub
1. Créez un compte sur github.com puis **New repository** (nom : `nouvelle-lune`, visibilité **Private**).
2. Décompressez le ZIP sur votre ordinateur.
3. Dans le dépôt, cliquez **uploading an existing file**, glissez **tout le contenu du dossier** (pas le dossier lui-même), puis **Commit changes**.
4. Vérifiez que `package.json` est visible à la racine du dépôt.
   Ne mettez jamais de fichier `.env` sur GitHub.

## Étape 3 – FedaPay (mode test)
1. Créez un compte sur fedapay.com. Le mode **Sandbox** (test) est utilisable tout de suite.
2. Dans le tableau de bord, section **API / Clés**, copiez la **clé secrète sandbox** (`sk_sandbox_...`) : c'est `FEDAPAY_SECRET_KEY`.
3. Lancez en parallèle la validation de votre compte pour le mode réel (pièces d'identité ou documents de l'entreprise). Elle peut prendre du temps.

## Étape 4 – Publier sur Vercel
1. Créez un compte sur vercel.com (connexion avec GitHub), puis **Add New > Project** et importez `nouvelle-lune`.
2. Avant de cliquer **Deploy**, ouvrez **Environment Variables** et ajoutez :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | la chaîne Supabase (étape 1) |
| `AUTH_SECRET` | une longue phrase aléatoire (40 caractères minimum) |
| `NEXT_PUBLIC_SITE_URL` | provisoirement `https://nouvelle-lune.vercel.app` (corrigé à l'étape 5) |
| `FEDAPAY_SECRET_KEY` | la clé sandbox |
| `FEDAPAY_ENV` | `sandbox` |
| `SETUP_KEY` | un code temporaire de votre choix |
| `ADMIN_USERNAME` | l'identifiant administrateur (ex. `admin`) |
| `ADMIN_PASSWORD` | un mot de passe solide (8 caractères minimum) |
| `RESEND_API_KEY` | (facultatif) étape 8 |
| `EMAIL_FROM` | (facultatif) `Nouvelle Lune <billets@votre-domaine.com>` |

3. Cliquez **Deploy** et attendez le message de réussite. Notez l'adresse du site.

## Étape 5 – Corriger l'adresse du site
1. Dans Vercel > **Settings > Environment Variables**, modifiez `NEXT_PUBLIC_SITE_URL` avec la vraie adresse (sans `/` final).
2. **Deployments > ... > Redeploy** pour que le changement soit pris en compte.

## Étape 6 – Installer la base (une seule fois)
1. Ouvrez dans le navigateur : `https://VOTRE-SITE/api/setup?key=VOTRE_SETUP_KEY`
2. Le message « Installation terminée » doit apparaître (il crée les tables, votre compte administrateur et l'événement « Nouvelle Lune »).
3. **Aussitôt après**, supprimez `SETUP_KEY` et `ADMIN_PASSWORD` dans Vercel, puis redéployez.
4. Ouvrez `https://VOTRE-SITE/admin` et connectez-vous. Réglez dans **Événements** (date, lieu, prix), **Reçu** (organisateur, signature) et **Profil** (citation, photo, mot de passe).

## Étape 7 – Brancher la confirmation de paiement (webhook FedaPay)
1. Dans FedaPay > **Webhooks > Créer un webhook**.
2. URL : `https://VOTRE-SITE/api/webhook/fedapay` (HTTPS obligatoire).
3. Cochez au minimum l'événement **transaction.approved**. Enregistrez.
Même sans webhook, la page de reçu vérifie le paiement auprès de FedaPay quand le client revient sur le site, mais le webhook sécurise les cas où le client ferme la page.

## Étape 8 – E-mails (facultatif)
1. Créez un compte sur resend.com, ajoutez et validez votre domaine, créez une clé API.
2. Renseignez `RESEND_API_KEY` et `EMAIL_FROM` dans Vercel, puis redéployez.
Sans cela, le client voit son reçu directement après le paiement mais ne le reçoit pas par e-mail.

## Étape 9 – Tester en mode sandbox
1. Sur le site, faites une réservation complète avec un faux client.
2. Sur la page FedaPay, utilisez les moyens de paiement de test indiqués dans la documentation FedaPay (sandbox).
3. Vérifiez : reçu affiché, téléchargement PDF et PNG, QR code, puis dans `/admin` le tableau de bord, l'onglet **Vérification** (avec le numéro du reçu) et **Valider l'entrée**.
4. Testez un code promo, l'archivage d'un événement et le changement de mot de passe.

## Étape 10 – Passer en réel
1. Quand FedaPay a validé votre compte : copiez la **clé secrète live** dans `FEDAPAY_SECRET_KEY` et mettez `FEDAPAY_ENV` à `live`.
2. Recréez le webhook côté **live** (mêmes réglages qu'à l'étape 7).
3. Redéployez et faites un vrai paiement de petit montant entre vous, puis vérifiez la réception des fonds.
4. Domaine personnalisé : Vercel > **Settings > Domains**, ajoutez votre domaine et suivez les instructions DNS de votre registrar. Mettez ensuite `NEXT_PUBLIC_SITE_URL` à jour et redéployez.

## Points d'attention
- **Hébergement commercial** : le plan gratuit (Hobby) de Vercel est réservé à un usage personnel non commercial. Pour vendre des tickets, vérifiez les conditions actuelles de Vercel et prévoyez probablement un plan payant.
- **Pages légales** : ajoutez conditions de vente, politique de confidentialité et mentions légales (vous collectez noms, téléphones, e-mails).
- **Sauvegardes** : activez les sauvegardes de votre projet Supabase.
- **Le numéro de téléphone** du client est enregistré pour vos vérifications. Le paiement Mobile Money se fait sur la page sécurisée FedaPay, où le client choisit son opérateur et son numéro.
- **QR code** : il contient l'adresse `/admin?verifier=NUMERO`. L'administrateur connecté qui scanne le QR avec l'appareil photo de son téléphone arrive sur la vérification avec le numéro prérempli et peut valider l'entrée.
- **Sécurité** : changez le mot de passe administrateur, n'utilisez jamais les clés FedaPay dans le navigateur, ne partagez pas la clé secrète.
- **Limites connues de cette version** : pas de limitation du nombre de tentatives de connexion, pas de limite de places par événement, pas d'export des commandes, pas de gestion des remboursements. Ils peuvent être ajoutés ensuite.

## En cas de problème
- **Page blanche ou erreur 500** : Vercel > **Logs** ; vérifiez `DATABASE_URL` et que l'étape 6 a été faite.
- **« Impossible de lancer le paiement »** : vérifiez `FEDAPAY_SECRET_KEY` et `FEDAPAY_ENV` (clé sandbox avec `sandbox`, clé live avec `live`), puis les logs.
- **Reçu « Paiement en attente »** : attendez quelques secondes et actualisez ; vérifiez le webhook et le statut de la transaction dans FedaPay.
- **Connexion administrateur refusée** : l'identifiant est en minuscules ; relancez l'étape 6 n'écrase pas un compte existant, modifiez le mot de passe depuis le profil si vous le connaissez.
- **Modification de variables sans effet** : il faut redéployer.
