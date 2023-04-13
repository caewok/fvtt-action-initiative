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
  SPELL_LEVELS: "spell-levels"
};

export function getSetting(settingName) {
  return game.settings.get(MODULE_ID, settingName);
}

export async function toggleSetting(settingName) {
  const curr = getSetting(settingName);
  return await game.settings.set(MODULE_ID, settingName, !curr);
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
    data.actioninitiative = {};
    return data;
  }

  async _updateObject(_, formData) {
    const data = expandObject(formData);
    for ( const [key, formula] of Object.entries(data.dice) ) {
      if ( formula === "" ) continue;
      if ( !Roll.validate(formula) ) {
        ui.notifications.warn("Die formula for ${key} is not valid.");
        continue;
      }
      setSetting(`${key}Dice`, formula);
    }

  }
}
