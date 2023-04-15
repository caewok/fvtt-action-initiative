/* globals
renderTemplate,
Dialog,
D20Roll,
game,
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";
import { getSetting, SETTINGS, FORMULA_DEFAULTS } from "./settings.js";


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
  const dnd = CONFIG.DND5E;
  const { meleeWeapons, rangedWeapons } = CONFIG[MODULE_ID];

  const options = {};
  const data = {
    actions: Object.keys(FORMULA_DEFAULTS.BASIC),
    weaponTypes: {
      melee: Object.keys(meleeWeapons),
      ranged: Object.keys(rangedWeapons)
    },
    weaponProperties: Object.keys(FORMULA_DEFAULTS.WEAPON_PROPERTIES),
    spellLevels: Object.keys(FORMULA_DEFAULTS.SPELL_LEVELS)
  };

  // Organize actions into specific order
  data.actions = [
    "CastSpell",
    "MeleeAttack",
    "RangedAttack",
    "OtherAction",

    "Movement",
    "SwapGear",
    "SurprisePenalty"
  ];

  data.localized = {
    spellLevels: CONFIG.DND5E.spellLevels,
    meleeWeapons: {},
    rangedWeapons: {},
    weaponTypes: CONFIG.DND5E.weaponTypes,
    weaponProperties: CONFIG.DND5E.weaponProperties,
    spellLevels: CONFIG.DND5E.spellLevels
  };

  // Add column splits
  data.splits = {
    actions: Math.ceil(data.actions.length * 0.5),
    weaponProperties: Math.ceil(data.weaponProperties.length * 0.5),
    spellLevels: Math.ceil(data.spellLevels.length * 0.5)
  }

  // Disable optional sections
  data.weaponTypeMeleeDisabled = true;
  data.weaponTypeRangedDisabled = false;

  Object.keys(dnd.weaponTypes).forEach(wpn => {
    if ( meleeWeapons.has(wpn) ) data.localized.meleeWeapons[wpn] = dnd.weaponTypes[wpn];
  });

  Object.keys(dnd.weaponTypes).forEach(wpn => {
    if ( rangedWeapons.has(wpn) ) data.localized.rangedWeapons[wpn] = dnd.weaponTypes[wpn];
  });

  const content = await renderTemplate(`modules/${MODULE_ID}/templates/combatant.html`, data);
  const modes = dnd5e.dice.D20Roll.ADV_MODE;

  return new Promise(resolve => {
    new ActionInitDialog({
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

  static get defaultOptions() {
    const opts = super.defaultOptions;
    opts.height = "auto";
    return opts;
  }

  /**
   * Activate additional listeners to display/hide spell levels and weapon properties
   */
  activateListeners(html) {
    super.activateListeners(html);
    html.on("change", "#actioninitiative-actionCheckbox", this._actionChanged.bind(this))
  }

  _actionChanged(event) {
    console.log("Action changed", event);

    let id;
    let propsId;
    switch ( event.target.name ) {
      case "MeleeAttack": {
        id = "actioninitiative-sectionWeaponTypeMelee";
        propsId = "actioninitiative-sectionWeaponProperties";
        break;
      }

      case "RangedAttack": {
        id = "actioninitiative-sectionWeaponTypeRanged";
        propsId = "actioninitiative-sectionWeaponProperties";
        break;
      }

      case "CastSpell": {
        id = "actioninitiative-sectionSpellLevel";
        break;
      }
    }

    const elem = document.getElementById(id);
    if ( elem ) elem.style.display = event.target.checked ? "block" : "none";

    const secondary = document.getElementById(propsId);
    if ( secondary ) secondary.style.display = event.target.checked ? "block" : "none";
  }
}


