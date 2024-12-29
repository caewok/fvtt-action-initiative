/* globals
CONFIG,
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

PATCHES.BASIC.WRAPS = { resetAll };

// ----- NOTE: Overrides ---- //

/**
 * Override async Combat.prototype.rollAll
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
 * Override async Combat.prototype.rollNPC
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
 * Override Combat.prototype._sortCombatants.
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

// ----- NOTE: Wraps ----- //

/**
 * Mixed wrap Combat.prototype.rollInitiative
 * Present 1+ dialogs to get initiative.
 * If actor is defined, use the actor for the dialog.
 * Otherwise, get dialog for each combatant if selection not yet made.
 */
async function rollInitiative(wrapped, combatantIds, opts = {}) {
  combatantIds = new Set(combatantIds);
  if ( opts.actor ) {
    const iH = opts.actor[MODULE_ID].initiativeHandler;
    const selections = await iH.initiativeDialogs();
    if ( !selections ) return;
    await iH.setInitiativeSelections(selections);
  } else {
    for ( const combatantId of combatantIds ) {
      const c = game.combat.combatants.get(combatantId);
      if ( !c ) continue;
      const iH = c[MODULE_ID].initiativeHandler;
      if ( iH.initiativeSelections ) continue;
      const selections = await iH.initiativeDialogs();
      if ( !selections ) {
        combatantIds.delete(combatantId);
        continue;
      }
      await iH.setInitiativeSelections(selections);
    }
  }
  if ( !combatantIds.size ) return;
  return wrapped([...combatantIds.values()], opts);
}

PATCHES.BASIC.MIXES = { rollInitiative };

// ----- NOTE: Helper functions ----- //

/**
 * Present GM with options to set actions for multiple combatants.
 * @param {string[]} ids
 * @param {object} _options     Options, unused
 */
async function setMultipleCombatants(combatantIds, _opts) {
  combatantIds = await CONFIG[MODULE_ID].CombatantInitiativeHandler.setMultipleCombatants(combatantIds, _opts);
  if ( !combatantIds || !combatantIds.size ) return; // Dialog canceled.
  return game.combat.rollInitiative([...combatantIds]);
}
