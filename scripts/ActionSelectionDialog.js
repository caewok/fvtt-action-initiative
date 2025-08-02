/* globals
CONFIG,
dnd5e,
FormDataExtended,
foundry,
renderTemplate,
Roll,
*/
"use strict";
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */

import { MODULE_ID, FORMULA_DEFAULTS } from "./const.js";
import { Settings, getDiceValueForProperty } from "./settings.js";

/**
 * @typedef {object} ActionSelectionResult
 * @param {object} actions
 * In actions object:
 * @param {object} BonusAction
 * - @prop {bool} Checkbox
 * - @prop {string} Text        The dice formula
 * @param {object} OtherAction
 * - @prop {bool} Checkbox
 * - @prop {string} Text        The dice formula
 * @param {bool} CastSpell
 * @param {bool} MeleeAttack
 * @param {bool} Movement
 * @param {bool} RangedAttack
 * @param {bool} SurprisePenalty
 * @param {bool} SwapGear
 * Other:
 * @param {string} spellLevels
 * @param {string} button         The button pressed by the user
 */

export class ActionSelectionDialog extends foundry.applications.api.DialogV2 {

  static DEFAULT_OPTIONS = {
    window: {
      title: `${MODULE_ID}.legend`,
      resizable: true,
      positioned: true
    },
    position: {
      width: 800,
      height: "auto"
    }
  };

  /**
   * @param {object} [opts]
   * @returns {ActionSelectionResult}
   */
  static async create(opts) {
    const dialogData = this.dialogData(opts);
    const content = await renderTemplate(`modules/${MODULE_ID}/templates/combatant.html`, dialogData);
    return this.wait({
      content,
      rejectClose: false,
      close: this.onDialogCancel,
      buttons: this.constructButtons(opts)
    })
  }

  /**
   * Create the button(s) for the dialog submission.
   * @returns {DialogV2Button[]}
   */
  static constructButtons(_opt) {
    const save = {
      action: "save",
      label: "Save",
      icon: "fa-solid fa-dice",
      default: true,
      callback: this.onDialogSubmit.bind(this)
    };
    return [save];
  }

  /**
   * Helper to handle the return from ActionSelectionDialog
   * @param {PointerEvent} event
   * @param {html} button
   * @param {ActionSelectionDialog} dialog
   * @returns {ActionSelectionResult} Object representing user selections for actions.
   */
  static onDialogSubmit(event, button, dialog) {
    const data = new FormDataExtended(button.form);
    const res = {
      actions: foundry.utils.expandObject(data.object),
      button: button.dataset.action,
      spellLevels: data.object.spellLevels
    }
    delete res.actions.spellLevels;
    return this.validateSelection(res);
  }

  /**
   * Validate the user selections. In particular, clean up entered formulas.
   * @param {ActionSelectionResult}
   * @returns {ActionSelectionResult}
   */
  static validateSelection(data) {
    const FORMULAS = Settings.get(Settings.KEYS.DICE_FORMULAS);
    const bonusFormula = data.actions.BonusAction.Text;
    if ( !Roll.validate(bonusFormula) ) data.actions.BonusAction.Text = FORMULAS["BASIC.BonusAction"];

    const otherFormula = data.actions.OtherAction.Text;
    if ( !Roll.validate(otherFormula) ) data.actions.OtherAction.Text = FORMULAS["BASIC.OtherAction"];
    return data;
  }

  static onDialogCancel(_event, _dialog) { return null; }


// ----- NOTE: Helper functions ----- //

  /**
   * Construct data required to display the dialog for this combatant.
   * @param {string[]} combatantNames
   * @returns {object}
   */
  static dialogData({ combatantNames } = {}) {
    // TODO: Move the trimming of actions elsewhere.
    const data = {
      actions: Object.keys(FORMULA_DEFAULTS.BASIC),
      spellLevels: Object.keys(FORMULA_DEFAULTS.SPELL_LEVELS),
      groupedNames: groupNames(combatantNames)
    };

    // Organize actions into specific order
    data.actions = [
      "CastSpell",
      "MeleeAttack",
      "RangedAttack",

      "Movement",
      "SwapGear",
      "SurprisePenalty"
    ];

    // Trim actions that are unused
    const removeElement = function(arr, elem) {
      const idx = arr.findIndex(obj => obj === elem);
      if ( ~idx ) arr.splice(idx, 1);
    };

    const KEYS = Settings.KEYS;
    const variant = Settings.get(KEYS.VARIANTS.KEY);
    const defaults = foundry.utils.expandObject(Settings.get(KEYS.DICE_FORMULAS));
    for ( const [key, value] of Object.entries(defaults.BASIC) ) {
      if ( value !== "0" ) continue;
      let remove = false;
      switch ( key ) {
        case "MeleeAttack":
        case "RangedAttack":
          if ( variant === KEYS.VARIANTS.TYPES.BASIC ) remove = true;
          break;
        case "CastSpell":
          if ( Settings.get(KEYS.SPELL_LEVELS) ) remove = true;
          break;
        default:
          remove = true;
      }
      if ( remove ) removeElement(data.actions, key);
    }

    // Display other action and bonus action separately with a text box to change the die roll
    data.otherActionDefault = getDiceValueForProperty("BASIC.OtherAction");
    data.bonusActionDefault = getDiceValueForProperty("BASIC.BonusAction");

    data.localized = {
      spellLevels: CONFIG[MODULE_ID].spellLevels
    };

    data.useSpellLevels = Settings.get(KEYS.SPELL_LEVELS);
    data.defaultSpellLevel = "0"

    return data;
  }

  static get defaultOptions() {
    const opts = super.defaultOptions;
    return opts;
  }

  /**
   * Activate additional listeners to display/hide spell levels and weapon properties
   * Also monitor for incorrect dice formulae.
   */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("change", this._handleChangeEvent.bind(this));

    // html.on("change", ".actioninitiative-actionCheckbox", this._actionChanged.bind(this));
    // html.on("change", ".actioninitiative-actionTextbox", this._textBoxChanged.bind(this));
  }

  _handleChangeEvent(event) {
    const targetClasses = new Set(event.target.classList);
    if ( targetClasses.has("actioninitiative-actionCheckbox") ) this._actionChanged(event);
    if ( targetClasses.has("actioninitiative-actionTextbox") ) this._textBoxChanged(event);
  }

  _actionChanged(event) {
    let elem;
    const KEYS = Settings.KEYS;
    switch ( event.target.name ) {
//       case "MeleeAttack": {
//         if ( Settings.get(KEYS.VARIANTS.KEY) === KEYS.VARIANTS.TYPES.BASIC ) break;
//         elem = document.getElementById("actioninitiative-sectionWeaponTypeMelee");
//         break;
//       }
//
//       case "RangedAttack": {
//         if ( Settings.get(KEYS.VARIANTS.KEY) === KEYS.VARIANTS.TYPES.BASIC ) break;
//         elem = document.getElementById("actioninitiative-sectionWeaponTypeRanged");
//         break;
//       }

      case "CastSpell": {
        if ( !Settings.get(KEYS.SPELL_LEVELS) ) break;
        elem = document.getElementById("actioninitiative-fieldSpellLevel");
        elem.disabled = !event.target.checked;
        break;
      }
    }

    // if ( elem ) elem.style.display = event.target.checked ? "block" : "none";
  }

  _textBoxChanged(event) {
    const elem = document.getElementById(event.target.name);
    if ( !elem ) return;
    const formula = elem.value;

    // If a formula is added, toggle the checkbox to be on.
    if ( formula !== "" && Roll.validate(formula) ) {
      let checkboxName;
      switch ( elem.name ) {
        case "OtherAction.Text": checkboxName = "OtherAction.Checkbox"; break;
        case "BonusAction.Text": checkboxName = "BonusAction.Checkbox"; break;
      }
      const checkbox = document.getElementById(checkboxName);
      checkbox.checked = true;
    }

    if ( formula === "" || Roll.validate(formula) ) elem.className.replace(" actionInitiativeError", "");
    else elem.className = `${elem.className} actionInitiativeError`;
  }
}

export class ActionSelectionDialogDND5e extends ActionSelectionDialog {
  /**
   * Create the button(s) for the dialog submission.
   * @returns {DialogV2Button[]}
   */
  static constructButtons({ advantageMode } = {}) {
    const modes = dnd5e.dice.D20Roll.ADV_MODE;
    const advantage = {
      action: modes.ADVANTAGE,
      label: "DND5E.Advantage",
      icon: "fa-solid fa-dice-six",
      callback: this.onDialogSubmit.bind(this)
    };

    const normal = {
      action: modes.NORMAL,
      label: "DND5E.Normal",
      icon: "fa-solid fa-dice",
      default: true,
      callback: this.onDialogSubmit.bind(this)
    };

    const disadvantage = {
      action: modes.DISADVANTAGE,
      label: "DND5E.Disadvantage",
      icon: "fa-solid fa-dice-one",
      callback: this.onDialogSubmit.bind(this)
    };
    const buttons = {
      [modes.ADVANTAGE]: advantage,
      [modes.NORMAL]: normal,
      [modes.DISADVANTAGE]: disadvantage
    }

    if ( advantageMode ) return buttons[advantageMode];
    return Object.values(buttons);
  }

  /**
   * Helper to handle the return from ActionSelectionDialog
   * @param {PointerEvent} event
   * @param {html} button
   * @param {ActionSelectionDialog} dialog
   * @returns {object} Object representing user selections for actions.
   */
  static onDialogSubmit(event, button, dialog) {
    const data = super.onDialogSubmit(event, button, dialog);
    data.advantageMode = Number(data.button);
    return data;
  }
}

/**
 * Utility function to display names in a grouped list.
 * E.g., Randall, Bandit (x3), Goblin (x2).
 * @param {string[]} names
 * @returns {string} Combined list
 */
function groupNames(names) {
  if ( !names || !(names.length || names.size) ) return "";
  const nameMap = new Map();
  for ( const name of names ) nameMap.set(name, (nameMap.get(name) || 0) + 1);
  let groupedNames = [];
  for ( const [name, number] of nameMap.entries() ) {
    const paren = number > 1 ? ` (x${number})` : "";
    groupedNames.push(`${name}${paren}`);
  }
  return groupedNames.join(", ");
}
