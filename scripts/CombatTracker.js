/* globals
CombatTracker,
foundry,
game,
Hooks,
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, FLAGS } from "./const.js";

export const PATCHES = {};
PATCHES.BASIC = {};


// Foundry: foundry.applications.sidebar.tabs.CombatTracker
// DND5e: dnd5e.applications.combat.CombatTracker5e (extends foundry.applications.sidebar.tabs.CombatTracker)

// ----- NOTE: Hooks -----

Hooks.once("renderCombatTracker", async (_app, _html, _context, _options) => {
  // Get the combatants for each combat and update flags as necessary.
  const promises = [];
  for ( const combat of game.combats ) {
    for ( const combatant of combat.combatants ) {
      const currVersion = combatant.getFlag(MODULE_ID, FLAGS.VERSION);
      if ( currVersion ) continue;

      // Wipe all the old initiative selections.
      // Not a huge issue b/c these are fleeting.
      promises.push(combatant.unsetFlag(MODULE_ID, FLAGS.COMBATANT.INITIATIVE_SELECTIONS));
      promises.push(combatant.setFlag(MODULE_ID, FLAGS.VERSION, game.modules.get("actioninitiative").version));
    }
  }
  await Promise.allSettled(promises);
});


/**
 * @param {ApplicationV2} application          The Application instance being rendered
 * @param {HTMLElement} element                The inner HTML of the document that will be displayed and may be modified
 * @param {ApplicationRenderContext} context   The application rendering context data
 * @param {ApplicationRenderOptions} options   The application rendering options
 */
function renderCombatTracker(app, html, context, options) {
  // Each combatant that has rolled will have a ".initiative" class
  const elems = html.getElementsByClassName("initiative");

  let i = 0;
  context.turns.forEach(turn => {
    if ( !turn.hasRolled || i >= elems.length ) return;
    const c = game.combat.combatants.get(turn.id);
    const summary = c[MODULE_ID].initiativeHandler.initiativeSelectionSummary();
    elems[i].setAttribute("data-tooltip", summary);
    i += 1;
  });
}

PATCHES.BASIC.HOOKS = { renderCombatTracker };

// ----- NOTE: Wraps -----

/**
 * Wrap CombatTracker#_onCombatantControl
 * Handle additional control buttons: addToInitiative and resetInitiative.
 *
 * Handle performing some action for an individual combatant.
 * @param {PointerEvent} event  The triggering event.
 * @param {HTMLElement} target  The action target element.
 */
async function _onCombatantControl(wrapped, event, target) {
  const btn = target || event.currentTarget;
  const combatantId = btn.closest(".combatant").dataset.combatantId;
  const combatant = this.viewed.combatants.get(combatantId);
  const action = btn.dataset.control || btn.dataset.action;
  const iH = combatant[MODULE_ID].initiativeHandler;
  switch ( action ) {
    case "addToInitiative": {
         const selections = await iH.initiativeDialogs();
         return selections ? iH.addToInitiative(selections) : undefined;
      }
    case "resetInitiative": return iH.resetInitiative();
  }

  return wrapped(event, target);
}

PATCHES.BASIC.WRAPS = { _onCombatantControl };


/**
 * An extension of the base CombatTracker class to provide ActionInitiative functionality.
 * Note that this replaces the 5e-specific version.
 * @extends {CombatTracker}
 */
export class CombatTrackerActionInitiative extends CombatTracker {
  /**
   * Copied from 5e: https://github.com/foundryvtt/dnd5e/blob/9a81781990174eb0581f2135d0146cd74ea489cb/module/applications/combat/combat-tracker.mjs
   * But pass the combatantId.
   * @inheritdoc
   */
  async _onCombatantControl(event) {
    event.preventDefault();
    event.stopPropagation();

    const btn = event.currentTarget;
    const li = btn.closest(".combatant");
    const combatantId = li.dataset.combatantId;
    const combatant = this.viewed.combatants.get(combatantId);
    const iH = combatant[MODULE_ID].initiativeHandler;
    switch ( btn.dataset.control ) {
      case "addToInitiative": {
         const selections = await iH.initiativeDialogs();
         return selections ? iH.addToInitiative(selections) : undefined;
      }
      case "resetInitiative": return iH.resetInitiative();
    }
    return super._onCombatantControl(event);
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      template: `modules/${MODULE_ID}/templates/combat-tracker.html`
    });
  }
}
