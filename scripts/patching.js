/* globals
libWrapper,
game,
MeasuredTemplate,
MeasuredTemplateDocument,
canvas
*/
"use strict";

import { MODULE_ID } from "./const.js";
import { _sortCombatantsCombat, rollAllCombat, rollNPCCombat } from "./combat.js";
import { rollInitiativeDialogActor5e } from "./initiativeRollDialog.js";

/**
 * Helper to wrap methods.
 * @param {string} method       Method to wrap
 * @param {function} fn   Function to use for the wrap
 */
function wrap(method, fn) { libWrapper.register(MODULE_ID, method, fn, libWrapper.WRAPPER); }

/**
 * Helper to override methods.
 * @param {string} method       Method to wrap
 * @param {function} fn   Function to use for the wrap
 */
function override(method, fn) { libWrapper.register(MODULE_ID, method, fn, libWrapper.OVERRIDE); }

/**
 * Register libWrapper patches for this module.
 */
export function registerActionInitiative() {
  override("Combat.prototype._sortCombatants", _sortCombatantsCombat);
  override("Combat.prototype.rollAll", rollAllCombat);
  override("Combat.prototype.rollNPC", rollNPCCombat);

  override("dnd5e.documents.Actor5e.prototype.rollInitiativeDialog", rollInitiativeDialogActor5e);
}
