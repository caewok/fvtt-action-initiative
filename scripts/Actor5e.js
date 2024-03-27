/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the Actor class

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
