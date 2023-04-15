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
  const test = await configureDialog(this);
  return this.rollInitiativeDialog(rollOptions);
}

async function configureDialog(actor) {
  const { meleeWeapons, rangedWeapons, spellLevels, weaponTypes, weaponProperties } = CONFIG[MODULE_ID];

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
  }

  // Add weapons
  data.weapons = {
    melee: filterMeleeWeapons(actor.items).map(i => {
      const { id, name, img } = i;
      return { id, name, img };
    }),

    ranged: filterRangedWeapons(actor.items).map(i => {
      const { id, name, img } = i;
      return { id, name, img };
    }),
  }


  // Disable optional sections
  data.weaponTypeMeleeDisabled = true;
  data.weaponTypeRangedDisabled = false;

  Object.keys(weaponTypes).forEach(wpn => {
    if ( meleeWeapons.has(wpn) ) data.localized.meleeWeapons[wpn] = weaponTypes[wpn];
  });

  Object.keys(weaponTypes).forEach(wpn => {
    if ( rangedWeapons.has(wpn) ) data.localized.rangedWeapons[wpn] = weaponTypes[wpn];
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
  data.object.forEach((value, key) => {
    if ( !value ) return;

    switch ( value ) {
      case "MeleeAttack": {
        formula.push(meleeAttackFormula(data.object));
        break;
      }
    }

  });


  return advantageMode;
}


function meleeAttackFormula(params) {
  const { KEY, TYPES } = SETTINGS.VARIANTS;
  const diceFormulas = getSetting(SETTINGS.DICE_FORMULAS);

  const variant = getSetting(KEY);
  switch ( variant ) {
    case TYPES.BASIC: {
      return diceFormulas.BASIC.MeleeAttack ?? FORMULA_DEFAULTS.MeleeAttack;
    }
    case TYPES.WEAPON_SPEED: {

    }

    case TYPES.WEAPON_TYPES: {

    }



  }
}

/**
 * Filter an actor's time for melee weapons.
 * @param {EmbeddedCollection[Item]} items     Items to filter
 * @returns {Item[]} Array of weapons.
 */
function filterMeleeWeapons(items) {
  const { weaponTypeProperty, meleeWeapons } = CONFIG[MODULE_ID];
  return items.filter(i => {
    if ( i.type !== "weapon" ) return;
    const type = foundry.utils.getProperty(i, weaponTypeProperty);
    return meleeWeapons.has(type);
  });
}

/**
 * Filter an actor's time for ranged or thrown weapons.
 * @param {EmbeddedCollection[Item]} items    Items to filter
 * @returns {Item[]} Array of weapons.
 */
function filterRangedWeapons(items) {
  const { weaponTypeProperty, rangedWeapons, canThrowWeapon } = CONFIG[MODULE_ID];
  return items.filter(i => {
    if ( i.type !== "weapon" ) return;
    const type = foundry.utils.getProperty(i, weaponTypeProperty);
    return canThrowWeapon(i) || rangedWeapons.has(type);
  });
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

    let elem;
    switch ( event.target.name ) {
      case "MeleeAttack": {
        if ( getSetting(SETTINGS.VARIANTS.KEY) !== SETTINGS.VARIANTS.TYPES.WEAPON_TYPE ) break;
        elem = document.getElementById("actioninitiative-sectionWeaponTypeMelee");
        break;
      }

      case "RangedAttack": {
        if ( getSetting(SETTINGS.VARIANTS.KEY) !== SETTINGS.VARIANTS.TYPES.WEAPON_TYPE ) break;
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
}


