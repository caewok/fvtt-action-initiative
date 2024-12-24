/* globals
CONFIG,
dnd5e,
FormDataExtended,
foundry,
game,
renderTemplate,
Roll
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the Actor class

import { MODULE_ID, FORMULA_DEFAULTS } from "./const.js";
import { getDiceValueForProperty, Settings } from "./settings.js";
import { ActionInitiativeDialog } from "./ActionInitiativeDialog.js";

export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Methods ----- //

/**
 * New Actor method.
 * Display a dialog so the user can select one or more actions that the combatant will take.
 * @param {object} [options]                        Options which modify the roll
 * @param {D20Roll.ADV_MODE} [options.advantageMode]    A specific advantage mode to apply
 *   If undefined, user will choose.
 * @returns {Promise<object>} Ultimately, an object representing user selections.
 */
async function actionInitiativeDialog({ advantageMode, dialogData } = {}) {
  const actor = this;
  dialogData ??= actor._actionInitiativeDialogData();
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/combatant.html`, dialogData);
  const modes = dnd5e.dice.D20Roll.ADV_MODE;
  const options = {};

  return new Promise(resolve => {

    const advantage = {
      action: "advantage",
      label: "DND5E.Advantage",
      icon: "fa-solid fa-dice-six",
      callback: html => resolve(onDialogSubmit(html, modes.ADVANTAGE))
    };

    const normal = {
      action: "normal",
      label: "DND5E.Normal",
      icon: "fa-solid fa-dice",
      default: true,
      callback: html => resolve(onDialogSubmit(html, modes.NORMAL))
    };

    const disadvantage = {
      action: "disadvantage",
      label: "DND5E.Disadvantage",
      icon: "fa-solid fa-dice-one",
      callback: html => resolve(onDialogSubmit(html, modes.DISADVANTAGE))
    };

    // If a specific advantage mode applies, use only that button. Otherwise, give user the choice.
    const buttons = [];
    switch ( advantageMode ) {
      case modes.ADVANTAGE: buttons.push(advantage); break;
      case modes.DISADVANTAGE: buttons.push(disadvantage); break;
      case modes.NORMAL: buttons.push(normal); break;
      default: buttons.push(advantage, normal, disadvantage);
    }

    new ActionInitiativeDialog({
      title: "Action Initiative",
      content,
      buttons,
      close: () => resolve(null)
    }, options).render(true);
  });
}

/**
 * New Actor method.
 * Construct the data object used by Actor.prototype.actionInitiativeDialog.
 * @param {object} [options]
 * @param {object} [options.items]  Items collection used to display actor weapons if applicable.
 * @returns {object} The data object used in the dialog.
 */
function _actionInitiativeDialogData({ items } = {}) {
  const data = {
    actions: Object.keys(FORMULA_DEFAULTS.BASIC),
    spellLevels: Object.keys(FORMULA_DEFAULTS.SPELL_LEVELS)
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

/**
 * New Actor method.
 * Helper to retrieve initiative selections for a given actor.
 * @returns {object} Selections, by id of the combatant.
 */
function getActionInitiativeSelections() {
  return game.combat.combatants.map(c => {
    return { [c.id]: c.getActionInitiativeSelections() };
  });
}

/**
 * New Actor method.
 * Helper to set initiative selections for a given actor.
 * @param {object} selections
 * @param {object} [options]
 * @param {string} [options.combatantId] Limit to a single combatant associated with the actor.
 */
async function setActionInitiativeSelections(selections, { combatantId } = {}) {
  if ( !Settings.get(Settings.KEYS.GROUP_ACTORS) && !combatantId ) {
    console.error("setActionInitiativeSelectionsActor requires combatant id when GROUP_ACTORS is disabled.");
  }

  const combatants = getCombatantsForActor(this);
  if ( !combatants.length ) return;

  if ( combatantId ) {
    return await combatants.find(c => c.id === combatantId).setActionInitiativeSelections(selections);
  }

  const promises = combatants.map(c => c.setActionInitiativeSelections(selections));
  await Promise.all(promises);
}

/**
 * Store actor methods / class instantiations.
 */
/**
 * New getter: Actor#actioninitiative
 * Class that handles action initiative items for the actor
 * @type {object}
 */
function actioninitiative() {
  const ai = this._actioninitiative ??= {};
  ai.weaponsHandler ??= new CONFIG[MODULE_ID].WeaponsHandler(this);
  return ai;
}

PATCHES.BASIC.METHODS = {
  actionInitiativeDialog,
  _actionInitiativeDialogData,
  getActionInitiativeSelections,
  setActionInitiativeSelections
};

PATCHES.BASIC.GETTERS = { actioninitiative };

// ----- NOTE: Helper functions ----- //

/**
 * Helper to get all combatants associated with the actor.
 * @param {Actor} actor
 * @returns {Combatant[]}
 */
function getCombatantsForActor(actor) {
  return game.combat.combatants.filter(c => c.actor.id === actor.id);
}

/**
 * Helper to handle the return from ActionInitiativeDialog
 * @param {object} html   Dialog html
 * @param {D20Roll.ADV_MODE} advantageMode
 * @returns {object} Object representing user selections for actions.
 */
function onDialogSubmit(html, advantageMode) {
  const form = html[0].querySelector("form");
  const data = new FormDataExtended(form);
  data.object.advantageMode = advantageMode;

  // Check the formulae in BonusAction
  // To be safe, do regardless of the checkbox value
  const FORMULAS = Settings.get(Settings.KEYS.DICE_FORMULAS);
  const bonusFormula = data.object["BonusAction.Text"];
  if ( !Roll.validate(bonusFormula) ) data.object["BonusAction.Text"] = FORMULAS["BASIC.BonusAction"];

  const otherFormula = data.object["OtherAction.Text"];
  if ( !Roll.validate(otherFormula) ) data.object["OtherAction.Text"] = FORMULAS["BASIC.OtherAction"];

  return data.object;
}
