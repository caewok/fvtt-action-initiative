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

const PATCHES = {
  Actor: PATCHES_Actor,
  "dnd5e.documents.Actor5e": PATCHES_Actor5e,
  ClientSettings: PATCHES_ClientSettings,
  Combat: PATCHES_Combat,
  Combatant: PATCHES_Combatant,
  "foundry.applications.apps.CombatTrackerConfig": PATCHES_CombatTrackerConfig,
};

export const PATCHER = new Patcher();
PATCHER.addPatchesFromRegistrationObject(PATCHES);

export function initializePatching() {
  PATCHER.registerGroup("BASIC");

  if ( game.system.id === "dnd5e" ) {
    PATCHER.registerGroup("DND5E");
    if ( foundry.utils.isNewerVersion(game.system.version, "3.0.9") ) {
      PATCHER.registerGroup("DND5E_V3"); // Combatant5e, added in v3.
    }
  }
}
