#!/usr/bin/env python3
"""Cale les pages du grimoire : aucune ligne ne sort du papier.

Le principe : Chrome rend le livre, on mesure chaque page, et toute
page qui déborde se resserre d'un cran (data-serre 1, 2, 3). On
remesure jusqu'à ce que plus rien ne dépasse. Posé le 2026-08-23 après
qu'Alex ait vu la fiche de l'olla gitana coupée en bas de page.
"""
import json, pathlib, re, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

MESURE = """
const pages=[...document.querySelectorAll('section.page')];
const out=pages.map((p,i)=>{const pad=p.querySelector('.pad');if(!pad)return null;
 const d=pad.scrollHeight-pad.clientHeight;
 const t=(p.querySelector('h2')?.textContent||'').trim().slice(0,42);
 return d>1?{i,t,cle:p.dataset.cle||null,serre:p.dataset.serre||null,d}:null;}).filter(Boolean);
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
    return re.sub(rf'(data-cle="{re.escape(cle)}" data-serre=")\d(")',
                  rf'\g<1>{cran}\g<2>', html)


def caler(fichier='grimoire.html', crans=3):
    chemin = HERE / fichier
    html = chemin.read_text(encoding='utf-8')
    for tour in range(crans):
        trop = mesurer(html)
        if not trop:
            print(f'calage : rien ne dépasse (tour {tour})')
            chemin.write_text(html, encoding='utf-8')
            return True
        for t in trop:
            if not t.get('cle'):
                print(f'  ⚠ page {t["i"]} « {t["t"]} » déborde de {t["d"]}px et ne peut pas se resserrer')
                continue
            print(f'  page {t["i"]} « {t["t"]} » déborde de {t["d"]}px → cran {tour + 1}')
            html = serrer(html, t['cle'], tour + 1)
    reste = mesurer(html)
    chemin.write_text(html, encoding='utf-8')
    if reste:
        for t in reste:
            print(f'  ⚠ RESTE : page {t["i"]} « {t["t"]} », {t["d"]}px de trop')
        return False
    print('calage : rien ne dépasse')
    return True


if __name__ == '__main__':
    ok = caler(*(sys.argv[1:] or []))
    sys.exit(0 if ok else 1)
