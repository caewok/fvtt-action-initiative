/* globals
CONFIG,
game
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";
import { Settings } from "./settings.js";

/**
 * Class to handle initiative.
 * Tied to specific actor.
 * Trigger dialogs.
 * Coordinate the multi-combatant dialog.
 */
export class ActorInitiativeHandler {
  /** @type {enum} */
  static ATTACK_TYPES = { MELEE: 1, RANGED: 2 };

  /* ----- NOTE: Instantiation ----- */

  /** @type {Actor} */
  actor;

  constructor(actor) {
    this.actor = actor;
  }


  /* ----- NOTE: Getters, setters, quasi-setters */

  /**
   * Retrieve combatant names for the actor.
   * @returns {string[]}
   */
  getCombatantNames(combatantId) {
    if ( combatantId ) {
      const name = game.combat.combatants.get(combatantId).name;
      return name ? [name] : [];
    }

    // Don't repeat the same combatant names. (e.g., 4 Bandits)
    const nameSet = new Set(this.combatants.map(c => c.name));
    return [...nameSet.values()];
  }

  /**
   * Retrieve combatant(s) for the actor.
   * @returns {Combatant[]}
   */
  get combatants() {
    return game.combat.combatants.filter(c => c.actorId === this.actor.id);
  }

  /**
   * Retrieve initiative selections for the actor.
   * @returns {Map<id, selections>} Selections by combatant id.
   */
  get initiativeSelections() {
    return new Map(this.combatants.map(c => [c.id, c[MODULE_ID].initiativeSelections]));
  }

  /**
   * Store initiative selections for a given actor.
   * @param {object} selections
   * @param {object} [opts]
   * @param {string} [opts.combatantId]   Limit to a single combatant id
   */
  async setInitiativeSelections(selections, { combatantId } = {}) {
    if ( !Settings.get(Settings.KEYS.GROUP_ACTORS) && !combatantId ) {
      console.error("setInitiativeSelectionsForActor requires combatant id when GROUP_ACTORS is disabled.");
    }
    const combatants = this.combatants;
    if ( !combatants.length ) return;
    if ( combatantId ) return await combatants.find(c => c.id === combatantId)[MODULE_ID]
      .initiativeHandler.setInitiativeSelections(selections);
    const promises = combatants.map(c => c[MODULE_ID]
      .initiativeHandler.setInitiativeSelections(selections));
    return Promise.allSettled(promises);
  }

  /* ----- NOTE: Primary methods ----- */

  /**
   * Display the initiative dialog(s) for this combatant.
   * Assumes a single combatant.
   */
  async initiativeDialogs(opts = {}) {
    opts.combatantNames ??= this.getCombatantNames();
    const selections = await this._getActionSelections(opts);
    if ( !selections ) return null;
    if ( Settings.get(Settings.KEYS.VARIANTS.KEY) !== Settings.KEYS.VARIANTS.TYPES.BASIC ) {
      const weaponSelections = await this._getWeaponSelections(selections, opts);
      selections.weapons = weaponSelections;
    }
    return selections;
  }

  async _getActionSelections(opts = {}) {
    opts.combatantNames ??= this.getCombatantNames();
    return await this.actionSelectionDialog(opts);
  }

  async _getWeaponSelections(actionSelections, opts = {}) {
    opts.combatantNames ??= this.getCombatantNames();
    const weaponSelections = {
      melee: {},
      ranged: {}
    };
    if ( actionSelections.actions.MeleeAttack ) {
      opts.attackType = this.constructor.ATTACK_TYPES.MELEE;
      weaponSelections.melee = await this.weaponSelectionDialog(opts);
    }
    if ( actionSelections.actions.RangedAttack ) {
      opts.attackType = this.constructor.ATTACK_TYPES.RANGED;
      weaponSelections.ranged = await this.weaponSelectionDialog(opts);
    }
    return weaponSelections;
  }

  /**
   * Display a dialog so the user can select one or more actions that the combatant will take.
   * @param {object} [opt]
   * @param {D20Roll.ADV_MODE} [opt.advantageMode]    A specific advantage mode to apply
   *   If undefined, user will choose.
   * @returns {Promise<object>} Ultimately, an object representing user selections.
   */
  async actionSelectionDialog(opts) {
    return CONFIG[MODULE_ID].ActionSelectionDialog.create(opts);
  }

  /**
   * Display a dialog so the user can select between specific weapons for the combatant.
   */
  async weaponSelectionDialog(opts) {
    return this.actor[MODULE_ID].weaponsHandler.weaponSelectionDialog(opts);
  }

  /* ----- NOTE: Helper methods ----- */
}

