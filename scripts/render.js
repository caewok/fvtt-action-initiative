/* globals
Hooks,
SETTINGS,
renderTemplate
*/
"use strict";

import { Settings } from "./settings.js";
import { MODULE_ID } from "./const.js";

Hooks.on("renderCombatTrackerConfig", renderCombatTrackerConfigHook);

async function renderCombatTrackerConfigHook(app, html, data) {
  const template = `modules/${MODULE_ID}/templates/action-initiative-combat-tracker-config.html`;
  const myHTML = await renderTemplate(template, data);
  html.find(".form-group").last().after(myHTML);
  app.setPosition(app.position);
}

export async function _updateObjectCombatTrackerConfig(wrapped, event, formData) {
  await Settings.set(Settings.KEYS.GROUP_ACTORS, formData.groupActors);
  return wrapped(event, formData);
}

export async function getDataCombatTrackerConfig(wrapped, options={}) {
  const data = await wrapped(options);
  data.groupActors = Settings.get(Settings.KEYS.GROUP_ACTORS);
  return data;
}
