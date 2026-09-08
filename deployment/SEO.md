# Référencement de CDK Team à Sevran

Domaine public : https://team-cdk.fr/

Recherches cibles : `cdk jjb`, `cdk sevran`, `cdk`, `cdk team`, `jjb sevran`.
Le titre de l'accueil associe le nom du club, JJB, Sevran et le nom complet de la discipline. Les données WebSite identifient le nom du site ; elles ne garantissent pas une position dans Google.

Dans Search Console, suivre chaque requête dans Performances / Résultats de recherche, avec le filtre de page `https://team-cdk.fr/` : impressions, clics et position moyenne, en conservant les mêmes filtres de pays et d'appareil pour comparer. Attendre des données après la nouvelle exploration avant de conclure sur les effets.

Actions externes restantes (comptes du club nécessaires) : vérifier et actualiser le lien du site sur la fiche Google, Facebook, Instagram et Smoothcomp ; demander aux partenaires et à la mairie d'actualiser leurs liens vers le domaine officiel. Aucun de ces comptes n'a été modifié par le déploiement.

## Publication

Les modifications doivent être transférées sur le VPS avant publication.
Depuis le dépôt à jour sur le VPS, lancer `bash deployment/deploy.sh client`.
Le script existant reconstruit et publie le client dans `/var/www/cdk-team/dist`.

Vérifier après publication :

- `/robots.txt` renvoie un fichier texte qui annonce le sitemap.
- `/sitemap.xml` renvoie le XML des quatre pages publiques.
- Le titre de l'accueil est « CDK Team – JJB à Sevran | Jiu-jitsu brésilien ».
- Après chargement, chaque page publique possède une seule canonique correspondant à son chemin, sans paramètres ni fragment.
- Les routes administratives portent `noindex, nofollow` après exécution du JavaScript ; elles restent protégées par l'authentification existante.

L'accueil est prérendu dans `dist/home.html` avec les données publiques récupérées à chaque build : mêmes composants Vue, planning, tarifs, coachs et documents. La route Nginx exacte `/` sert ce fichier (voir `nginx.conf.example`). Les autres routes utilisent toujours le shell Vue. La canonique de l'accueil est présente dans le HTML initial.

Le navigateur initialise l'accueil avec ce contenu puis recharge l'API pour afficher les données à jour. Après modification du contenu dans l'administration, relancer le déploiement client pour actualiser également le HTML prérendu. Le build Docker invalide son cache de compilation à chaque déploiement pour récupérer les nouvelles données. Si l'API échoue, le build s'arrête avant publication. En local, le prérendu est ignoré si `VITE_API_URL` n'est pas défini.

Les aperçus sociaux des pages secondaires utilisent encore les métadonnées initiales communes. L'adresse complète et les coordonnées du club restent à renseigner dans l'administration.

## Google Search Console

Cette étape nécessite un compte Google autorisé et une validation de propriété.

1. Ouvrir https://search.google.com/search-console et ajouter la propriété Domaine `team-cdk.fr`.
2. Copier l'enregistrement TXT fourni dans la configuration DNS du domaine, puis valider.
3. Soumettre `https://team-cdk.fr/sitemap.xml` dans Sitemaps.
4. Inspecter `https://team-cdk.fr/`, tester l'URL publiée et demander son indexation.
5. Consulter ensuite les rapports d'indexation et de performance.

Ne pas inventer de jeton de validation et ne jamais ajouter de mot de passe Google au dépôt.

## Fiche d'établissement

Revendiquer la fiche existante du club ou en créer une si elle n'existe pas, avec son nom réel, son adresse complète, son téléphone, ses horaires et https://team-cdk.fr/.
La validation doit être effectuée par un représentant du club selon la méthode proposée par Google.
L'adresse de rue et le téléphone ne sont pas ajoutés aux données structurées tant qu'ils ne sont pas confirmés.

L'indexation et la position dans les résultats sont décidées par Google et ne sont pas garanties par ces modifications.
