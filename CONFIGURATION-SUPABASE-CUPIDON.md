# Configuration Supabase — Cupidon Rencontres (comptes membres)

Guide pas à pas pour activer le nouveau système d'inscription/connexion.
Tout se passe sur https://supabase.com/dashboard → projet **vincxrmtfjbenlzhjwby** (le même que Pull Up Hub).

⏱️ Temps total : environ 15 minutes. Les étapes 1 et 2 sont **obligatoires**,
les étapes 3 à 5 améliorent l'expérience, l'étape 6 active les mails de bienvenue.

---

## Étape 1 — Créer les tables (OBLIGATOIRE)

1. Menu de gauche → **SQL Editor** → **New query**.
2. Ouvrir le fichier `sql/cupidon-auth.sql` de ce dossier, tout copier, tout coller.
3. Cliquer **Run**. Il doit afficher « Success ».

Ce script crée uniquement de nouvelles choses (profils, journal, photos).
Il ne touche à rien d'existant (Pull Up Hub, inscriptions_cupidon).

## Étape 2 — Autoriser les adresses de retour (OBLIGATOIRE)

Les liens des e-mails (confirmation, mot de passe) doivent ramener vers l'appli.

1. Menu → **Authentication** → **URL Configuration**.
2. **Site URL** : laisser tel quel s'il y a déjà quelque chose pour Pull Up Hub ;
   sinon mettre `https://cupidon.re/app/`.
3. Dans **Redirect URLs**, ajouter ces lignes (bouton *Add URL*) :
   - `https://cupidon.re/app/confirmation.html`
   - `https://cupidon.re/app/nouveau-mot-de-passe.html`
   - `http://localhost:8777/app/confirmation.html` *(pour les tests)*
   - `http://localhost:8777/app/nouveau-mot-de-passe.html` *(pour les tests)*
4. **Save**.

## Étape 3 — Règles de mot de passe et durée des liens (recommandé)

1. **Authentication** → **Providers** → **Email** :
   - *Minimum password length* : **8**
   - *Password Requirements* : choisir **« Lowercase, uppercase letters, digits and symbols »**
     (l'appli affiche déjà ces critères pendant la saisie).
2. **Authentication** → **Sessions / Security** (selon l'interface) :
   - *Email OTP expiration* : **1800** secondes (= liens valables 30 minutes).

Supabase gère déjà tout seul : le chiffrement des mots de passe (bcrypt, jamais
en clair), la limitation des tentatives, l'usage unique des liens, les cookies
sécurisés et le HTTPS.

## Étape 4 — Textes des e-mails en français (recommandé)

**Authentication** → **Email Templates**. Pour chaque onglet, remplacer le sujet
et le contenu par ceci :

### Onglet « Confirm signup »
Sujet : `Confirme ton adresse — Cupidon Rencontres 💘`
```html
<h2>Bienvenue {{ .Data.prenom }} !</h2>
<p>Plus qu'un clic pour activer ton compte sur <b>Cupidon Rencontres</b>,
l'appli de rencontres 100 % La Réunion.</p>
<p style="margin:26px 0">
  <a href="{{ .ConfirmationURL }}"
     style="background:#F2C200;color:#3A2C00;padding:14px 26px;border-radius:12px;
            text-decoration:none;font-weight:bold;font-family:Arial,sans-serif">
     Confirmer mon adresse e-mail
  </a>
</p>
<p>Tant que ce n'est pas fait, ton compte reste inactif.</p>
<p style="color:#6B7A9E;font-size:13px">Si tu n'es pas à l'origine de cette
inscription, ignore simplement ce message.</p>
<p>À tout de suite !<br><b>L'équipe PullUpCupidon.re</b></p>
```

### Onglet « Reset password »
Sujet : `Réinitialisation de votre mot de passe Cupidon.re`
```html
<h2>Bonjour {{ .Data.prenom }},</h2>
<p>Vous avez demandé à réinitialiser le mot de passe de votre compte Cupidon.re.</p>
<p>Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>
<p style="margin:26px 0">
  <a href="{{ .ConfirmationURL }}"
     style="background:#C90D00;color:#ffffff;padding:14px 26px;border-radius:12px;
            text-decoration:none;font-weight:bold;font-family:Arial,sans-serif">
     Réinitialiser mon mot de passe
  </a>
</p>
<p>Ce lien est personnel et temporaire. Si vous n'êtes pas à l'origine de cette
demande, vous pouvez ignorer cet e-mail et votre mot de passe restera inchangé.</p>
<p><b>L'équipe Cupidon.re</b></p>
```

### Onglet « Change email address »
Sujet : `Confirme ta nouvelle adresse — Cupidon.re`
```html
<h2>Bonjour {{ .Data.prenom }},</h2>
<p>Tu as demandé à utiliser une nouvelle adresse e-mail sur Cupidon.re.</p>
<p style="margin:26px 0">
  <a href="{{ .ConfirmationURL }}"
     style="background:#F2C200;color:#3A2C00;padding:14px 26px;border-radius:12px;
            text-decoration:none;font-weight:bold;font-family:Arial,sans-serif">
     Confirmer ma nouvelle adresse
  </a>
</p>
<p>Si tu n'es pas à l'origine de cette demande, ignore ce message et contacte-nous
à contact@pullup.re.</p>
<p><b>L'équipe Cupidon.re</b></p>
```

## Étape 5 — Expéditeur des e-mails (IMPORTANT avant le lancement du 1ᵉʳ août)

⚠️ Par défaut, Supabase n'envoie que **2 à 4 e-mails par heure** (service de test).
Pour un lancement avec beaucoup d'inscriptions, il FAUT brancher un vrai
expéditeur :

1. **Project Settings** → **Authentication** (section *SMTP Settings*) → *Enable Custom SMTP*.
2. Utiliser la boîte Hostinger existante, par exemple :
   - Host : `smtp.hostinger.com` — Port : `465`
   - Utilisateur : `contact@pullup.re` (ou mieux : créer `bonjour@cupidon.re` dans Hostinger)
   - Mot de passe : celui de la boîte mail
   - Sender email : la même adresse — Sender name : `Cupidon Rencontres`
3. Sauvegarder, puis tester une inscription.

## Étape 6 — Mails de bienvenue + notification équipe (optionnel mais conseillé)

Ces deux mails (« Bienvenue sur PullUpCupidon.re ❤️ » au membre, et
« Nouvelle inscription » à contact@pullup.re) passent par une petite fonction.

1. Créer un compte gratuit sur https://resend.com (100 e-mails/jour offerts),
   ajouter le domaine `cupidon.re` (Resend affiche 2-3 lignes DNS à recopier
   dans Cloudflare) et créer une **API Key**.
2. Dashboard Supabase → **Edge Functions** → **Deploy a new function** :
   - Nom : `cupidon-mails`
   - Coller le contenu du fichier `supabase/functions/cupidon-mails/index.ts`
   - Deploy.
3. Toujours dans Edge Functions → **Secrets** (ou *Manage secrets*), ajouter :
   - `RESEND_API_KEY` = la clé Resend
   - `MAIL_EXPEDITEUR` = `Cupidon.re <bonjour@cupidon.re>`
   - `MAIL_ADMIN` = `contact@pullup.re`

Sans cette étape, l'appli fonctionne quand même : la notification d'inscription
part alors par le formulaire relais (FormSubmit) vers contact@pullup.re, et
seul le mail de bienvenue n'est pas envoyé.

---

## Ce qui est géré automatiquement (rien à faire)

- Mots de passe chiffrés avec bcrypt, jamais visibles ni stockés en clair.
- Compte inactif tant que l'e-mail n'est pas confirmé.
- Liens de confirmation/réinitialisation uniques, à durée limitée, invalidés après usage.
- Limitation des tentatives de connexion (serveur) + frein côté appli après 5 échecs.
- Message neutre « Si un compte existe… » (on ne révèle jamais si une adresse est inscrite).
- Déconnexion des autres appareils après changement de mot de passe.
- Sessions sécurisées avec renouvellement automatique, compatibles gestionnaires
  de mots de passe (Apple, Google, Chrome, Safari).
- Photos : bucket privé, chacun ne peut écrire que dans son dossier, liens signés.
- Données protégées par règles RLS ligne par ligne.

## Comptes de test

Pour vérifier que tout marche : s'inscrire avec une vraie adresse perso,
puis supprimer le compte de test dans **Authentication** → **Users** → ⋮ → *Delete user*.
