# Référencement de CDK Team à Sevran

Domaine public : https://team-cdk.fr/

## Publication

Les modifications doivent être transférées sur le VPS avant publication.
Depuis le dépôt à jour sur le VPS, lancer `bash deployment/deploy.sh client`.
Le script existant reconstruit et publie le client dans `/var/www/cdk-team/dist`.

Vérifier après publication :

- `/robots.txt` renvoie un fichier texte qui annonce le sitemap.
- `/sitemap.xml` renvoie le XML des quatre pages publiques.
- Le titre de l'accueil est « CDK Team Sevran – Club de jiu-jitsu brésilien ».
- Après chargement, chaque page publique possède une seule canonique correspondant à son chemin, sans paramètres ni fragment.
- Les routes administratives portent `noindex, nofollow` après exécution du JavaScript ; elles restent protégées par l'authentification existante.

Le contenu public dépend toujours du rendu Vue et de l'API. Aucun prérendu ou rendu serveur n'est ajouté par cette modification. Les aperçus sociaux des pages secondaires utilisent encore les métadonnées initiales communes.

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
