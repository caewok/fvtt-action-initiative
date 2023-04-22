/* globals
libWrapper,
Actor,
Combatant
*/
"use strict";

import { MODULE_ID } from "./const.js";
import { _sortCombatantsCombat, rollAllCombat, rollNPCCombat } from "./combat.js";
import {
  _getInitiativeFormulaCombatant,
  getInitiativeRollCombatant,
  getActionInitiativeSelectionsCombatant,
  setActionInitiativeSelectionsCombatant,
   _actionInitiativeSelectionSummaryCombatant,
   addToInitiativeCombatant,

  rollInitiativeDialogActor5e,

  actionInitiativeDialogActor,
  _actionInitiativeDialogDataActor,
  getActionInitiativeSelectionsActor,
  setActionInitiativeSelectionsActor,

  rollInitiativeCombat } from "./initiativeRollDialog.js";

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
 * Register libWrapper patches for this module.
 */
export function registerActionInitiative() {
  wrap("Combat.prototype.rollInitiative", rollInitiativeCombat);
  override("Combat.prototype._sortCombatants", _sortCombatantsCombat);
  override("Combat.prototype.rollAll", rollAllCombat);
  override("Combat.prototype.rollNPC", rollNPCCombat);

  override("Combatant.prototype._getInitiativeFormula", _getInitiativeFormulaCombatant);
  override("Combatant.prototype.getInitiativeRoll", getInitiativeRollCombatant);

  override("dnd5e.documents.Actor5e.prototype.rollInitiativeDialog", rollInitiativeDialogActor5e);

  wrap("CombatTrackerConfig.prototype._updateObject", _updateObjectCombatTrackerConfig);
  wrap("CombatTrackerConfig.prototype.getData", getDataCombatTrackerConfig);

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

  Object.defineProperty(Combatant.prototype, "_actionInitiativeSelectionSummary", {
    value: _actionInitiativeSelectionSummaryCombatant,
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

  Object.defineProperty(Combatant.prototype, "getActionInitiativeSelections", {
    value: getActionInitiativeSelectionsCombatant,
    writable: true,
    configurable: true
  });

  Object.defineProperty(Combatant.prototype, "setActionInitiativeSelections", {
    value: setActionInitiativeSelectionsCombatant,
    writable: true,
    configurable: true
  });

  Object.defineProperty(Combatant.prototype, "addToInitiative", {
    value: addToInitiativeCombatant,
    writable: true,
    configurable: true
  });
}
