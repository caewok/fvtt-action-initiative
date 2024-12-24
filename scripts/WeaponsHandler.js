/* globals
CONFIG,
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, FORMULA_DEFAULTS } from "./const.js";
import { Settings } from "./settings.js";


/**
 * Class to handle defining weapons for purposes of initiative.
 * Define weapon types, properties.
 * Define melee vs ranged.
 * Store default values.
 * Subclasses intended to handle specific systems.
 */
export class WeaponsHandler {
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
   * Determine the initiative formula based on weapon type.
   */


  /**
   * Determine the base damage for a weapon.
   * For example, a dnd5e dagger returns "1d4".
   * @param {Item} weapon
   * @returns {string} The damage. If not determined, uses a default value.
   */

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


  /* ----- NOTE: Helper methods -----*/
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
}
