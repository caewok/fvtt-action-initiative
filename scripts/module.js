/* globals
CONFIG,
game,
Hooks
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Basics
import { MODULE_ID, constructConfigObject } from "./const.js";
import { log } from "./util.js";

// Patching
import { PATCHER, initializePatching } from "./patching.js";
import { CombatTrackerActionInitiative } from "./CombatTrackerActionInitiative.js";

// Settings
import {
  Settings,
  defaultDiceFormulaObject } from "./settings.js";

import { MultipleCombatantDialog } from "./MultipleCombatantDialog.js";

// Self-executing scripts for hooks
import "./changelog.js";

/**
 * Tell DevMode that we want a flag for debugging this module.
 * https://github.com/League-of-Foundry-Developers/foundryvtt-devMode
 */
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(MODULE_ID);
});

Hooks.once("init", () => {
  log("Initializing...");
  initializePatching();

  game.modules.get(MODULE_ID).api = {
    MultipleCombatantDialog,
    PATCHER
  };

  CONFIG.ui.combat = CombatTrackerActionInitiative;

  // Set configuration values used internally. May be modified by users.
  CONFIG[MODULE_ID] = constructConfigObject();
});

Hooks.once("setup", () => {
  Settings.registerAll();

  CONFIG[MODULE_ID].filterSets = {};
  for ( const key of CONFIG[MODULE_ID].filterProperties.keys()) {
    CONFIG[MODULE_ID].filterSets[key] = new Set();
  }
});

Hooks.once("ready", () => {
  CONFIG[MODULE_ID].cleanupDefaults = true;

  if ( CONFIG[MODULE_ID].cleanupDefaults ) {
    // Clean up dice formula settings (rarely needed)
    const formulae = Settings.get(Settings.KEYS.DICE_FORMULAS);
    const defaults = defaultDiceFormulaObject();

    // Add missing
    const formulaeKeys = new Set(Object.keys(formulae));
    const defaultKeys = new Set(Object.keys(defaults));
    const missingFromFormulae = defaultKeys.difference(formulaeKeys);
    const extrasInFormulae = formulaeKeys.difference(defaultKeys);

    for ( const key of missingFromFormulae ) formulae[key] = defaults[key];
    for ( const key of extrasInFormulae ) delete formulae[key];

    Settings.set(Settings.KEYS.DICE_FORMULAS, formulae);
  }
});

Hooks.on("preCreateChatMessage", preCreateChatMessageHook);

function preCreateChatMessageHook(document, data, _options, _userId) {
  if ( !document.getFlag("core", "initiativeRoll") ) return;

  const actorId = data.speaker.actor;
  const combatants = game.combat.getCombatantByActors(actorId);
  if ( !combatants.length ) return;

  // Just pick the first combatant, b/c we don't currently have a good reason to pick another.
  const c = combatants[0];
  const summary = c._actionInitiativeSelectionSummary("chat");
  data.flavor += summary;
  document.updateSource({ flavor: data.flavor });
}

Hooks.on("renderCombatTracker", renderCombatTrackerHook);

function renderCombatTrackerHook(app, html, data) {
  // Each combatant that has rolled will have a ".initiative" class
  const elems = html.find(".initiative");

  let i = 0;
  data.turns.forEach(turn => {
    if ( !turn.hasRolled || i >= elems.length ) return;
    const c = game.combat.combatants.get(turn.id);
    const summary = c._actionInitiativeSelectionSummary("combatTrackerTooltip");
    elems[i].setAttribute("data-tooltip", summary);
    i += 1;
  });
}

/* DND5e combat initiative dialog
dnd5e.applications.combat.CombatTracker5e
dnd5e.documents.Actor5e.
dnd5e.documents.combat.getInitiativeRoll

CombatTracker5e.prototype._onCombatControl (extends CombatTracker)
--> combatant.actor.rollInitiativeDialog()

Actor5e.prototype.rollInitiativeDialog (extends Actor)
(Also called when rolling initiative from the character sheet)
(Only PCs (linked) can roll initiative from character sheet)
--> this.getInitiativeRoll(rollOptions)
--> roll.configureDialog
--> this.rollInitiative

D20Roll.prototype.configureDialog (extends Roll)
--> resolves using D20Roll.prototype._onDialogSubmit

Dialog now rendered

Click Normal

Actor5e.prototype.rollInitiative
--> Hook dnd5e.preRollInitiative
--> super.rollInitiative (Actor.prototype.rollInitiative)
    -- optionally add combatants if missing
    -- collects ids for all applicable combatants
    -- calls combat.rollInitiative

--> Hook dnd5e.rollInitiative

Patched version:

rollInitiativeDialog: Create the dialog. Helpful if we had the combatant
-- basically ignores getInitiativeRoll, configureDialog, and rollInitiative
-- calls this.rollInitiative.

-------
Roll Initiative methods

async Combatant.prototype.rollInitiative
async Actor.prototype.rollInitiative: Roll for all combatants in currently active Combat associated with this actor
  -- optionally add combatants if missing
  -- collects ids for all applicable combatants
  -- calls combat.rollInitiative

async Actor5e.prototype.rollInitiative
  -- calls super.rollInitiative

async Combat.prototype.rollInitiative
  -- iterates over each combatant id, rolling for each
  -- calls combatant.getInitiativeRoll for each, passing the provided formula if any
  -- publishes the chat message for each (all at once at end)
  -- updates initiative value for all combatant ids at once

async Combatant.prototype.rollInitiative
  -- Rolls initiative for particular combatant, calling this.getInitiativeRoll(formula)
  -- Updates initiative but no message

Combatant.prototype.getInitiativeRoll
  -- uses formula argument or calls Combatant.prototype._getInitiativeFormula
  -- Creates roll from formula
*/

/* Combat Tracker Hooks

Add Combat:
- preCreateCombat
- createCombat
- getCombatTracker5eEntryContext
- getCombatTrackerEntryContext
- renderCombatTracker5e
- renderCombatTracker
- preUpdateCombat
- updateCombat
- getCombatTracker5eEntryContext
- getCombatTrackerEntryContext
- renderCombatTracker5e
- renderCombatTracker

Click Combat Tracker settings:
- getCombatTrackerConfigHeaderButtons
- renderCombatTrackerConfig

Close Combat Tracker settings:
- closeCombatTrackerConfig

Add 3 combatants to tracker:
- preCreateCombatant (x3)
- createCombatant (x3)
- getCombatTracker5eEntryContext
- getCombatTrackerEntryContext
- renderCombatTracker5e
- renderCombatTracker

Roll initiative button:
- renderApplication
** Initiative Roll dialog pops up **
- dnd5e.preRollInitiative
- preUpdateCombatant
- updateCombatant
- getCombatTracker5eEntryContext
- getCombatTrackerEntryContext
- renderCombatTracker5e
- renderCombatTracker
- dnd5e.rollInitiative

Roll NPCs:
- preUpdateCombatant
- updateCombatant
- getCombatTracker5eEntryContext
- getCombatTrackerEntryContext
- renderCombatTracker5e
- renderCombatTracker

Roll all:
- preUpdateCombatant
- updateCombatant
- preCreateChatMessage
- getCombatTracker5eEntryContext
- getCombatTrackerEntryContext
- renderCombatTracker5e
- renderCombatTracker

Reset initiative:
- preUpdateCombat
- updateCombat
- getCombatTracker5eEntryContext
- getCombatTrackerEntryContext
- renderCombatTracker5e
- renderCombatTracker

Begin Combat:
- combatStart
- preUpdateCombat
- updateCombat
- getCombatTracker5eEntryContext
- getCombatTrackerEntryContext
- renderCombatTracker5e
- renderCombatTracker

(Note: Begin Combat does not cause tokens to roll initiative if not yet set)


*/
