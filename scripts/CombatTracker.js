/* globals
CombatTracker
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

/**
 * An extension of the base CombatTracker class to provide ActionInitiative functionality.
 * Note that this replaces the 5e-specific version.
 * @extends {CombatTracker}
 */
export class CombatTrackerActionInitiative extends CombatTracker {
  /**
   * Copied from 5e: https://github.com/foundryvtt/dnd5e/blob/9a81781990174eb0581f2135d0146cd74ea489cb/module/applications/combat/combat-tracker.mjs
   * But pass the combatantId.
   * @inheritdoc
   */
  async _onCombatantControl(event) {
    const btn = event.currentTarget;
    const combatantId = btn.closest(".combatant").dataset.combatantId;
    const combatant = this.viewed.combatants.get(combatantId);
    if ( (btn.dataset.control === "rollInitiative")
      && combatant?.actor ) return combatant.actor.rollInitiativeDialog({combatantId});
    return super._onCombatantControl(event);
  }
}