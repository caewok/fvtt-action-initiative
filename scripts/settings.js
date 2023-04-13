/* globals
game
*/

"use strict";

import { MODULE_ID } from "./const.js";

export const SETTINGS = {
  CHANGELOG: "changelog",

  VARIANTS: {
    KEY: "variants",
    TYPES: {
      BASIC: "variant-basic",
      WEAPON_SPEED: "variant-weapon-speed",
      WEAPON_TYPE: "variant-weapon-type"
    }
  },

  CONFIGURE_MENU: "configure-menu",
  SPELL_LEVELS: "spell-levels",

  DICE_FORMULAS: "dice-formulas"
};


export const FORMULA_DEFAULTS = {
  MISC: {
    BONUS: "",
    SURPRISE: "+10",
  },

  BASIC: {
    MELEE: "1d6",
    MOVEMENT: "1d6",
    RANGED: "1d4",
    OTHER: "1d6",
    SPELL: "1d10",
    SWAP: "1d6"
  },

  // Added dynamically
  WEAPON_TYPES: {},
  WEAPON_PROPERTIES: {},
}

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
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i],
            subkeys = key.split(/,\s?/),
            target = obj[key];
        delete obj[key];
        subkeys.forEach(function(key) { obj[key] = target; })
    }
    return obj;
}

function dnd5eDefaultWeaponProperties() {
  const keys = Object.keys(CONFIG.DND5E.weaponProperties).join(",");
  const props = expand({[`${keys}`]: "0"});

  // Set some of the defaults
  props.fin = "-1";
  props.hvy = "+2";
  props.lod = "1d4";
  props.thr = "-1";
  props.two = "1d4";

  return props;
}

function dnd5eDefaultWeaponTypes() {
  const keys = Object.keys(CONFIG.DND5E.weaponTypes).join(",");
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
    label:  game.i18n.localize(`${MODULE_ID}.settings.${SETTINGS.CONFIGURE_MENU}.Label`),
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
      [VARIANT.WEAPON_SPEED]: game.i18n.localize(`${MODULE_ID}.settings.${VARIANT.WEAPON_SPEED}`),
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
  game.settings.register(MODULE_ID, SETTINGS.DICE_FORMULAS, {
    name: `${MODULE_ID}.settings.${SETTINGS.DICE_FORMULAS}.Name`,
    type: Object,
    default: defaultDiceFormulaObject(),
    scope: "world",
    config: false
  });
}

class ActionConfigureMenu extends FormApplication {
  /** @override */
  static get defaultOptions() {
    const opts = super.defaultOptions;
    opts.template = "modules/actioninitiative/templates/settings-config.html"
    opts.height = "auto",
    opts.width = 600,
    opts.classes = [MODULE_ID, "settings"],
    opts.tabs = [
      {
        navSelector: ".tabs",
        contentSelector: "form",
        initial: "basic"
      }
    ];
    opts.submitOnClose = false
    return opts;
  }

  getData() {
    const data = super.getData();
    const formulae = getSetting(SETTINGS.DICE_FORMULAS);
    data.dice = expandObject(formulae);
    data.defaultDice = FORMULA_DEFAULTS;
    return data;
  }

  async _updateObject(_, formData) {
    const toUpdate = Object.entries(formData).filter(([key, formula]) => {
      if ( formula === "" ) return false;
      if ( !Roll.validate(formula) ) {
        ui.notifications.warn("Die formula for ${key} is not valid.");
        return false;
      }
      return true;
    });

    if ( !toUpdate.length ) return;

    const diceFormulas = getSetting(SETTINGS.DICE_FORMULAS)
    for ( const [key, formula] of toUpdate ) {
      diceFormulas[key] = formula;
    }
    setSetting(SETTINGS.DICE_FORMULAS, diceFormulas);
  }
}
