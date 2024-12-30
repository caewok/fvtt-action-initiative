/* globals
CONFIG,
game,
Hooks
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Basics
import { MODULE_ID, FLAGS, constructConfigObject } from "./const.js";
import { log } from "./util.js";

// Patching
import { PATCHER, initializePatching } from "./patching.js";
import { CombatTrackerActionInitiative } from "./CombatTrackerActionInitiative.js";

// Settings
import {
  Settings,
  defaultDiceFormulaObject } from "./settings.js";

import { MultipleCombatantDialog } from "./MultipleCombatantDialog.js";
import { WeaponsHandler, WeaponsHandlerDND5e, WeaponsHandlerA5e } from "./WeaponsHandler.js";
import { CombatantInitiativeHandler, CombatantInitiativeHandlerDND5e } from "./CombatantInitiativeHandler.js";
import { ActionSelectionDialog, ActionSelectionDialogDND5e } from "./ActionSelectionDialog.js";
import { WeaponSelectionDialog } from "./WeaponSelectionDialog.js";
import { ActorInitiativeHandler } from "./ActorInitiativeHandler.js";

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

  // API; mostly for debugging.
  game.modules.get(MODULE_ID).api = {
    MultipleCombatantDialog,
    PATCHER,
    Settings,
    CombatantInitiativeHandler, CombatantInitiativeHandlerDND5e,
    WeaponsHandler, WeaponsHandlerDND5e,
    ActionSelectionDialog, ActionSelectionDialogDND5e,
    ActorInitiativeHandler,
    MultipleCombatantDialog
  };

  // Add the extra buttons to the combat tracker.
  CONFIG.ui.combat = CombatTrackerActionInitiative;

  // Set configuration values used internally. May be modified by users.
  CONFIG[MODULE_ID] = constructConfigObject();

  /**
   * Classes to handle:
   * - weapons categorization
   * - initiative dialogs per-actor
   * - combatant initiative
   * - multiple combatants
   * @type {class}
   */
  CONFIG[MODULE_ID].WeaponsHandler = WeaponsHandler;
  CONFIG[MODULE_ID].ActorInitiativeHandler = ActorInitiativeHandler;
  CONFIG[MODULE_ID].CombatantInitiativeHandler = CombatantInitiativeHandler;
  CONFIG[MODULE_ID].ActionSelectionDialog = ActionSelectionDialog;
  CONFIG[MODULE_ID].WeaponSelectionDialog = WeaponSelectionDialog;
  CONFIG[MODULE_ID].MultipleCombatantDialog = MultipleCombatantDialog;

  // System-specific changes.
  switch ( game.system.id ) {
    case "dnd5e":
      CONFIG[MODULE_ID].WeaponsHandler = WeaponsHandlerDND5e;
      CONFIG[MODULE_ID].CombatantInitiativeHandler = CombatantInitiativeHandlerDND5e;
      CONFIG[MODULE_ID].ActionSelectionDialog = ActionSelectionDialogDND5e;
      break;
    case "a5e":
      CONFIG[MODULE_ID].WeaponsHandler = WeaponsHandlerA5e;
      break;
  }

  // Initialize system-specific properties.
  CONFIG[MODULE_ID].WeaponsHandler.initialize();
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

  const combatant = game.combat.getCombatantByActor(data.speaker.actor);
  if ( !combatant ) return;

  // Just pick the first combatant, b/c we don't currently have a good reason to pick another.
  const summary = combatant[MODULE_ID].initiativeHandler.initiativeSelectionSummary();
  data.flavor += summary;
  document.updateSource({ flavor: data.flavor });
}

Hooks.once("renderCombatTracker", async (_app, _html, _data) => {
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
  Hooks.on("renderCombatTracker", renderCombatTrackerHook);
});


function renderCombatTrackerHook(app, html, data) {
  // Each combatant that has rolled will have a ".initiative" class
  const elems = html.find(".initiative");

  let i = 0;
  data.turns.forEach(turn => {
    if ( !turn.hasRolled || i >= elems.length ) return;
    const c = game.combat.combatants.get(turn.id);
    const summary = c[MODULE_ID].initiativeHandler.initiativeSelectionSummary();
    elems[i].setAttribute("data-tooltip", summary);
    i += 1;
  });
}

/* Foundry default initiative flow

From combat tracker:
  - async CombatTracker#_onCombatantControl <-- If grouped, pass multiple ids?
  - async Combat#rollInitiative <-- Do init dialog if no selections yet
  - Combatant#getInitiativeRoll
  - Combatant#_getInitiativeFormula  <-- Formula from selection.

From actor call:
  - async Actor#rollInitiative  <-- Pass actor to Combat#rollInitiative
  - For each combatant:
    - async Combat#rollInitiative <-- Tests for init dialog but already run above
    - Combatant#getInitiativeRoll
    - Combatant#_getInitiativeFormula  <-- Formula from selection.

?? call: (Not called in base foundry)
  - async Combatant#rollInitiative(formula) <-- Do init dialog if no selections yet
  - Combatant#getInitiativeRoll(formula)
  - Combatant#_getInitiativeFormula <-- Formula from selection.

async CombatTracker#_onCombatantControl
  --> If "rollInitiative" button clicked: combat.rollInitiative([c.id])

async Combat#rollInitiative(ids, {formula=null, updateTurn=true, messageOptions={}}={})
  For each id:
  --> combatant.getInitiativeRoll(formula), then evaluates the roll
  --> Updates combatants
  --> Displays chat

Combatant#getInitiativeRoll(formula)
  --> Use existing or call this._getInitiativeFormula
  --> Create the roll

async Combatant#rollInitiative(formula)
  --> Create roll by calling this.getInitiativeRoll(formula).
  --> Evaluate roll and update.

Combatant#_getInitiativeFormula
  --> Get default dice formula to roll initiative

async Actor#rollInitiative({createCombatants=false, rerollInitiative=false, initiativeOptions={}}={})
  Roll initiative for all Combatants in the currently active Combat encounter which are associated with this Actor.
  If viewing a full Actor document, all Tokens which map to that actor will be targeted for initiative rolls.
  If viewing a synthetic Token actor, only that particular Token will be targeted for an initiative roll.
  --> Find combat
  --> Create combatants (optional)
  --> Roll initiative for each by calling combat.rollInitiative(combatants, initiativeOptions);
*/

/* DND5e initiative flow

From combat tracker:
  - CombatTracker5e#_onCombatantControl
  - Actor5e#rollInitiativeDialog <-- Do init dialog
  - Actor5e#rollInitiative
  - Actor5e#getInitiativeRoll
  - Actor#rollInitiative
    - For each combatant:
      - Combat#rollInitiative
      - Combatant#getInitiativeRoll
      - Combatant#_getInitiativeFormula


From actor (character sheet):
  - _onSheetAction
  - Actor5e#rollInitiativeDialog <-- Do init dialog
  - Actor5e#rollInitiative
  - Actor5e#getInitiativeRoll
  - Actor5e#rollInitiative
    - For each combatant:
      - Combat#rollInitiative
      - Combatant#getInitiativeRoll
      - Combatant#_getInitiativeFormula

CombatTracker5e#_onCombatantControl
  - If "rollInitiative" button clicked: combatant.actor.rollInitiativeDialog()

Actor5e#rollInitiativeDialog(rollOptions={})
  Roll initiative for this Actor with a dialog that provides an opportunity to elect advantage or other bonuses.
  --> Display dialog
  --> Call this.rollInitiative({ createCombatants: true })

Actor5e#rollInitiative(options={}, rollOptions={})
  --> Call this.getInitiativeRoll(rollOptions)
  --> Hooks.call("dnd5e.preRollInitiative"
  --> super.rollInitiative(options);
  --> Get combatants for the actor
  --> Hooks.callAll("dnd5e.rollInitiative"

Actor5e#getInitiativeRoll(options={})
  Get an un-evaluated D20Roll instance used to roll initiative for this Actor.
  --> Use either cached initiative roll or call this.getInitiativeRollConfig(options);

Actor5e#getInitiativeRollConfig(options={})
  Get an un-evaluated D20Roll instance used to roll initiative for this Actor.
  --> Constructs parts of the roll
  --> Hooks.callAll("dnd5e.preConfigureInitiative", this, rollConfig);


Combatant#getInitiativeRoll(formula)
 --> If no actor, return default 1d20
 --> Return this.actor.getInitiativeRoll();

*/

/* A5E initiative flow
From combat tracker:
  - CombatTracker#_onCombatantControl
  - Combat#rollInitiative
  - For each combatant:
    - Combatant#getInitiativeRoll
    - Combatant#_getInitiativeFormula -- Do init dialog if no selections yet
    - SimpleInitiativeRollDialog or InitiativeRollDialog

From actor (character sheet):
  - Actor#rollInitiative?  <-- Do init dialog

CombatTracker#_onCombatantControl(event)
  - If "rollInitiative" button clicked: combat.rollInitiative([c.id], { rollOptions: { rollMode, skipRollDialog, }, });
    (Defines skipRollDialog)

Combat#rollInitiative(ids, {updateTurn = true, messageOptions = {}, rollOptions = {})
  - For each combatant:
    - combatant.getInitiativeRoll(rollOptions)
    - Update
    - Create chat data

Combatant#_getInitiativeFormula(options)
  Override the default Initiative formula to customize special behaviors of the system.
  - If skipDialog, returns getDefaultInitiativeFormula
  - Constructs dialog: SimpleInitiativeRollDialog or InitiativeRollDialog
  - returns roll formula

Combatant#getInitiativeRoll(options)
  Get a Roll object which represents the initiative roll for this Combatant.
  - Calls this._getInitiativeFormula(options);
  - Creates and evaluates the roll and returns result

Combatant#rollInitiative(options)
  Roll initiative for this particular combatant.
  - Calls this.getInitiativeRoll(options);
  - Updates the combatant's initiative

*/



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
