/* globals
FormDataExtended,
foundry,
game
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the Combat class

import { MODULE_ID, FLAGS } from "./const.js";

export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Hooks ----- //

/**
 * Reset combat initiative when the round moves to the next.
 */
async function combatRoundHook(combat, _updateData, opts) {
  if ( opts.direction < 0 ) return;
  await combat.resetAll();
}

PATCHES.BASIC.HOOKS = { combatRound: combatRoundHook };

// ----- NOTE: Wraps ----- //

/**
 * Wrap Combat.prototype.resetAll
 * If resetting, wipe the initiative selections.
 * @returns {Promise<Combat>}
 */
async function resetAll(wrapped) {
  for ( const c of this.combatants ) {
    c.updateSource({ [`flags.${MODULE_ID}.-=${FLAGS.COMBATANT.INITIATIVE_SELECTIONS}`]: null })
  }
  // All combatants are updated by resetAll.
  return wrapped();
}

/**
 * Wrap Combat.prototype.rollInitiative
 * If limiting to actor id, then use only combatant id for the active tokens of the actor.
 * This means synthetic tokens will be rolled separately.
 */
async function rollInitiative(wrapped, ids,
  {formula=null, updateTurn=true, messageOptions={}, combatantId}={}) {

  if ( !combatantId ) return wrapped(ids, { formula, updateTurn, messageOptions });

  // Pull actors from combatants b/c game.actor will not get synthetic actors.
  const combatant = game.combat.combatants.get(combatantId);
  if ( !combatant || !combatant.actor ) return wrapped( ids, { formula, updateTurn, messageOptions });

  // Only use the actor's active tokens for combatant ids.
  // Only if the combatant is already in ids.
  const tokens = combatant.actor.getActiveTokens();
  const oldIds = new Set(ids);
  ids = [];
  tokens.forEach(t => {
    if ( !t.inCombat ) return;
    const combatants = game.combat.getCombatantsByToken(t.id);
    combatants.forEach(c => {
       if ( oldIds.has(c.id) ) ids.push(c.id);
    });
  });

  return wrapped(ids, { formula, updateTurn, messageOptions });
}

PATCHES.BASIC.WRAPS = { rollInitiative, resetAll };

// ----- NOTE: Overrides ---- //

/**
 * Wrap async Combat.prototype.rollAll
 * @param {object} [options]  Passed to rollInitiative. formula, updateTurn, messageOptions
 */
async function rollAll(options={}) {
  // Get all combatants that have not yet rolled initiative.
  const ids = game.combat.combatants
    .filter(c => c.initiative === null)
    .map(c => c.id);
  await setMultipleCombatants(ids, options);
  return this;
}

/**
 * Wrap async Combat.prototype.rollNPC
 * @param {object} [options]  Passed to rollInitiative. formula, updateTurn, messageOptions
 */
async function rollNPC(options={}) {
  // Get all NPC combatants that have not yet rolled initiative.
  const ids = game.combat.combatants
    .filter(c => c.isNPC && c.initiative === null)
    .map(c => c.id);
  await setMultipleCombatants(ids, options);
  return this;
}

/**
 * Wrap Combat.prototype._sortCombatants.
 * Define how the array of Combatants is sorted.
 * As opposed to Foundry default, here the Combatants are initially sorted by
 * initiative bonus. Then by token name. Bonus is checked every sort so that updates can be reflected.
 * @param {Combatant} a     Some combatant
 * @param {Combatant} b     Some other combatant
 * @returns {number} The sort order.
 */
function _sortCombatants(a, b) {
  const ia = Number.isNumeric(a.initiative) ? a.initiative : -Infinity;
  const ib = Number.isNumeric(b.initiative) ? b.initiative : -Infinity;
  return (ia - ib) || a.token.name.localeCompare(b.token.name) || (a.id > b.id ? 1 : -1);
}

PATCHES.BASIC.OVERRIDES = { rollAll, rollNPC, _sortCombatants };

// ----- NOTE: Helper functions ----- //

/**
 * Present GM with options to set actions for multiple combatants.
 * @param {string[]} ids
 * @param {object} _options     Options, unused
 */
async function setMultipleCombatants(combatantIds, _opts) {
  const res = await CONFIG[MODULE_ID].CombatantInitiativeHandler.setMultipleCombatants(combatantIds, _opts);
  if ( res === null ) return; // Dialog canceled.

  for ( const combatantId of res ) {
    const thisC = game.combat.combatants.get(combatantId);
    await thisC.actor.rollInitiative({createCombatants: true, initiativeOptions: { combatantId }});
  }
}

/**
 * Helper to construct a new form from html.
 * @param {html} html
 * @returns {object}
 */
function onDialogSubmit(html) {
  const form = html[0].querySelector("form");
  const data = new FormDataExtended(form);
  return data.object;
}

