/* globals
renderTemplate
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for CombatTrackerConfig

import { MODULE_ID } from "./const.js";
import { Settings } from "./settings.js";

export const PATCHES = {};
PATCHES.BASIC = {};

// ----- NOTE: Hooks -----

/**
 * Hook renderCombatTracker to insert the tracker template.
 */
async function renderCombatTrackerConfig(app, html, data) {
  // Add handler on close to store the group actors setting.
  const oldHandler = app.options.form.handler;
  app.options.form.handler = async (event, form, submitData) => {
    await saveSettings(event, form, submitData);
    await oldHandler(event, form, submitData);
  }

  // Add the data for the new group actor toggle.
  data.groupActors = Settings.get(Settings.KEYS.GROUP_ACTORS);

  // Add the toggle to the html.
  const template = `modules/${MODULE_ID}/templates/action-initiative-combat-tracker-config.html`;
  const myHTML = await renderTemplate(template, data);

  const newFormGroup = document.createElement('div');
  newFormGroup.classList.add('form-group');
  newFormGroup.innerHTML = myHTML;
  const formGroups = html.getElementsByClassName("form-group");
  formGroups[formGroups.length -1].appendChild(newFormGroup);

  // html.find(".form-group").last().after(myHTML); // ApplicationV1
  app.setPosition(app.position);
}

/**
 * Called on application submission. Update the group actors.
 */
async function saveSettings(event, form, submitData) {
  await Settings.set(Settings.KEYS.GROUP_ACTORS, submitData.groupActors);
}

PATCHES.BASIC.HOOKS = { renderCombatTrackerConfig };
