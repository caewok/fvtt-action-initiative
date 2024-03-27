/* globals
renderTemplate
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for CombatTrackerConfig

import { MODULE_ID } from "./const.js";
import { Settings } from "./settings.js";

const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Hooks -----

/**
 * Hook renderCombatTracker to insert the tracker template.
 */
async function renderCombatTrackerConfigHook(app, html, data) {
  const template = `modules/${MODULE_ID}/templates/action-initiative-combat-tracker-config.html`;
  const myHTML = await renderTemplate(template, data);
  html.find(".form-group").last().after(myHTML);
  app.setPosition(app.position);
}

PATCHES.BASIC.HOOKS = { renderCombatTrackerConfig: renderCombatTrackerConfigHook };

// ----- NOTE: WRAPS -----

/**
 * Wrap CombatTrackerConfig.prototype._updateObject
 * Update the actor groups.
 */
async function _updateObject(wrapped, event, formData) {
  await Settings.set(Settings.KEYS.GROUP_ACTORS, formData.groupActors);
  return wrapped(event, formData);
}

/**
 * Wrap CombatTrackerConfig.prototype.getData
 * Update the actor groups.
 */
async function getData(wrapped, options={}) {
  const data = await wrapped(options);
  data.groupActors = Settings.get(Settings.KEYS.GROUP_ACTORS);
  return data;
}

PATCHES.BASIC.WRAPS = { _updateObject, getData };
