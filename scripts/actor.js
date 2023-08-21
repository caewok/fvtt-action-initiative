/* globals
CONFIG,
Dialog,
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

import { MODULE_ID } from "./const.js";
import { FORMULA_DEFAULTS, getSetting, getDiceValueForProperty, SETTINGS } from "./settings.js";

/**
 * New Actor method.
 * Display a dialog so the user can select one or more actions that the combatant will take.
 * @param {object} [options]                        Options which modify the roll
 * @param {D20Roll.ADV_MODE} [options.advantageMode]    A specific advantage mode to apply
 *   If undefined, user will choose.
 * @returns {Promise<object>} Ultimately, an object representing user selections.
 */
export async function actionInitiativeDialogActor({ advantageMode, dialogData } = {}) {
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
  const bonusFormula = data.object["BonusAction.Text"];
  if ( !Roll.validate(bonusFormula) ) data.object["BonusAction.Text"] = FORMULA_DEFAULTS.BASIC.BonusAction;

  const otherFormula = data.object["OtherAction.Text"];
  if ( !Roll.validate(otherFormula) ) data.object["OtherAction.Text"] = FORMULA_DEFAULTS.BASIC.OtherAction;

  return data.object;
}

/**
 * New Actor method.
 * Construct the data object used by Actor.prototype.actionInitiativeDialog.
 * @param {object} [options]
 * @param {object} [options.items]  Items collection used to display actor weapons if applicable.
 * @returns {object} The data object used in the dialog.
 */
export function _actionInitiativeDialogDataActor({ items } = {}) {
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

  const variant = getSetting(SETTINGS.VARIANTS.KEY);
  const defaults = expandObject(getSetting(SETTINGS.DICE_FORMULAS));
  for ( const [key, value] of Object.entries(defaults.BASIC) ) {
    if ( value !== "0" ) continue;
    let remove = false;
    switch ( key ) {
      case "MeleeAttack":
      case "RangedAttack":
        if ( variant === SETTINGS.VARIANTS.TYPES.BASIC ) remove = true;
        break;
      case "CastSpell":
        if ( getSetting(SETTINGS.SPELL_LEVELS) ) remove = true;
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
export function getActionInitiativeSelectionsActor() {
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
export async function setActionInitiativeSelectionsActor(selections, { combatantId } = {}) {
  if ( !getSetting(SETTINGS.GROUP_ACTORS) && !combatantId ) {
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
 * Helper to get all combatants associated with the actor.
 * @param {Actor} actor
 * @returns {Combatant[]}
 */
export function getCombatantsForActor(actor) {
  return game.combat.combatants.filter(c => c.actor.id === actor.id);
}

/**
 * Override Actor5e.prototype.rollInitiativeDialog
 * Present user with dialog to select actions.
 * Store the selections made by the user.
 * Then roll initiative as usual.
 * @param {object} [rollOptions]
 * @param {D20Roll.ADV_MODE} [options.advantageMode]    A specific advantage mode to apply
 * @param {string} [options.combatantId]                Id of the combatant chosen
 * @returns {Promise<void>}
 */
export async function rollInitiativeDialogActor5e({advantageMode, combatantId} = {}) {
  const selections = await this.actionInitiativeDialog(this, { advantageMode });
  if ( !selections ) return; // Closed dialog.

  // Set initiative for either only active tokens or all
  if ( getSetting(SETTINGS.GROUP_ACTORS) ) combatantId = undefined;

  // Retrieve the action choices made by the user for this actor.
  // Ultimate tied to the combatant that represents the actor.
  await this.setActionInitiativeSelections(selections, { combatantId });
  await this.rollInitiative({createCombatants: true, initiativeOptions: { combatantId }});
}


/* NOTE: Helper functions */

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

class ActionInitiativeDialog extends Dialog {

  static get defaultOptions() {
    const opts = super.defaultOptions;
    opts.height = "auto";
    return opts;
  }

  /**
   * Activate additional listeners to display/hide spell levels and weapon properties
   * Also monitor for incorrect dice formulae.
   */
  activateListeners(html) {
    super.activateListeners(html);
    html.on("change", ".actioninitiative-actionCheckbox", this._actionChanged.bind(this));
    html.on("change", ".actioninitiative-actionTextbox", this._textBoxChanged.bind(this));
  }

  _actionChanged(event) {
    let elem;
    switch ( event.target.name ) {
      case "MeleeAttack": {
        if ( getSetting(SETTINGS.VARIANTS.KEY) === SETTINGS.VARIANTS.TYPES.BASIC ) break;
        elem = document.getElementById("actioninitiative-sectionWeaponTypeMelee");
        break;
      }

      case "RangedAttack": {
        if ( getSetting(SETTINGS.VARIANTS.KEY) === SETTINGS.VARIANTS.TYPES.BASIC ) break;
        elem = document.getElementById("actioninitiative-sectionWeaponTypeRanged");
        break;
      }

      case "CastSpell": {
        if ( !getSetting(SETTINGS.SPELL_LEVELS) ) break;
        elem = document.getElementById("actioninitiative-sectionSpellLevel");
        break;
      }
    }

    if ( elem ) elem.style.display = event.target.checked ? "block" : "none";
  }

  _textBoxChanged(event) {
    const elem = document.getElementById(event.target.name);
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


