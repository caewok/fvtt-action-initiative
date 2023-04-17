/* globals
CONFIG,
game,
ui,
Hooks
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, FLAGS } from "./const.js";
import { getSetting, SETTINGS } from "./settings.js";

/* Roll NPCs:
- Roll the highest NPC if not already
- Intersperse the other NPCs between players by assigning initiative accordingly
- Can we await the results of player rolls at this point?
- NPCs that have manually rolled keep their initiative position
*/

/* Roll all:
- Roll PCs
- See Roll NPCs for rest
*/

/* Flags
To facilitate sorting without resorting to decimals to break initiative ties, use a flag
to rank combatants.
*/

async function resetInitRank(combatant) {
}

/**
 * Hook createCombatant.
 */
Hooks.on("createCombatant", createCombatantHook);

async function createCombatantHook(combatant, _options, _id) {
}

/**
 * Hook updateCombat.
 */
Hooks.on("updateCombat", updateCombatHook);

async function updateCombatHook(combat, _change, _opts, _id) {

}

/**
 * Hook combatRound.
 */
Hooks.on("combatRound", combatRoundHook);

async function combatRoundHook(combat, _updateData, opts) {
}

/**
 * Wrap async Combat.prototype.rollAll
 * @param {object} [options]  Passed to rollInitiative. formula, updateTurn, messageOptions
 */
export async function rollAllCombat(options={}) {

}

/**
 * Wrap async Combat.prototype.rollNPC
 * @param {object} [options]  Passed to rollInitiative. formula, updateTurn, messageOptions
 */
export async function rollNPCCombat(options={}) {

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
export function _sortCombatantsCombat(a, b) {
  const ia = Number.isNumeric(a.initiative) ? a.initiative : -Infinity;
  const ib = Number.isNumeric(b.initiative) ? b.initiative : -Infinity;
  return (ia - ib) || a.token.name.localeCompare(b.token.name) || (a.id > b.id ? 1 : -1);
}
