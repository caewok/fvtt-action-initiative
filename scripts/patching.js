/* globals
libWrapper,
Actor,
Combatant
*/
"use strict";

import { MODULE_ID } from "./const.js";
import { _sortCombatantsCombat, rollAllCombat, rollNPCCombat } from "./combat.js";
import {
  rollInitiativeDialogActor5e,
  actionInitiativeDialogActor,
  _actionInitiativeDialogDataActor,
  calculateActionInitiativeRollActor,
  calculateActionInitiativeRollCombatant,
  getActionInitiativeSelectionsActor,
  setActionInitiativeSelectionsActor } from "./initiativeRollDialog.js";


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

  // New methods
  Object.defineProperty(Actor.prototype, "actionInitiativeDialog", {
    value: actionInitiativeDialogActor,
    writable: true,
    configurable: true
  });

  Object.defineProperty(Actor.prototype, "_actionInitiativeDialogData", {
    value: _actionInitiativeDialogDataActor,
    writable: true,
    configurable: true
  });

  Object.defineProperty(Actor.prototype, "calculateActionInitiativeRoll", {
    value: calculateActionInitiativeRollActor,
    writable: true,
    configurable: true
  });

  Object.defineProperty(Combatant.prototype, "calculateActionInitiativeRoll", {
    value: calculateActionInitiativeRollCombatant,
    writable: true,
    configurable: true
  });

  Object.defineProperty(Actor.prototype, "getActionInitiativeSelections", {
    value: getActionInitiativeSelectionsActor,
    writable: true,
    configurable: true
  });

  Object.defineProperty(Actor.prototype, "setActionInitiativeSelections", {
    value: setActionInitiativeSelectionsActor,
    writable: true,
    configurable: true
  });
}
