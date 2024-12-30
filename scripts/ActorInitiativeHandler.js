/* globals
CONFIG,
foundry,
game
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";
import { Settings, getDiceValueForProperty } from "./settings.js";
import { simplifyRollFormula } from "./simplifyRollFormula.js";

/**
 * Class to handle initiative.
 * Tied to specific actor.
 * Trigger dialogs.
 * Coordinate the multi-combatant dialog.
 */
export class ActorInitiativeHandler {
  /** @type {enum} */
  static ATTACK_TYPES = { MELEE: 1, RANGED: 2 };

  /**
   * The filters that should be used when selecting multiple combatants.
   * @type {Set<string>}
   */
  static FILTERS = new Set();

  /**
   * Categorize this actor by the filter properties.
   * @returns {object<string: string>}
   *  Key is one of the FILTERS set.
   *  Value is the localization key for the property, or NA
   */
  categorize() {
    const na = game.i18n.localize(`${MODULE_ID}.phrases.NA`);
    const res = {};
    this.constructor.FILTER_PROPERTIES.forEach((value, key) => res[key]= na);
    return res;
  }

  /**
   * Determine the init formula for a spell optionally using spell levels.
   * @param {object} params   Parameters chosen for initiative
   * @returns {string|null}
   */
  static chosenSpellLevel(selections) {
    if ( !Settings.get(Settings.KEYS.SPELL_LEVELS) ) return null;
    const spellLevels = new Set(Object.keys(CONFIG[MODULE_ID].spellLevels));
    const chosenLevel = Object.entries(selections).find(([_key, value]) => value && spellLevels.has(value));
    return CONFIG[MODULE_ID].spellLevels[chosenLevel ? chosenLevel[1] : 9];
  }

  /**
   * Names and localizations of the filters used with MultipleCombatantDialog
   * @returns {Set<string>} Localization key for each filter
   */
  static filterProperties() {
    return new Set();
  }



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
    const combatants = game.combat.combatants;
    if ( combatantId ) {
      const name = combatants.get(combatantId).name;
      return name ? [name] : [];
    }
    const actorCombatants = Settings.get(Settings.KEYS.GROUP_ACTORS)
      ? combatants.filter(c => c.actor.id === this.actor.id)
      : combatants.filter(c => c.actor === this.actor);
    return actorCombatants.map(c => c.name);
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
  async setInitiativeSelections(selections, { combatantIds } = {}) {
    let combatants = this.combatants;
    if ( !combatants.length ) return;

    if ( combatantIds ) {
      if ( !(combatantIds instanceof Set) ) combatantIds = new Set(combatantIds);
      combatants = combatants.filter(c => combatantIds.has(c.id));
    }

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

  /**
   * Construct the initiative formula for a combatant based on user-selected actions.
   * @param {object} [selections]   Optional returned object from ActionSelectionDialog.
   * @returns {string} Cleaned dice formula
   */
  constructInitiativeFormula(selections) {
    selections ??= this.combatants[0][MODULE_ID].initiativeHandler.initiativeSelections;
    if ( !selections ) return "0";
    const formula = this._constructInitiativeFormula(selections);

    // Clean the roll last, and re-do
    return simplifyRollFormula(formula) || "";
  }

  /**
   * Construct the initiative formula for a combatant based on user-selected actions.
   * @param {object} [selections]   Optional returned object from ActionSelectionDialog.
   * @returns {string} Dice formula
   */
  _constructInitiativeFormula(selections) {
    const { MELEE, RANGED } = this.constructor.ATTACK_TYPES;
    const actor = this.actor;
    const keyType = {
      MeleeAttack: MELEE,
      RangedAttack: RANGED
    };

    // Build the formula parts
    const selectedActions = selections.actions;
    const formula = [];
    for ( const [key, value] of Object.entries(selectedActions) ) {
      if ( !value ) continue;

      switch ( key ) {
        case "MeleeAttack":
        case "RangedAttack":
          formula.push(actor[MODULE_ID].weaponsHandler.attackFormula(selections, keyType[key]) ?? "0");
          break;
        case "CastSpell": {
          const chosenLevel = this.constructor.chosenSpellLevel(selections);
          const str = chosenLevel === null ? "BASIC.CastSpell"
            : `SPELL_LEVELS.${Object.entries(CONFIG[MODULE_ID].spellLevels)
              .find(([_key, value]) => value === chosenLevel)[0]}`
          formula.push(getDiceValueForProperty(str));
          break;
        }

        case "BonusAction":
          if ( selectedActions.BonusAction.Checkbox ) formula.push(selectedActions.BonusAction.Text || getDiceValueForProperty("BASIC.BonusAction"));
          break;
        case "OtherAction":
          if ( selectedActions.OtherAction.Checkbox ) formula.push(selectedActions.OtherAction.Text || getDiceValueForProperty("BASIC.OtherAction"));
          break;
        default:
          formula.push(getDiceValueForProperty(`BASIC.${key}`) ?? "0");
      }
    }

    // Combine the parts
    return formula.join("+");
  }

  /* ----- NOTE: Helper methods ----- */
}

export class ActorInitiativeHandlerDND5e extends ActorInitiativeHandler {
  /**
   * Where to find the filter properties in the actor data.
   * For dnd5e, this is a fairly straightforward mapping.
   * @type {Map<string, string>}
   */
  static FILTER_PROPERTIES = new Map(Object.entries({
      ["TYPES.Item.race"]: "system.details.race",
      ["DND5E.CreatureType"]: "system.details.type.value",
      ["DND5E.Movement"]: "system.attributes.movement",
      ["DND5E.SenseDarkvision"]: "system.attributes.senses.darkvision"
  }));

  /**
   * The filters that should be used when selecting multiple combatants.
   * @type {Set<string>}
   */
  static FILTERS = new Set([
    "TYPES.Item.race",
    "DND5E.CreatureType",
    "DND5E.Movement",
    "DND5E.SenseDarkvision"
  ]);

  /**
   * Categorize this actor by the filter properties.
   * @returns {object<string: string>}
   *  Key is one of the FILTERS set.
   *  Value is the localization key for the property, or NA
   */
  categorize() {
    const na = game.i18n.localize(`${MODULE_ID}.phrases.NA`);
    const res = {};
    this.constructor.FILTER_PROPERTIES.forEach((value, key) => {
      // For movement, use the maximum value.
      let attr = foundry.utils.getProperty(this.actor, value) ?? na;
      if ( key === "DND5E.Movement" ) {
        attr = Object.keys(CONFIG.DND5E.movementTypes).reduce((acc, curr) =>
          Math.max(acc, foundry.utils.getProperty(this.actor, `${value}.${curr}`) || 0), 0);
      }
      res[key]= attr;
    });
    return res;
  }
}

export class ActorInitiativeHandlerA5e extends ActorInitiativeHandler {
  /**
   * Where to find the filter properties in the actor data.
   * For dnd5e, this is a fairly straightforward mapping.
   * @type {Map<string, string>}
   */
  static FILTER_PROPERTIES = new Map(Object.entries({
      ["A5E.effects.keys.details.elite"]: "system.details.elite",
      ["A5E.CreatureTypesLabel"]: "system.details.creatureTypes",
      ["A5E.MovementSpeed"]: "system.attributes.movement",
      ["A5E.SenseDarkvisionRange"]: "system.attributes.senses.darkvision.distance"
  }));

  /**
   * The filters that should be used when selecting multiple combatants.
   * @type {Set<string>}
   */
  static FILTERS = new Set([
    "A5E.effects.keys.details.elite",
    "A5E.CreatureTypesLabel",
    "A5E.MovementSpeed",
    "A5E.SenseDarkvisionRange"
  ]);

  /**
   * Categorize this actor by the filter properties.
   * @returns {object<string: string>}
   *  Key is one of the FILTERS set.
   *  Value is the localization key for the property, or NA
   */
  categorize() {
    const na = game.i18n.localize(`${MODULE_ID}.phrases.NA`);
    const res = {};
    this.constructor.FILTER_PROPERTIES.forEach((value, key) => {
      // For movement, use the maximum value.
      let attr = foundry.utils.getProperty(this.actor, value);
      if ( key === "A5E.MovementSpeed" ) {
        attr = Object.keys(CONFIG.A5E.movement).reduce((acc, curr) =>
          Math.max(acc, foundry.utils.getProperty(this.actor, `${value}.${curr}.distance`) || 0), 0);
      } else if ( key === "A5E.CreatureTypesLabel" ) {
        attr = attr[0]; // Pick the first type. TODO: Uses sets of values for categories instead of single string.
      }
      res[key]= attr ?? na;
    });
    return res;
  }
}

