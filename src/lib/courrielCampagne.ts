// ─── La mise en page des courriels de campagne ───────────────────────
// Alex, 2026-08-24 : les lettres partent au nom du festival, avec sa
// signature de directeur des communications au bas. Ce fichier prend un
// modèle de `src/content/campagnes.ts` et rend les trois morceaux qu'un
// courriel demande : l'objet, la version HTML et la version texte seul.
//
// POURQUOI DU HTML AUSSI RUDE. Un courriel n'est pas une page web.
// Outlook pour Windows rend le HTML avec le moteur de Word, qui ignore
// flexbox, grid, les positions et la moitié des marges. Gmail coupe la
// feuille de style dès qu'elle dépasse quelques dizaines de kilooctets
// et ne garde presque rien des sélecteurs. La seule construction qui
// tient partout depuis vingt ans reste le tableau imbriqué avec des
// styles écrits sur chaque cellule, et c'est celle-là qui est ici.
//
// Trois interdits, pour que la lettre arrive intacte :
//   • aucune image de fond, Outlook ne les rend pas et Gmail les coupe;
//   • aucune police exotique, la pile est Georgia puis les serifs du
//     système, disponibles sur toutes les machines depuis toujours;
//   • aucun dégradé, qui tomberait en aplat gris sur la moitié des
//     clients. Le filet doré est donc une ligne de couleur pleine.
//
// LES DEUX JETONS. Le HTML et le texte sortent d'ici avec `{{nom}}` et
// `{{desabonnement}}` encore en place : c'est la Cloud Function qui les
// remplace, destinataire par destinataire, au moment de l'envoi. Le
// navigateur n'a donc jamais à fabriquer trois cents versions d'une
// même lettre, et le lien de désabonnement se signe côté serveur.

import type { LangueCampagne, ModeleCampagne } from '../content/campagnes';

/** La signature au bas de chaque lettre. L'expéditeur reste le
 *  festival : c'est ici, et seulement ici, que le nom d'Alex paraît. */
export const SIGNATURE = {
  nom: 'Alex Turcot St-Laurent',
  titreFR: 'Directeur des communications',
  titreEN: 'Director of Communications',
  organisation: 'Festival Médiéval de Montpellier',
  site: 'festivalmedievaldemontpellier.org',
  siteUrl: 'https://festivalmedievaldemontpellier.org',
  datesFR: '25, 26 et 27 septembre 2026',
  datesEN: 'September 25, 26 and 27, 2026',
};

/** Le noir chaud et l'or du festival, transposés pour un courriel.
 *  Les valeurs viennent de la palette caravane de `src/index.css`,
 *  arrondies en couleurs pleines : un client de courriel ne sait pas
 *  lire une variable CSS ni un `color-mix`. */
const C = {
  fond:        '#0B0508',   // le noir chaud, derrière la lettre
  carte:       '#150A0F',   // le parchemin sombre de la lettre
  bordure:     '#3B2A18',   // le filet de laiton éteint
  or:          '#C9A85A',   // --color-brass de la palette caravane
  orPale:      '#E0BE6A',   // --color-brass-soft
  texte:       '#EDE6D9',   // l'ivoire du corps
  texteDoux:   '#BDB3A2',   // l'ivoire assourdi
  texteMuet:   '#8C8375',   // le pied de page
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
function echapper(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const POLICE = 'Georgia, \'Times New Roman\', Times, serif';
const POLICE_SANS = '-apple-system, BlinkMacSystemFont, \'Segoe UI\', Arial, sans-serif';

/** La ligne d'aperçu que Gmail et Apple Mail affichent sous l'objet.
 *  Sans elle, ils y mettent le premier texte trouvé, soit « Bonjour ».
 *  La première phrase du premier paragraphe fait un bien meilleur
 *  hameçon, et elle reste cachée dans le corps de la lettre. */
function apercu(corps: string[]): string {
  const premier = corps[0] || '';
  const fin = premier.indexOf('. ');
  const phrase = fin > 40 ? premier.slice(0, fin + 1) : premier;
  return phrase.length > 155 ? `${phrase.slice(0, 152)}…` : phrase;
}

/**
 * Rend une lettre complète, prête pour la Cloud Function.
 * Les deux jetons restent en place : ils se remplacent à l'envoi.
 */
export function rendreCampagne(
  modele: ModeleCampagne,
  langue: LangueCampagne,
): RenduCourriel {
  const fr = langue === 'FR';
  const sujet = fr ? modele.sujetFR : modele.sujetEN;
  const corps = fr ? modele.corpsFR : modele.corpsEN;
  const salut = fr ? modele.salutFR : modele.salutEN;
  const titreSignature = fr ? SIGNATURE.titreFR : SIGNATURE.titreEN;
  const dates = fr ? SIGNATURE.datesFR : SIGNATURE.datesEN;
  const bonjour = fr ? 'Bonjour' : 'Hello';
  const piedDesabo = fr
    ? 'Vous recevez cette lettre parce que vous êtes déjà venu au festival ou que vous avez pris un billet. Pour ne plus rien recevoir de nous'
    : 'You are receiving this letter because you have attended the festival or bought a ticket. To stop receiving anything from us';
  const motDesabo = fr ? 'retirez votre adresse' : 'remove your address';

  // ── Le corps, en paragraphes ──
  const paragraphesHtml = corps
    .map(
      (p) =>
        `<p style="margin:0 0 18px 0;font-family:${POLICE};font-size:16px;line-height:27px;color:${C.texte};">${echapper(p)}</p>`,
    )
    .join('\n            ');

  // ── Le bouton ──
  // Un tableau plutôt qu'un lien stylé : Outlook n'applique ni le
  // remplissage ni la couleur de fond sur une balise <a>, et le bouton
  // s'y réduirait à du texte souligné. Les coins restent carrés chez
  // lui, ce qui est le pire qui puisse arriver.
  const bouton = modele.cta
    ? `
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 8px 0;">
              <tr>
                <td align="center" bgcolor="${C.or}" style="border-radius:3px;">
                  <a href="${echapper(modele.cta.url)}" target="_blank" style="display:inline-block;padding:14px 30px;font-family:${POLICE_SANS};font-size:13px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#14080C;text-decoration:none;border-radius:3px;">${echapper(fr ? modele.cta.labelFR : modele.cta.labelEN)}</a>
                </td>
              </tr>
            </table>`
    : '';

  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="${fr ? 'fr' : 'en'}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${echapper(sujet)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a { font-family: Georgia, 'Times New Roman', serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    /* Le téléphone : la lettre respire moins large, le titre descend
       d'un cran. Outlook pour Windows ignore ce bloc, ce qui n'a
       aucune importance : il tourne sur un écran de bureau. */
    @media only screen and (max-width: 620px) {
      .fmm-marge { padding-left: 22px !important; padding-right: 22px !important; }
      .fmm-titre { font-size: 22px !important; letter-spacing: 3px !important; }
      .fmm-corps p { font-size: 16px !important; line-height: 26px !important; }
    }
    a { color: ${C.orPale}; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.fond};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${C.fond};">${echapper(apercu(corps))}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.fond};">
    <tr>
      <td align="center" style="padding:28px 12px 40px 12px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:${C.carte};border:1px solid ${C.bordure};">

          <!-- L'en-tête : le nom du festival et ses dates -->
          <tr>
            <td class="fmm-marge" align="center" style="padding:38px 44px 26px 44px;">
              <p class="fmm-titre" style="margin:0;font-family:${POLICE};font-size:25px;line-height:34px;letter-spacing:4px;text-transform:uppercase;color:${C.texte};">Festival Médiéval<br />de Montpellier</p>
              <p style="margin:14px 0 0 0;font-family:${POLICE_SANS};font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:${C.or};">${echapper(dates)}</p>
            </td>
          </tr>

          <!-- Le filet de laiton -->
          <tr>
            <td style="padding:0 44px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td height="1" style="height:1px;line-height:1px;font-size:1px;background-color:${C.bordure};">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- La lettre -->
          <tr>
            <td class="fmm-marge fmm-corps" style="padding:32px 44px 8px 44px;">
              <p style="margin:0 0 18px 0;font-family:${POLICE};font-size:16px;line-height:27px;color:${C.texte};">${bonjour}${JETON_NOM},</p>
            ${paragraphesHtml}${bouton}
            </td>
          </tr>

          <!-- La signature -->
          <tr>
            <td class="fmm-marge" style="padding:14px 44px 38px 44px;">
              <p style="margin:0 0 20px 0;font-family:${POLICE};font-size:16px;line-height:27px;color:${C.texte};">${echapper(salut)}</p>
              <p style="margin:0;font-family:${POLICE};font-size:16px;line-height:24px;color:${C.or};">${echapper(SIGNATURE.nom)}</p>
              <p style="margin:3px 0 0 0;font-family:${POLICE_SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${C.texteDoux};">${echapper(titreSignature)}</p>
              <p style="margin:3px 0 0 0;font-family:${POLICE_SANS};font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:${C.texteDoux};">${echapper(SIGNATURE.organisation)}</p>
            </td>
          </tr>

        </table>

        <!-- Le pied de page, hors de la lettre -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
          <tr>
            <td class="fmm-marge" align="center" style="padding:20px 44px 0 44px;">
              <p style="margin:0 0 8px 0;font-family:${POLICE_SANS};font-size:11px;line-height:19px;color:${C.texteMuet};">
                <a href="${SIGNATURE.siteUrl}" target="_blank" style="color:${C.texteMuet};text-decoration:underline;">${SIGNATURE.site}</a>
              </p>
              <p style="margin:0;font-family:${POLICE_SANS};font-size:11px;line-height:19px;color:${C.texteMuet};">
                ${echapper(piedDesabo)} : <a href="${JETON_DESABONNEMENT}" target="_blank" style="color:${C.texteMuet};text-decoration:underline;">${echapper(motDesabo)}</a>.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  // ── La version texte seul ──
  // Elle part dans le même message que le HTML. Deux raisons de la
  // soigner : les filtres antipourriel se méfient d'un courriel qui n'a
  // que du HTML, et certains lecteurs (montres, terminaux, réglages de
  // confidentialité) n'affichent jamais autre chose que celle-ci.
  const ligneCta = modele.cta
    ? `\n${fr ? modele.cta.labelFR : modele.cta.labelEN} : ${modele.cta.url}\n`
    : '';

  const texte = [
    'FESTIVAL MÉDIÉVAL DE MONTPELLIER',
    dates,
    '',
    '----------------------------------------',
    '',
    `${bonjour}${JETON_NOM},`,
    '',
    corps.join('\n\n'),
    ligneCta,
    salut,
    '',
    SIGNATURE.nom,
    titreSignature,
    SIGNATURE.organisation,
    SIGNATURE.site,
    '',
    '----------------------------------------',
    `${piedDesabo} : ${JETON_DESABONNEMENT}`,
  ].join('\n');

  return { sujet, html, texte };
}
