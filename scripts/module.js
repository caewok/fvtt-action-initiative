/* globals
Hooks,
*/
"use strict";

// Basics
import { MODULE_ID } from "./const.js";
import { log } from "./util.js";

// Patching
import { registerActionInitiative } from "./patching.js";

// Settings
import { registerSettings, FORMULA_DEFAULTS } from "./settings.js";

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
  registerActionInitiative();



  // Set configuration values used internally
  CONFIG[MODULE_ID] = {
    FORMULA_DEFAULTS: FORMULA_DEFAULTS,

    /**
     * Melee weapon categories
     * @type {string[]}
     */
    meleeWeapons: new Set([
      "simpleM",
      "martialM",
      "natural",
      "improv"
    ]),

    /**
     * Melee weapon categories
     * @type {string[]}
     */
    rangedWeapons: new Set([
      "simpleR",
      "martialR",
      "natural",
      "improv",
      "siege"
    ]),

    /**
     * Properties of weapons.
     * An object with key:name for each. Names are assumed to be localized.
     * @type {object}
     */
    weaponProperties: CONFIG.DND5E.weaponProperties,

    /**
     * Types of weapons.
     * An object with key:name for each. Names are assumed to be localized.
     * @type {object}
     */
    weaponTypes: CONFIG.DND5E.weaponTypes,

    /**
     * Spell levels
     * An object with key:name for each. Names are assumed to be localized.

     * @type {object}
     */
    spellLevels: CONFIG.DND5E.spellLevels,

    /**
     * In items, where to find the weapon type. (See meleeWeapons and rangedWeapons for types.)
     * @type {string}
     */
    weaponTypeKey: "system.weaponType",

    /**
     * In items, where to find the weapon properties.
     * @type {string}
     */
    weaponPropertiesKey: "system.properties",

    /**
     * In items, where to find the weapon damage formula.
     * The first term of this string may be used as the formula for purposes of initiative,
     * if the Weapon Damage variant is selected.
     * @type {string}
     */
    weaponDamageKey: "labels.damage",

    /**
     * Callback to determine if a weapon can be thrown.
     * Thrown weapons are listed as both melee and ranged.
     * @type {function}
     */
    canThrowWeapon: i => i.system.properties.thr

  }

});

Hooks.once("setup", () => {
  registerSettings();
});


Hooks.on("preCreateChatMessage", preCreateChatMessageHook);

function preCreateChatMessageHook(document, data, options, userId) {
  if ( !document.getFlag("core", "initiativeRoll") ) return;

  const actorId = data.speaker.actor;
  const c = game.combat.getCombatantByActor(actorId);
  const summary = c._actionInitiativeSelectionSummary("chat");
  data.flavor += summary;
  document.updateSource({ flavor: data.flavor });
}

Hooks.on("renderCombatTracker", renderCombatTrackerHook);

function renderCombatTrackerHook(app, html, data) {
  // Each combatant that has rolled will have a ".initiative" class
  const elems = html.find(".initiative");

  let i = 0
  data.turns.forEach(turn => {
    if ( !turn.hasRolled || i >= elems.length ) return;
    const c = game.combat.combatants.get(turn.id);
    const summary = c._actionInitiativeSelectionSummary("combatTrackerTooltip");
    elems[i].setAttribute("data-tooltip", summary);
    i += 1;
  });
}

/*
elems = document.getElementsByClassName("token-initiative")
elem = elems[11]
parent = elem.parentElement

game.tooltip.activate(elem, ({text: "My tooltip"}))
game.tooltip.deactivate()

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