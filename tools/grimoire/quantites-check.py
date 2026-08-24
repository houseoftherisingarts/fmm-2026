#!/usr/bin/env python3
"""Vérifie que le livre ne sort aucune mesure impossible à prendre.

Alex a dû corriger à la main des tiers de cuillère à soupe, des poids
sous le gramme et des herbes fraîches impesables. Ce fichier attrape
ces retours-là avant qu'ils atteignent le PDF.

    python3 tools/grimoire/quantites-check.py
"""
import json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from grimoire import (ETAPE_CHIFFREE, ETAPES_INCHANGEES, ETAPES_POUR_CINQ,
                      etapes_pour_cinq, joli_depart, portions_de, pour_cinq,
                      rendement_pour_cinq)

# Les mesures qu'aucune cuisine ne sait prendre.
IMPOSSIBLE = re.compile(
    r'⅓|⅔'                                   # tiers de cuillère
    r'|\d[,.]\d\s*c\. à'                       # « 1,6 c. à soupe »
    r'|\b0[,.]\d+\s*(g|ml)\b'                  # poids sous le gramme
    r'|\bpièces?\b'                            # « 1 pièce de feuilles de laurier »
)


def mesure(q, portions, nom=''):
    """La mesure telle que la fiche l'imprime, une seule par ingrédient."""
    m = re.match(r'^([\d.,]+\s*[a-zA-Z]+)\s+(.+)$', (q or '').strip())
    if m:
        q = m.group(1)
    return pour_cinq(q, portions, nom) or joli_depart(q)


def verifier():
    fautes = []
    recettes = json.load(open(HERE / 'recettes.json', encoding='utf-8'))

    for r in recettes:
        portions = portions_de(r.get('yield'))
        rendu = rendement_pour_cinq(r['yield'], portions, r['tab'])
        # Le livre ne compte plus qu'en tablée de cinq, sauf ce qui ne
        # se divise pas : une bouteille reste une bouteille.
        if portions and not re.match(r'^5 (portions|tasses)', rendu):
            fautes.append(f"{r['tab']} : rendement « {rendu} » ne parle pas de cinq")

        for i in r['ing']:
            if not i['n'] or not i['q']:
                continue
            m = mesure(i['q'], portions, i['n'])
            if m and IMPOSSIBLE.search(m):
                fautes.append(f"{r['tab']} : « {m} » de {i['n']} ne se mesure pas")

        for s in r['steps']:
            if ETAPE_CHIFFREE.search(s) and r['tab'] not in ETAPES_POUR_CINQ \
                    and r['tab'] not in ETAPES_INCHANGEES:
                fautes.append(f"{r['tab']} : quantité non relue dans « {s[:50]} »")

    # Un temps de cuisson ne se divise jamais, quelle que soit la marmite.
    minutes = "Mijoter environ 20 minutes à feu doux."
    assert etapes_pour_cinq(minutes, 'goulash') == minutes, 'un temps a été divisé'

    # Les corrections d'étapes relues à la main tombent bien.
    picada = "picada : pain grillé, ail roti, 300ml huile d'olive, 1L bouillon chaud."
    assert '30 ml' in etapes_pour_cinq(picada, 'olla gitana')
    assert '100 ml de bouillon' in etapes_pour_cinq(picada, 'olla gitana')
    assert '5 pâtons' in etapes_pour_cinq('diviser en 50 pâtons de ~110g', 'pain insectes')

    # Le sel se prend à la cuillère, le sucre reste au poids.
    assert pour_cinq('120g', 50, 'sel') == '2 c. à thé'
    assert pour_cinq('200g', 50, 'sucre') == '20 g'
    # Les herbes fraîches ne passent jamais sur une balance.
    assert 'poignée' in pour_cinq('200g', 50, 'persil')
    # Ce qui se compte se compte, sans « pièce ».
    assert pour_cinq('10un', 50, 'feuilles de laurier').endswith('×')

    if fautes:
        print(f'{len(fautes)} mesure(s) à revoir :')
        for f in fautes:
            print('  ✗', f)
        return False
    print(f'quantités : {len(recettes)} recettes relues, rien d’impossible à mesurer')
    return True


if __name__ == '__main__':
    sys.exit(0 if verifier() else 1)
