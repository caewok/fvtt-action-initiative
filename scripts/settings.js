/* globals
CONFIG,
foundry
*/

"use strict";

import { MODULE_ID, FORMULA_DEFAULTS } from "./const.js";
import { ModuleSettingsAbstract } from "./ModuleSettingsAbstract.js";
import { ActionConfigureMenu } from "./ActionConfigureMenu.js";

const SETTINGS = {
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

  DICE_FORMULAS: "dice-formulas",
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
  return getDiceValue(diceFormulas[prop], foundry.utils.getProperty(FORMULA_DEFAULTS, prop));
}

function getDiceValue(config, fallback) { return (config ?? "0") || fallback; }


// ----- NOTE: Functions to construct default weapon properties ----- //
/**
 * Take an object with key(s) separated by commas in the name, and
 * assign the value to each key in that name.
 * See https://stackoverflow.com/questions/14743536/multiple-key-names-same-pair-value
 * @param {object} obj
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

/**
 * Construct modifiers for default weapon properties, based on properties identified in CONFIG.
 * @returns {object}
 */
function defaultWeaponProperties() {
  const wh = CONFIG[MODULE_ID].WeaponsHandler;
  const keys = [...wh.weaponPropertiesMap.keys()].join(",");
  const props = expand({[`${keys}`]: "0"});
  for ( const [key, mod] of Object.entries(FORMULA_DEFAULTS.WEAPON_PROPERTIES) ) {
    if ( !Object.hasOwn(props, key) ) continue;
    props[key] = mod;
  }
  return props;
}

/**
 * Construct modifiers for default weapon types, based on properties identified in CONFIG.
 * @returns {object}
 */
function defaultWeaponTypes() {
  const wh = CONFIG[MODULE_ID].WeaponsHandler;
  const keys = [...wh.weaponTypesMap.keys()].join(",");
  const props = expand({[`${keys}`]: "0"});
  for ( const [key, mod] of Object.entries(FORMULA_DEFAULTS.WEAPON_TYPES) ) {
    if ( !Object.hasOwn(props, key) ) continue;
    props[key] = mod;
  }
  return props;
}

/**
 * Construct modifiers for default spell levels, based on properties identified in CONFIG.
 * @returns {object}
 */
function defaultSpellLevels() {
  // Each spell level is 1d10 + spell_level
  // Take advantage of fact that DND5e keys spell levels by number
  const props = {};
  for ( const key of Object.keys(CONFIG[MODULE_ID].spellLevels) ) {
    props[key] = `${FORMULA_DEFAULTS.SPELL_BASE} + ${key}`;
  }
  return props;
}

/**
 * Construct a flattened formula object using all default values.
 * @returns {object}
 */
export function defaultDiceFormulaObject() {
  const flat = foundry.utils.flattenObject(FORMULA_DEFAULTS);
  Object.keys(flat).forEach(key => flat[key] = "");
  return flat;
}


// ----- NOTE: Settings class ----- //
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
    FORMULA_DEFAULTS.WEAPON_TYPES = defaultWeaponTypes();
    FORMULA_DEFAULTS.WEAPON_PROPERTIES = defaultWeaponProperties();
    FORMULA_DEFAULTS.SPELL_LEVELS = defaultSpellLevels();
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
