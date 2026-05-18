# Hnefatafl — GLB asset notes

The actual `.glb` files do **not** live in this folder — large 3D assets
go under `public/games/hnefatafl/models/` so vite serves them directly
without bundling them into a JS chunk.

```
public/games/hnefatafl/models/
├── board.glb            ← installed (33 MB — needs compression)
├── piece_raider.glb     ← TODO (Meshy)
├── piece_defender.glb   ← TODO (Meshy)
└── piece_king.glb       ← TODO (Meshy)
```

## Currently wired

- `board.glb` — loaded by `loadBoardModel()` in `../../boardMesh.ts`.
  When it resolves, the procedural board decorations (base, trims, grid
  lines, corner + throne markers) are hidden and the 121 procedural
  squares become invisible-but-raycastable so cell clicks still work.
  Highlights are now overlay planes (see `../../highlightSystem.ts`),
  rendered above whichever board surface is visible.

## File-size mitigation (board.glb is 33 MB)

Web GLBs should be 1–10 MB. Compression options:

```bash
# Draco geometry compression — 10–50× smaller for high-poly meshes
npx gltf-pipeline -i public/games/hnefatafl/models/board.glb \
                  -o public/games/hnefatafl/models/board.draco.glb \
                  --draco.compressionLevel 7

# Or meshopt (better for animation; comparable for static)
npx gltfpack -i public/games/hnefatafl/models/board.glb \
             -o public/games/hnefatafl/models/board.meshopt.glb -cc
```

After compression, point `BOARD_GLB_URL` in `boardMesh.ts` at the
compressed file and (for draco) register `THREE.DRACOLoader` on the
`GLTFLoader` instance.

Until compressed, consider either:
- **Git LFS** for the binary so the repo stays light
- A `.gitignore` entry + manual upload to the deploy bucket (Firebase
  Hosting accepts assets up to 32 MB per file on the spark plan)

## Piece GLBs (still pending)

When the Meshy outputs arrive, drop them into the public path above and
swap the procedural body+cap geometry inside
`../../pieceMesh.ts → mkPiece()`. The commented `GLTFLoader` block at
the bottom of that file shows the exact swap point.
