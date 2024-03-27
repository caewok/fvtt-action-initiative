/* globals
libWrapper,
Actor,
Combatant
*/
"use strict";

import { Patcher } from "./Patcher.js";

import { PATCHES as PATCHES_Combat } from "./Combat.js";

const PATCHES = {
  Combat: PATCHES_Combat
};

export const PATCHER = new Patcher();
PATCHER.addPatchesFromRegistrationObject(PATCHES);

export function initializePatching() {
  PATCHER.registerGroup("BASIC");
}


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
  resetInitiativeCombatant,
  getInitiativeRollCombatant } from "./combatant.js";

import {
  actionInitiativeDialogActor,
  _actionInitiativeDialogDataActor,
  getActionInitiativeSelectionsActor,
  setActionInitiativeSelectionsActor,
  rollInitiativeDialogActor5e
} from "./actor.js";

import { getDataCombatTrackerConfig, _updateObjectCombatTrackerConfig } from "./render.js";




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
