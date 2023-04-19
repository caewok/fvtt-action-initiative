/* globals
renderTemplate,
Dialog,
game,
CONFIG,
dnd5e,
FormDataExtended,
expandObject,
Roll,
getProperty,
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";
import { getSetting, SETTINGS, FORMULA_DEFAULTS, getDiceValueForProperty } from "./settings.js";

// TO-DO: Store the prior initiative selection on the actor (or token? or combatant?) to re-use.


/* Combatant
New methods on combatant to calculate and store action initiative.
Store user-selected options in Combatant flags to facilitate initiative on new session.

1. async Combatant.prototype.actionInitiativeDialog
- Pop up a dialog for the user to select initiative options.
- stores options to the flag

1.1 Combatant.prototype._actionInitiativeDialogData

2. get Combatant.prototype.actionInitiativeSelections
- Undefined or the last selections provided by the user. Get the flag from (1)
- Returns object

2.1 set Combatant.prototype.actionInitiativeSelections

3. Combatant.prototype.calculateActionInitiativeRoll
- undefined if no selections
- returns Roll

4. Function or Combatant method to construct initiative dialog?

5. Initiative tooltip for a combatant?

*/

export async function actionInitiativeDialogActor() {
  const actor = this;
  const data = actor._actionInitiativeDialogData();
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/combatant.html`, data);
  const modes = dnd5e.dice.D20Roll.ADV_MODE;
  const options = {};

  return new Promise(resolve => {
    new ActionInitiativeDialog({
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

export function _actionInitiativeDialogDataActor() {
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
    "OtherAction",

    "Movement",
    "SwapGear",
    "BonusAction",
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
  };

  // Add weapons
  data.weapons = {
    melee: filterMeleeWeapons(this.items).map(i => {
      const { id, name, img } = i;
      return { id, name, img };
    }),

    ranged: filterRangedWeapons(this.items).map(i => {
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

export function calculateActionInitiativeRollCombatant() {
  const lastSelections = this.getFlag(MODULE_ID, "initSelections");
  return this.actor.calculateActionInitiativeRoll(lastSelections);
}

export function _getInitiativeFormulaCombatant() {
  const lastSelections = this.getFlag(MODULE_ID, "initSelections");
  if ( !lastSelections ) return "0";
  const selections = expandObject(lastSelections);
  const actor = this.actor;

  // Build the formula parts
  const formula = [];
  for ( const [key, value] of Object.entries(selections) ) {
    if ( !value
      || key === "meleeWeapon"
      || key === "rangeWeapon"
      || key === "advantageMode" ) continue;

    switch ( key ) {
      case "MeleeAttack":
      case "RangedAttack":
        formula.push(attackFormula(selections, actor, key) ?? "0");
        break;
      case "CastSpell":
        formula.push(castSpellFormula(selections) ?? "0");
        break;
      default:
        formula.push(getDiceValueForProperty(`BASIC.${key}`) ?? "0");
    }
  }

  // Combine the parts
  let f = formula.join("+");

  // Drop/increase highest die based on advantage
  const { ADVANTAGE, DISADVANTAGE } = dnd5e.dice.D20Roll.ADV_MODE;
  const advantageMode = selections.advantageMode;
  if ( advantageMode === ADVANTAGE || advantageMode === DISADVANTAGE ) {
    const roll = new Roll(f, actor);
    if ( advantageMode === ADVANTAGE ) shrinkLargestDie(roll);
    else increaseLargestDie(roll);
    f = roll.formula;
  }

  // Clean the roll last, and re-do
  // Cannot clean earlier b/c it would screw up the advantage/disadvantage.
  const fClean = dnd5e.dice.simplifyRollFormula(f) || "";
  return fClean;
}


export function getInitiativeRollCombatant(formula) {
  // TO-DO: Ignore formula or use it?
  formula = this._getInitiativeFormula();
  return new Roll(formula, this.actor);
}


export function calculateActionInitiativeRollActor(lastSelections) {

}

export function _actionInitiativeSelectionSummaryCombatant(type = "chat") {
  const lastSelections = this.getFlag(MODULE_ID, "initSelections");
  if ( !lastSelections ) return undefined;
  const selections = expandObject(lastSelections);
  const { KEY, TYPES } = SETTINGS.VARIANTS;
  const variant = getSetting(KEY);
  const modes = dnd5e.dice.D20Roll.ADV_MODE;

  const actions = [];
  const weapons = [];
  let spellLevel;
  let advantage;
  for ( const [key, value] of Object.entries(selections) ) {
    if ( !value
      || key === "meleeWeapon"
      || key === "rangeWeapon"
      || key === "spellLevels") continue;

    switch ( key ) {
      case "MeleeAttack":
      case "RangedAttack":
        actions.push(`${game.i18n.localize(`${MODULE_ID}.phrases.${key}`)}`);
        if ( variant === TYPES.WEAPON_DAMAGE
          || variant === TYPES.WEAPON_TYPE ) weapons.push(...filterWeaponsChoices(selections, this.actor, key));
        break;

      case "CastSpell":
        actions.push(`${game.i18n.localize(`${MODULE_ID}.phrases.${key}`)}`);

        if ( getSetting(SETTINGS.SPELL_LEVELS) ) {
          const spellLevels = new Set(Object.keys(CONFIG[MODULE_ID].spellLevels));
          const chosenLevel = Object.entries(selections).find(([_key, value]) => value && spellLevels.has(value));
          spellLevel = `${CONFIG[MODULE_ID].spellLevels[chosenLevel[1]]}`;
        }
        break;

      case "advantageMode":
        advantage = value === modes.ADVANTAGE
          ? advantage = `${game.i18n.localize("DND5E.Advantage")}` : value === modes.DISADVANTAGE
            ? advantage = `${game.i18n.localize("DND5E.Disadvantage")}` : undefined;
        break;

      default:
        actions.push(`${game.i18n.localize(`${MODULE_ID}.phrases.${key}`)}`);
    }
  }

  let text = `<br><b>Actions:</b> ${actions.join(", ")}`;
  if ( weapons.length ) {
    const weaponNames = weapons.map(w => w.name);
    text += `<br><b>Weapons:</b> ${weaponNames.join(", ")}`;
  }
  if ( spellLevel ) text += `<br><b>Maximum Spell Level:</b> ${spellLevel}`;
  if ( advantage ) text += `<br><em>${advantage}</em>`;

  return text;
}

// Depending on setting, a combatant may:
// 1. share its selections with all other combatants that have the same actor
// 2. have its own selections
export function getActionInitiativeSelectionsCombatant() {
  return this.getFlag(MODULE_ID, "initSelections");
}

export async function setActionInitiativeSelectionsCombatant(selections) {
  return this.setFlag(MODULE_ID, "initSelections", selections);
}

export function getActionInitiativeSelectionsActor() {
  const combatants = getCombatantsForActor(this);
  if ( !combatants.length ) return undefined;
  return combatants[0].actionInitiativeSelections;
}

export async function setActionInitiativeSelectionsActor(selections) {
  const combatants = getCombatantsForActor(this);
  if ( !combatants.length ) return;
  const promises = combatants.map(c => c.setActionInitiativeSelections(selections));
  await Promise.all(promises);
}

function getCombatantsForActor(actor) {
  const groupActors = getSetting(SETTINGS.GROUP_ACTORS);
  if ( groupActors ) game.combat.combatants.filter(c => c.actor.id === actor.id);
  return [game.combat.getCombatantByToken(actor.token.id)];
}

/**
 * Override Actor5e.prototype.rollInitiativeDialog
 * @param {object} [rollOptions]    Passed to Actor.getInitiativeRoll
 * @returns {Promise<void>}
 */
export async function rollInitiativeDialogActor5e(rollOptions = {}) {
  const selections = await this.actionInitiativeDialog(this);
  if ( !selections ) return; // Closed dialog.

  await this.setActionInitiativeSelections(selections);
  await this.rollInitiative({createCombatants: true});
}

function onDialogSubmit(html, advantageMode) {
  const form = html[0].querySelector("form");
  const data = new FormDataExtended(form);
  data.object.advantageMode = advantageMode;
  return data.object;
}

/**
 * Shrink largest die by 1 face.
 * d20 --> d12 --> d8 --> d6 --> d4 --> d3
 * @param {Roll} roll
 * @returns {Roll}
 */
function shrinkLargestDie(roll) {
  const largestTerm = roll.terms.reduce((acc, curr) => {
    if ( !acc.faces ) return curr;
    if ( !curr.faces ) return acc;
    return acc.faces > curr.faces ? acc : curr;
  });

  if ( !largestTerm.faces || largestTerm.faces <= 3 ) return;

  const f = largestTerm.faces;
  if ( f <= 4 ) largestTerm.faces = 3;
  else if ( f <= 6 ) largestTerm.faces = 4;
  else if ( f <= 8 ) largestTerm.faces = 6;
  else if ( f <= 12 ) largestTerm.faces = 8;
  else if ( f <= 20 ) largestTerm.faces = 12;
  else if ( f > 20 ) largestTerm.faces = 20;

  roll._formula = roll.formula; // Odd, but the getter reconstructs the formula from the terms.
}

/**
 * Increase smallest die by 1 face.
 * d20 <-- d12 <-- d8 <-- d6 <-- d4 <-- d3
 * @param {Roll} roll
 * @returns {Roll}
 */
function increaseLargestDie(roll) {
  const largestTerm = roll.terms.reduce((acc, curr) => {
    if ( !acc.faces ) return curr;
    if ( !curr.faces ) return acc;
    return acc.faces > curr.faces ? acc : curr;
  });

  if ( !largestTerm.faces || largestTerm.faces >= 20 ) return;

  const f = largestTerm.faces;
  if ( f >= 12 ) largestTerm.faces = 20;
  else if ( f >= 8 ) largestTerm.faces = 12;
  else if ( f >= 6 ) largestTerm.faces = 8;
  else if ( f >= 4 ) largestTerm.faces = 6;
  else if ( f >= 3 ) largestTerm.faces = 4;
  else largestTerm.faces = 3;

  roll._formula = roll.formula; // Odd, but the getter reconstructs the formula from the terms.
}

/**
 * Determine the init formula for a melee or ranged attack.
 * @param {Item} weapon   Weapon used.
 * @param {Actor} actor   Actor rolling init
 * @returns {string|"0"}
 */
function attackFormula(selections, actor, attackType = "MeleeAttack") {
  const { KEY, TYPES } = SETTINGS.VARIANTS;
  const variant = getSetting(KEY);
  const weaponFormulas = [];

  // For the basic variant, just return the formula. Otherwise, get all weapon formulas
  // for selected weapons.
  switch ( variant ) {
    case TYPES.BASIC: return getDiceValueForProperty(`BASIC.${attackType}`);

    // Filter melee or ranged weapons and get the underlying formula for each.
    case TYPES.WEAPON_DAMAGE:
      filterWeaponsChoices(selections, actor, attackType)
        .forEach(w => weaponFormulas.push(weaponDamageFormula(w)));
      break;
    case TYPES.WEAPON_TYPES:
      filterWeaponsChoices(selections, actor, attackType)
        .forEach(w => weaponFormulas.push(weaponTypeFormula(w)));
      break;
  }

  // If none or one weapon selected, return the corresponding formula.
  if ( !weaponFormulas.length ) return "0";
  if ( weaponFormulas.length === 1 ) return weaponFormulas[0];

  // For multiple weapons, pick the one that can cause the maximum damage.
  const max = weaponFormulas.reduce((acc, curr) => {
    const roll = new Roll(curr, actor);
    const max = roll.evaluate({ maximize: true, async: false }).total;
    if ( max > acc.max ) return { max, formula: curr };
    return acc;
  }, { max: Number.NEGATIVE_INFINITY, formula: "0" });
  return max.formula;
}

/**
 * Helper to filter weapons based on user selections.
 * @param {object}  selections    Selections provided by the user initiative form.
 * @param {Actor}   actor         Actor for the combatant
 * @param {"MeleeAttack"|"RangeAttack"}  type
 * @returns {Item[]}
 */
function filterWeaponsChoices(selections, actor, type = "MeleeAttack") {
  type = type === "MeleeAttack" ? "meleeWeapon" : "rangeWeapon";
  const weaponSelections = selections[type];
  return Object.entries(weaponSelections)
    .filter(([_key, value]) => value)
    .map(([key, _value]) => actor.items.get(key));
}


/**
 * Determine the base damage for a weapon.
 * For example, a dnd5e dagger return "1d4".
 * @param {Item} weapon
 * @returns {string|"0"}
 */
function weaponDamageFormula(weapon) {
  const dmg = getProperty(weapon, CONFIG[MODULE_ID].weaponDamageKey);
  const roll = new Roll(dmg);
  return roll.terms[0]?.formula ?? "0";
}

/**
 * Determine the init formula for a weapon using weapon type and properties.
 * The given type provides the base formula, for which weapon properties may
 * add/subtract to that base value.
 * For example, a dnd5e dagger is:
 * - simple melee type: Default 1d4
 * - light: Default -1
 * - finesse: Default -1
 * - thrown: no modifier
 * Result: 1d4 - 1 - 1
 * @param {Item} weapon
 * @returns {string|"0"}
 */
function weaponTypeFormula(weapon) {
  const { weaponPropertiesKey, weaponTypeKey } = CONFIG[MODULE_ID];
  const type = foundry.utils.getProperty(weapon, weaponTypeKey);
  const props = foundry.utils.getProperty(weapon, weaponPropertiesKey);

  // Base is set by the weapon type.
  const base = getDiceValueForProperty(`WEAPON_TYPES.${type}`);

  // Each property potentially contributes to the formula
  if ( !props.length ) return base;
  const propF = props.map(prop => getDiceValueForProperty(`WEAPON_PROPERTIES.${prop}`));
  return `${base} + ${propF.join(" + ")}`;
}

/**
 * Determine the init formula for a spell optionally using spell levels.
 * @param {object} params   Parameters chosen for initiative
 * @returns {string}
 */
function castSpellFormula(params) {
  if ( !getSetting(SETTINGS.SPELL_LEVELS) ) return getDiceValueForProperty("BASIC.CastSpell");

  const spellLevels = new Set(Object.keys(CONFIG[MODULE_ID].spellLevels));
  const chosenLevel = Object.entries(params).find(([_key, value]) => value && spellLevels.has(value));
  return getDiceValueForProperty(`SPELL_LEVELS.${chosenLevel[1]}`);
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


class ActionInitiativeDialog extends Dialog {

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
    html.on("change", "#actioninitiative-actionCheckbox", this._actionChanged.bind(this));
  }

  _actionChanged(event) {
    console.log("Action changed", event);

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
}
