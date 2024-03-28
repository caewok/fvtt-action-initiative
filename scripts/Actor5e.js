/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the Actor5e class

import { Settings } from "./settings.js";

export const PATCHES = {};
PATCHES.BASIC = {};

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
async function rollInitiativeDialog({advantageMode, combatantId} = {}) {
  const selections = await this.actionInitiativeDialog(this, { advantageMode });
  if ( !selections ) return; // Closed dialog.

  // Set initiative for either only active tokens or all
  if ( Settings.get(Settings.KEYS.GROUP_ACTORS) ) combatantId = undefined;

  // Retrieve the action choices made by the user for this actor.
  // Ultimate tied to the combatant that represents the actor.
  await this.setActionInitiativeSelections(selections, { combatantId });
  await this.rollInitiative({createCombatants: true, initiativeOptions: { combatantId }});
}

PATCHES.BASIC.OVERRIDES = { rollInitiativeDialog };


/**
 * Mixed wrap of Actor5e.prototype.getInitiativeRoll
 * Construct the initiative formula for the combatant.
 * If combatant is not present, fall back on original.
 */
function getInitiativeRoll(wrapped, options = {}) {
  let c = this.token?.object?.combatant;
  if ( !c ) {
    // Hunt for tokens, use the first one that has a combatant.
    for ( const t of this.getActiveTokens() ) {
      c = t.object?.combatant;
      if ( c ) break;
    }
  }
  if ( !c ) return wrapped(options);

  const formula = c._getInitiativeFormula();
  const rollData = this.getRollData();
  return Roll.create(formula, rollData);
}

PATCHES.BASIC.MIXES = { getInitiativeRoll };

