/* globals
CONFIG,
game,
isNewerVersion
*/
"use strict";

export const MODULE_ID = "actioninitiative";

export const FLAGS = {
  DND5E: {
    DEX_TIEBREAKER: "initiativeDexTiebreaker"
  }
};

export const FORMULA_DEFAULTS = {
  BASIC: {
    CastSpell: "1d10",
    MeleeAttack: "1d8",
    Movement: "1d6",
    OtherAction: "1d6",
    RangedAttack: "1d4",
    SurprisePenalty: "+10",
    SwapGear: "1d6",
    BonusAction: "1d8"
  },

  // Modified dynamically
  WEAPON_PROPERTIES: {
    fin: "-1", // Finesse
    hvy: "+2", // Heavy
    lod: "1d4", // Loading
    two: "1d4", // Two-handed
    amm: "+1" // Ammunition
  },

  WEAPON_TYPES: {
    natural: "1",
    siege: "2d10",
    simpleM: "1d6",
    martialM: "1d8",
    simpleR: "1d4",
    martialR: "1d6"
  },

  SPELL_LEVELS: {},

  SPELL_BASE: "1d10"
};

const MELEE_WEAPONS = [
  "simpleM",
  "martialM",
  "natural",
  "improv"
];

const RANGED_WEAPONS = [
  "simpleR",
  "martialR",
  "natural",
  "improv",
  "siege"
];

/**
 * Construct the CONFIG object for this module containing basic properties.
 * Must be called in the init hook (or later) to retrieve relevant DND5e properties.
 * @returns {object}
 */
export function constructConfigObject() {
  const cfg = {

    /**
     * Default dice formulas if not set by GM in settings.
     * @type {object}
     */
    FORMULA_DEFAULTS,

    /**
     * Melee weapon categories. Labels correspond to keys.
     * @type {Set<string>}
     */
    meleeWeapons: new Set(MELEE_WEAPONS),

    /**
     * Range weapon categories. Labels correspond to keys.
     * @type {Set<string>}
     */
    rangedWeapons: new Set(RANGED_WEAPONS),

    /**
     * Properties of weapons.
     * An object with key:name for each. "Name" should be localizable or localized.
     * @type {object}
     */
    weaponProperties: CONFIG.DND5E.weaponProperties,

    /**
     * Types of weapons.
     * An object with key:name for each. "Name" should be localizable or localized.
     * @type {object}
     */
    weaponTypes: CONFIG.DND5E.weaponTypes,

    /**
     * Spell levels
     * An object with key:name for each. "Name" should be localizable or localized.

     * @type {object}
     */
    spellLevels: CONFIG.DND5E.spellLevels,

    /**
     * In items, where to find the weapon type. (See meleeWeapons and rangedWeapons for types.)
     * @type {string}
     */
    weaponTypeKey: "system.weaponType",

    /**
     * In items, where to find the weapon properties.
     * @type {string}
     */
    weaponPropertiesKey: "system.properties",

    /**
     * In items, where to find the weapon damage formula.
     * The first term of this string may be used as the formula for purposes of initiative,
     * if the Weapon Damage variant is selected.
     * @type {string}
     */
    weaponDamageKey: "labels.damage",

    /**
     * Callback to determine if a weapon can be thrown.
     * Thrown weapons are listed as both melee and ranged.
     * @type {function}
     */
    canThrowWeapon: i => i.system.properties.thr,

    /**
     * Properties used for grouping combatants when using rollAll and rollNPCs in initiative
     * Based on the actor class.
     * @type {Map<string, string>}
     */
    filterProperties: new Map(Object.entries({
      Race: "system.details.race",
      Type: "system.details.type.value",
      Walk: "system.attributes.movement.walk",
      Darkvision: "system.attributes.senses.darkvision"
    }))
  };

  if ( isNewerVersion(game.system.version, "3") ) {
    const cfgDnD = CONFIG.DND5E;
    cfg.weaponTypeKey = "system.type.value";
    cfg.weaponProperties = {};
    for ( const key of Object.keys(cfgDnD.weaponProperties) ) {
      cfg.weaponProperties[key] = game.i18n.localize(cfgDnD.itemProperties[key].label);
    }
  }
  return cfg;
}


