/* globals
foundry,
game
*/
"use strict";

import { Patcher } from "./Patcher.js";

import { PATCHES as PATCHES_Actor } from "./Actor.js";
import { PATCHES as PATCHES_Actor5e } from "./Actor5e.js";
import { PATCHES as PATCHES_Combat } from "./Combat.js";
import { PATCHES as PATCHES_Combatant } from "./Combatant.js";
import { PATCHES as PATCHES_CombatTrackerConfig } from "./CombatTrackerConfig.js";
import { PATCHES as PATCHES_ClientSettings } from "./ModuleSettingsAbstract.js";
import { PATCHES as PATCHES_CombatTracker } from "./CombatTracker.js";

const PATCHES = {
  "CONFIG.Actor.documentClass": PATCHES_Actor,
  "dnd5e.documents.Actor5e": PATCHES_Actor5e,
  ClientSettings: PATCHES_ClientSettings,
  "CONFIG.Combat.documentClass": PATCHES_Combat,
  "CONFIG.Combatant.documentClass": PATCHES_Combatant,
  "foundry.applications.apps.CombatTrackerConfig": PATCHES_CombatTrackerConfig,
  "foundry.applications.sidebar.tabs.CombatTracker": PATCHES_CombatTracker,
};

export const PATCHER = new Patcher();
PATCHER.addPatchesFromRegistrationObject(PATCHES);

export function initializePatching() {
  PATCHER.registerGroup("BASIC");
  if ( game.system.id === "dnd5e" ) PATCHER.registerGroup("DND5E");
}
