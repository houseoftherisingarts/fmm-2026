// Reprise des six tâches Meshy déjà lancées : on attend chacune, on
// télécharge le GLB brut, on retire la carte métal et on optimise.
// Vit dans scripts/ le temps du chantier pour que @gltf-transform/core
// se résolve depuis le dépôt.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { NodeIO } from '@gltf-transform/core';

const KEY = process.env.MESHY_API_KEY;
const outDir = 'public/games/des/convives';
const TACHES = {
  moine: '01a0c73d-a21a-7414-87d9-1ba73b951ef1',
  dame: '01a0c73d-a235-7380-aa0c-26464edfe7e1',
  colporteur: '01a0c73d-a24b-75a5-a94f-86963364b225',
  meunier: '01a0c73d-a20a-70fa-bdfa-4712179bbddb',
  taverniere: '01a0c73d-a25e-778f-be72-25734f862b8d',
  bourreau: '01a0c73d-a209-7092-98cf-ee302ae42402',
};
const H = { Authorization: `Bearer ${KEY}` };
const dors = (ms) => new Promise((r) => setTimeout(r, ms));

async function sansMetal(entree, sortie) {
  const io = new NodeIO();
  const doc = await io.read(entree);
  for (const m of doc.getRoot().listMaterials()) {
    const t = m.getMetallicRoughnessTexture();
    m.setMetallicRoughnessTexture(null);
    m.setMetallicFactor(0);
    m.setRoughnessFactor(0.72);
    if (t && t.listParents().length <= 1) t.dispose();
  }
  await io.write(sortie, doc);
}

async function un(nom, id) {
  const brut = path.join(outDir, `${nom}-brut.glb`);
  const mat = path.join(outDir, `${nom}-mat.glb`);
  const fin = path.join(outDir, `${nom}.glb`);
  for (;;) {
    const s = await (await fetch(`https://api.meshy.ai/openapi/v1/image-to-3d/${id}`, { headers: H })).json();
    if (s.status === 'SUCCEEDED') {
      if (!fs.existsSync(brut)) fs.writeFileSync(brut, Buffer.from(await (await fetch(s.model_urls.glb)).arrayBuffer()));
      fs.writeFileSync(path.join(outDir, `${nom}-vignette.url`), s.thumbnail_url);
      break;
    }
    if (s.status === 'FAILED' || s.status === 'EXPIRED') throw new Error(`${nom}: ${s.status} ${s.task_error?.message || ''}`);
    console.log(nom, s.status, s.progress ?? '');
    await dors(15000);
  }
  await sansMetal(brut, mat);
  execSync(`npx --yes @gltf-transform/cli optimize "${mat}" "${fin}" --compress draco --texture-compress webp --texture-size 1024`, { stdio: 'inherit' });
  fs.rmSync(brut); fs.rmSync(mat);
  console.log(nom, 'prêt', fs.statSync(fin).size);
}

const r = await Promise.allSettled(Object.entries(TACHES).map(([n, id]) => un(n, id)));
r.forEach((x, i) => { if (x.status === 'rejected') console.error(Object.keys(TACHES)[i], x.reason.message); });
