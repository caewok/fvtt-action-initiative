/* globals
foundry,
game,
renderTemplate
*/
"use strict";

import { MODULE_ID } from "./const.js";

export class WeaponSelectionDialog extends foundry.applications.api.DialogV2 {

  static DEFAULT_OPTIONS = {
    window: {
      title: `${MODULE_ID}.legend`
    }
  };

  /**
   * @param {string[]} combatantNames
   */
  static async create(combatantNames, weapons) {
    const dialogData = this.dialogData(combatantNames, weapons);
    const content = await renderTemplate(`modules/${MODULE_ID}/templates/weapons.html`, dialogData);
    return this.wait({
      content,
      rejectClose: false,
      close: this.onDialogCancel,
      buttons: this.constructButtons()
    })
  }

  /**
   * Create the button(s) for the dialog submission.
   * @returns {DialogV2Button[]}
   */
  static constructButtons() {
    const save = {
      action: "save",
      label: "Save",
      icon: "fa-solid fa-dice",
      default: true,
      callback: this.onDialogSubmit
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
    console.log("onDialogSubmit", event, button, dialog);
  }

  static onDialogCancel(event, dialog) {
    console.log("onDialogCancel", event, dialog);
  }


  /**
   * Construct data required to display the dialog for this combatant.
   * @param {string[]} combatantNames
   * @returns {object}
   */
  static dialogData(combatantNames, weapons) {
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
  const nameMap = new Map();
  for ( const name of names ) nameMap.set(name, (nameMap.get(name) || 0) + 1);
  let groupedNames = [];
  for ( const [name, number] of nameMap.entries() ) {
    const paren = number > 1 ? `(x${number})` : "";
    groupedNames.push(`${name}${paren}`);
  }
  return groupedNames.join(", ");
}