/* globals
ChatMessage,
CONFIG,
CONST,
dnd5e,
foundry,
game,
Roll
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, FLAGS } from "./const.js";
import { Settings, getDiceValueForProperty } from "./settings.js";

/**
 * Class to handle combatant initiative.
 * Tied to specific combatant.
 * Store action selections for the combatant.
 * Trigger dialogs.
 * Coordinate the multi-combatant dialog.
 */
export class CombatantInitiativeHandler {
  /* ----- NOTE: Static properties ----- */

  /** @type {enum} */
  static ATTACK_TYPES = { MELEE: 1, RANGED: 2 };

  /* ----- NOTE: Static quasi-getters and setters ----- */

  /* ----- NOTE: Instantiation ----- */

  /** @type {Combatant} */
  combatant;

  constructor(combatant) {
    this.combatant = combatant;
  }

  /* ----- NOTE: Getters / Setters ----- */

  /**
   * Get the stored user action choices.
   * @returns {object}
   */
  get initiativeSelections() {
    return this.combatant.getFlag(MODULE_ID, FLAGS.COMBATANT.INITIATIVE_SELECTIONS);
  }

  /**
   * Store user action choices.
   * @param {object} selections
   */
  async setInitiativeSelections(selections) {
    return await this.combatant.setFlag(MODULE_ID, FLAGS.COMBATANT.INITIATIVE_SELECTIONS, selections);
  }

  /* ----- NOTE: Primary methods ----- */

  /**
   * Display the initiative dialog(s) for this combatant.
   * Assumes a single combatant.
   */
  async initiativeDialogs() {
    return this.actor[MODULE_ID].initiativeHandler.initiativeDialogs();
  }

  /**
   * Display a dialog so the user can select one or more actions that the combatant will take.
   */
  async actionSelectionDialog() {
    return this.actor[MODULE_ID].initiativeHandler.actionSelectionDialog();
  }

  /**
   * Display a dialog so the user can select between specific weapons for the combatant.
   * @param {Item[]} weapons
   * @param {ATTACK_TYPES} type
   */
  async weaponSelectionDialog(weapons, type) {
    return this.actor[MODULE_ID].initiativeHandler.weaponSelectionDialog({ weapons, type });
  }

  /**
   * Add to the combatant's initiative.
   * Add specific selections to combatant's initiative by presenting the action dialog to the user.
   * Rolls for those actions and add those to existing initiative and constructs chat message.
   * @param {object} selections
   */
  async addToInitiative(selections) {
    const combatant = this.combatant;

    // Store the new selections along with prior selections.
    const combinedSelections = this.getActionInitiativeSelections();
    for ( const [key, value] of Object.entries(selections) ) combinedSelections[key] ||= value;
    await this.setActionInitiativeSelections(combinedSelections);

    // Determine additional dice to roll.
    const formula = combatant._getInitiativeFormula(selections);
    const roll = combatant.getInitiativeRoll(formula);
    await roll.evaluate();
    await combatant.update({initiative: roll.total + (combatant.initiative ?? 0)});

    // Construct chat message data
    let messageData = foundry.utils.mergeObject({
      speaker: ChatMessage.getSpeaker({
        actor: combatant.actor,
        token: combatant.token,
        alias: combatant.name
      }),
      flavor: `Added to initiative for ${this.name}.`,
      flags: {"core.initiativeRoll": true}
    });
    const chatData = await roll.toMessage(messageData, {create: false});

    // If the combatant is hidden, use a private roll unless an alternative rollMode was explicitly requested
    chatData.rollMode = combatant.hidden ? CONST.DICE_ROLL_MODES.PRIVATE : game.settings.get("core", "rollMode");

    // Ensure the turn order remains with the same combatant
    await game.combat.update({turn: game.combat.turns.findIndex(t => t.id === combatant.id)});

    // Create multiple chat messages
    await ChatMessage.create(chatData);

    return this;
  }

  /**
   * Reset the combatant's initiative.
   */
  async resetInitiative() { await this.combatant.update({ initiative: null }); }

  /**
   * Construct text describing what the user chose for the combatant actions.
   * Used in chat message and in the tooltip in the Combat Tracker.
   * @returns {string}
   */
  initiativeSelectionSummary(lastSelections) {
    lastSelections ??= this.initiativeSelections;
    if ( !lastSelections ) return undefined;

    const selections = foundry.utils.expandObject(lastSelections);
    const { KEY, TYPES } = Settings.KEYS.VARIANTS;
    const variant = Settings.get(KEY);

    const actions = [];
    const weapons = [];
    let spellLevel;
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

          if ( Settings.get(Settings.KEYS.SPELL_LEVELS) ) {
            const spellLevels = new Set(Object.keys(CONFIG[MODULE_ID].spellLevels));
            const chosenLevel = Object.entries(selections).find(([_key, value]) => value && spellLevels.has(value));
            spellLevel = `${CONFIG[MODULE_ID].spellLevels[chosenLevel ? chosenLevel[1] : 9]}`;
          }
          break;
        case "BonusAction":
          if ( selections.BonusAction.Checkbox ) actions.push(`${game.i18n.localize(`${MODULE_ID}.phrases.${key}`)} (${selections.BonusAction.Text})`);
          break;
        case "OtherAction":
          if ( selections.OtherAction.Checkbox ) actions.push(`${game.i18n.localize(`${MODULE_ID}.phrases.${key}`)} (${selections.OtherAction.Text})`);
          break;
      }
    }

    let text = `<br><b>Actions:</b> ${actions.join(", ")}`;
    if ( weapons.length ) {
      const weaponNames = weapons.map(w => w.name);
      text += `<br><b>Weapons:</b> ${weaponNames.join(", ")}`;
    }
    if ( spellLevel ) text += `<br><b>Maximum Spell Level:</b> ${spellLevel}`;
    return text;
  }

  /**
   * Construct the initiative formula for a combatant based on user-selected actions.
   * @param {object} [lastSelections]   Optional returned object from ActionSelectionDialog.
   * @returns {string} Cleaned dice formula
   */
  constructInitiativeFormula(lastSelections) {
    lastSelections ??= this.initiativeSelections;
    if ( !lastSelections ) return "0";

    const selections = foundry.utils.expandObject(lastSelections);
    const formula = this._constructInitiativeFormula(selections);

    // Clean the roll last, and re-do
    return dnd5e.dice.simplifyRollFormula(formula) || "";
  }

  /**
   * Construct the initiative formula for a combatant based on user-selected actions.
   * @param {object} [lastSelections]   Optional returned object from ActionSelectionDialog.
   * @returns {string} Dice formula
   */
  _constructInitiativeFormula(selections) {
    const actor = this.combatant.actor;

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
        case "BonusAction":
          if ( selections.BonusAction.Checkbox ) formula.push(selections.BonusAction.Text);
          break;
        case "OtherAction":
          if ( selections.OtherAction.Checkbox ) formula.push(selections.OtherAction.Text);
          break;
        default:
          formula.push(getDiceValueForProperty(`BASIC.${key}`) ?? "0");
      }
    }

    // Combine the parts
    return formula.join("+");
  }

  /* ----- NOTE: Helper methods ----- */

}

export class CombatantInitiativeHandlerDND5e extends CombatantInitiativeHandler {
  /**
   * Construct text describing what the user chose for the combatant actions.
   * Used in chat message and in the tooltip in the Combat Tracker.
   * @returns {string}
   */
  initiativeSelectionSummary() {
    const modes = dnd5e.dice.D20Roll.ADV_MODE;
    const lastSelections = this.initiativeSelections;
    if ( !lastSelections ) return undefined;
    let text = super.initiativeSelectionSummary();
    if ( !Object.hasOwn("advantageMode", lastSelections) ) return text;
    const advantage = lastSelections.advantageMode === modes.ADVANTAGE ? `${game.i18n.localize("DND5E.Advantage")}`
      : lastSelections.advantageMode === modes.DISADVANTAGE ? `${game.i18n.localize("DND5E.Disadvantage")}`
      : undefined;
    text += `<br><em>${advantage}</em>`;
    return text;
  }

  /**
   * Construct the initiative formula for a combatant based on user-selected actions.
   * @param {object} [lastSelections]   Optional returned object from ActionSelectionDialog.
   * @returns {string} Cleaned dice formula
   */
  _constructInitiativeFormula(selections) {
    let formula = super._constructInitiativeFormula(selections);

    // Drop/increase highest die based on advantage
    const { ADVANTAGE, DISADVANTAGE } = dnd5e.dice.D20Roll.ADV_MODE;
    const advantageMode = selections.advantageMode;
    if ( advantageMode === ADVANTAGE || advantageMode === DISADVANTAGE ) {
      const roll = new Roll(formula, this.combatant.actor);
      if ( advantageMode === ADVANTAGE ) shrinkLargestDie(roll);
      else increaseLargestDie(roll);
      formula = roll.formula;
    }
    return formula;
  }
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
  const dmg = foundry.utils.getProperty(weapon, CONFIG[MODULE_ID].weaponDamageKey);
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
  if ( !props.size ) return base;
  const propF = [...props.values().map(prop => getDiceValueForProperty(`WEAPON_PROPERTIES.${prop}`))];
  return `${base} + ${propF.join(" + ")}`;
}

/**
 * Determine the init formula for a spell optionally using spell levels.
 * @param {object} params   Parameters chosen for initiative
 * @returns {string}
 */
function castSpellFormula(params) {
  if ( !Settings.get(Settings.KEYS.SPELL_LEVELS) ) return getDiceValueForProperty("BASIC.CastSpell");

  const spellLevels = new Set(Object.keys(CONFIG[MODULE_ID].spellLevels));
  const chosenLevel = Object.entries(params).find(([_key, value]) => value && spellLevels.has(value));
  return getDiceValueForProperty(`SPELL_LEVELS.${chosenLevel[1]}`);
}

/**
 * Determine the init formula for a melee or ranged attack.
 * @param {Item} weapon   Weapon used.
 * @param {Actor} actor   Actor rolling init
 * @returns {string|"0"}
 */
function attackFormula(selections, actor, attackType = "MeleeAttack") {
  const { KEY, TYPES } = Settings.KEYS.VARIANTS;
  const variant = Settings.get(KEY);
  const weaponFormulas = [];

  // For the basic variant, just return the formula. Otherwise, get all weapon formulas
  // for selected weapons.
  if ( variant === TYPES.BASIC ) return getDiceValueForProperty(`BASIC.${attackType}`);
  const wpns = filterWeaponsChoices(selections, actor, attackType);
  const formulaFn = variant === TYPES.WEAPON_DAMAGE ? weaponDamageFormula : weaponTypeFormula;
  wpns.forEach(w => weaponFormulas.push(formulaFn(w)));

  // If none or one weapon selected, return the corresponding formula.
  if ( !weaponFormulas.length ) return "0";
  if ( weaponFormulas.length === 1 ) return weaponFormulas[0];

  // For multiple weapons, pick the one that can cause the maximum damage.
  const max = weaponFormulas.reduce((acc, curr) => {
    const roll = new Roll(curr, actor);
    const max = roll.evaluateSync({ maximize: true }).total;
    if ( max > acc.max ) return { max, formula: curr };
    return acc;
  }, { max: Number.NEGATIVE_INFINITY, formula: "0" });
  return max.formula;
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