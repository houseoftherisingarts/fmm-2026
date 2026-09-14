# -*- coding: utf-8 -*-
"""Les vingt-sept recettes du festival, écrites pour quatre personnes.

Marc-Alexis Pepin, le chef, a demandé le 14 septembre 2026 que la
formulation du livre suive celle de Ricardo Cuisine, parce que c'est le
langage que les gens d'ici lisent déjà dans leur cuisine. Les
conventions relevées sur ricardocuisine.com et reprises ici :

  · la mesure métrique d'abord, l'impériale entre parenthèses, puis
    « de » et l'ingrédient : « 30 ml (2 c. à soupe) d'huile d'olive » ;
  · ce qu'on fait subir à l'ingrédient suit la virgule, au participe :
    « 2 gousses d'ail, hachées finement » ;
  · ce qui se compte se compte, plutôt que de se peser : « 1 oignon
    jaune, émincé » vaut mieux que « 160 g d'oignon » ;
  · les listes se coupent en sections nommées quand la recette en a
    plusieurs, du genre « Marinade », « Vinaigrette », « Picada » ;
  · l'étape commence par le lieu, puis le verbe à l'infinitif, et elle
    finit par le temps ET l'indice visuel : « Dans une grande poêle, à
    feu moyen, dorer les oignons environ 10 minutes ou jusqu'à ce
    qu'ils soient bien colorés. »

Les quantités viennent des fiches de cuisine du festival, divisées par
le rendement de chaque fiche puis ramenées à quatre parts, et enfin
arrondies à ce qui se mesure vraiment dans une cuisine de maison. Les
temps affichés en tête de fiche ne sont donnés que lorsque le chef les
a écrits lui-même : rien n'a été inventé.
"""

# Chaque entrée : titre, chapeau, temps (liste de couples), ingrédients
# (liste de sections, chacune un couple titre-ou-None et ses lignes),
# étapes, et la note de fin s'il y en a une.

RECETTES = {

# ── I · La marmite du campement ──────────────────────────────────────

'olla gitana': {
 'titre': 'Olla gitana aux pois chiches et à la courge',
 'chapeau': "Le grand pot des campements gitans, où passait tout ce que la caravane avait sous la main : pois chiches, courge, poires fermes. Il mijote tout l'après-midi et se sert dans un bol qu'on tient à deux mains.",
 'temps': [('4 portions', ''), ('Trempage', '12 h'), ('Cuisson', '2 h')],
 'ingredients': [
   ('Le ragoût', [
     "300 g (1 ½ tasse) de pois chiches secs",
     "250 g (1 ¼ tasse) de haricots blancs secs",
     "45 ml (3 c. à soupe) d'huile d'olive",
     "1 gros oignon jaune, haché",
     "6 gousses d'ail, hachées",
     "2 carottes, pelées et coupées en rondelles",
     "250 g (2 tasses) de pommes de terre, pelées et coupées en cubes de 4 cm (1 ½ po)",
     "1,125 L (4 ½ tasses) de bouillon de légumes",
     "1 feuille de laurier",
     "7,5 ml (1 ½ c. à thé) de paprika doux",
     "5 ml (1 c. à thé) de cumin moulu",
     "1 ml (¼ c. à thé) de pistils de safran, broyés",
     "400 g (3 tasses) de courge musquée, pelée et coupée en cubes de 2 cm (¾ po)",
     "160 g (1 tasse) de tomates fraîches, épépinées et concassées",
     "160 g (1 ½ tasse) de haricots verts ou jaunes, parés",
     "1 poire ferme, pelée et coupée en cubes",
     "7,5 ml (1 ½ c. à thé) de sel",
     "2,5 ml (½ c. à thé) de poivre",
     "30 ml (2 c. à soupe) de persil plat frais, ciselé",
     "15 ml (1 c. à soupe) de menthe fraîche, ciselée",
   ]),
   ('La picada', [
     "1 tranche de pain de campagne, grillée",
     "1 petite tête d'ail, rôtie",
     "30 ml (2 c. à soupe) d'huile d'olive",
     "80 ml (1/3 tasse) de bouillon de légumes, chaud",
     "15 ml (1 c. à soupe) de vinaigre de cidre",
   ]),
 ],
 'etapes': [
   "La veille, dans deux bols séparés, couvrir les pois chiches et les haricots blancs d'eau froide et laisser tremper 12 heures. Égoutter.",
   "Dans une grande casserole, couvrir les légumineuses d'eau froide. Porter à ébullition, puis laisser mijoter à feu moyen-doux environ 1 heure ou jusqu'à ce qu'elles soient presque tendres. Égoutter.",
   "Dans une grande marmite, chauffer l'huile à feu moyen. Y ajouter le bouillon, l'oignon, l'ail, les carottes, les pommes de terre, le laurier, le paprika, le cumin et le safran, puis les légumineuses égouttées. Porter à ébullition et laisser mijoter 20 minutes.",
   "Ajouter la courge et les tomates. Poursuivre la cuisson 15 minutes.",
   "Ajouter les haricots verts et cuire de 8 à 10 minutes. Ajouter la poire dans les dernières minutes seulement, pour qu'elle reste légèrement ferme.",
   "Entre-temps, au robot culinaire, réduire en pâte le pain grillé, l'ail rôti, l'huile, le bouillon chaud et le vinaigre.",
   "Incorporer la picada au ragoût et laisser mijoter 15 minutes ou jusqu'à ce que le bouillon épaississe de lui-même. Saler et poivrer.",
   "Au moment de servir, parsemer de persil et de menthe.",
 ],
 'note': "La picada est ce qui lie ce ragoût : il n'y a ni farine ni crème là-dedans, seulement du pain grillé et de l'ail rôti broyés dans du bouillon.",
},

'goulash': {
 'titre': 'Goulash de bœuf au paprika',
 'chapeau': "La palette de bœuf mijote trois heures dans le paprika hongrois avec des racines coupées gros. C'est la marmite qu'on laisse sur le feu pendant qu'on monte les tentes, et elle sera encore meilleure le lendemain.",
 'temps': [('4 portions', ''), ('Cuisson', '3 h')],
 'ingredients': [
   (None, [
     "800 g (1 ¾ lb) de rôti de palette de bœuf désossé, coupé en cubes de 3 cm (1 ¼ po)",
     "30 ml (2 c. à soupe) d'huile de canola",
     "2 oignons jaunes, émincés",
     "6 gousses d'ail, hachées",
     "30 ml (2 c. à soupe) de paprika hongrois doux",
     "5 ml (1 c. à thé) de paprika fumé",
     "5 ml (1 c. à thé) de graines de carvi, moulues",
     "2 tomates, épépinées et concassées",
     "1 litre (4 tasses) de fond de bœuf",
     "60 ml (¼ tasse) de vin rouge",
     "1 feuille de laurier",
     "7,5 ml (1 ½ c. à thé) de marjolaine séchée",
     "10 ml (2 c. à thé) de thym frais, haché",
     "10 ml (2 c. à thé) de sel kasher",
     "2,5 ml (½ c. à thé) de poivre noir moulu",
     "2 pommes de terre, pelées et coupées en gros dés",
     "2 carottes, pelées et coupées en rondelles",
     "160 g (1 tasse) de rutabaga, pelé et coupé en gros dés",
     "1 poivron rouge, coupé en dés",
     "30 ml (2 c. à soupe) de farine grillée",
     "30 ml (2 c. à soupe) de persil plat frais, ciselé",
   ]),
 ],
 'etapes': [
   "Dans une grande casserole, chauffer l'huile à feu vif. Y colorer le bœuf en deux ou trois fois, sans surcharger la casserole, jusqu'à ce qu'il soit bien doré sur toutes les faces. Réserver sur une assiette.",
   "Dans la même casserole, à feu moyen, dorer les oignons environ 10 minutes ou jusqu'à belle coloration. Ajouter l'ail et poursuivre la cuisson 1 minute.",
   "Retirer du feu. Ajouter les paprikas et le carvi, puis remuer 30 secondes : hors du feu, les paprikas libèrent leur parfum sans brûler.",
   "Remettre sur le feu. Ajouter les tomates, le fond de bœuf, le vin, le laurier, la marjolaine, le thym, le sel et le poivre, puis la viande et le jus qu'elle a rendu. Porter à ébullition.",
   "Couvrir et laisser mijoter à feu doux environ 2 h 30 ou jusqu'à ce que la viande se défasse à la fourchette.",
   "Ajouter les pommes de terre, les carottes et le rutabaga. Poursuivre la cuisson 25 minutes, en ajoutant le poivron dans les 20 dernières minutes.",
   "Délayer la farine grillée dans un peu de bouillon chaud, puis l'incorporer au ragoût. Laisser mijoter 5 minutes ou jusqu'à ce que la sauce nappe la cuillère.",
   "Rectifier l'assaisonnement et parsemer de persil au moment de servir.",
 ],
 'note': "La farine se grille à sec dans une poêle, à feu moyen, jusqu'à ce qu'elle prenne une couleur de noisette. C'est elle qui donne au goulash son goût de marmite plutôt qu'un simple bouillon lié.",
},

# ── II · Les grillages ───────────────────────────────────────────────

'brochette de poulet du verger': {
 'titre': "Brochettes de poulet au cidre et à l'érable",
 'chapeau': "Les cuisses de poulet marinent une nuit dans le cidre et le sirop d'érable, puis grillent jusqu'à ce que les arêtes caramélisent. C'est la brochette qui sent le verger, et c'est celle qui part la première.",
 'temps': [('4 portions, 2 brochettes chacune', ''), ('Marinage', '12 à 24 h'), ('Cuisson', '15 min')],
 'ingredients': [
   ('La marinade', [
     "180 ml (¾ tasse) de cidre du Québec",
     "80 ml (1/3 tasse) d'huile de canola",
     "45 ml (3 c. à soupe) de moutarde de Dijon",
     "45 ml (3 c. à soupe) de sirop d'érable",
     "8 gousses d'ail, hachées",
     "2 échalotes françaises, hachées finement",
     "30 ml (2 c. à soupe) de thym frais, haché",
     "15 ml (1 c. à soupe) de romarin frais, haché",
     "Le zeste de 1 citron",
     "10 ml (2 c. à thé) de sel kasher",
     "5 ml (1 c. à thé) de poivre noir moulu",
   ]),
   ('Les brochettes', [
     "1 kg (2 lb) de hauts de cuisse de poulet désossés, coupés en cubes de 4 cm (1 ½ po)",
     "1 oignon rouge, coupé en quartiers et défait en pétales",
     "1 poivron rouge, coupé en gros morceaux",
     "240 g (3 tasses) de champignons blancs, coupés en deux",
   ]),
 ],
 'etapes': [
   "Dans un grand bol, mélanger au fouet tous les ingrédients de la marinade.",
   "Ajouter le poulet et remuer pour bien l'enrober. Couvrir et réfrigérer de 12 à 24 heures.",
   "Égoutter le poulet et jeter la marinade. Sur des brochettes, enfiler le poulet en alternance avec l'oignon, le poivron et les champignons, à raison d'environ 5 morceaux par brochette.",
   "Préchauffer le barbecue à puissance moyenne-élevée. Huiler la grille.",
   "Griller les brochettes de 12 à 15 minutes, en les retournant à quelques reprises, jusqu'à ce qu'un thermomètre inséré au centre du poulet indique 74 °C (165 °F).",
 ],
 'note': "Sans barbecue, les brochettes se font à la plancha, ou au four à 220 °C (425 °F) sur une plaque, de 20 à 25 minutes. Elles se servent avec la sauce au cidre de la page suivante.",
},

'sauce au cidre': {
 'titre': 'Sauce au cidre et aux deux moutardes',
 'chapeau': "C'est la sauce qui accompagne les brochettes du verger : le cidre réduit jusqu'à napper la cuillère, les deux moutardes donnent la longueur en bouche et une pointe d'érable referme le tout.",
 'temps': [('Rendement', 'environ 250 ml (1 tasse)'), ('Cuisson', '20 min')],
 'ingredients': [
   (None, [
     "15 ml (1 c. à soupe) de beurre",
     "3 échalotes françaises, hachées finement",
     "180 ml (¾ tasse) de cidre",
     "80 ml (1/3 tasse) de fond de volaille",
     "30 ml (2 c. à soupe) de moutarde à l'ancienne",
     "15 ml (1 c. à soupe) de moutarde de Dijon",
     "30 ml (2 c. à soupe) de crème 35 %",
     "15 ml (1 c. à soupe) de sirop d'érable",
     "5 ml (1 c. à thé) de vinaigre de cidre",
     "Sel et poivre, au goût",
   ]),
 ],
 'etapes': [
   "Dans une petite casserole, faire fondre le beurre à feu moyen. Y faire suer les échalotes environ 3 minutes, sans les colorer.",
   "Ajouter le cidre et laisser réduire de moitié.",
   "Ajouter le fond de volaille et laisser réduire jusqu'à ce que la sauce nappe le dos d'une cuillère.",
   "Retirer du feu. Incorporer les deux moutardes, le sirop d'érable, la crème et le vinaigre. Saler et poivrer.",
 ],
 'note': "Pour une sauce plus ronde, la monter hors du feu avec 15 ml (1 c. à soupe) de beurre froid coupé en dés, en fouettant jusqu'à ce qu'il disparaisse.",
},

'boeuf kawaps': {
 'titre': 'Brochettes de bœuf façon kawaps',
 'chapeau': "Les cubes de macreuse s'attendrissent au bicarbonate, puis marinent une nuit dans l'huile d'olive, l'oignon râpé et les deux paprikas. Ça se mange brûlant, dans le pain, avec la sauce froide à côté.",
 'temps': [('4 portions, 2 brochettes chacune', ''), ('Marinage', '12 à 24 h'), ('Cuisson', '10 min')],
 'ingredients': [
   ("L'attendrissage", [
     "1 kg (2 lb) de macreuse de bœuf, coupée en cubes de 4 cm (1 ½ po)",
     "5 ml (1 c. à thé) de bicarbonate de soude",
     "60 ml (¼ tasse) d'eau froide",
   ]),
   ('La marinade', [
     "180 ml (¾ tasse) d'huile d'olive",
     "1 oignon jaune, râpé avec son jus",
     "8 gousses d'ail, hachées",
     "45 ml (3 c. à soupe) de jus de citron",
     "45 ml (3 c. à soupe) de paprika doux",
     "10 ml (2 c. à thé) de paprika fumé",
     "15 ml (1 c. à soupe) de cumin moulu",
     "10 ml (2 c. à thé) de coriandre moulue",
     "5 ml (1 c. à thé) de cannelle moulue",
     "7,5 ml (1 ½ c. à thé) de piment d'Alep",
     "10 ml (2 c. à thé) de sel kasher",
     "7,5 ml (1 ½ c. à thé) de poivre noir moulu",
     "60 ml (¼ tasse) de persil plat frais, ciselé",
     "30 ml (2 c. à soupe) de menthe fraîche, ciselée",
     "15 ml (1 c. à soupe) de vinaigre de cidre",
   ]),
   ('Les brochettes', [
     "1 oignon rouge, coupé en quartiers",
     "1 poivron jaune, coupé en gros morceaux",
     "240 g (3 tasses) de champignons blancs, coupés en deux",
   ]),
 ],
 'etapes': [
   "Dans un grand bol, dissoudre le bicarbonate dans l'eau froide. Ajouter le bœuf et masser la viande de 2 à 3 minutes. Couvrir et réfrigérer 45 minutes.",
   "Rincer rapidement la viande à l'eau froide, bien l'égoutter et l'éponger.",
   "Dans le même bol, nettoyé, mélanger tous les ingrédients de la marinade. Ajouter le bœuf et remuer pour bien l'enrober. Couvrir et réfrigérer de 12 à 24 heures.",
   "Égoutter la viande. Sur des brochettes, enfiler le bœuf en alternance avec l'oignon, le poivron et les champignons.",
   "Préchauffer le barbecue à puissance élevée. Huiler la grille. Griller les brochettes de 8 à 10 minutes, en les retournant souvent, jusqu'à ce que la viande soit bien colorée à l'extérieur et encore rosée au centre.",
 ],
 'note': "Le bicarbonate remonte le pH de la surface de la viande et l'empêche de se contracter à la cuisson. Il faut le rincer, sinon il laisse un goût de savon.",
},

'sauce boeuf': {
 'titre': 'Sauce au yogourt, au tahini et à la menthe',
 'chapeau': "Le yogourt grec, le tahini, l'ail rôti et beaucoup de menthe fraîche se fouettent ensemble la veille. C'est la sauce froide qui calme le feu des brochettes de bœuf, et elle gagne à être préparée d'avance.",
 'temps': [('Rendement', 'environ 375 ml (1 ½ tasse)'), ('Réfrigération', '1 h')],
 'ingredients': [
   (None, [
     "250 ml (1 tasse) de yogourt grec nature",
     "60 ml (¼ tasse) de crème sure",
     "30 ml (2 c. à soupe) de tahini",
     "4 gousses d'ail, rôties et écrasées",
     "30 ml (2 c. à soupe) de jus de citron",
     "45 ml (3 c. à soupe) de menthe fraîche, ciselée",
     "30 ml (2 c. à soupe) de persil plat frais, ciselé",
     "10 ml (2 c. à thé) d'huile d'olive",
     "Sel et poivre, au goût",
   ]),
 ],
 'etapes': [
   "Dans un bol, mélanger au fouet tous les ingrédients jusqu'à ce que la sauce soit lisse. Saler et poivrer.",
   "Couvrir et réfrigérer au moins 1 heure, le temps que l'ail et la menthe parfument la sauce.",
 ],
 'note': "L'ail se rôtit entier, en chemise, à 190 °C (375 °F) pendant 40 minutes. La pulpe se presse ensuite hors de la gousse et n'a plus rien de l'ail cru.",
},

'hotdog': {
 'titre': 'Saucisse grillée sur pain viking',
 'chapeau': "Une saucisse artisanale se pose dans un pain viking, avec de la choucroute chaude et les trois moutardes alignées sur la table. C'est la file la plus longue du village gustatif, et c'est aussi celle qui bouge le plus vite.",
 'temps': [('4 portions', ''), ('Cuisson', '10 min')],
 'ingredients': [
   (None, [
     "4 pains viking (recette au chapitre de la boulangerie)",
     "4 saucisses artisanales",
     "250 g (2 tasses) de choucroute, égouttée",
     "Moutarde jaune, moutarde de Dijon et moutarde à l'ancienne, au goût",
     "Oignons frits et oignons marinés, au goût",
     "Cornichons tranchés et relish, au goût",
     "Ketchup et mayonnaise à l'ail, au goût",
   ]),
 ],
 'etapes': [
   "Préchauffer le barbecue à puissance moyenne. Griller les saucisses de 8 à 10 minutes, en les retournant souvent, jusqu'à ce qu'elles soient bien colorées et chaudes à cœur.",
   "Entre-temps, dans une petite casserole, réchauffer la choucroute à feu doux.",
   "Fendre les pains sur la longueur sans les traverser, puis les griller quelques secondes, côté coupé sur la grille.",
   "Garnir chaque pain d'une saucisse et de choucroute, puis laisser chacun monter le sien.",
 ],
 'note': "Au festival, les condiments sont posés en rang sur la table et personne ne monte deux fois le même. C'est la moitié du plaisir, et c'est pour ça qu'aucune quantité n'est donnée ici.",
},

'patate chaude': {
 'titre': 'Pommes de terre rôties au miel épicé',
 'chapeau': "Chaque personne a sa pomme de terre, ouverte en quartiers et enrobée d'un beurre au miel relevé de cannelle et de paprika, puis rôtie jusqu'à ce que les arêtes caramélisent. Elle sort brûlante et se mange sans couvert.",
 'temps': [('4 portions, 1 pomme de terre chacune', ''), ('Cuisson', '45 min')],
 'ingredients': [
   (None, [
     "4 pommes de terre à chair jaune d'environ 200 g (7 oz) chacune, coupées en gros quartiers",
     "30 ml (2 c. à soupe) de beurre",
     "45 ml (3 c. à soupe) de miel",
     "1 gousse d'ail, hachée finement",
     "7,5 ml (1 ½ c. à thé) de paprika",
     "2,5 ml (½ c. à thé) de cannelle moulue",
     "1 ml (¼ c. à thé) de piment en poudre",
     "Sel et poivre, au goût",
     "Herbes fraîches, ciselées, au goût",
   ]),
 ],
 'etapes': [
   "Placer la grille au centre du four. Préchauffer le four à 200 °C (400 °F).",
   "Dans une petite casserole, faire fondre le beurre à feu doux. Retirer du feu, puis y mélanger le miel, l'ail, le paprika, la cannelle et le piment. Saler et poivrer.",
   "Dans un grand bol, verser la préparation sur les pommes de terre et remuer pour bien les enrober.",
   "Sur une plaque de cuisson tapissée de papier parchemin, étaler les pommes de terre en une seule couche. Cuire au four de 40 à 45 minutes, en remuant à mi-cuisson, jusqu'à ce qu'elles soient tendres et caramélisées.",
   "Parsemer d'herbes fraîches au moment de servir.",
 ],
 'note': "Le miel brûle vite. Si les pommes de terre colorent trop avant d'être tendres, couvrir la plaque de papier d'aluminium pour la fin de la cuisson.",
},

# ── III · Les boustifailles ──────────────────────────────────────────

'cuirs du seigneur': {
 'titre': 'Les cuirs du seigneur, bœuf séché aux épices',
 'chapeau': "Le rumsteak se tranche mince, marine une nuit dans les épices, puis sèche lentement jusqu'à devenir cuir. Ça se mâche longtemps et ça se garde des semaines au fond d'une besace.",
 'temps': [('Rendement', 'environ 200 g (7 oz)'), ('Marinage', '12 à 24 h'), ('Séchage', '5 à 8 h')],
 'ingredients': [
   (None, [
     "450 g (1 lb) de rumsteak de bœuf",
     "60 ml (¼ tasse) de sauce soya",
     "60 ml (¼ tasse) de sauce Worcestershire",
     "15 ml (1 c. à soupe) de miel",
     "5 ml (1 c. à thé) de poivre noir moulu",
     "5 ml (1 c. à thé) de poudre d'ail",
     "5 ml (1 c. à thé) de poudre d'oignon",
     "5 ml (1 c. à thé) de piment en poudre",
     "5 ml (1 c. à thé) de paprika fumé",
     "5 ml (1 c. à thé) de sel",
     "2,5 ml (½ c. à thé) de poivre de Cayenne",
   ]),
 ],
 'etapes': [
   "Envelopper le rumsteak et le placer au congélateur 45 minutes : raffermie, la viande se tranche beaucoup plus mince.",
   "Couper le bœuf en tranches de 0,5 cm (¼ po), dans le sens contraire des fibres.",
   "Dans un grand bol, mélanger la sauce soya, la sauce Worcestershire, le miel et toutes les épices.",
   "Ajouter la viande et remuer pour enrober chaque tranche. Couvrir et réfrigérer de 12 à 24 heures.",
   "Égoutter la viande et l'éponger légèrement.",
   "Déposer les tranches côte à côte sur les plateaux du déshydrateur, sans qu'elles se touchent. Déshydrater à 60 °C (140 °F) de 5 à 8 heures ou jusqu'à ce que la viande soit sèche mais encore souple : elle doit plier sans casser.",
   "Laisser refroidir complètement à l'air libre, puis emballer dans des sacs hermétiques.",
 ],
 'note': "Sans déshydrateur, cuire au four à la plus basse température, la porte entrouverte sur le manche d'une cuillère de bois, de 4 à 6 heures.",
},

'verdure du jardin': {
 'titre': "Verdure du jardin, vinaigrette à l'érable",
 'chapeau': "Le mesclun, le concombre et la carotte râpée sont à peine lustrés d'une vinaigrette au cidre et à l'érable. C'est la fraîcheur qu'on met entre deux grillades, et rien d'autre.",
 'temps': [('4 portions de 100 g', '')],
 'ingredients': [
   ('La salade', [
     "240 g (8 tasses) de mesclun",
     "½ concombre anglais, coupé en demi-lunes",
     "1 carotte, pelée et râpée",
   ]),
   ('La vinaigrette', [
     "15 ml (1 c. à soupe) d'huile végétale",
     "7,5 ml (1 ½ c. à thé) de vinaigre de cidre",
     "2,5 ml (½ c. à thé) de moutarde de Dijon",
     "2,5 ml (½ c. à thé) de sirop d'érable",
     "Sel et poivre, au goût",
   ]),
 ],
 'etapes': [
   "Dans un petit bol, mélanger au fouet l'huile, le vinaigre, la moutarde et le sirop d'érable. Saler et poivrer.",
   "Dans un grand saladier, réunir le mesclun, le concombre et la carotte.",
   "Au moment de servir, verser la vinaigrette sur la salade et remuer délicatement pour enrober les feuilles.",
 ],
 'note': "La vinaigrette du chef est volontairement mince : elle doit lustrer les feuilles sans les alourdir. Si votre mesclun est très frisé, doublez-la.",
},

'salade betteraves repas': {
 'titre': "Salade-repas de betteraves et d'orge",
 'chapeau': "Les betteraves rôties et l'orge mondé rejoignent les pois chiches et la roquette sous une vinaigrette à l'érable, et l'ensemble tient lieu de repas complet. Elle est meilleure quand elle a mariné une heure au froid.",
 'temps': [('4 portions de 300 g', ''), ('Trempage', '12 h'), ('Cuisson', '1 h')],
 'ingredients': [
   ('La salade', [
     "100 g (½ tasse) de pois chiches secs",
     "4 betteraves moyennes, d'environ 500 g (1 lb) au total",
     "125 g (2/3 tasse) d'orge mondé sec",
     "40 g (1/3 tasse) de noix de Grenoble",
     "30 ml (2 c. à soupe) d'oignon rouge, émincé finement",
     "60 ml (¼ tasse) de persil plat frais, ciselé",
     "160 g (5 tasses) de roquette",
   ]),
   ("La vinaigrette à l'érable", [
     "30 ml (2 c. à soupe) d'huile d'olive",
     "15 ml (1 c. à soupe) de vinaigre de cidre",
     "10 ml (2 c. à thé) de sirop d'érable",
     "5 ml (1 c. à thé) de moutarde de Dijon",
     "5 ml (1 c. à thé) de jus de citron",
     "Sel et poivre, au goût",
   ]),
 ],
 'etapes': [
   "La veille, dans un bol, couvrir les pois chiches d'eau froide et laisser tremper 12 heures. Égoutter.",
   "Dans une casserole d'eau bouillante salée, cuire les pois chiches de 45 à 60 minutes ou jusqu'à ce qu'ils soient tendres. Égoutter et laisser tiédir.",
   "Placer la grille au centre du four. Préchauffer le four à 200 °C (400 °F). Envelopper les betteraves entières dans du papier d'aluminium et les cuire au four de 50 à 60 minutes ou jusqu'à ce que la pointe d'un couteau y entre sans résistance. Laisser tiédir, puis peler et couper en cubes.",
   "Entre-temps, rincer l'orge à l'eau froide. Dans une casserole, le cuire dans trois fois son volume d'eau bouillante salée de 30 à 40 minutes ou jusqu'à ce qu'il soit tendre sous la dent. Égoutter et laisser tiédir.",
   "Dans une poêle à feu moyen, griller les noix de 4 à 5 minutes, en remuant souvent, jusqu'à ce qu'elles dégagent leur parfum. Laisser refroidir, puis les concasser grossièrement.",
   "Dans un petit bol, mélanger au fouet tous les ingrédients de la vinaigrette.",
   "Dans un grand saladier, réunir les betteraves, l'orge, les pois chiches, l'oignon rouge et le persil. Verser la vinaigrette et remuer. Couvrir et laisser mariner au réfrigérateur au moins 1 heure.",
   "Au moment de servir, incorporer la roquette et les noix grillées.",
 ],
 'note': "La roquette ne se met jamais d'avance : elle tombe en dix minutes au contact de la vinaigrette. Tout le reste, au contraire, gagne à attendre.",
},

'salade betterves side': {
 'titre': 'Salade de betteraves, en accompagnement',
 'chapeau': "C'est la même salade de betteraves et d'orge, en portions réduites de moitié, qui se pose à côté d'une grillade plutôt que de tenir le repas à elle seule.",
 'temps': [('4 portions de 150 g', ''), ('Trempage', '12 h'), ('Cuisson', '1 h')],
 'ingredients': [
   ('La salade', [
     "50 g (¼ tasse) de pois chiches secs",
     "2 betteraves moyennes, d'environ 250 g (9 oz) au total",
     "60 g (1/3 tasse) d'orge mondé sec",
     "20 g (3 c. à soupe) de noix de Grenoble",
     "15 ml (1 c. à soupe) d'oignon rouge, émincé finement",
     "30 ml (2 c. à soupe) de persil plat frais, ciselé",
     "80 g (2 ½ tasses) de roquette",
   ]),
   ("La vinaigrette à l'érable", [
     "15 ml (1 c. à soupe) d'huile d'olive",
     "7,5 ml (1 ½ c. à thé) de vinaigre de cidre",
     "5 ml (1 c. à thé) de sirop d'érable",
     "2,5 ml (½ c. à thé) de moutarde de Dijon",
     "2,5 ml (½ c. à thé) de jus de citron",
     "Sel et poivre, au goût",
   ]),
 ],
 'etapes': [
   "La veille, dans un bol, couvrir les pois chiches d'eau froide et laisser tremper 12 heures. Égoutter.",
   "Dans une casserole d'eau bouillante salée, cuire les pois chiches de 45 à 60 minutes ou jusqu'à ce qu'ils soient tendres. Égoutter et laisser tiédir.",
   "Placer la grille au centre du four. Préchauffer le four à 200 °C (400 °F). Envelopper les betteraves entières dans du papier d'aluminium et les cuire au four de 45 à 55 minutes ou jusqu'à ce que la pointe d'un couteau y entre sans résistance. Laisser tiédir, puis peler et couper en cubes.",
   "Entre-temps, rincer l'orge à l'eau froide. Dans une casserole, le cuire dans trois fois son volume d'eau bouillante salée de 30 à 40 minutes ou jusqu'à ce qu'il soit tendre sous la dent. Égoutter et laisser tiédir.",
   "Dans une poêle à feu moyen, griller les noix de 4 à 5 minutes, en remuant souvent. Laisser refroidir, puis les concasser grossièrement.",
   "Dans un petit bol, mélanger au fouet tous les ingrédients de la vinaigrette.",
   "Dans un grand saladier, réunir les betteraves, l'orge, les pois chiches, l'oignon rouge et le persil. Verser la vinaigrette et remuer. Couvrir et laisser mariner au réfrigérateur au moins 1 heure.",
   "Au moment de servir, incorporer la roquette et les noix grillées.",
 ],
 'note': None,
},

'baba ganoush': {
 'titre': 'Baba ganoush aux aubergines brûlées',
 'chapeau': "Les aubergines grillent jusqu'à ce que la peau soit noire de partout, puis s'écrasent au tahini et au citron. C'est la fumée qui fait la moitié du travail, et elle ne s'obtient pas au four.",
 'temps': [('4 portions de 70 g', ''), ('Cuisson', '20 min'), ('Réfrigération', '1 h')],
 'ingredients': [
   (None, [
     "2 aubergines moyennes, d'environ 400 g (14 oz) au total",
     "45 ml (3 c. à soupe) de tahini",
     "30 ml (2 c. à soupe) de jus de citron",
     "2 gousses d'ail, hachées finement",
     "30 ml (2 c. à soupe) d'huile d'olive",
     "2,5 ml (½ c. à thé) de cumin moulu",
     "Sel et poivre, au goût",
     "15 ml (1 c. à soupe) de persil plat frais, ciselé",
     "1 ml (¼ c. à thé) de paprika",
   ]),
 ],
 'etapes': [
   "Sur le barbecue à puissance élevée, ou directement sur la flamme d'un brûleur à gaz, griller les aubergines entières de 15 à 20 minutes, en les retournant souvent, jusqu'à ce que la peau soit noire de partout et que la chair s'affaisse.",
   "Déposer les aubergines dans un bol et laisser reposer 20 minutes : la vapeur finit de cuire la chair et décolle la peau.",
   "Couper les aubergines en deux sur la longueur, puis les laisser égoutter dans une passoire pour retirer l'excès de liquide.",
   "À la cuillère, évider la chair et la hacher grossièrement au couteau.",
   "Dans un bol, mélanger la chair d'aubergine avec le tahini, le jus de citron, l'ail, l'huile et le cumin. Saler et poivrer.",
   "Couvrir et réfrigérer au moins 1 heure. Au moment de servir, parsemer de persil et de paprika, puis arroser d'un filet d'huile d'olive.",
 ],
 'note': "Une aubergine cuite au four donnera une purée correcte, mais elle n'aura jamais le goût de fumée. Si vous n'avez ni barbecue ni cuisinière au gaz, faites-les noircir sous le gril, au plus près de l'élément.",
},

'hummus': {
 'titre': 'Hummus tiède au tahini et au citron',
 'chapeau': "Les pois chiches cuisent au bicarbonate jusqu'à s'écraser sous le doigt, puis se montent au tahini et au citron glacé. Servi tiède, le jour même, il n'a rien à voir avec celui du commerce.",
 'temps': [('4 portions de 70 g', ''), ('Trempage', '12 h'), ('Cuisson', '1 h')],
 'ingredients': [
   (None, [
     "100 g (½ tasse) de pois chiches secs",
     "1 pincée de bicarbonate de soude",
     "45 ml (3 c. à soupe) de tahini",
     "15 ml (1 c. à soupe) de jus de citron",
     "2 gousses d'ail",
     "15 ml (1 c. à soupe) d'huile d'olive, et un peu plus pour servir",
     "30 ml (2 c. à soupe) d'eau glacée",
     "2,5 ml (½ c. à thé) de cumin moulu",
     "2,5 ml (½ c. à thé) de sel",
     "1 ml (¼ c. à thé) de paprika fumé",
   ]),
 ],
 'etapes': [
   "La veille, dans un bol, couvrir les pois chiches d'eau froide et laisser tremper 12 heures. Égoutter.",
   "Dans une casserole, couvrir les pois chiches d'eau froide et ajouter le bicarbonate. Porter à ébullition, puis laisser mijoter de 45 à 60 minutes ou jusqu'à ce qu'un pois chiche s'écrase sans effort sous le doigt. Écumer au besoin, puis égoutter en réservant quelques pois chiches entiers.",
   "Au robot culinaire, réduire en purée le tahini, le jus de citron et l'ail. Ajouter les pois chiches encore tièdes, l'huile et l'eau glacée, puis mixer de 3 à 4 minutes ou jusqu'à ce que le hummus soit parfaitement lisse et pâle.",
   "Ajouter le cumin et le sel, puis rectifier l'assaisonnement.",
   "Étendre le hummus dans un plat en creusant un sillon à la cuillère. Arroser d'huile d'olive, saupoudrer de paprika fumé et garnir des pois chiches réservés.",
 ],
 'note': "Le bicarbonate n'est pas un détail : c'est lui qui fait tomber la peau des pois chiches à la cuisson, et c'est la peau qui empêche un hummus d'être lisse.",
},

# ── IV · La boulangerie ──────────────────────────────────────────────

'pain viking': {
 'titre': 'Pain viking',
 'chapeau': "C'est un pain de blé au miel, pétri le matin et cuit dans la journée, avec très peu de levure et une longue levée qui fait tout le goût. On le retrouve sur toutes les tables du festival.",
 'temps': [('Rendement', '1 pain de 4 portions'), ('Levée', '4 à 6 h'), ('Cuisson', '30 min')],
 'ingredients': [
   (None, [
     "250 g (1 2/3 tasse) de farine de blé",
     "150 ml (2/3 tasse) d'eau tiède",
     "2 g (½ c. à thé) de levure fraîche, émiettée",
     "7,5 ml (1 ½ c. à thé) de miel",
     "5 ml (1 c. à thé) de sel",
   ]),
 ],
 'etapes': [
   "Dans un grand bol, mélanger la farine, la levure émiettée, le miel et l'eau tiède jusqu'à ce qu'il ne reste plus de farine sèche.",
   "Sur un plan de travail légèrement fariné, pétrir la pâte environ 10 minutes ou jusqu'à ce qu'elle devienne lisse et élastique. Ajouter le sel et pétrir 5 minutes de plus.",
   "Déposer la pâte dans un bol légèrement huilé. Couvrir d'un linge humide et laisser lever dans un endroit chaud de 3 à 4 heures ou jusqu'à ce qu'elle ait doublé de volume.",
   "Sur un plan de travail légèrement fariné, dégazer la pâte et la façonner en boule ou en pain allongé.",
   "Déposer le pain sur une plaque tapissée de papier parchemin, ou dans un banneton fariné. Couvrir et laisser lever de 1 à 2 heures ou jusqu'à ce que la pâte soit bien gonflée.",
   "Placer la grille au centre du four. Préchauffer le four à 230 °C (450 °F). Cuire le pain de 25 à 30 minutes ou jusqu'à ce que la croûte soit bien dorée et qu'il sonne creux quand on tape le dessous.",
 ],
 'note': "Au festival, ce pain cuit sur une roche posée dans la braise ardente. Le four de la maison donne une croûte plus régulière, mais c'est la braise qui donne le goût.",
},

'beurre aux herbes': {
 'titre': "Beurre aux herbes fraîches et à l'ail",
 'chapeau': "Le persil, la ciboulette, le thym et le romarin se hachent avec une gousse d'ail, puis se roulent en bûche dans du beurre mou. C'est ce qui attend le pain viking à la sortie du four.",
 'temps': [('Rendement', '60 g (¼ tasse)'), ('Réfrigération', '1 h')],
 'ingredients': [
   (None, [
     "60 g (¼ tasse) de beurre non salé, ramolli",
     "7,5 ml (1 ½ c. à thé) de persil plat frais, ciselé",
     "7,5 ml (1 ½ c. à thé) de ciboulette fraîche, ciselée",
     "5 ml (1 c. à thé) de thym frais, haché",
     "2,5 ml (½ c. à thé) de romarin frais, haché",
     "1 petite gousse d'ail, hachée finement",
     "5 ml (1 c. à thé) de jus de citron",
     "1 ml (¼ c. à thé) de sel",
     "Poivre, au goût",
   ]),
 ],
 'etapes': [
   "Sortir le beurre du réfrigérateur au moins 1 heure à l'avance : il doit être assez mou pour se travailler à la cuillère.",
   "Dans un bol, à la spatule, mélanger le beurre, les herbes, l'ail, le jus de citron, le sel et le poivre jusqu'à ce que tout soit réparti uniformément.",
   "Déposer le beurre sur une feuille de papier parchemin, le rouler en bûche et bien l'envelopper.",
   "Réfrigérer au moins 1 heure, le temps que le beurre durcisse et que les parfums se fondent.",
 ],
 'note': "La bûche se congèle jusqu'à trois mois, et il suffit d'en couper une rondelle à poser sur un pain viking encore brûlant.",
},

'bloodbraud': {
 'titre': 'Blóðbrauð, le pain au sang',
 'chapeau': "C'est le pain des tables nordiques, celui où le sang remplace l'œuf. Il en tire une mie sombre, une texture plus dense qu'un pain ordinaire et un goût de fer que rien d'autre ne donne.",
 'temps': [('Rendement', '4 galettes de 200 g'), ('Cuisson', '30 min')],
 'ingredients': [
   (None, [
     "500 g (3 1/3 tasses) de farine de blé",
     "10 ml (2 c. à thé) de sel",
     "250 ml (1 tasse) de sang de porc frais",
     "200 ml (¾ tasse) d'eau tiède",
     "20 g (4 c. à thé) de saindoux, fondu",
     "Herbes séchées, au goût",
   ]),
 ],
 'etapes': [
   "Dans un grand bol, mélanger la farine et le sel.",
   "Ajouter le sang et l'eau progressivement, en pétrissant, jusqu'à obtenir une pâte homogène et souple.",
   "Incorporer le saindoux fondu et les herbes, puis pétrir 5 minutes de plus.",
   "Diviser la pâte en 4 pâtons d'environ 200 g et les aplatir en galettes de 1,5 cm (5/8 po) d'épaisseur.",
   "Dans une poêle en fonte à feu moyen, ou sur une pierre chaude, cuire les galettes de 10 à 15 minutes de chaque côté ou jusqu'à ce qu'elles soient cuites à cœur et que la croûte soit bien formée.",
 ],
 'note': "Le sang de porc frais se commande chez le boucher et ne se garde que deux jours. Il doit être remué avant d'être versé, sinon il se sépare et la mie devient inégale.",
},

'lembas': {
 'titre': 'Lembas, la galette de voyage',
 'chapeau': "Le pain de voyage, version festival : l'avoine, le miel et la crème se cuisent ensemble en une galette assez ferme pour voyager. Une seule suffit à tenir une journée de marche, et elle se garde une semaine dans un sac.",
 'temps': [('Rendement', '4 galettes de 85 g'), ('Réfrigération', '30 min'), ('Cuisson', '20 min')],
 'ingredients': [
   (None, [
     "50 g (¼ tasse) de beurre non salé, ramolli",
     "45 ml (3 c. à soupe) de miel",
     "15 ml (1 c. à soupe) de sucre",
     "30 ml (2 c. à soupe) de crème 35 %",
     "2,5 ml (½ c. à thé) d'extrait de vanille",
     "160 g (1 tasse) de farine tout usage",
     "25 g (¼ tasse) de flocons d'avoine",
     "1 ml (¼ c. à thé) de sel",
   ]),
 ],
 'etapes': [
   "Dans un bol, au batteur électrique, crémer le beurre, le miel et le sucre jusqu'à ce que le mélange soit homogène.",
   "Incorporer la crème et la vanille.",
   "À la cuillère de bois, incorporer la farine, l'avoine et le sel jusqu'à obtenir une pâte ferme.",
   "Entre deux feuilles de papier parchemin, abaisser la pâte à 1,5 cm (5/8 po) d'épaisseur. Réfrigérer 30 minutes pour la raffermir.",
   "Placer la grille au centre du four. Préchauffer le four à 175 °C (350 °F). Cuire de 18 à 22 minutes ou jusqu'à ce que les bords soient dorés et que le centre soit encore ferme au toucher.",
   "Laisser refroidir complètement, puis découper en 4 carrés égaux.",
 ],
 'note': "Enveloppée une à une dans du papier parchemin, la galette se transporte sans s'émietter. C'est tout l'intérêt d'un pain de voyage.",
},

'pain insectes': {
 'titre': 'Pain aux insectes et à la farine de criquet',
 'chapeau': "La farine de criquet se mêle à la farine de blé, les vers se plient dans la pâte et les fourmis entières se pressent sur la croûte. C'est le pain qui fait reculer les visiteurs, puis revenir en chercher un deuxième.",
 'temps': [('Rendement', '4 petits pains'), ('Levée', '2 à 3 h'), ('Cuisson', '25 min')],
 'ingredients': [
   (None, [
     "215 g (1 1/3 tasse) de farine tout usage",
     "25 g (3 c. à soupe) de farine de criquet",
     "160 ml (2/3 tasse) d'eau tiède",
     "5 ml (1 c. à thé) de levure sèche active",
     "10 ml (2 c. à thé) de miel",
     "10 ml (2 c. à thé) d'huile végétale",
     "5 ml (1 c. à thé) de sel",
     "15 g (2 c. à soupe) de vers de farine séchés",
     "10 g (2 c. à soupe) de fourmis entières séchées",
   ]),
 ],
 'etapes': [
   "Dans un bol, mélanger les deux farines.",
   "Dans un autre bol, dissoudre la levure et le miel dans l'eau tiède. Laisser reposer 10 minutes ou jusqu'à ce que le mélange mousse.",
   "Verser le liquide sur les farines, ajouter le sel et l'huile, puis pétrir de 8 à 10 minutes ou jusqu'à obtenir une pâte lisse et élastique.",
   "Incorporer les vers de farine et la moitié des fourmis, en pliant la pâte sur elle-même.",
   "Couvrir et laisser lever dans un endroit chaud de 1 à 2 heures ou jusqu'à ce que la pâte ait doublé de volume.",
   "Dégazer la pâte et la diviser en 4 pâtons d'environ 110 g, puis les façonner en petits pains ronds.",
   "Déposer les pains sur une plaque tapissée de papier parchemin et presser le reste des fourmis à la surface. Couvrir et laisser lever environ 45 minutes ou jusqu'à ce qu'ils soient visiblement gonflés.",
   "Placer la grille au centre du four. Préchauffer le four à 200 °C (400 °F). Cuire de 20 à 25 minutes ou jusqu'à ce que la croûte soit dorée et que les pains sonnent creux quand on tape le dessous.",
 ],
 'note': "Les insectes séchés se vendent en épicerie spécialisée et se gardent des mois au garde-manger. La farine de criquet donne un goût de noisette grillée, et personne ne devine ce que c'est avant qu'on le dise.",
},

# ── V · Les douceurs ─────────────────────────────────────────────────

'gateau du voyageur': {
 'titre': 'Gâteau du voyageur aux fruits séchés',
 'chapeau': "C'est un gâteau de route aux fruits séchés, aux noix et à la cannelle, qu'on glace au sirop d'érable une fois refroidi. Bien enveloppé, il se garde une semaine et voyage sans s'émietter : c'est de là que lui vient son nom.",
 'temps': [('Rendement', '1 gâteau de 4 portions'), ('Cuisson', '55 min')],
 'ingredients': [
   (None, [
     "150 g (1 tasse) de farine tout usage",
     "5 ml (1 c. à thé) de poudre à pâte",
     "2,5 ml (½ c. à thé) de cannelle moulue",
     "1 ml (¼ c. à thé) de muscade moulue",
     "1 ml (¼ c. à thé) de sel",
     "75 g (1/3 tasse) de beurre non salé, ramolli",
     "55 g (¼ tasse) de sucre",
     "2 œufs",
     "30 ml (2 c. à soupe) de lait",
     "30 ml (2 c. à soupe) de sirop d'érable",
     "75 g (½ tasse) de fruits séchés, hachés",
     "30 g (¼ tasse) de noix de Grenoble, hachées",
     "Le zeste de 1 orange",
   ]),
 ],
 'etapes': [
   "Placer la grille au centre du four. Préchauffer le four à 165 °C (325 °F). Beurrer et fariner un moule à pain de 20 x 10 cm (8 x 4 po).",
   "Dans un bol, mélanger la farine, la poudre à pâte, la cannelle, la muscade et le sel.",
   "Dans un autre bol, au batteur électrique, crémer le beurre et le sucre jusqu'à ce que le mélange soit pâle et aéré. Ajouter les œufs un à un, en battant bien après chaque ajout.",
   "À basse vitesse, incorporer les ingrédients secs en alternant avec le lait et la moitié du sirop d'érable.",
   "À la spatule, incorporer les fruits séchés, les noix et le zeste d'orange.",
   "Verser la pâte dans le moule. Cuire au four de 45 à 55 minutes ou jusqu'à ce qu'un cure-dent inséré au centre du gâteau en ressorte propre.",
   "Laisser tiédir 10 minutes, puis démouler sur une grille et laisser refroidir complètement.",
   "Badigeonner le dessus du gâteau avec le reste du sirop d'érable.",
 ],
 'note': "Le glaçage se fait sur un gâteau froid, jamais tiède : sur un gâteau chaud, le sirop entre dans la mie au lieu de rester en surface.",
},

"les offrandes de l'oasis": {
 'titre': "Les offrandes de l'oasis, dattes farcies",
 'chapeau': "Les dattes s'ouvrent et se farcissent de noix concassées, de miel et de zeste d'orange, puis reposent une demi-heure au froid. Deux bouchées, et le café turc arrive.",
 'temps': [('4 portions, 3 dattes chacune', ''), ('Réfrigération', '30 min')],
 'ingredients': [
   (None, [
     "12 dattes Medjool",
     "50 g (1/3 tasse) de noix, concassées",
     "10 ml (2 c. à thé) de miel",
     "1 ml (¼ c. à thé) de cannelle moulue",
     "1 pincée de sel",
     "Le zeste de ½ orange",
   ]),
 ],
 'etapes': [
   "Inciser chaque datte sur la longueur et en retirer le noyau, sans séparer les deux moitiés.",
   "Dans un bol, mélanger les noix concassées, le miel, la cannelle, le sel et le zeste d'orange.",
   "Farcir chaque datte d'environ 5 g de préparation, soit une petite cuillerée.",
   "Dresser les dattes sur un plat, couvrir et réfrigérer 30 minutes avant de servir.",
 ],
 'note': "La Medjool est la plus charnue et la plus facile à farcir. Une datte plus sèche se laisse tremper cinq minutes dans l'eau tiède avant d'être ouverte.",
},

# ── VI · L'abreuvoir ─────────────────────────────────────────────────

'hypocras': {
 'titre': "Hypocras, le vin d'épices au miel",
 'chapeau': "C'est le vin d'épices du Moyen Âge, sucré au miel et parfumé à la cannelle et au girofle. Il macère deux jours à froid avant d'être filtré et mis en bouteille, et il ne se fait jamais bouillir.",
 'temps': [('Rendement', '750 ml (4 portions)'), ('Macération', '24 à 48 h')],
 'ingredients': [
   (None, [
     "750 ml (3 tasses) de vin rouge",
     "10 ml (2 c. à thé) de miel",
     "1 bâton de cannelle",
     "1 clou de girofle",
     "1 pincée de gingembre en poudre",
     "1 pincée de poivre",
     "1 pincée de muscade moulue",
     "1 pincée de macis",
   ]),
 ],
 'etapes': [
   "Dans un grand pot, mélanger le vin et le miel jusqu'à ce que le miel soit dissous.",
   "Ajouter le bâton de cannelle, le clou de girofle, le gingembre, le poivre, la muscade et le macis. Bien mélanger.",
   "Couvrir et laisser macérer au frais de 24 à 48 heures, en remuant de temps en temps.",
   "Filtrer au tamis fin ou à travers un coton à fromage, puis mettre en bouteille.",
 ],
 'note': "Le chef sucre très peu : goûtez après la première journée et ajoutez du miel si vous le voulez plus rond. La chaleur, elle, emporte le parfum des épices en même temps que l'alcool, alors l'hypocras se boit frais ou tiède, jamais chaud.",
},

'vin chaud': {
 'titre': "Vin chaud à l'orange et aux épices",
 'chapeau': "Le vin rouge chauffe doucement avec une orange piquée de girofle, un bâton de cannelle et un anis étoilé, sans jamais bouillir. C'est le verre qu'on tient à deux mains devant le feu.",
 'temps': [('4 tasses de 250 ml', ''), ('Cuisson', '20 min'), ('Infusion', '30 min')],
 'ingredients': [
   (None, [
     "1 litre (4 tasses) de vin rouge",
     "45 ml (3 c. à soupe) de miel",
     "1 orange, coupée en rondelles et piquée de 4 clous de girofle",
     "1 bâton de cannelle",
     "1 anis étoilé",
     "1 morceau de gingembre frais de 2 cm (¾ po), pelé et tranché",
     "1 pincée de muscade, râpée",
   ]),
 ],
 'etapes': [
   "Dans une casserole, réunir le vin, le miel, l'orange piquée de girofle, la cannelle, l'anis étoilé, le gingembre et la muscade.",
   "Chauffer à feu doux, sans laisser bouillir, de 15 à 20 minutes ou jusqu'à ce que le mélange atteigne 70 °C (160 °F), en remuant de temps en temps.",
   "Retirer du feu, couvrir et laisser infuser de 15 à 30 minutes.",
   "Filtrer au tamis fin et servir chaud, dans des tasses de 250 ml (1 tasse).",
 ],
 'note': "Au-delà de 78 °C, l'alcool s'évapore et le vin tourne au jus d'épices. Un thermomètre vaut mieux qu'un coup d'œil.",
},

'bière au beurre': {
 'titre': 'Bière au beurre',
 'chapeau': "C'est la boisson des enfants au festival : un caramel de cassonade et de beurre se dissout dans le lait chaud, le crème soda l'allonge sans lui enlever son pétillant, et la crème fouettée vient par-dessus.",
 'temps': [('4 portions', ''), ('Cuisson', '10 min')],
 'ingredients': [
   (None, [
     "20 g (4 c. à thé) de beurre",
     "60 g (1/3 tasse) de cassonade",
     "200 ml (¾ tasse) de lait",
     "20 ml (4 c. à thé) d'extrait de vanille",
     "750 ml (3 tasses) de crème soda",
     "Cannelle moulue, au goût",
     "Crème fouettée, au goût",
   ]),
 ],
 'etapes': [
   "Dans une casserole, faire fondre le beurre à feu moyen.",
   "Ajouter la cassonade et remuer jusqu'à ce qu'elle fonde et forme un caramel léger.",
   "Verser le lait, ajouter la vanille et la cannelle. Chauffer sans laisser bouillir, en remuant, jusqu'à ce que le caramel soit complètement dissous.",
   "Retirer du feu et incorporer délicatement le crème soda, pour garder le pétillant.",
   "Servir aussitôt, garni de crème fouettée et d'une pincée de cannelle.",
 ],
 'note': "Pour la version froide, mélanger tous les ingrédients au fouet dans un grand pichet, sans chauffer, puis réfrigérer et servir sur glace.",
},

'cervoise': {
 'titre': 'Cervoise au sirop de miel et de genièvre',
 'chapeau': "Une bière blonde se relève d'un bâton de cannelle et d'un sirop de miel infusé au genièvre. Tout se monte directement dans le verre, et ça disparaît vite.",
 'temps': [('4 portions', ''), ('Infusion', '20 min')],
 'ingredients': [
   ('Le sirop de miel et de genièvre', [
     "60 ml (¼ tasse) de miel",
     "60 ml (¼ tasse) d'eau chaude",
     "6 baies de genièvre, écrasées",
   ]),
   ('Le montage', [
     "4 bouteilles de bière blonde de 341 ml, froides",
     "4 bâtons de cannelle",
   ]),
 ],
 'etapes': [
   "Dans un bol, dissoudre le miel dans l'eau chaude. Ajouter les baies de genièvre écrasées et laisser infuser 20 minutes.",
   "Filtrer le sirop au tamis fin pour retirer le genièvre, puis laisser tiédir.",
   "Déposer un bâton de cannelle dans chaque verre.",
   "Verser la bière froide en inclinant le verre, pour garder le col de mousse.",
   "Incorporer 15 ml (1 c. à soupe) de sirop par verre, en remuant doucement.",
 ],
 'note': "Le sirop se prépare d'avance et se garde deux semaines au réfrigérateur. Il se met aussi sur un thé noir.",
},

'limonade': {
 'titre': 'Limonade au citron pressé',
 'chapeau': "Il n'y entre que du citron, du sucre, de l'eau froide et des glaçons, rien d'autre, et c'est exactement ce qui sauve les après-midi de septembre quand le soleil plombe sur le champ.",
 'temps': [('Rendement', '1 litre (4 portions)')],
 'ingredients': [
   (None, [
     "100 g (½ tasse) de sucre",
     "125 ml (½ tasse) d'eau chaude",
     "200 ml (¾ tasse) de jus de citron frais, soit environ 5 citrons",
     "800 ml (3 ¼ tasses) d'eau froide",
     "Glaçons",
     "Tranches de citron",
   ]),
 ],
 'etapes': [
   "Dans une casserole à feu moyen, dissoudre le sucre dans l'eau chaude, en remuant, jusqu'à obtenir un sirop clair. Laisser refroidir.",
   "Dans un grand pichet, mélanger le sirop et le jus de citron.",
   "Ajouter l'eau froide petit à petit, en goûtant, puis rectifier en sucre ou en eau selon l'acidité des citrons.",
   "Réfrigérer, puis servir sur glaçons, garni de tranches de citron.",
 ],
 'note': "Elle se boit le jour même : au bout de vingt-quatre heures, le jus de citron perd son mordant et le sucre prend toute la place. Une poignée de menthe froissée au fond du pichet en fait la version du festival.",
},

'café turc': {
 'titre': 'Café turc à la cardamome',
 'chapeau': "Le café moulu très fin et la cardamome cuisent ensemble dans le cezve jusqu'à ce que la mousse monte deux fois. Il se sert avec le marc au fond de la tasse, et la dernière gorgée ne se boit jamais.",
 'temps': [('4 tasses de 70 ml', ''), ('Cuisson', '5 min')],
 'ingredients': [
   (None, [
     "280 ml d'eau froide, soit 70 ml (¼ tasse) par tasse",
     "20 ml (4 c. à thé) de café moulu très finement",
     "Sucre, au goût",
     "Cardamome moulue, au goût",
   ]),
 ],
 'etapes': [
   "Verser l'eau froide dans le cezve, en mesurant 70 ml (¼ tasse) par tasse à servir.",
   "Ajouter le café moulu, le sucre et la cardamome directement dans l'eau froide, sans mélanger le café.",
   "Remuer une seule fois, juste assez pour dissoudre le sucre, puis ne plus toucher.",
   "Chauffer à feu très doux, sans jamais remuer, en surveillant la mousse qui monte lentement à la surface.",
   "Dès que la mousse commence à gonfler, juste avant l'ébullition, retirer du feu et répartir une cuillerée de mousse dans chaque tasse.",
   "Remettre brièvement sur le feu pour faire remonter la mousse une seconde fois, puis retirer.",
   "Verser lentement dans les tasses, en gardant la mousse sur le dessus, et laisser reposer une minute le temps que le marc descende au fond.",
 ],
 'note': "Au festival, le cezve cuit enfoncé dans un bac de sable brûlant : la chaleur monte par tous les côtés et la mousse se forme plus régulièrement qu'au brûleur.",
},

}
