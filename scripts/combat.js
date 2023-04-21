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

/**
 * Present GM with options to set actions for multiple combatants.
 */
async function setMultipleCombatants(ids) {
  const res = await new Promise(resolve => {
    new MultipleCombatantDialog({
      combatantIds: ids,
      title: "Action Initiative: Combatant Selection",
      content,
      buttons: {
        label: game.i18n.localize("Ok"),
        callback: html => resolve(onDialogSubmit(html))
      },
      close: () => resolve(null)
    }, options).render(true);
  });

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
    foundry.utils.mergeObject(this.data, this.constructor.categorizeCombatants(this.data.combatantIds));

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

    const filterName = event.target.name.split(".")[1]
    if ( !filterName ) return;

    const selections = new Set(Object.values(event.target.selectedOptions).map(s => s.value));
    const removed = this.selectedFilters[filterName].difference(selections);
    const added = selections.difference(this.selectedFilters[filterName]);
    this.selectedFilters[filterName] = selections;
    if ( !removed.size && !added.size ) return;

    this.data.combatants.forEach(c => {
      const elem = document.getElementById(`combatant.${c.id}`);
      if ( !c[filterName] ) {
        if ( removed.has("n/a") ) elem.checked = false;
        else if ( added.has("n/a") ) elem.checked = true;
      }
      else if ( removed.has(c[filterName].toString()) ) elem.checked = false;
      else if ( added.has(c[filterName].toString()) ) elem.checked = true;
    });
  }

  static categorizeCombatants(ids) {
    // Categorize by preset properties
    const { filterProperties, filterSets } = CONFIG[MODULE_ID];
    Object.values(filterSets).forEach(s => s.clear());

    const data = {
      filters: {},
      combatants: game.combat.combatants.map(c => {
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
