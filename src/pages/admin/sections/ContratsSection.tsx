import React, { useEffect, useState } from 'react';
import { Download, FileSignature } from 'lucide-react';
import {
  adresseContratSigne, listerContratsSignes, NOMS_CONTRATS, type ContratSigne,
} from '../../../firebase/contratsSignes';
import { Card, EmptyState, GhostButton } from '../primitives';

// ─── Les contrats signés qui reviennent de la page publique ─────────
// Chaque personne qui signe sur son téléphone (/signer-cuisine) dépose
// ici sa copie en appuyant sur « Renvoyer le document signé ». Une
// ligne par signature, la plus récente en haut.
//
// Le PDF ne porte pas d'adresse publique : il se lit par un admin
// connecté, et l'adresse de téléchargement se résout à l'ouverture de
// la section. Une entente porte un nom et une signature manuscrite,
// donc elle reste dans le coffre de l'équipe (Loi 25).

const dateLongue = (t?: { toDate?: () => Date } | null) => {
  const d = t && typeof t.toDate === 'function' ? t.toDate() : null;
  return d ? d.toLocaleString('fr-CA', { dateStyle: 'long', timeStyle: 'short' }) : '';
};

const ContratsSection: React.FC = () => {
  const [items, setItems] = useState<ContratSigne[]>([]);
  const [liens, setLiens] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    listerContratsSignes()
      .then(async (rows) => {
        if (!vivant) return;
        setItems(rows);
        setLoading(false);
        // Les adresses se résolvent en parallèle : une signature qui
        // manque à l'appel ne retient pas la liste.
        const paires = await Promise.all(rows.map(async (c) => {
          try { return [c.id, await adresseContratSigne(c.chemin)] as const; }
          catch { return [c.id, ''] as const; }
        }));
        if (vivant) setLiens(Object.fromEntries(paires.filter(([, u]) => u)));
      })
      .catch((e) => {
        if (!vivant) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => { vivant = false; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-title text-2xl">Contrats signés</h1>
        <p className="admin-prose">
          Les ententes signées au doigt depuis la page publique, avec le nom écrit par la
          personne signataire et l'heure exacte de la signature. Le PDF s'ouvre d'un clic et
          garde la page de signature ajoutée au document d'origine.
        </p>
      </div>

      {error && <p className="admin-prose" style={{ color: '#FCA5B0' }}>{error}</p>}

      {loading ? (
        <p className="admin-prose">Chargement…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={FileSignature}>Personne n'a encore renvoyé d'entente signée.</EmptyState>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Nom', 'Entente', 'Signé le', 'Document'].map((h) => (
                  <th key={h} className="px-4 py-3 font-sans uppercase tracking-[0.14em] text-[10px] opacity-70">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td className="px-4 py-3">{c.nom}</td>
                  <td className="px-4 py-3 opacity-80">{NOMS_CONTRATS[c.contrat] ?? c.contrat}</td>
                  <td className="px-4 py-3 opacity-80">{dateLongue(c.signeLe)}</td>
                  <td className="px-4 py-3">
                    {liens[c.id] ? (
                      <a href={liens[c.id]} target="_blank" rel="noopener noreferrer">
                        <GhostButton type="button">
                          <Download size={14} className="inline mr-1.5 -mt-0.5" /> Ouvrir le PDF
                        </GhostButton>
                      </a>
                    ) : (
                      <span className="opacity-50">…</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default ContratsSection;
