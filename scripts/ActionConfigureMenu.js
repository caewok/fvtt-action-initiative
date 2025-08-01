/* globals
CONFIG,
FormApplication,
foundry,
Roll,
ui
*/

"use strict";

import { MODULE_ID, FORMULA_DEFAULTS } from "./const.js";
import { Settings } from "./settings.js";

export class ActionConfigureMenu extends FormApplication {
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
    const formulae = Settings.get(Settings.KEYS.DICE_FORMULAS);
    const formulaeObj = foundry.utils.expandObject(formulae);
    data.basic = formulaeObj.BASIC;
    data.weaponTypes = formulaeObj.WEAPON_TYPES;
    data.weaponProperties = formulaeObj.WEAPON_PROPERTIES;
    data.spellLevels = formulaeObj.SPELL_LEVELS;
    data.placeholder = FORMULA_DEFAULTS;

    const wh = CONFIG[MODULE_ID].WeaponsHandler;
    const weaponTypes = {};
    const weaponProperties = {};
    wh.weaponTypesMap.forEach((value, key) => weaponTypes[key] = value);
    wh.weaponPropertiesMap.forEach((value, key) => weaponProperties[key] = value);

    data.localized = {
      spellLevels: CONFIG[MODULE_ID].spellLevels,
      weaponTypes,
      weaponProperties,
    };

    return data;
  }

  async _updateObject(_, formData) {
    const diceFormulas = Settings.get(Settings.KEYS.DICE_FORMULAS);
    Object.entries(formData).forEach(([key, formula]) => {
      if ( formula !== "" && !Roll.validate(formula) ) {
        ui.notifications.warn(`Die formula for ${key} is not valid.`);
        return;
      }

      diceFormulas[key] = formula;
    });

    await Settings.set(Settings.KEYS.DICE_FORMULAS, diceFormulas);
  }

  /**
   * Activate additional listeners to display/hide spell levels and weapon properties
   * Also monitor for incorrect dice formulae.
   */
  activateListeners(html) {
    super.activateListeners(html);
    html.on("change", ".actioninitiative-actionTextbox", this._textBoxChanged.bind(this));
  }

  _textBoxChanged(event) {
    const elem = document.getElementById(event.target.name);
    const formula = elem.value;

    // Cannot get the style sheet to work here.
    // if ( formula === "" || Roll.validate(formula) ) elem.className.replace(" actionInitiativeError", "");
    // else elem.className = elem.className + " actionInitiativeError";

    if ( formula === "" || Roll.validate(formula) ) {
      elem.style.borderColor = "";
      elem.style.borderWidth = "";
    } else {
      elem.style.borderColor = "#8B0000";
      elem.style.borderWidth = "2px";
    }
  }
}
