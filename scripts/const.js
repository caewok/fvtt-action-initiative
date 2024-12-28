/* globals
CONFIG,
foundry,
game,
*/
"use strict";

// TODO: Move the CONFIG to module.js
export const MODULE_ID = "actioninitiative";

export const FLAGS = {
  DND5E: {
    DEX_TIEBREAKER: "initiativeDexTiebreaker"
  },

  COMBATANT: {
    INITIATIVE_SELECTIONS: "initSelections",
  },

  VERSION: "version"
};

export const FORMULA_DEFAULTS = {
  BASIC: {
    CastSpell: "1d10",
    MeleeAttack: "1d8",
    RangedAttack: "1d4",
    Movement: "1d6",
    OtherAction: "1d6",
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

// TODO: Use CONFIG.DND5E.validProperties.weapon instead of CONFIG.DND5E.weaponProperties

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
     * Spell levels
     * An object with key:name for each. "Name" should be localizable or localized.
     * @type {object} Each element has {key: localized_name}
     */
    spellLevels: {},

    /**
     * Properties used for grouping combatants when using rollAll and rollNPCs in initiative
     * Based on the actor class.
     * @type {Map<string, string>}
     */
    filterProperties: new Map(),
  };

  switch ( game.system.id ) {
    case "dnd5e": {
      cfg.spellLevels = CONFIG.DND5E.spellLevels;
      cfg.filterProperties = new Map(Object.entries({
        Race: "system.details.race",
        Type: "system.details.type.value",
        Walk: "system.attributes.movement.walk",
        Darkvision: "system.attributes.senses.darkvision"
      }));
    }
    case "a5e": {

    }
  }
  return cfg;
}
