/* globals
game,
getProperty,
CONFIG,
FormApplication,
expandObject,
flattenObject,
Roll,
ui
*/

"use strict";

import { MODULE_ID } from "./const.js";

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
  const diceFormulas = getSetting(SETTINGS.DICE_FORMULAS); // DICE_FORMULAS are flat
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

function defaultDiceFormulaObject() {
  const flat = flattenObject(FORMULA_DEFAULTS);
  Object.keys(flat).forEach(key => flat[key] = "");
  return flat;
}

export function getSetting(settingName) {
  return game.settings.get(MODULE_ID, settingName);
}

export async function setSetting(settingName, value) {
  return await game.settings.set(MODULE_ID, settingName, value);
}

export function registerSettings() {
  game.settings.registerMenu(MODULE_ID, SETTINGS.CONFIGURE_MENU, {
    name: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.CONFIGURE_MENU}.Name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.CONFIGURE_MENU}.Hint`),
    label: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.CONFIGURE_MENU}.Label`),
    icon: "fa-solid fa-gears",
    type: ActionConfigureMenu,
    restricted: true
  });

  const VARIANT = SETTINGS.VARIANTS.TYPES;
  game.settings.register(MODULE_ID, SETTINGS.VARIANTS.KEY, {
    name: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.VARIANTS.KEY}.Name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.VARIANTS.KEY}.Hint`),
    scope: "world",
    config: true,
    type: String,
    choices: {
      [VARIANT.BASIC]: game.i18n.localize(`${MODULE_ID}.settings.${VARIANT.BASIC}`),
      [VARIANT.WEAPON_DAMAGE]: game.i18n.localize(`${MODULE_ID}.settings.${VARIANT.WEAPON_DAMAGE}`),
      [VARIANT.WEAPON_TYPE]: game.i18n.localize(`${MODULE_ID}.settings.${VARIANT.WEAPON_TYPE}`)
    },
    default: VARIANT.BASIC
  });

  game.settings.register(MODULE_ID, SETTINGS.SPELL_LEVELS, {
    name: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.SPELL_LEVELS}.Name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.SPELL_LEVELS}.Hint`),
    type: Boolean,
    default: false,
    scope: "world",
    config: true
  });

  // Register defaults for weapon types and properties
  FORMULA_DEFAULTS.WEAPON_TYPES = dnd5eDefaultWeaponTypes();
  FORMULA_DEFAULTS.WEAPON_PROPERTIES = dnd5eDefaultWeaponProperties();
  FORMULA_DEFAULTS.SPELL_LEVELS = dnd5eDefaultSpellLevels();
  game.settings.register(MODULE_ID, SETTINGS.DICE_FORMULAS, {
    name: `${MODULE_ID}.settings.${SETTINGS.DICE_FORMULAS}.Name`,
    type: Object,
    default: defaultDiceFormulaObject(),
    scope: "world",
    config: false
  });

  game.settings.register(MODULE_ID, SETTINGS.GROUP_ACTORS, {
    name: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.GROUP_ACTORS}.Name`),
    hint: game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.GROUP_ACTORS}.Hint`),
    type: Boolean,
    default: false,
    scope: "world",
    config: true
  });
}

class ActionConfigureMenu extends FormApplication {
  /** @override */
  static get defaultOptions() {
    const opts = super.defaultOptions;
    opts.template = "modules/actioninitiative/templates/settings-config.html";
    opts.height = "auto";
    opts.width = 600;
    opts.classes = [MODULE_ID, "settings"];
    opts.tabs = [
      {
        navSelector: ".tabs",
        contentSelector: "form",
        initial: "basic"
      }
    ];
    opts.submitOnClose = false;
    return opts;
  }

  getData() {
    const data = super.getData();
    const formulae = getSetting(SETTINGS.DICE_FORMULAS);
    const formulaeObj = expandObject(formulae);
    data.basic = formulaeObj.BASIC;
    data.weaponTypes = formulaeObj.WEAPON_TYPES;
    data.weaponProperties = formulaeObj.WEAPON_PROPERTIES;
    data.spellLevels = formulaeObj.SPELL_LEVELS;
    data.placeholder = FORMULA_DEFAULTS;

    data.localized = {
      spellLevels: CONFIG.DND5E.spellLevels,
      weaponTypes: CONFIG.DND5E.weaponTypes,
      weaponProperties: CONFIG.DND5E.weaponProperties
    };

    return data;
  }

  async _updateObject(_, formData) {
    const diceFormulas = getSetting(SETTINGS.DICE_FORMULAS);
    Object.entries(formData).forEach(([key, formula]) => {
      if ( formula !== "" && !Roll.validate(formula) ) {
        ui.notifications.warn(`Die formula for ${key} is not valid.`);
        return;
      }

      diceFormulas[key] = formula;
    });

    await setSetting(SETTINGS.DICE_FORMULAS, diceFormulas);
  }
}
