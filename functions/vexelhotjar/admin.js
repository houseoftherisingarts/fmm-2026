"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ADMIN_EMAILS = void 0;
// Les adresses qui ont le droit d'administrer la mesure (rafraîchir, effacer
// une session). Au FMM, la liste vit déjà dans index.js (COURRIELS_ADMIN,
// recopiée de config/equipe-admin.json par scripts/sync-equipe.mjs) : index.js
// la verse ici au chargement, pour qu'il n'y ait jamais deux listes.
exports.ADMIN_EMAILS = [];
