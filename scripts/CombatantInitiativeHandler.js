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


  /* ----- NOTE: Static methods ----- */

  /**
   * Present GM with options to set actions for multiple combatants.
   * @param {string[]} combatantIds     Combatants to include
   * @param {object} _options           Options, unused
   */
  static async setMultipleCombatants(combatantIds, _opts) {
    if ( !combatantIds.length ) return;
    const res = await CONFIG[MODULE_ID].MultipleCombatantDialog.create({ combatantIds })
    if ( !res ) return null;

    // Determine which combatants were selected
    combatantIds = new Set(Object.entries(res.combatant)
      .filter(([_key, value]) => value)
      .map(([key, _value]) => key));
    if ( !combatantIds.size ) return null;

    // Present DM with action dialog
    // Use first combatant for calling the dialog(s).
    const firstCombatant = game.combat.combatants.get(combatantIds.first());
    const selectedActions = await firstCombatant[MODULE_ID].initiativeHandler.actionSelectionDialog({ combatantIds });

    // For weapons, need to present multiple dialogs. One per actor.
    const promises = [];
    const actors = [...game.combat.combatants].filter(c => combatantIds.has(c.id)).map(c => c.actor);
    for ( const actor of actors ) {
      const iH = actor[MODULE_ID].initiativeHandler;
      const weaponSelections = await iH._getWeaponSelections(selectedActions);
      promises.push(iH.setInitiativeSelections({ ...selectedActions, weapons: weaponSelections }));
    }
    await Promise.allSettled(promises);
    return combatantIds;
  }

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
    await this.combatant.unsetFlag(MODULE_ID, FLAGS.COMBATANT.INITIATIVE_SELECTIONS);
    return this.combatant.setFlag(MODULE_ID, FLAGS.COMBATANT.INITIATIVE_SELECTIONS, selections);
  }

  /* ----- NOTE: Primary methods ----- */

  /**
   * Display the initiative dialog(s) for this combatant.
   * Assumes a single combatant.
   */
  async initiativeDialogs(opts) {
    return this.combatant.actor[MODULE_ID].initiativeHandler.initiativeDialogs(opts);
  }

  /**
   * Display a dialog so the user can select one or more actions that the combatant will take.
   */
  async actionSelectionDialog(opts) {
    return this.combatant.actor[MODULE_ID].initiativeHandler.actionSelectionDialog(opts);
  }

  /**
   * Display a dialog so the user can select between specific weapons for the combatant.
   * @param {Item[]} weapons
   * @param {ATTACK_TYPES} type
   */
  async weaponSelectionDialog(opts) {
    return this.combatant.actor[MODULE_ID].initiativeHandler.weaponSelectionDialog(opts);
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
   * @param {object} [selections]   Optional returned object from ActionSelectionDialog.
   * @returns {string}
   */
  initiativeSelectionSummary(selections) {
    selections ??= this.initiativeSelections;
    if ( !selections ) return undefined;

    const { KEY, TYPES } = Settings.KEYS.VARIANTS;
    const variant = Settings.get(KEY);
    const weaponVariant = variant === TYPES.WEAPON_DAMAGE || variant === TYPES.WEAPON_TYPE;

    const selectedActions = selections.actions;
    const actions = [];
    let spellLevel;
    selectionLoop: for ( const [key, value] of Object.entries(selectedActions) ) {
      if ( !value ) continue;
      let label = `${game.i18n.localize(`${MODULE_ID}.phrases.${key}`)}`;
      switch ( key ) {
        case "BonusAction":
        case "OtherAction":
          if ( !selectedActions[key].Checkbox ) continue selectionLoop;
          label += `(${selections[key].Text})`
          break;

        case "CastSpell":
          if ( Settings.get(Settings.KEYS.SPELL_LEVELS) ) spellLevel = this.chosenSpellLevel(selections);
          break;
      }
      actions.push(label);
    }

    let text = `<br><b>Actions:</b> ${actions.join(", ")}`;
    if ( weaponVariant ) text += this.combatant.actor[MODULE_ID].weaponsHandler.summarizeWeaponsChoices(selections);
    if ( spellLevel ) text += `<br><b>Maximum Spell Level:</b> ${spellLevel}`;
    return text;
  }

  /**
   * Construct the initiative formula for a combatant based on user-selected actions.
   * @param {object} [selections]   Optional returned object from ActionSelectionDialog.
   * @returns {string} Cleaned dice formula
   */
  constructInitiativeFormula(selections) {
    selections ??= this.initiativeSelections;
    if ( !selections ) return "0";
    const formula = this._constructInitiativeFormula(selections);

    // Clean the roll last, and re-do
    return dnd5e.dice.simplifyRollFormula(formula) || "";
  }

  /**
   * Construct the initiative formula for a combatant based on user-selected actions.
   * @param {object} [selections]   Optional returned object from ActionSelectionDialog.
   * @returns {string} Dice formula
   */
  _constructInitiativeFormula(selections) {
    const { MELEE, RANGED } = this.constructor.ATTACK_TYPES;
    const actor = this.combatant.actor;
    const keyType = {
      MeleeAttack: MELEE,
      RangedAttack: RANGED
    };

    // Build the formula parts
    const selectedActions = selections.actions;
    const formula = [];
    for ( const [key, value] of Object.entries(selectedActions) ) {
      if ( !value ) continue;

      switch ( key ) {
        case "MeleeAttack":
        case "RangedAttack":
          formula.push(actor[MODULE_ID].weaponsHandler.attackFormula(selections, keyType[key]) ?? "0");
          break;
        case "CastSpell": {
          const chosenLevel = this.chosenSpellLevel(selections);
          const str = chosenLevel === null ? "BASIC.CastSpell"
            : `SPELL_LEVELS.${Object.entries(CONFIG[MODULE_ID].spellLevels)
              .find(([_key, value]) => value === chosenLevel)[0]}`
          formula.push(getDiceValueForProperty(str));
          break;
        }

        case "BonusAction":
          if ( selectedActions.BonusAction.Checkbox ) formula.push(selectedActions.BonusAction.Text);
          break;
        case "OtherAction":
          if ( selectedActions.OtherAction.Checkbox ) formula.push(selectedActions.OtherAction.Text);
          break;
        default:
          formula.push(getDiceValueForProperty(`BASIC.${key}`) ?? "0");
      }
    }

    // Combine the parts
    return formula.join("+");
  }

  /**
   * Determine the init formula for a spell optionally using spell levels.
   * @param {object} params   Parameters chosen for initiative
   * @returns {string}
   */
  chosenSpellLevel(selections) {
    selections ??= this.initiativeSelections;
    if ( !Settings.get(Settings.KEYS.SPELL_LEVELS) ) return null;
    const spellLevels = new Set(Object.keys(CONFIG[MODULE_ID].spellLevels));
    const chosenLevel = Object.entries(selections).find(([_key, value]) => value && spellLevels.has(value));
    return CONFIG[MODULE_ID].spellLevels[chosenLevel ? chosenLevel[1] : 9];
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