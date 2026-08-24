// ─── La mise en page des infolettres ─────────────────────────────────
// Alex, 2026-08-24 : « On veut des infolettres premium, pas de simples
// courriels. » Ce fichier prend un modèle de `src/content/campagnes.ts`
// et rend les trois morceaux qu'un envoi demande : l'objet, la version
// en couleurs et la version texte seul.
//
// POURQUOI DU HTML AUSSI RUDE. Un courriel n'est pas une page web.
// Outlook pour Windows rend le HTML avec le moteur de Word, qui ignore
// flexbox, grid, les positions et la moitié des marges. Gmail coupe la
// feuille de style dès qu'elle dépasse quelques dizaines de kilooctets
// et ne garde presque rien des sélecteurs. La seule construction qui
// tient partout depuis vingt ans reste le tableau imbriqué avec des
// styles écrits sur chaque cellule, et c'est celle-là qui est ici.
//
// Quatre interdits, pour que la lettre arrive intacte :
//   • aucune feuille de style externe, tout est en ligne;
//   • aucune image de fond, Outlook ne les rend pas et Gmail les coupe;
//   • aucune police exotique, la pile est Georgia puis les serifs du
//     système, présentes sur toutes les machines depuis toujours;
//   • aucun dégradé, qui tomberait en aplat gris sur la moitié des
//     clients. Le filet doré est donc une ligne de couleur pleine.
//
// LES IMAGES sont en JPEG et jamais en WebP : le moteur de Word ne
// connaît pas le WebP, et une infolettre en webp s'affiche chez lui en
// cadres vides. Elles pointent toutes vers des adresses absolues du
// site, parce qu'une pièce jointe ou une image en base64 se fait
// couper par Gmail. Leur largeur d'affichage est bornée à 600 px, et
// le fichier fait le double pour les écrans à forte densité.
//
// LES DEUX JETONS. Le HTML et le texte sortent d'ici avec `{{nom}}` et
// `{{desabonnement}}` encore en place : c'est la Cloud Function qui les
// remplace, destinataire par destinataire, au moment de l'envoi. Le
// navigateur n'a donc jamais à fabriquer trois cents versions d'une
// même lettre, et le lien de désabonnement se signe côté serveur.

import type { BlocCampagne, LangueCampagne, ModeleCampagne } from '../content/campagnes';

/** L'adresse publique du site. Les images du courriel s'y réfèrent en
 *  absolu : le client de courriel n'a aucune notion de « chemin
 *  relatif », il n'a que l'adresse écrite dans la balise. */
export const BASE_PUBLIQUE = 'https://www.festivalmedievaldemontpellier.org';

/** La signature au bas de chaque lettre. L'expéditeur reste le
 *  festival : c'est ici, et seulement ici, que le nom d'Alex paraît. */
export const SIGNATURE = {
  nom: 'Alex Turcot St-Laurent',
  titreFR: 'Directeur des communications',
  titreEN: 'Director of Communications',
  organisation: 'Festival Médiéval de Montpellier',
  site: 'festivalmedievaldemontpellier.org',
  siteUrl: 'https://festivalmedievaldemontpellier.org',
  billetterie: 'https://festivalmedievaldemontpellier.org/billets',
  datesFR: '25, 26 et 27 septembre 2026',
  datesEN: 'September 25, 26 and 27, 2026',
  themeFR: 'Caravanes et Saltimbanques · Sixième édition',
  themeEN: 'Caravanes et Saltimbanques · Sixth edition',
};

/** Le noir chaud et l'or du festival, transposés pour un courriel.
 *  Les valeurs descendent de la palette caravane de `src/index.css`,
 *  arrondies en couleurs pleines : un client de courriel ne sait lire
 *  ni une variable CSS ni un `color-mix`. Aucun neutre n'est un gris
 *  pur, ils tirent tous vers l'oxblood du site. */
const C = {
  fond:      '#0B0509',   // le noir chaud, derrière la lettre
  carte:     '#150A10',   // le parchemin sombre de la lettre
  bande:     '#100609',   // l'en-tête, le pied, les blocs rapportés
  bordure:   '#3B2A1B',   // le filet de laiton éteint
  or:        '#C9A85A',   // --color-brass de la palette caravane
  orPale:    '#E0BE6A',   // --color-brass-soft
  texte:     '#EFE8DB',   // l'ivoire du corps
  texteDoux: '#BDB2A1',   // l'ivoire assourdi
  texteMuet: '#8B8072',   // le pied de page et les crédits
};

/** Les jetons que la Cloud Function remplace au moment de l'envoi.
 *  Les mêmes chaînes vivent dans `functions/index.js` : si l'une des
 *  deux change, l'autre doit suivre, sinon le lien de désabonnement
 *  part en toutes lettres dans la boîte du destinataire. */
export const JETON_NOM = '{{nom}}';
export const JETON_DESABONNEMENT = '{{desabonnement}}';

export interface RenduCourriel {
  sujet: string;
  html: string;
  texte: string;
}

/** Les quatre caractères qui cassent un document HTML. Le texte vient
 *  de notre propre fichier de contenu, mais l'échappement se fait quand
 *  même : le jour où une lettre se rédige dans l'admin, la garde est
 *  déjà en place. */
function e(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SERIF = 'Georgia, \'Times New Roman\', Times, serif';
const SANS = '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Arial, Helvetica, sans-serif';

const MARGE = 'padding-left:44px;padding-right:44px;';

/** La ligne d'aperçu que Gmail et Apple Mail affichent sous l'objet.
 *  Sans elle, ils y mettent le premier texte trouvé, soit « Bonjour ».
 *  La première phrase du premier paragraphe fait un bien meilleur
 *  hameçon, et elle reste cachée dans le corps de la lettre. */
function apercu(blocs: BlocCampagne[], fr: boolean): string {
  const premier = blocs.find((b) => b.type === 'texte') as { FR: string; EN: string } | undefined;
  const texte = premier ? (fr ? premier.FR : premier.EN) : '';
  const fin = texte.indexOf('. ');
  const phrase = fin > 40 ? texte.slice(0, fin + 1) : texte;
  return phrase.length > 155 ? `${phrase.slice(0, 152)}…` : phrase;
}

/** Un paragraphe du corps. */
const paragraphe = (t: string) =>
  `<p style="margin:0 0 20px 0;font-family:${SERIF};font-size:16px;line-height:28px;color:${C.texte};">${e(t)}</p>`;

/** Une image pleine largeur, avec son crédit. L'attribut `width` n'est
 *  pas décoratif : Outlook l'exige pour dimensionner l'image, et sans
 *  lui il l'affiche à sa taille réelle, soit 1200 px de large dans une
 *  colonne qui en fait 600. */
function image(src: string, alt: string, credit: string): string {
  return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px 0;">
              <tr>
                <td style="padding:0;">
                  <img src="${e(src)}" width="512" alt="${e(alt)}" border="0" style="width:100%;max-width:512px;height:auto;display:block;border:0;outline:none;text-decoration:none;" />
                </td>
              </tr>
              <tr>
                <td align="right" style="padding:7px 0 0 0;font-family:${SANS};font-size:10px;letter-spacing:1.2px;text-transform:uppercase;color:${C.texteMuet};">${e(credit)}</td>
              </tr>
            </table>`;
}

/** Le bouton. Un tableau plutôt qu'un lien stylé : Outlook n'applique
 *  ni le remplissage ni la couleur de fond sur une balise <a>, et le
 *  bouton s'y réduirait à du texte souligné. Les coins restent carrés
 *  chez lui, ce qui est le pire qui puisse arriver. */
function bouton(url: string, label: string): string {
  return `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px 0;">
              <tr>
                <td align="center" bgcolor="${C.or}" style="border-radius:3px;">
                  <a href="${e(url)}" target="_blank" style="display:inline-block;padding:15px 32px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#150A10;text-decoration:none;border-radius:3px;">${e(label)}</a>
                </td>
              </tr>
            </table>`;
}

/** Un bloc, rendu en HTML. */
function rendreBloc(b: BlocCampagne, fr: boolean, base: string): string {
  const photos = `${base}/courriel/lena`;
  const courriel = `${base}/courriel`;
  const credit = fr ? 'Photo : Léna' : 'Photo: Léna';

  if (b.type === 'texte') return paragraphe(fr ? b.FR : b.EN);

  if (b.type === 'photo') {
    return image(`${photos}/${b.fichier}`, fr ? b.altFR : b.altEN, credit);
  }

  if (b.type === 'video') {
    // Dans un courriel, une vidéo ne se joue jamais sur place : aucun
    // client n'exécute de lecteur. L'aperçu porte donc le triangle de
    // lecture DESSINÉ dans l'image, et l'image entière est le lien.
    return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px 0;">
              <tr>
                <td style="padding:0;">
                  <a href="${e(b.url)}" target="_blank" style="display:block;text-decoration:none;">
                    <img src="${e(`${courriel}/${b.image}`)}" width="512" alt="${e(fr ? b.altFR : b.altEN)}" border="0" style="width:100%;max-width:512px;height:auto;display:block;border:0;outline:none;text-decoration:none;" />
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 0 0 0;font-family:${SERIF};font-size:14px;line-height:24px;color:${C.texteDoux};">${e(fr ? b.legendeFR : b.legendeEN)}</td>
              </tr>
            </table>`;
  }

  // La carte : le bloc réutilisable image plus texte plus lien, qui
  // accueille les publications reprises de la page du festival. Elle se
  // détache par une bande plus sombre et un filet de laiton au-dessus,
  // jamais par un cadre : une boîte dans une boîte alourdit la lettre.
  const img = b.image
    ? `
                <tr>
                  <td style="padding:0 0 16px 0;">
                    <img src="${e(`${courriel}/${b.image}`)}" width="464" alt="${e((fr ? b.altFR : b.altEN) || '')}" border="0" style="width:100%;max-width:464px;height:auto;display:block;border:0;outline:none;text-decoration:none;" />
                  </td>
                </tr>`
    : '';
  const lien = b.lien
    ? `
                <tr>
                  <td style="padding:14px 0 0 0;font-family:${SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;">
                    <a href="${e(b.lien.url)}" target="_blank" style="color:${C.orPale};text-decoration:none;border-bottom:1px solid ${C.bordure};">${e(fr ? b.lien.labelFR : b.lien.labelEN)}</a>
                  </td>
                </tr>`
    : '';

  return `
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:10px 0 26px 0;background-color:${C.bande};">
              <tr><td height="1" style="height:1px;line-height:1px;font-size:1px;background-color:${C.bordure};">&nbsp;</td></tr>
              <tr>
                <td style="padding:24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${img}
                    <tr>
                      <td style="padding:0 0 10px 0;font-family:${SERIF};font-size:19px;line-height:27px;color:${C.orPale};">${e(fr ? b.titreFR : b.titreEN)}</td>
                    </tr>
                    <tr>
                      <td style="font-family:${SERIF};font-size:15px;line-height:26px;color:${C.texteDoux};">${e(fr ? b.texteFR : b.texteEN)}</td>
                    </tr>
                    ${lien}
                  </table>
                </td>
              </tr>
            </table>`;
}

/** Un bloc, rendu en texte seul. Les photos n'y laissent rien : la
 *  description d'une image encombre une lecture au clavier ou à la
 *  voix, alors que le lien d'une vidéo ou d'une carte, lui, doit
 *  absolument survivre. */
function blocEnTexte(b: BlocCampagne, fr: boolean): string | null {
  if (b.type === 'texte') return fr ? b.FR : b.EN;
  if (b.type === 'photo') return null;
  if (b.type === 'video') return `${fr ? b.legendeFR : b.legendeEN}\n${fr ? 'La vidéo' : 'The video'} : ${b.url}`;
  const bouts = [(fr ? b.titreFR : b.titreEN).toUpperCase(), fr ? b.texteFR : b.texteEN];
  if (b.lien) bouts.push(`${fr ? b.lien.labelFR : b.lien.labelEN} : ${b.lien.url}`);
  return bouts.join('\n');
}

/**
 * Rend une infolettre complète, prête pour la Cloud Function.
 * Les deux jetons restent en place : ils se remplacent à l'envoi.
 *
 * @param base L'adresse d'où viennent les images. Le défaut est le site
 *   public, la seule valeur juste pour un envoi réel. L'aperçu de
 *   l'admin y passe `window.location.origin`, ce qui lui montre les
 *   images servies par le site en cours plutôt que par la production.
 */
export function rendreCampagne(
  modele: ModeleCampagne,
  langue: LangueCampagne,
  base: string = BASE_PUBLIQUE,
): RenduCourriel {
  const fr = langue === 'FR';
  const sujet = fr ? modele.sujetFR : modele.sujetEN;
  const titre = fr ? modele.titreFR : modele.titreEN;
  const salut = fr ? modele.salutFR : modele.salutEN;
  const titreSignature = fr ? SIGNATURE.titreFR : SIGNATURE.titreEN;
  const dates = fr ? SIGNATURE.datesFR : SIGNATURE.datesEN;
  const theme = fr ? SIGNATURE.themeFR : SIGNATURE.themeEN;
  const bonjour = fr ? 'Bonjour' : 'Hello';

  const piedRaison = fr
    ? 'Vous recevez cette lettre parce que vous êtes déjà venu au festival ou que vous avez pris un billet.'
    : 'You are receiving this letter because you have attended the festival or bought a ticket.';
  const piedDesabo = fr ? 'Ne plus rien recevoir' : 'Stop receiving these';
  const piedBillets = fr ? 'La billetterie' : 'Tickets';
  const piedPhotos = fr ? 'Photographies : Léna' : 'Photography: Léna';

  const corps = modele.blocs.map((b) => rendreBloc(b, fr, base)).join('\n');
  const cta = modele.cta ? bouton(modele.cta.url, fr ? modele.cta.labelFR : modele.cta.labelEN) : '';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${fr ? 'fr' : 'en'}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${e(sujet)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a { font-family: Georgia, 'Times New Roman', serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Le téléphone : la lettre respire moins large et le titre descend
       d'un cran. Outlook pour Windows ignore ce bloc, ce qui n'a aucune
       importance : il tourne sur un écran de bureau. */
    @media only screen and (max-width: 620px) {
      .fmm-marge { padding-left: 22px !important; padding-right: 22px !important; }
      .fmm-titre { font-size: 26px !important; line-height: 34px !important; }
      .fmm-corps p { font-size: 16px !important; line-height: 27px !important; }
      /* Sur un téléphone, l'attribut width d'une image fixe la largeur
         MINIMALE de sa cellule, et le tableau refuse alors de descendre
         sous 600 px : la lettre déborde de l'écran vers la droite.
         Cette règle relâche la contrainte. Outlook ignore le bloc, et
         garde donc ses largeurs en pixels, qui sont ce qu'il lui faut. */
      img { max-width: 100% !important; height: auto !important; }
      table { max-width: 100% !important; }
    }
    a { color: ${C.orPale}; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.fond};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.fond};">${e(apercu(modele.blocs, fr))}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.fond};">
    <tr>
      <td align="center" style="padding:24px 12px 40px 12px;">

        <!--[if mso]>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td>
        <![endif]-->
        <!-- La colonne « fluide-hybride ». Elle vaut 100 % de la place
             disponible, jusqu'à 600 px, ce qui la fait tenir sur un
             téléphone sans jamais déborder. Outlook ne comprend pas
             max-width : le tableau fantôme ci-dessus, qu'il est seul à
             lire, lui donne les 600 px en dur. -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">

          <!-- ── L'en-tête : le blason, le nom, les dates ── -->
          <tr>
            <td align="center" bgcolor="${C.bande}" class="fmm-marge" style="background-color:${C.bande};padding-top:34px;padding-bottom:28px;${MARGE}border:1px solid ${C.bordure};border-bottom:0;">
              <img src="${e(`${base}/fmm-logo-white.png`)}" width="72" alt="${e(SIGNATURE.organisation)}" border="0" style="width:72px;max-width:72px;height:auto;display:block;border:0;outline:none;" />
              <p style="margin:18px 0 0 0;font-family:${SERIF};font-size:17px;line-height:25px;letter-spacing:3.4px;text-transform:uppercase;color:${C.texte};">Festival Médiéval<br />de Montpellier</p>
              <p style="margin:12px 0 0 0;font-family:${SANS};font-size:10px;letter-spacing:2.6px;text-transform:uppercase;color:${C.or};">${e(dates)}</p>
            </td>
          </tr>

          <!-- ── La lettre ── -->
          <tr>
            <td bgcolor="${C.carte}" style="background-color:${C.carte};border:1px solid ${C.bordure};border-top:0;border-bottom:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

                <!-- Le titre -->
                <tr>
                  <td class="fmm-marge" style="${MARGE}padding-top:38px;padding-bottom:0;">
                    <p style="margin:0 0 12px 0;font-family:${SANS};font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:${C.or};">${e(theme)}</p>
                    <h1 class="fmm-titre" style="margin:0;font-family:${SERIF};font-size:32px;line-height:41px;font-weight:400;color:${C.texte};">${e(titre)}</h1>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 30px 0;">
                      <tr><td width="56" height="2" style="width:56px;height:2px;line-height:2px;font-size:2px;background-color:${C.or};">&nbsp;</td></tr>
                    </table>
                  </td>
                </tr>

                <!-- Le corps -->
                <tr>
                  <td class="fmm-marge fmm-corps" style="${MARGE}padding-bottom:6px;">
                    <p style="margin:0 0 20px 0;font-family:${SERIF};font-size:16px;line-height:28px;color:${C.texte};">${bonjour}${JETON_NOM},</p>
${corps}${cta}
                  </td>
                </tr>

                <!-- La signature -->
                <tr>
                  <td class="fmm-marge" style="${MARGE}padding-top:26px;padding-bottom:40px;">
                    <p style="margin:0 0 22px 0;font-family:${SERIF};font-size:16px;line-height:28px;color:${C.texte};">${e(salut)}</p>
                    <p style="margin:0;font-family:${SERIF};font-size:17px;line-height:25px;color:${C.or};">${e(SIGNATURE.nom)}</p>
                    <p style="margin:5px 0 0 0;font-family:${SANS};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:${C.texteDoux};">${e(titreSignature)}</p>
                    <p style="margin:3px 0 0 0;font-family:${SANS};font-size:10px;letter-spacing:1.8px;text-transform:uppercase;color:${C.texteDoux};">${e(SIGNATURE.organisation)}</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── Le pied de page ── -->
          <tr>
            <td align="center" bgcolor="${C.bande}" class="fmm-marge" style="background-color:${C.bande};padding-top:26px;padding-bottom:28px;${MARGE}border:1px solid ${C.bordure};border-top:0;">
              <p style="margin:0;font-family:${SANS};font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:${C.or};">${e(dates)}</p>
              <p style="margin:12px 0 0 0;font-family:${SANS};font-size:11px;line-height:20px;color:${C.texteDoux};">
                <a href="${SIGNATURE.siteUrl}" target="_blank" style="color:${C.texteDoux};text-decoration:none;border-bottom:1px solid ${C.bordure};">${SIGNATURE.site}</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${SIGNATURE.billetterie}" target="_blank" style="color:${C.texteDoux};text-decoration:none;border-bottom:1px solid ${C.bordure};">${e(piedBillets)}</a>
              </p>
              <p style="margin:16px 0 0 0;font-family:${SANS};font-size:10px;line-height:18px;color:${C.texteMuet};">${e(piedPhotos)}</p>
              <p style="margin:6px 0 0 0;font-family:${SANS};font-size:10px;line-height:18px;color:${C.texteMuet};">
                ${e(piedRaison)}
                <a href="${JETON_DESABONNEMENT}" target="_blank" style="color:${C.texteMuet};text-decoration:underline;">${e(piedDesabo)}</a>.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->

      </td>
    </tr>
  </table>
</body>
</html>`;

  // ── La version texte seul ──
  // Elle part dans le même message que la version en couleurs. Deux
  // raisons de la soigner : les filtres antipourriel se méfient d'un
  // courriel qui n'a que du HTML, et certains lecteurs (montres,
  // terminaux, réglages de confidentialité) n'affichent jamais autre
  // chose que celle-ci.
  const corpsTexte = modele.blocs
    .map((b) => blocEnTexte(b, fr))
    .filter((t): t is string => Boolean(t))
    .join('\n\n');

  const ligneCta = modele.cta
    ? `\n${fr ? modele.cta.labelFR : modele.cta.labelEN} : ${modele.cta.url}\n`
    : '';

  const texte = [
    'FESTIVAL MÉDIÉVAL DE MONTPELLIER',
    dates,
    titre.toUpperCase(),
    '',
    '----------------------------------------',
    '',
    `${bonjour}${JETON_NOM},`,
    '',
    corpsTexte,
    ligneCta,
    salut,
    '',
    SIGNATURE.nom,
    titreSignature,
    SIGNATURE.organisation,
    SIGNATURE.site,
    '',
    '----------------------------------------',
    piedPhotos,
    `${piedRaison} ${piedDesabo} : ${JETON_DESABONNEMENT}`,
  ].join('\n');

  return { sujet, html, texte };
}
