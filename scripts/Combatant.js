/* globals
CONFIG
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";

export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Overrides ----- //

/**
 * Override Combatant.prototype._getInitiativeFormula method.
 * If no selections, present dialog to retrieve selections for combatant.
 * Construct the initiative formula for a combatant based on user-selected actions.
 * @param {object} [lastSelections]   Optional returned object from ActionSelectionDialog.
 * @returns {string} Dice formula
 */
function _getInitiativeFormula() {
  const iH = this[MODULE_ID].initiativeHandler;
  return iH.constructInitiativeFormula();
}

PATCHES.BASIC.OVERRIDES = { _getInitiativeFormula };

// ----- NOTE: Wraps ----- //

/**
 * Wrap Combatant.prototype.rollInitiative
 * @param {string} [formula]      A dice formula which overrides the default for this Combatant.
 * @returns {Promise<Combatant>}  The updated Combatant.
 */
async function rollInitiative(wrapped, formula) {
  if ( !formula ) {
    const iH = this[MODULE_ID].initiativeHandler;
    if ( !iH.initiativeSelections ) {
      // Present the initiative dialog for this combatant and store the result.
      const selections = await iH.initiativeDialogs();
      await iH.setInitiativeSelections(selections);
      // super.rollInitiative should call _getInitiativeFormula to calculate the formula.
    }
  }
  return wrapped(formula);
}

PATCHES.BASIC.WRAPS = { rollInitiative };

// ----- NOTE: Getters ----- //

/**
 * New getter: Actor#actioninitiative
 * Class that handles action initiative items for the combatant
 * @type {object}
 */
function actioninitiative() {
  const ai = this._actioninitiative ??= {};
  ai.initiativeHandler ??= new CONFIG[MODULE_ID].CombatantInitiativeHandler(this);
  return ai;
}

PATCHES.BASIC.GETTERS = {
  actioninitiative
};
