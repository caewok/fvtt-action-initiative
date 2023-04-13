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
    data.actioninitiative.diceCombinations = {
      d4: "1d4",
      d6: "1d6",
      d8: "1d8",
      d10: "1d10",
      d12: "1d12",
      dd4: "2d4",
      dd6: "2d6",
      dd8: "2d8",
      dd10: "2d10",
      dd12: "2d12"
    };

    return data;
  }

  async _updateObject(_, formData) {
    const data = expandObject(formData);
  }
}
