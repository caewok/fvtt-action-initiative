/* globals
CONFIG,
Dialog,
expandObject,
FormDataExtended,
foundry,
game,
getProperty,
Hooks,
renderTemplate
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";

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
  await setMultipleCombatants(ids, options);
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
export function _sortCombatantsCombat(a, b) {
  const ia = Number.isNumeric(a.initiative) ? a.initiative : -Infinity;
  const ib = Number.isNumeric(b.initiative) ? b.initiative : -Infinity;
  return (ia - ib) || a.token.name.localeCompare(b.token.name) || (a.id > b.id ? 1 : -1);
}

/**
 * Present GM with options to set actions for multiple combatants.
 */
async function setMultipleCombatants(ids, _options) {
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
    .filter(([_key, value]) => value)
    .map(([key, _value]) => key));
  if ( !combatantIds.size ) return;

  // Gather all items from all the combatants
  const items = [];
  game.combat.combatants
    .filter(c => combatantIds.has(c.id))
    .forEach(c => items.push(...c.actor.items.values()));

  // Present DM with action dialog
  const [firstCombatantId] = combatantIds;
  const firstCombatant = game.combat.combatants.get(firstCombatantId);
  const dialogData = firstCombatant.actor._actionInitiativeDialogData({ items });
  const selections = await firstCombatant.actor.actionInitiativeDialog({ dialogData });
  if ( !selections ) return; // Closed dialog.

  for ( const combatantId of combatantIds ) {
    const thisC = game.combat.combatants.get(combatantId);
    await thisC.actor.setActionInitiativeSelections(selections, { combatantId });
    await thisC.actor.rollInitiative({createCombatants: true, initiativeOptions: { combatantId }});
  }
}

function onDialogSubmit(html) {
  const form = html[0].querySelector("form");
  const data = new FormDataExtended(form);
  return data.object;
}

/**
 * Wrap Combat.prototype.rollInitiative
 * If limiting to actor id, then use only combatant id for the active tokens of the actor.
 * This means synthetic tokens will be rolled separately.
 */
export async function rollInitiativeCombat(wrapped, ids,
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
    const c = game.combat.getCombatantByToken(t.id);
    if ( oldIds.has(c.id) ) ids.push(c.id);
  });

  return wrapped(ids, { formula, updateTurn, messageOptions });
}


export class MultipleCombatantDialog extends Dialog {

  combatantFilters = new Map();

  constructor(data, options = {}) {
    if ( !options.combatantIds ) console.error("MultipleCombatantDialog requires 'option = {combatantId: }'.");
    super(data, options);
    foundry.utils.mergeObject(this.data, this.constructor.categorizeCombatants(options.combatantIds));
    this._buildCombatantFilters();
  }

  /**
   * Tracking to link filters to combatants.
   * Build a map with each key filter.filterCategory.filterChoice.
   * E.g., "filter.Race.Half Elf". Matches keys used in the template for the dialog.
   * Each map value is an object with set of combatants, category, choice, checked boolean.
   */
  _buildCombatantFilters() {
    // Tracking to link filters to combatants.
    for ( const filterCategory of Object.keys(this.data.filters) ) {
      // Add tracking Sets for when filters are selected.
      for ( const filterChoice of Object.keys(this.data.filters[filterCategory]) ) {
        const obj = { combatants: new Set(), checked: false, filterCategory, filterChoice };
        const filterKey = `filter.${filterCategory}.${filterChoice}`;
        this.combatantFilters.set(filterKey, obj);
      }

      for ( const c of this.data.combatants ) {
        const filterChoice = c[filterCategory] || "n/a"; // "" => "n/a"
        const filterKey = `filter.${filterCategory}.${filterChoice}`;
        this.combatantFilters.get(filterKey).combatants.add(c);
      }
    }
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
    html.on("change", ".filterChoice", this._filterChanged.bind(this));
    html.on("change", "#combatantSelectAll", this._selectAll.bind(this));
    html.on("change", ".combatantChoice", this._combatantChanged.bind(this));
  }

  _combatantChanged(_event) { this._syncFilters(); }

  /**
   * Sync the checked filters with combatants.
   * If all the combatants for a given filter option are checked, check that filter.
   * If not all combatants for a given filter option are checked, uncheck that filter.
   */
  _syncFilters() {
    // Assume each filter is checked. If a combatant is unchecked, then
    // uncheck the associated filter(s).
    const { combatantFilters, data } = this;
    combatantFilters.forEach(f => f.checked = true);
    const filterCategories = Object.keys(data.filters);
    let allCombatantsChecked = true;
    data.combatants.forEach(c => {
      const elem = document.getElementById(`combatant.${c.id}`);
      allCombatantsChecked &&= elem.checked;
      filterCategories.forEach(filterCategory => {
        const filterKey = `filter.${filterCategory}.${c[filterCategory] || "n/a"}`;
        const obj = combatantFilters.get(filterKey);
        if ( obj.combatants.has(c) ) obj.checked &&= elem.checked;
      });
    });

    // Sync the filters to the template.
    const templateFilters = document.getElementsByClassName("filterChoice");
    for ( const templateFilter of templateFilters ) {
      templateFilter.checked = combatantFilters.get(templateFilter.name).checked;
    }

    // Sync the "all" checkbox for combatants.
    const allElem = document.getElementById("combatantSelectAll");
    allElem.checked = allCombatantsChecked;
  }

  /**
   * Select all the combatants.
   * Also causes all filters to be checked.
   * Unchecking selectAll does the opposite.
   */
  _selectAll(event) {
    const selectAll = event.target.checked;
    this.data.combatants.forEach(c => {
      const elem = document.getElementById(`combatant.${c.id}`);
      elem.checked = selectAll;
    });
    this._syncFilters();
  }

  /**
   * Handle the selection or de-selection of a filter.
   */
  _filterChanged(event) {
    // E.g.: event.target.name ==> "filter.Race.Half Elf"
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
    this._syncFilters();
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
            isNPC: c.isNPC
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
      // Drop filters with only a single option.
      if ( filterSet.size < 2 ) continue;

      // Convert sets to object
      data.filters[filterKey] = {};
      filterSet.forEach(elem => data.filters[filterKey][elem] = elem);
    }

    return data;
  }
}
