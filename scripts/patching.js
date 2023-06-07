/* globals
libWrapper,
Actor,
Combatant
*/
"use strict";

import { MODULE_ID } from "./const.js";
import {
  _sortCombatantsCombat,
  rollAllCombat,
  rollNPCCombat,
  rollInitiativeCombat } from "./combat.js";

import {
  getActionInitiativeSelectionsCombatant,
  setActionInitiativeSelectionsCombatant,
  _getInitiativeFormulaCombatant,
  _actionInitiativeSelectionSummaryCombatant,
  addToInitiativeCombatant,
  resetInitiativeCombatant } from "./combatant.js";

import {
  actionInitiativeDialogActor,
  _actionInitiativeDialogDataActor,
  getActionInitiativeSelectionsActor,
  setActionInitiativeSelectionsActor,
  rollInitiativeDialogActor5e
} from "./actor.js";

import { getDataCombatTrackerConfig, _updateObjectCombatTrackerConfig } from "./render.js";


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
 * Helper to add a method to a class.
 * @param {class} cl      Either Class.prototype or Class
 * @param {string} name   Name of the method
 * @param {function} fn   Function to use for the method
 */
function addClassMethod(cl, name, fn) {
  Object.defineProperty(cl, name, {
    value: fn,
    writable: true,
    configurable: true
  });
}

/**
 * Register libWrapper patches for this module.
 */
export function registerActionInitiative() {
  wrap("Combat.prototype.rollInitiative", rollInitiativeCombat);
  override("Combat.prototype._sortCombatants", _sortCombatantsCombat);
  override("Combat.prototype.rollAll", rollAllCombat);
  override("Combat.prototype.rollNPC", rollNPCCombat);

  override("Combatant.prototype._getInitiativeFormula", _getInitiativeFormulaCombatant);

  override("dnd5e.documents.Actor5e.prototype.rollInitiativeDialog", rollInitiativeDialogActor5e);

  wrap("CombatTrackerConfig.prototype._updateObject", _updateObjectCombatTrackerConfig);
  wrap("CombatTrackerConfig.prototype.getData", getDataCombatTrackerConfig);

  // New methods
  addClassMethod(Actor.prototype, "actionInitiativeDialog", actionInitiativeDialogActor);
  addClassMethod(Actor.prototype, "_actionInitiativeDialogData", _actionInitiativeDialogDataActor);
  addClassMethod(Actor.prototype, "getActionInitiativeSelections", getActionInitiativeSelectionsActor);
  addClassMethod(Actor.prototype, "setActionInitiativeSelections", setActionInitiativeSelectionsActor);
  addClassMethod(Combatant.prototype, "_actionInitiativeSelectionSummary", _actionInitiativeSelectionSummaryCombatant);
  addClassMethod(Combatant.prototype, "getActionInitiativeSelections", getActionInitiativeSelectionsCombatant);
  addClassMethod(Combatant.prototype, "setActionInitiativeSelections", setActionInitiativeSelectionsCombatant);
  addClassMethod(Combatant.prototype, "addToInitiative", addToInitiativeCombatant);
  addClassMethod(Combatant.prototype, "resetInitiative", resetInitiativeCombatant);
}
