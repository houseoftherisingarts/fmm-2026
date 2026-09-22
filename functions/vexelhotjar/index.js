"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vhPurger = exports.vhEffacerSession = exports.vhAgregerMaintenant = exports.vhAgreger = exports.vhCollecter = void 0;
// VexelHotjar : la mesure du comportement des visiteurs (voir commun.ts).
var collecte_1 = require("./collecte");
Object.defineProperty(exports, "vhCollecter", { enumerable: true, get: function () { return collecte_1.vhCollecter; } });
var agregation_1 = require("./agregation");
Object.defineProperty(exports, "vhAgreger", { enumerable: true, get: function () { return agregation_1.vhAgreger; } });
Object.defineProperty(exports, "vhAgregerMaintenant", { enumerable: true, get: function () { return agregation_1.vhAgregerMaintenant; } });
Object.defineProperty(exports, "vhEffacerSession", { enumerable: true, get: function () { return agregation_1.vhEffacerSession; } });
Object.defineProperty(exports, "vhPurger", { enumerable: true, get: function () { return agregation_1.vhPurger; } });
