/* globals
Roll
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the Combatant5e class

export const PATCHES = {};
PATCHES.DND5E_V3 = {};

// ----- NOTE: Overrides ----- //


// ----- NOTE: Overrides ----- //

/**
 * Override Combatant5e.prototype.getInitiativeRoll.
 * DND5e patches this to point to documents.combat.getInitiativeRoll,
 * which calls actor.getInitiativeRoll.
 * In dnd5e v3, this is not used.
 */
function getInitiativeRoll(formula) {
  formula ||= this._getInitiativeFormula();
  const rollData = this.actor?.getRollData() || {};
  return Roll.create(formula, rollData);
}

PATCHES.DND5E_V3.OVERRIDES = { getInitiativeRoll };
