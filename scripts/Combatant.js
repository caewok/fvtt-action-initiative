/* globals
CONFIG,
Roll
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";

export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Overrides ----- //

/**
 * Override Combatant.prototype.getInitiativeRoll.
 * DND5e patches this to point to documents.combat.getInitiativeRoll,
 * which calls actor.getInitiativeRoll.
 * In dnd5e v3, this is not used.
 */
function getInitiativeRoll(formula) {
  // This just copied from v11 Combatant.prototype.getInitiativeRoll.
  formula = formula || this._getInitiativeFormula();
  const rollData = this.actor?.getRollData() || {};
  return Roll.create(formula, rollData);
}

/**
 * Override Combatant.prototype._getInitiativeFormula method.
 * Construct the initiative formula for a combatant based on user-selected actions.
 * @param {object} [lastSelections]   Optional returned object from ActionSelectionDialog.
 * @returns {string} Dice formula
 */
function _getInitiativeFormula(lastSelections) {
  return this[MODULE_ID].initiativeHandler.constructInitiativeFormula(lastSelections);
}


PATCHES.BASIC.OVERRIDES = { getInitiativeRoll, _getInitiativeFormula };

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
