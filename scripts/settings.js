/* globals
getProperty,
CONFIG,
flattenObject
*/

"use strict";

import { MODULE_ID } from "./const.js";
import { ModuleSettingsAbstract } from "./ModuleSettingsAbstract.js";
import { ActionConfigureMenu } from "./ActionConfigureMenu.js";

export const SETTINGS = {
  CHANGELOG: "changelog",

  VARIANTS: {
    KEY: "variants",
    TYPES: {
      BASIC: "variant-basic",
      WEAPON_DAMAGE: "variant-weapon-damage",
      WEAPON_TYPE: "variant-weapon-type"
    }
  },

  CONFIGURE_MENU: "configure-menu",
  SPELL_LEVELS: "spell-levels",
  GROUP_ACTORS: "group-actors",

  DICE_FORMULAS: "dice-formulas"
};

/* Dice Formulas

User configured:
- "": Use the default.
- "0": Ignore; do not use or (for basic) present to user
- "value": use this formula value
- (config ?? "0") || def

def = "2d4"
config = ""
==> "2d4"

config = "0"
==> "0"

config = "1d4"
==> "1d4"


Each dice formula should be set to null if not defined, and "0" if not
*/

export function getDiceValueForProperty(prop) {
  const diceFormulas = Settings.get(Settings.KEYS.DICE_FORMULAS); // DICE_FORMULAS are flat
  return getDiceValue(diceFormulas[prop], getProperty(FORMULA_DEFAULTS, prop));
}

function getDiceValue(config, fallback) { return (config ?? "0") || fallback; }


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

  // Added dynamically
  WEAPON_TYPES: {},
  WEAPON_PROPERTIES: {},
  SPELL_LEVELS: {}
};

/**
 * Take an object with key(s) separated by commas in the name, and
 * assign the value to each key in that name.
 * See https://stackoverflow.com/questions/14743536/multiple-key-names-same-pair-value
 * @param {object} obj
 * @returns {object}
 * @example
 * expand({ "thanksgiving day, thanksgiving, t-day": 1});
 */
function expand(obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; ++i) {
    const key = keys[i];
    const subkeys = key.split(/,\s?/);
    const target = obj[key];
    delete obj[key];
    subkeys.forEach(function(key) { obj[key] = target; });
  }
  return obj;
}

function dnd5eDefaultWeaponProperties() {
  const keys = Object.keys(CONFIG[MODULE_ID].weaponProperties).join(",");
  const props = expand({[`${keys}`]: "0"});

  // Set some of the defaults
  props.fin = "-1"; // Finesse
  props.hvy = "+2"; // Heavy
  props.lod = "1d4"; // Loading
  props.two = "1d4"; // Two-handed
  props.amm = "+1"; // Ammunition

  return props;
}

function dnd5eDefaultWeaponTypes() {
  const keys = Object.keys(CONFIG[MODULE_ID].weaponTypes).join(",");
  const props = expand({[`${keys}`]: "0"});

  // Set some of the defaults
  props.natural = "1";
  props.siege = "2d10";
  props.simpleM = "1d6";
  props.martialM = "1d8";
  props.simpleR = "1d4";
  props.martialR = "1d6";

  return props;
}

function dnd5eDefaultSpellLevels() {
  // Each spell level is 1d10 + spell_level
  // Take advantage of fact that DND5e keys spell levels by number
  const props = {};
  for ( const key of Object.keys(CONFIG[MODULE_ID].spellLevels) ) {
    props[key] = `1d10 + ${key}`;
  }
  return props;
}

export function defaultDiceFormulaObject() {
  const flat = flattenObject(FORMULA_DEFAULTS);
  Object.keys(flat).forEach(key => flat[key] = "");
  return flat;
}

export class Settings extends ModuleSettingsAbstract {
  /** @type {object} */
  static KEYS = SETTINGS;

  static registerAll() {
    const { KEYS, register, registerMenu, localize } = this;

    registerMenu(KEYS.CONFIGURE_MENU, {
      name: localize(`${KEYS.CONFIGURE_MENU}.Name`),
      hint: localize(`${KEYS.CONFIGURE_MENU}.Hint`),
      label: localize(`${KEYS.CONFIGURE_MENU}.Label`),
      icon: "fa-solid fa-gears",
      type: ActionConfigureMenu,
      restricted: true
    });

    const VARIANT = SETTINGS.VARIANTS.TYPES;
    register(KEYS.VARIANTS.KEY, {
      name: localize(`${KEYS.VARIANTS.KEY}.Name`),
      hint: localize(`${KEYS.VARIANTS.KEY}.Hint`),
      scope: "world",
      config: true,
      type: String,
      choices: {
        [VARIANT.BASIC]: localize(VARIANT.BASIC),
        [VARIANT.WEAPON_DAMAGE]: localize(VARIANT.WEAPON_DAMAGE),
        [VARIANT.WEAPON_TYPE]: localize(VARIANT.WEAPON_TYPE)
      },
      default: VARIANT.BASIC
    });

    register(KEYS.SPELL_LEVELS, {
      name: localize(`${KEYS.SPELL_LEVELS}.Name`),
      hint: localize(`${KEYS.SPELL_LEVELS}.Hint`),
      type: Boolean,
      default: false,
      scope: "world",
      config: true
    });

    // Register defaults for weapon types and properties
    FORMULA_DEFAULTS.WEAPON_TYPES = dnd5eDefaultWeaponTypes();
    FORMULA_DEFAULTS.WEAPON_PROPERTIES = dnd5eDefaultWeaponProperties();
    FORMULA_DEFAULTS.SPELL_LEVELS = dnd5eDefaultSpellLevels();
    register(KEYS.DICE_FORMULAS, {
      name: `${KEYS.DICE_FORMULAS}.Name`,
      type: Object,
      default: defaultDiceFormulaObject(),
      scope: "world",
      config: false
    });

    register(KEYS.GROUP_ACTORS, {
      name: localize(`${KEYS.GROUP_ACTORS}.Name`),
      hint: localize(`${KEYS.GROUP_ACTORS}.Hint`),
      type: Boolean,
      default: false,
      scope: "world",
      config: true
    });
  }
}
