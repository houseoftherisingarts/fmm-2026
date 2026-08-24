#!/usr/bin/env python3
"""Cale les pages du grimoire : rien ne sort du papier, rien ne flotte.

Le principe : Chrome rend le livre, on mesure chaque page, et chaque
fiche trouve son cran. Une page qui déborde se resserre, une page qui
laisse un grand vide en bas se desserre, et on remesure jusqu'à ce que
tout le monde ait trouvé sa place. Posé le 2026-08-23 après qu'Alex ait
vu la fiche de l'olla gitana coupée en bas de page, puis élargi le
2026-08-24 : la colonne des cinquante portions est partie du livre et
les fiches courtes se retrouvaient avec un trou blanc là où elle était.
"""
import json, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# Les crans du serrage, du plus aéré au plus serré. Ils correspondent
# aux règles `.rec[data-serre="…"]` de la feuille de style.
CRAN_MIN, CRAN_MAX = -2, 4

# Le vide toléré au bas d'une fiche, en pixels. Au-delà, la page se
# desserre d'un cran : le texte grossit plutôt que de laisser du blanc.
VIDE_TOLERE = 110

MESURE = """
const out=[...document.querySelectorAll('section.page')].map((p,i)=>{
 const pad=p.querySelector('.pad'); if(!pad) return null;
 const c=p.querySelector('.cols');
 const t=(p.querySelector('h2')?.textContent||'').trim().slice(0,42);
 return {i,t,cle:p.dataset.cle||null,serre:p.dataset.serre||null,
   d:pad.scrollHeight-pad.clientHeight,
   vide: c ? Math.round(c.clientHeight - Math.max(...[...c.children].map(
     col=>[...col.children].reduce((s,e)=>s+e.offsetHeight,0)))) : 0};
}).filter(Boolean);
const tag=document.createElement('div');tag.id='__mesure';tag.textContent=JSON.stringify(out);
document.body.appendChild(tag);
"""


def mesurer(html: str):
    (HERE / '_mesure.html').write_text(
        html.replace('</body>', f'<script>{MESURE}</script></body>'), encoding='utf-8')
    r = subprocess.run(
        [CHROME, '--headless', '--disable-gpu', '--virtual-time-budget=12000', '--dump-dom',
         f'file://{(HERE / "_mesure.html").resolve()}'],
        capture_output=True, text=True)
    m = re.search(r'<div id="__mesure">(.*?)</div>', r.stdout, re.S)
    if not m:
        raise SystemExit('mesure impossible : Chrome n’a rien rendu')
    return json.loads(m.group(1) or '[]')


def serrer(html: str, cle: str, cran: int) -> str:
    return re.sub(rf'(data-cle="{re.escape(cle)}" data-serre=")-?\d(")',
                  rf'\g<1>{cran}\g<2>', html)


def caler(fichier='grimoire.html', tours=9):
    chemin = HERE / fichier
    html = chemin.read_text(encoding='utf-8')
    crans, figees, desserrees = {}, set(), set()
    mesures = []
    for tour in range(int(tours)):
        mesures = mesurer(html)
        bouge = False
        for m in mesures:
            cle = m.get('cle')
            if not cle:
                if m['d'] > 1:
                    print(f'  ⚠ page {m["i"]} « {m["t"]} » déborde de {m["d"]}px '
                          'et ne peut pas se resserrer')
                continue
            crans.setdefault(cle, int(m.get('serre') or 0))
            if cle in figees:
                continue
            if m['d'] > 1 and crans[cle] < CRAN_MAX:
                crans[cle] += 1
                # Une fiche qu'on avait desserrée et qui déborde revient
                # au dernier cran qui tenait, et on la laisse tranquille.
                if cle in desserrees:
                    figees.add(cle)
                bouge = True
            elif m['d'] <= 1 and m['vide'] > VIDE_TOLERE and crans[cle] > CRAN_MIN:
                crans[cle] -= 1
                desserrees.add(cle)
                bouge = True
            else:
                figees.add(cle)
            html = serrer(html, cle, crans[cle])
        if not bouge:
            break
    chemin.write_text(html, encoding='utf-8')
    reste = [m for m in mesurer(html) if m['d'] > 1]
    bouge = {c: v for c, v in crans.items() if v}
    print(f'calage : {len(bouge)} fiches recalées sur {len(crans)}, '
          f'{sum(1 for v in bouge.values() if v < 0)} desserrées')
    for m in reste:
        print(f'  ⚠ RESTE : page {m["i"]} « {m["t"]} », {m["d"]}px de trop')
    return not reste


if __name__ == '__main__':
    ok = caler(*(sys.argv[1:] or []))
    sys.exit(0 if ok else 1)
