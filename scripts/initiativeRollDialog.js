/* globals
renderTemplate,
Dialog,
D20Roll,
game,
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";
import { getSetting, SETTINGS } from "./settings.js";


// TO-DO: Store the prior initiative selection on the actor (or token? or combatant?) to re-use.

/**
 * Override Actor5e.prototype.rollInitiativeDialog
 * @param {object} [rollOptions]    Passed to Actor.getInitiativeRoll
 * @returns {Promise<void>}
 */
export async function rollInitiativeDialogActor5e(rollOptions = {}) {
  const test = await configureDialog();
  return this.rollInitiativeDialog(rollOptions);
}

async function configureDialog() {
  const options = {};
  const data = {};
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/initiative-actor-basic.html`, data);
  const modes = dnd5e.dice.D20Roll.ADV_MODE;

  return new Promise(resolve => {
    new Dialog({
      title: "Action Initiative",
      content,
      buttons: {
        advantage: {
          label: game.i18n.localize("DND5E.Advantage"),
          callback: html => resolve(onDialogSubmit(html, modes.ADVANTAGE))
        },
        normal: {
          label: game.i18n.localize("DND5E.Normal"),
          callback: html => resolve(onDialogSubmit(html, modes.NORMAL))
        },
        disadvantage: {
          label: game.i18n.localize("DND5E.Disadvantage"),
          callback: html => resolve(onDialogSubmit(html, modes.DISADVANTAGE))
        }
      },
      close: () => resolve(null)
    }, options).render(true);
  });
}

function onDialogSubmit(html, advantageMode) {
  const form = html[0].querySelector("form");
  const data = new FormDataExtended(form);

  // Do something with the data to construct the roll.
  const diceFormulas = getSetting(SETTINGS.DICE_FORMULAS);

  let formula = [];
  data.forEach((value, key) => {
    if ( !value ) return;
    const f = diceFormulas.BASIC[key] ?? FORMULA_DEFAULTS[key];
    formula.push(f);
  });


  return advantageMode;
}

class ActionInitDialog extends Dialog {

  /**
   * Activate additional listeners to display/hide spell levels and weapon properties
   */
  activateListeners(html) {
    html.find("#actioninitiative.melee");
  }

}


