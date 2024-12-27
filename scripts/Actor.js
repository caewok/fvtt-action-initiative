/* globals
CONFIG
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the Actor class

import { MODULE_ID } from "./const.js";

export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Getters ----- //

/**
 * New getter: Actor#actioninitiative
 * Class that handles action initiative items for the actor
 * @type {object}
 */
function actioninitiative() {
  const ai = this._actioninitiative ??= {};
  ai.weaponsHandler ??= new CONFIG[MODULE_ID].WeaponsHandler(this);
  ai.initiativeHandler ??= new CONFIG[MODULE_ID].ActorInitiativeHandler(this);
  return ai;
}

PATCHES.BASIC.GETTERS = { actioninitiative };
