/* globals
CONFIG,
FormDataExtended,
foundry,
game,
renderTemplate
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID } from "./const.js";

export class MultipleCombatantDialog extends foundry.applications.api.DialogV2 {

  static DEFAULT_OPTIONS = {
    window: {
      title: `${MODULE_ID}.template.multiple-combatant-config.Title`,
      resizable: true,
      positioned: true
    },
    position: {
      width: 500,
      height: "auto"
    }
  };

  /**
   * @param {object} [opts]
   * @returns {ActionSelectionResult}
   */
  static async create(opts) {
    const dialogData = this.categorizeCombatants(opts.combatantIds)

    const content = await renderTemplate(`modules/${MODULE_ID}/templates/multiple-combatant-config.html`, dialogData);
    return this.wait({
      content,
      rejectClose: false,
      close: this.onDialogCancel,
      buttons: this.constructButtons(opts),
      combatantFilters: this._buildCombatantFilters(dialogData),
      combatants: dialogData.combatants,
      combatantIds: opts.combatantIds,
      filters: dialogData.filters
    });
  }

  /**
   * Create the button(s) for the dialog submission.
   * @returns {DialogV2Button[]}
   */
  static constructButtons(_opts) {
    const save = {
      action: "save",
      label: "Save",
      icon: "fa-solid fa-dice",
      default: true,
      callback: this.onDialogSubmit.bind(this)
    };
    return [save];
  }

  static onDialogCancel(_event, _dialog) { return null; }

  /**
   * Helper to handle the return from ActionSelectionDialog
   * @param {object} html   Dialog html
   * @param {D20Roll.ADV_MODE} advantageMode
   * @returns {ActionSelectionResult} Object representing user selections for actions.
   */
  static onDialogSubmit(event, button, dialog) {
    const form = dialog.querySelector("form");
    const data = new FormDataExtended(form);
    return this.validateSelection(foundry.utils.expandObject(data.object));
  }

  static validateSelection(data) { return data; }

  /**
   * Tracking to link filters to combatants.
   * Build a map with each key filter.filterCategory.filterChoice.
   * E.g., "filter.Race.Half Elf". Matches keys used in the template for the dialog.
   * Each map value is an object with set of combatants, category, choice, checked boolean.
   */
  static _buildCombatantFilters(data) {
    const combatantFilters = new Map();
    // Tracking to link filters to combatants.
    for ( const filterCategory of Object.keys(data.filters) ) {
      // Add tracking Sets for when filters are selected.
      for ( const filterChoice of Object.keys(data.filters[filterCategory]) ) {
        const obj = { combatantIds: new Set(), checked: false, filterCategory, filterChoice };
        const filterKey = `filter.${filterCategory}.${filterChoice}`;
        combatantFilters.set(filterKey, obj);
      }

      for ( const c of data.combatants ) {
        const filterChoice = c[filterCategory] ?? `${MODULE_ID}.phrases.NA`;
        const filterKey = `filter.${filterCategory}.${filterChoice}`;
        combatantFilters.get(filterKey).combatantIds.add(c.id);
      }
    }
    return combatantFilters;
  }

 /**
   * Activate additional listeners to operate the search filters.
   */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("change", this._handleChangeEvent.bind(this));
  }

  _handleChangeEvent(event) {
    const targetClasses = new Set(event.target.classList);
    if ( targetClasses.has("actioninitiative-filterChoice") ) this._filterChanged(event);
    if ( targetClasses.has("actioninitiative-combatantChoice") ) this._combatantChanged(event);
    if ( targetClasses.has("actioninitiative-combatantSelectAll") ) this._selectAll(event);
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
    const { combatantFilters, combatants, filters } = this.options;
    combatantFilters.forEach(f => f.checked = true);
    const filterCategories = Object.keys(filters);
    let allCombatantsChecked = true;
    const na = `${MODULE_ID}.phrases.NA`;
    combatants.forEach(c => {
      const combatantElem = document.getElementById(`combatant.${c.id}`);
      allCombatantsChecked &&= combatantElem.checked;
      filterCategories.forEach(filterCategory => {
        const filterKey = `filter.${filterCategory}.${c[filterCategory] ?? na}`;
        const obj = combatantFilters.get(filterKey);
        if ( obj.combatantIds.has(c.id) ) obj.checked &&= combatantElem.checked;
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
    this.options.combatants.forEach(c => {
      const elem = document.getElementById(`combatant.${c.id}`);
      elem.checked = selectAll;
    });
    this._syncFilters();
  }

  /**
   * Handle the selection or de-selection of a filter.
   */
  _filterChanged(event) {
    // E.g.: event.target.name ==> "filter.DND5E.CreatureType.beast"
    const nameParts = event.target.name.split(".");
    const filterSelection = nameParts.at(-1);
    nameParts.shift();
    nameParts.pop();
    const filterName = nameParts.join(".");
    if ( !filterName || !filterSelection ) return;

    // Mark each combatant that meets the filter or should be removed b/c filter was removed.
    const filterChecked = event.target.checked;
    this.options.combatants.forEach(c => {
      const elem = document.getElementById(`combatant.${c.id}`);
      if ( typeof c[filterName] === "undefined" ) {
        if ( filterSelection === `${MODULE_ID}.phrases.NA` ) elem.checked = filterChecked;
      } else if ( c[filterName].toString() === filterSelection ) elem.checked = filterChecked;
    });
    this._syncFilters();
  }

  static categorizeCombatants(ids) {
    // Categorize by preset properties
    const filters = CONFIG[MODULE_ID].ActorInitiativeHandler.FILTERS;
    const filterSets = new Map([...filters].map(f => [f, new Set()]));
    ids = new Set(ids);
    const data = {
      filters: {},
      combatants: game.combat.combatants
        .filter(c => ids.has(c.id))
        .map(c => {
          const props = {
            tokenName: c.token.name,
            actorName: c.actor.name,
            img: c.token.texture.src,
            id: c.id,
            isNPC: c.isNPC
          };
          const actorLabels = c.actor[MODULE_ID].initiativeHandler.categorize();
          filters.forEach(key => {
            props[key] = actorLabels[key];
            filterSets.get(key).add(actorLabels[key]);
          });
          return props;
        })
    };
    filterSets.forEach((filterSet, filterKey) => {
      // Drop filters with only a single option.
      if ( filterSet.size < 2 ) return;

      // Convert sets to object
      data.filters[filterKey] = {};
      filterSet.forEach(elem => data.filters[filterKey][elem] = elem);
    })
    return data;
  }
}
