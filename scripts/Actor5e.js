/* globals
Roll
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the Actor5e class
import { MODULE_ID } from "./const.js";

export const PATCHES = {};
PATCHES.DND5E = {};

// ----- NOTE: Overrides ----- //

/**
 * Override Actor5e.prototype.rollInitiativeDialog
 * Present user with dialog to select actions.
 * Store the selections made by the user.
 * Then roll initiative as usual.
 * @param {object} [rollOptions]
 * @param {D20Roll.ADV_MODE} [options.advantageMode]    A specific advantage mode to apply
 * @param {string} [options.combatantId]                Id of the combatant chosen
 * @returns {Promise<void>}
 */
async function rollInitiativeDialog(_rollOptions={}) {
  // Removes the dialog; handled in Combat#rollInitiative
  const iH = this[MODULE_ID].initiativeHandler;
  const selections = await iH.initiativeDialogs();
  if ( !selections ) return;
  await iH.setInitiativeSelections(selections);

  this._cachedInitiativeRoll = this.getInitiativeRoll();
  await this.rollInitiative({ createCombatants: true, actioninitiativeSkipActorDialog: true });
}


/**
 * Override Actor5e.prototype.getInitiativeRoll
 * Construct the initiative formula for the combatant.
 */
function getInitiativeRoll(wrapped, _options = {}) {
  const formula = this[MODULE_ID].initiativeHandler.constructInitiativeFormula();
  const rollData = this.getRollData();
  return Roll.create(formula, rollData);
}

PATCHES.DND5E.MIXES = { getInitiativeRoll };

PATCHES.DND5E.OVERRIDES = { rollInitiativeDialog };
