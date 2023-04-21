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
  if ( opts.direction < 0 ) return;
  await combat.resetAll();
}

/**
 * Wrap async Combat.prototype.rollAll
 * @param {object} [options]  Passed to rollInitiative. formula, updateTurn, messageOptions
 */
export async function rollAllCombat(options={}) {
  // Get all combatants that have not yet rolled initiative.
  const ids = game.combat.combatants
    .filter(c => c.initiative === null)
    .map(c => c.id);
  await setMultipleCombatants(ids);
  return this;
}

/**
 * Wrap async Combat.prototype.rollNPC
 * @param {object} [options]  Passed to rollInitiative. formula, updateTurn, messageOptions
 */
export async function rollNPCCombat(options={}) {
  // Get all NPC combatants that have not yet rolled initiative.
  const ids = game.combat.combatants
    .filter(c => c.isNPC && c.initiative === null)
    .map(c => c.id);
  await setMultipleCombatants(ids);
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
export function _sortCombatantsCombat(a, b) {
  const ia = Number.isNumeric(a.initiative) ? a.initiative : -Infinity;
  const ib = Number.isNumeric(b.initiative) ? b.initiative : -Infinity;
  return (ia - ib) || a.token.name.localeCompare(b.token.name) || (a.id > b.id ? 1 : -1);
}

/**
 * Present GM with options to set actions for multiple combatants.
 */
async function setMultipleCombatants(ids) {

  // Loop repeatedly while combatants still present.
  // But stop after 5 times.
  const MAX_ITER = 5;
  for ( let i = 0; i < MAX_ITER; i += 1 ) {
    if ( !ids.length ) return;

    const obj = await MultipleCombatantDialog.prompt({
      title: game.i18n.localize(`${MODULE_ID}.template.multiple-combatant-config.Title`),
      label: "Okay",
      callback: html => onDialogSubmit(html),
      rejectClose: false,
      options: { combatantIds: ids }
    });
    if ( obj === null ) return;

    // Determine which combatants were selected
    const expanded = expandObject(obj);
    const combatantIds = new Set(Object.entries(expanded.combatant)
      .filter(([key, value]) => value)
      .map(([key, value]) => key));
    if ( !combatantIds.size ) continue;

    // Gather all items from all the combatants
    const items = [];
    const combatants = game.combat.combatants
      .filter(c => combatantIds.has(c.id))
      .map(c => items.push(...c.actor.items.values()));

    // Present DM with action dialog
    const [firstCombatantId] = combatantIds;
    const firstCombatant = game.combat.combatants.get(firstCombatantId);
    const data = firstCombatant.actor._actionInitiativeDialogData({ items });
    const selections = await firstCombatant.actor.actionInitiativeDialog({ data });
    if ( !selections ) continue; // Closed dialog.

    for ( let combatantId of combatantIds ) {
      const thisC = game.combat.combatants.get(combatantId);

      // Set initiative for either only active tokens or all
      if ( getSetting(SETTINGS.GROUP_ACTORS) ) combatantId = undefined;

      // Retrieve the action choices made by the user for this actor.
      // Ultimate tied to the combatant that represents the actor.
      await thisC.actor.setActionInitiativeSelections(selections, { combatantId });
      await thisC.actor.rollInitiative({createCombatants: true, initiativeOptions: { combatantId }});
    }

    // Filter ids for only those still not rolled
    ids = game.combat.combatants
      .filter(c => combatantIds.has(c.id) && c.initiative === null)
      .map(c => c.id);
  }
}

function retrieveSelectedCombatants(obj) {

}

function onDialogSubmit(html) {
  const form = html[0].querySelector("form");
  const data = new FormDataExtended(form);
  return data.object;
}

export class MultipleCombatantDialog extends Dialog {


  selectedFilters = {};

  constructor(data, options = {}) {
    if ( !options.combatantIds ) console.error("MultipleCombatantDialog requires 'option = {combatantId: }'.");
    super(data, options);
    foundry.utils.mergeObject(this.data, this.constructor.categorizeCombatants(options.combatantIds));

    // Add tracking Sets for when filters are selected.
    for ( const key of Object.keys(this.data.filters) ) this.selectedFilters[key] = new Set();
  }

  /** @inheritdoc */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 420,
      height: "auto"
    });
  }

  async getData(options={}) {
    const data = await super.getData(options);
    data.content = await renderTemplate(`modules/${MODULE_ID}/templates/multiple-combatant-config.html`, this.data);
    return data;
  }

  /**
   * Activate additional listeners to display/hide spell levels and weapon properties
   */
  activateListeners(html) {
    super.activateListeners(html);
    html.on("change", ".filterChoice", this._actionChanged.bind(this));
  }

  _actionChanged(event) {
    console.log("Action changed", event);

    // event.target.name e.g., "filter.Race.Half Elf"
    const filterName = event.target.name.split(".")[1];
    const filterSelection = event.target.name.split(".")[2];
    if ( !filterName || !filterSelection ) return;

    // Mark each combatant that meets the filter or should be removed b/c filter was removed.
    const filterChecked = event.target.checked;
    this.data.combatants.forEach(c => {
      const elem = document.getElementById(`combatant.${c.id}`);
      if ( !c[filterName] ) {
        if ( filterSelection === "n/a" ) elem.checked = filterChecked;
      } else if ( c[filterName].toString() === filterSelection ) elem.checked = filterChecked;
    });
  }

  static categorizeCombatants(ids) {
    // Categorize by preset properties
    const { filterProperties, filterSets } = CONFIG[MODULE_ID];
    Object.values(filterSets).forEach(s => s.clear());

    ids = new Set(ids);
    const data = {
      filters: {},
      combatants: game.combat.combatants
        .filter(c => ids.has(c.id))
      .map(c => {
        const a = c.actor;
        const props = {
          tokenName: c.token.name,
          actorName: c.actor.name,
          img: c.token.texture.src,
          id: c.id,
          isNPC: c.isNPC,
        };

        filterProperties.forEach((value, key) => {
          const attr = getProperty(a, value);
          props[key] = attr;
          if ( !attr ) filterSets[key].add("n/a");
          else filterSets[key].add(attr);
        });

        return props;
      })
    };


    for ( const [filterKey, filterSet] of Object.entries(filterSets) ) {
      console.log(filterKey, filterSet)

      // Drop filters with only a single option.
      if ( filterSet.size < 2 ) continue;

      // Convert sets to object
      data.filters[filterKey] = {};
      filterSet.forEach(elem => data.filters[filterKey][elem] = elem);
    }

    return data;
  }
}
