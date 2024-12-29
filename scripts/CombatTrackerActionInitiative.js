/* globals
CombatTracker,
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";

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
    event.preventDefault();
    event.stopPropagation();

    const btn = event.currentTarget;
    const li = btn.closest(".combatant");
    const combatantId = li.dataset.combatantId;
    const combatant = this.viewed.combatants.get(combatantId);
    if ( (btn.dataset.control === "rollInitiative")
      && combatant?.actor ) return combatant.actor.rollInitiativeDialog({combatantId});

    const iH = combatant.actor[MODULE_ID].initiativeHandler;
    if ( btn.dataset.control === "addToInitiative" ) return iH.addToInitiative(this.actor);
    if ( btn.dataset.control === "resetInitiative" ) return iH.resetInitiative();
    return super._onCombatantControl(event);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${MODULE_ID}/templates/combat-tracker.html`
    });
  }
}

/**
 * An extension of the base CombatTracker class to provide ActionInitiative functionality.
 * Note that this replaces the 5e-specific version.
 * @extends {CombatTracker}
 */
export class CombatTrackerActionInitiativeDND5e extends CombatTracker {
  /**
   * Copied from 5e: https://github.com/foundryvtt/dnd5e/blob/9a81781990174eb0581f2135d0146cd74ea489cb/module/applications/combat/combat-tracker.mjs
   * But pass the combatantId.
   * @inheritdoc
   */
  async _onCombatantControl(event) {
    event.preventDefault();
    event.stopPropagation();

    const btn = event.currentTarget;
    const li = btn.closest(".combatant");
    const combatantId = li.dataset.combatantId;
    const combatant = this.viewed.combatants.get(combatantId);
    if ( (btn.dataset.control === "rollInitiative")
      && combatant?.actor ) return combatant.actor.rollInitiativeDialog({combatantId});

    const iH = combatant.actor[MODULE_ID].initiativeHandler;
    if ( btn.dataset.control === "addToInitiative" ) return iH.addToInitiative(this.actor);
    if ( btn.dataset.control === "resetInitiative" ) return iH.resetInitiative();
    return super._onCombatantControl(event);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${MODULE_ID}/templates/combat-tracker.html`
    });
  }
}

