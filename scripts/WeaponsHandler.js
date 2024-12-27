/* globals
CONFIG,
foundry,
game,
Roll
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, FORMULA_DEFAULTS } from "./const.js";
import { Settings, getDiceValueForProperty } from "./settings.js";


/**
 * Class to handle defining weapons for purposes of initiative.
 * Define weapon types, properties.
 * Define melee vs ranged.
 * Store default values.
 * Subclasses intended to handle specific systems.
 */
export class WeaponsHandler {
  /** @type {enum} */
  static ATTACK_TYPES = { MELEE: 1, RANGED: 2 };

  /**
   * Helper to set up any data that is not defined at load. E.g., CONFIG.DND5E.
   * Called on init hook.
   */
  static initialize() {}

  /* ----- NOTE: Static properties ----- */

  /**
   * Weapon damage when all else fails.
   * @type {string}
   */
  static DEFAULT_DAMAGE = "1d6";

  /**
   * Properties of weapons.
   * A map with key:label for each. "Label" should be localizable or localized.
   * @type {Map<string, string>}
   */
  static weaponPropertiesMap = new Map();

  /**
   * Types of weapons.
   * A map with key:label for each. "Label" should be localizable or localized.
   * @type {Map<string, string}
   */
  static weaponTypesMap = new Map();

  /**
   * In items, where to find the weapon type.
   * @type {string}
   */
  static weaponTypeKey = "";

  /**
   * In items, where to find the weapon properties.
   * @type {string}
   */
  static weaponPropertiesKey = "";

  /**
   * In items, where to find the weapon damage formula.
   * The first term of this string may be used as the formula for purposes of initiative,
   * if the Weapon Damage variant is selected.
   * @type {string}
   */
  static weaponDamageKey = "";

  /* ----- NOTE: Static filter functions ----- */

  /**
   * Is this item a weapon? '
   * It can be assumed it is a weapon, defined by the weapons getter.
   * @param {Item} weapon
   * @returns {boolean}
   */
  static isWeapon(_weapon) { return false; }

  /**
   * Is this item a ranged weapon? '
   * It can be assumed it is a weapon, defined by `isWeapon`.
   * @param {Item} weapon
   * @returns {boolean}
   */
  static isRanged(_weapon) { return false; }

  /**
   * Is this item a melee weapon?
   * It can be assumed it is a weapon, defined by `isWeapon`.
   * @param {Item} weapon
   * @returns {boolean}
   */
  static isMelee(_weapon) { return false; }

  /* ----- NOTE: Static weapon descriptor functions ----- */

  /**
   * Get the weapon's properties.
   * @param {Item} weapon
   * @returns {Set<string>} The weaponProperties key(s)
   */
  static weaponProperties(weapon) { return new Set(foundry.utils.getProperty(weapon, this.weaponPropertiesKey)); }

  /**
   * Get the weapon's types.
   * @param {Item} weapon
   * @returns {Set<string>} The weaponType key(s)
   */
  static weaponTypes(weapon) { return new Set(foundry.utils.getProperty(weapon, this.weaponTypesKey)); }

  /**
   * Get the weapon's damage formula.
   * @param {Item} weapon
   * @returns {string} Can return "" if the formula is unknown.
   */
  static weaponDamageFormula(weapon) { return foundry.utils.getProperty(weapon, this.weaponDamageKey) ?? ""; }

  /**
   * Determine the default weapon damage for a weapon without accounting for its actual damage formula.
   * @param {Item} weapon
   * @param {boolean} [ranged=false]    Treat as ranged weapon?
   * @returns {string}
   */
  static weaponDefaultDamage(weapon, ranged = false) {
    const { BASIC, WEAPON_DAMAGE, WEAPON_TYPE } = Settings.KEYS.VARIANTS.TYPES;
    let dmg = "";
    switch ( Settings.get(Settings.KEYS.VARIANTS.KEY) ) {
      case BASIC: dmg = ranged ? FORMULA_DEFAULTS.RangedAttack : FORMULA_DEFAULTS.MeleeAttack; break;
      case WEAPON_DAMAGE: dmg = FORMULA_DEFAULTS.WEAPON; break;
      case WEAPON_TYPE: dmg = FORMULA_DEFAULTS.WEAPON_TYPES; break;
    }
    if ( !dmg ) return this.DEFAULT_DAMAGE;
  }

  /**
   * Determine the base damage for a weapon.
   * For example, a dnd5e dagger return "1d4".
   * @param {Item} weapon
   * @returns {string|"0"}
   */
  static weaponBaseDamageFormula(weapon) {
    const dmg = this.weaponDamageFormula(weapon);
    const roll = new Roll(dmg);
    return roll.terms[0]?.formula ?? "0";
  }

  /**
   * Determine the init formula for a weapon using weapon type and properties.
   * The given type provides the base formula, for which weapon properties may
   * add/subtract to that base value.
   * For example, a dnd5e dagger is:
   * - simple melee type: Default 1d4
   * - light: Default -1
   * - finesse: Default -1
   * - thrown: no modifier
   * Result: 1d4 - 1 - 1
   * @param {Item} weapon
   * @returns {string|"0"}
   */
  static weaponTypeFormula(weapon) {
    const { weaponPropertiesKey, weaponTypeKey } = this;
    const type = foundry.utils.getProperty(weapon, weaponTypeKey);
    const props = foundry.utils.getProperty(weapon, weaponPropertiesKey);

    // Base is set by the weapon type.
    const base = getDiceValueForProperty(`WEAPON_TYPES.${type}`);

    // Each property potentially contributes to the formula
    if ( !props.size ) return base;
    const propF = [...props.values().map(prop => getDiceValueForProperty(`WEAPON_PROPERTIES.${prop}`))];
    return `${base} + ${propF.join(" + ")}`;
  }

  /**
   * Determine the init formula for a melee or ranged attack.
   * @param {Item} weapon   Weapon used.
   * @param {Actor} actor   Actor rolling init
   * @returns {string|"0"}
   */
  attackFormula(selections, attackType) {
    const { MELEE } = this.constructor.ATTACK_TYPES;
    const { KEY, TYPES } = Settings.KEYS.VARIANTS;
    const variant = Settings.get(KEY);
    const weaponFormulas = [];
    attackType ??= MELEE;
    const actor = this.actor;

    // For the basic variant, just return the formula. Otherwise, get all weapon formulas
    // for selected weapons.
    if ( variant === TYPES.BASIC ) return getDiceValueForProperty(`BASIC.${attackType === MELEE ? "MeleeAttack" : "RangedAttack"}`);

    const wpns = this.filterWeaponsChoices(selections, attackType);
    const formulaFn = variant === TYPES.WEAPON_DAMAGE
      ? this.constructor.weaponBaseDamageFormula.bind(this.constructor)
      : this.constructor.weaponTypeFormula.bind(this.constructor);
    wpns.forEach(w => weaponFormulas.push(formulaFn(w)));

    // If none or one weapon selected, return the corresponding formula.
    if ( !weaponFormulas.length ) return "0";
    if ( weaponFormulas.length === 1 ) return weaponFormulas[0];

    // For multiple weapons, pick the one that can cause the maximum damage.
    const max = weaponFormulas.reduce((acc, curr) => {
      const roll = new Roll(curr, actor);
      const max = roll.evaluateSync({ maximize: true }).total;
      if ( max > acc.max ) return { max, formula: curr };
      return acc;
    }, { max: Number.NEGATIVE_INFINITY, formula: "0" });
    return max.formula;
  }

  /* ----- NOTE: Static getters / setters ----- */

  /* ----- NOTE: Instantiation ----- */

  /** @type {Actor} */
  actor;

  /**
   * @param {Actor} actor     The actor whose weapons are tracked.
   */
  constructor(actor) {
    this.actor = actor;
  }

  /* ----- NOTE: Getters ----- */

  /** @type {Set<Item>} */
  get rangedWeapons() { return this.weapons.filter(w => this.constructor.isRanged(w)); }

  /** @type {Set<Item>} */
  get meleeWeapons() { return this.weapons.filter(w => this.constructor.isMelee(w)); }

  /** @type {Set<Item>} */
  get weapons() {
    return new Set([...this.actor.items.values()].filter(i => this.constructor.isWeapon(i)));
  }

  /* ----- NOTE: Primary methods ----- */

  /**
   * Display a dialog so the user can select between specific weapons for the combatant.
   */
  async weaponSelectionDialog({ weapons, combatantNames, attackType, ...opts } = {}) {
    const { MELEE, RANGED } = this.constructor.ATTACK_TYPES;
    combatantNames ??= this.actor[MODULE_ID].initiativeHandler.getCombatantNames();
    weapons ??= this.weapons;
    attackType ??= MELEE;
    switch ( attackType ) {
      case MELEE: weapons = weapons.filter(w => this.constructor.isMelee(w)); break;
      case RANGED: weapons = weapons.filter(w => this.constructor.isRanged(w)); break;
    }
    return CONFIG[MODULE_ID].WeaponSelectionDialog.create(weapons, { combatantNames, ...opts });
  }

  /* ----- NOTE: Helper methods -----*/

  /**
   * Helper to filter weapons based on user selections.
   * @param {object}  selections    Selections provided by the user initiative form.
   * @param {ATTACK_TYPES}  type
   * @returns {Item[]}
   */
  filterWeaponsChoices(selections, type) {
    const { MELEE } = this.constructor.ATTACK_TYPES;
    const typeKey = type === MELEE ? "melee" : "ranged";
    const weaponSelections = selections.weapons?.[typeKey]?.checked;
    if ( !weaponSelections ) return [];
    return Object.entries(weaponSelections)
      .filter(([_key, value]) => value)
      .map(([key, _value]) => this.actor.items.get(key));
  }

  /**
   * Summarize the weapon choices for chat display.
   * @param {object}  selections    Selections provided by the user initiative form.
   * @returns {string}
   */
  summarizeWeaponsChoices(_selections) { return ""; }
}

export class WeaponsHandlerDND5e extends WeaponsHandler {
  /**
   * Helper to set up any data that is not defined at load. E.g., CONFIG.DND5E.
   * Called on init hook.
   */
  static initialize() {
    for ( const [key, label] of Object.entries(CONFIG.DND5E.weaponTypes) ) this.weaponTypesMap.set(key, label);
    for ( const key of CONFIG.DND5E.validProperties.weapon ) {
      const label = CONFIG.DND5E.itemProperties[key].label;
      this.weaponPropertiesMap.set(key, label);
    }
  }

  /* ----- NOTE: Static properties ----- */

  /**
   * In items, where to find the weapon type.
   * @type {string}
   */
  static weaponTypeKey = "system.type.value";

  /**
   * In items, where to find the weapon properties.
   * @type {string}
   */
  static weaponPropertiesKey = "labels.properties";

  /**
   * In items, where to find the weapon damage formula.
   * The first term of this string may be used as the formula for purposes of initiative,
   * if the Weapon Damage variant is selected.
   * @type {string}
   */
  static weaponDamageKey = "labels.damage";

  /* ----- NOTE: Static filter functions ----- */

  /**
   * Is this item a weapon? '
   * It can be assumed it is a weapon, defined by the weapons getter.
   * @param {Item} weapon
   * @returns {boolean}
   */
  static isWeapon(weapon) {  return weapon.type === "weapon"; }

  /**
   * Is this item a ranged weapon? '
   * It can be assumed it is a weapon, defined by `isWeapon`.
   * @param {Item} weapon
   * @returns {boolean}
   */
  static isRanged(weapon) {
    // See Giant Ape's rock for example of "None" range but still thrown.
    return weapon.labels.range !== "None"
      || weapon.system.range.long;
  }

  /**
   * Is this item a melee weapon?
   * It can be assumed it is a weapon, defined by `isWeapon`.
   * @param {Item} weapon
   * @returns {boolean}
   */
  static isMelee(weapon) {
    // Daggers, etc. can be thrown or melee.
    return weapon.system.type.value === "simpleM"
      || weapon.system.type === "martialM"
      || !this.isRanged(weapon);
  }

  /**
   * Summarize the weapon choices for chat display.
   * @param {object}  selections    Selections provided by the user initiative form.
   * @returns {string}
   */
  summarizeWeaponsChoices(selections) {
    const { MELEE, RANGED } = this.constructor.ATTACK_TYPES;
    let text = "";
    if ( selections.MeleeAttack ) {
      const weaponNames = this.filterWeaponsChoices(selections, MELEE).map(w => w.name ?? "");
      text += `<br><b>${game.i18n.localize("DND5E.ATTACK.Weapon.Melee")}:</b> ${weaponNames.join(", ")}`;
    }
    if ( selections.RangedAttack ) {
      const weaponNames = this.filterWeaponsChoices(selections, RANGED).map(w => w.name ?? "");
      text += `<br><b>${game.i18n.localize("DND5E.ATTACK.Weapon.Ranged")}:</b> ${weaponNames.join(", ")}`;
    }
    return text;
  }
}
