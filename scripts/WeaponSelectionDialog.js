/* globals
foundry,
game,
renderTemplate
*/
"use strict";

import { MODULE_ID } from "./const.js";

/**
 * @typedef {object} WeaponSelectionResult
 * @param {object} weapons
 * One or more keys, one for each weapon:
 * - @prop {bool} weaponId         Key is the weapon id; true if checked.
 * ...
 * @param {string} button         The button pressed by the user
 */

export class WeaponSelectionDialog extends foundry.applications.api.DialogV2 {

  static DEFAULT_OPTIONS = {
    window: {
      title: `${MODULE_ID}.legend`
    }
  };

  /**
   * @param {string[]} combatantNames
   */
  static async create(weapons, opts) {
    if ( !weapons || !(weapons.size || weapons.length) ) return {};

    // If only one weapon to select, bypass the dialog entirely.
    if ( weapons.size === 1 || weapons.length === 1 ) {
      const [weapon] = weapons;
      return {
        checked: { [weapon.id]: true },
        button: "none"
      }
    }

    const dialogData = this.dialogData(weapons, opts);
    const content = await renderTemplate(`modules/${MODULE_ID}/templates/weapons.html`, dialogData);
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
  static constructButtons(opts) {
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
   * Helper to handle the return from ActionInitiativeDialog
   * @param {object} html   Dialog html
   * @param {D20Roll.ADV_MODE} advantageMode
   * @returns {object} Object representing user selections for actions.
   */
  static onDialogSubmit(event, button, dialog) {
    const form = dialog.querySelector("form");
    const data = new FormDataExtended(form);
    const res = {
      checked: foundry.utils.expandObject(data.object),
      button: button.dataset.action
    }
    return this.validateSelection(res);
  }

  static onDialogCancel(event, dialog) {
    console.log("WeaponsSelectionDialog|onDialogCancel", event, dialog);
    return null;
  }

  static validateSelection(data) { return data; }

  /**
   * Construct data required to display the dialog for this combatant.
   * @param {string[]} combatantNames
   * @returns {object}
   */
  static dialogData(weapons, { combatantNames } = {}) {
    const data = { groupedNames: groupNames(combatantNames) };
    data.weapons = weapons.map(w => {
       const { id, name, img } = w;
       return { id, name, img };
    });
    return data;
  }

  static get defaultOptions() {
    const opts = super.defaultOptions;
    opts.height = "auto";
    return opts;
  }
}

/**
 * Utility function to display names in a grouped list.
 * E.g., Randall, Bandit (x3), Goblin (x2).
 * @param {string[]} names
 * @returns {string} Combined list
 */
function groupNames(names) {
  if ( !names || !names.length ) return "";
  const nameMap = new Map();
  for ( const name of names ) nameMap.set(name, (nameMap.get(name) || 0) + 1);
  let groupedNames = [];
  for ( const [name, number] of nameMap.entries() ) {
    const paren = number > 1 ? `(x${number})` : "";
    groupedNames.push(`${name}${paren}`);
  }
  return groupedNames.join(", ");
}