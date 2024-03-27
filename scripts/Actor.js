/* globals
CONFIG,
dnd5e,
expandObject,
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
      label: game.i18n.localize("DND5E.Advantage"),
      callback: html => resolve(onDialogSubmit(html, modes.ADVANTAGE))
    };

    const normal = {
      label: game.i18n.localize("DND5E.Normal"),
      callback: html => resolve(onDialogSubmit(html, modes.NORMAL))
    };

    const disadvantage = {
      label: game.i18n.localize("DND5E.Disadvantage"),
      callback: html => resolve(onDialogSubmit(html, modes.DISADVANTAGE))
    };

    // If a specific advantage mode applies, use only that button. Otherwise, give user the choice.
    const buttons = {};
    switch ( advantageMode ) {
      case modes.ADVANTAGE:
        buttons.advantage = advantage;
        break;
      case modes.DISADVANTAGE:
        buttons.disadvantage = disadvantage;
        break;
      case modes.NORMAL:
        buttons.normal = normal;
        break;
      default:
        buttons.advantage = advantage;
        buttons.normal = normal;
        buttons.disadvantage = disadvantage;
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
  items ??= this.items;

  const { meleeWeapons, rangedWeapons, weaponTypes } = CONFIG[MODULE_ID];
  const data = {
    actions: Object.keys(FORMULA_DEFAULTS.BASIC),
    weaponTypes: {
      melee: [...meleeWeapons.keys()],
      ranged: [...rangedWeapons.keys()]
    },
    weaponProperties: Object.keys(FORMULA_DEFAULTS.WEAPON_PROPERTIES),
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
  const defaults = expandObject(Settings.get(KEYS.DICE_FORMULAS));
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
    spellLevels: CONFIG[MODULE_ID].spellLevels,
    meleeWeapons: {},
    rangedWeapons: {},
    weaponTypes: CONFIG[MODULE_ID].weaponTypes,
    weaponProperties: CONFIG[MODULE_ID].weaponProperties
  };

  // Add column splits
  data.splits = {
    actions: Math.ceil(data.actions.length * 0.5),
    weaponProperties: Math.ceil(data.weaponProperties.length * 0.5),
    spellLevels: Math.ceil(data.spellLevels.length * 0.5)
  };

  // Add weapons
  data.weapons = {
    melee: filterMeleeWeapons(items).map(i => {
      const { id, name, img } = i;
      return { id, name, img };
    }),

    ranged: filterRangedWeapons(items).map(i => {
      const { id, name, img } = i;
      return { id, name, img };
    })
  };

  Object.keys(weaponTypes).forEach(wpn => {
    if ( meleeWeapons.has(wpn) ) data.localized.meleeWeapons[wpn] = weaponTypes[wpn];
  });

  Object.keys(weaponTypes).forEach(wpn => {
    if ( rangedWeapons.has(wpn) ) data.localized.rangedWeapons[wpn] = weaponTypes[wpn];
  });

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

PATCHES.BASIC.METHODS = {
  actionInitiativeDialog,
  _actionInitiativeDialogData,
  getActionInitiativeSelections,
  setActionInitiativeSelections
};

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

/**
 * Filter items for melee weapons.
 * @param {EmbeddedCollection[Item]} items     Items to filter
 * @returns {Item[]} Array of weapons.
 */
function filterMeleeWeapons(items) {
  const { weaponTypeKey, meleeWeapons } = CONFIG[MODULE_ID];
  return items.filter(i => {
    if ( i.type !== "weapon" ) return false;
    const type = foundry.utils.getProperty(i, weaponTypeKey);
    return meleeWeapons.has(type);
  });
}

/**
 * Filter items for ranged or thrown weapons.
 * @param {EmbeddedCollection[Item]} items    Items to filter
 * @returns {Item[]} Array of weapons.
 */
function filterRangedWeapons(items) {
  const { weaponTypeKey, rangedWeapons, canThrowWeapon } = CONFIG[MODULE_ID];
  return items.filter(i => {
    if ( i.type !== "weapon" ) return false;
    const type = foundry.utils.getProperty(i, weaponTypeKey);
    return canThrowWeapon(i) || rangedWeapons.has(type);
  });
}
