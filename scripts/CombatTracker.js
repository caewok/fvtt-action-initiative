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
  // Add to (single combatant) initiative button
  const addToInitButton = document.createElement("button");
  addToInitButton.classList.add("inline-control", "combatant-control", "icon", "fa-regular", "fa-square-plus");
  addToInitButton.setAttribute("data-action", "toggleHidden");
  addToInitButton.setAttribute("data-tooltip", "actioninitiative.CombatTracker.addToInitiative");
  addToInitButton.setAttribute("data-control", "addToInitiative");
  // addToInitButton.setAttribute("aria-label", "Add To Initiative");

  // Reset (single combatant) initiative button
  const resetInitButton = document.createElement("button");
  resetInitButton.classList.add("inline-control", "combatant-control", "icon", "fa-solid", "fa-undo");
  resetInitButton.setAttribute("data-action", "toggleHidden");
  resetInitButton.setAttribute("data-tooltip", "actioninitiative.CombatTracker.resetInitiative");
  resetInitButton.setAttribute("data-control", "resetInitiative");
  // resetInitButton.setAttribute("aria-label", "Add To Initiative");

  // Example combat button in v13:
  // <button type="button" class="inline-control combatant-control icon fa-solid fa-eye-slash " data-action="toggleHidden" data-tooltip="" aria-label="Toggle Visibility"></button>

  /* v12 buttons:
  `
  <a class="combatant-control" data-tooltip="actioninitiative.CombatTracker.addToInitiative" data-control="addToInitiative">
    <i class="fa-regular fa-square-plus"></i>
  </a>

  <a class="combatant-control" data-tooltip="actioninitiative.CombatTracker.resetInitiative" data-control="resetInitiative">
    <i class="fas fa-undo"></i>
  </a>
  `;
  */

  // Cycle through each combatant.
  const elems = html.getElementsByClassName("combatant-controls");

  for ( let i = 0, iMax = elems.length; i < iMax; i += 1 ) {
    const turn = context.turns[i];
    if ( turn.initiative === null ) continue;

    const c = game.combat.combatants.get(turn.id);
    if ( !c ) continue;

    // Add the initiative buttons.
    if ( game.user.isGM || c.isOwner ) {
      elems[i].appendChild(addToInitButton);
      elems[i].appendChild(resetInitButton)
    }

    // Add the initiative summary data tooltip.
    const summary = c[MODULE_ID].initiativeHandler.initiativeSelectionSummary();
    elems[i].setAttribute("data-tooltip", summary);
  }
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
