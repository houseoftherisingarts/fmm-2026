# GEO Audit Report : Festival Médiéval de Montpellier

**Date :** 2026-08-21 · **URL :** festivalmedievaldemontpellier.org · **Type :** événement local (festival) · **Méthode :** 5 auditeurs parallèles (citabilité, marque, technique, E-E-A-T, schéma), vue « HTML brut » = ce que voient réellement les robots IA.

## Score GEO global : 33/100 (faible)

Le paradoxe du site : une couche métadonnées EXCELLENTE (JSON-LD Festival complet, llms.txt exemplaire, sitemap hreflang, robots ouverts aux IA, IndexNow) posée sur un corps INVISIBLE. Le site est une SPA React : pour tout robot qui n'exécute pas le JavaScript (ChatGPT, Claude, Perplexity, tous sauf Google), chaque page du site est un `<div id="root"></div>` vide. Les seuls faits que les IA peuvent citer viennent du bloc JSON-LD de l'accueil et du llms.txt.

| Catégorie | Score | Poids |
|---|---|---|
| Citabilité IA | 8/100 | 25 % |
| Autorité de marque | 42/100 | 20 % |
| Contenu E-E-A-T | 22/100 | 20 % |
| Technique GEO | 58/100 | 15 % |
| Schéma / données structurées | 61/100 | 10 % |
| Plateformes | ~35/100 | 10 % |
| **Global** | **33/100** | |

## LE constat (critique)
**Prérendu absent.** Les 34 routes servent le même index.html : aucun texte, aucun titre par page, canonical identique partout. Tant que ce n'est pas réglé, rien d'autre ne compte vraiment. Corrections : prerender/SSG au build (react-snap ou script Puppeteer sur les 34 routes du sitemap) OU fallback statique par route (title + meta + bloc de faits + JSON-LD par page).

## Priorités
1. **CRITIQUE · Prérendu des 34 routes** (citabilité 8 → 60+ à lui seul). Meta/title/JSON-LD PAR page (billets = prix; contact = adresse; hébergement = camping).
2. **HAUTE · Ambiguïté Montpellier** : sans « Québec/Outaouais » dans la requête, les IA répondent Montpellier FRANCE. Créer une entrée Wikidata « Festival Médiéval de Montpellier (Québec) », uniformiser le nom partout avec le qualificatif.
3. **HAUTE · Inscriptions autorité absentes** : Bonjour Québec et Tourisme Outaouais ne listent pas le festival (Tourisme Petite-Nation oui). Ce sont les 2 sources que les IA pèsent le plus pour le Québec.
4. **MOYENNE · Schéma** : startDate/endDate sans heure ni fuseau; geo (lat/long) absent; offers sans validFrom/priceValidUntil; image simple au lieu d'un array; inLanguage mal placé. FAQPage/BreadcrumbList/WebSite inexploités.
5. **MOYENNE · E-E-A-T** : ni téléphone, ni courriel, ni identité d'organisateur dans le HTML brut; partenaires (municipalité, MRC = signaux d'autorité forts) invisibles.
6. **BASSE · Presse** : une seule mention média (Le Droit 2021). Une mention Radio-Canada/nationale diversifierait l'entité.

## Déjà en place (forces)
robots.txt ouvert à tous les robots IA · llms.txt best-in-class (dates, prix, adresse, programmation) · sitemap 34 URLs hreflang · IndexNow actif (Bing → ChatGPT search) · JSON-LD Festival avec 9 performers, offres, adresse · fichier de vérification Search Console posé · Facebook actif, municipalité + Tourisme Petite-Nation le listent.

## Plan 30 jours
- **S1 :** prérendu des 34 routes + meta par page + valider au Rich Results Test.
- **S2 :** schéma enrichi (heures réelles + geo + validFrom) · bloc organisateur/contact statique.
- **S3 :** Wikidata + soumissions Bonjour Québec / Tourisme Outaouais.
- **S4 :** FAQPage (billets, accès, camping) + une approche presse.
