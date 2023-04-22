/* globals
Hooks,
game,
showdown,
Dialog
*/
"use strict";

import { MODULE_ID } from "./const.js";
import { SETTINGS, getSetting, setSetting } from "./settings.js";
const CHANGELOG = SETTINGS.CHANGELOG;

// From Perfect Vision
// https://github.com/dev7355608/perfect-vision/blob/cdf03ae7e4b5969efaee8e742bf9dd11d18ba8b7/scripts/changelog.js


Hooks.once("ready", () => {
  if (!game.user.isGM) {
    return;
  }

  game.settings.register(
    MODULE_ID,
    CHANGELOG,
    {
      scope: "client",
      config: false,
      type: Number,
      default: 0
    }
  );

  new ChangelogBuilder()
    .addEntry({
      version: "0.0.1",
      title: "Welcome to Action Initiative!",
      body: `\
          Action Initiative implements initiative similar to that of the [Unearthed Arcana
          Greyhawk Initiative](https://media.wizards.com/2017/dnd/downloads/UAGreyhawkInitiative.pdf).


          Combatants declare actions in advance each turn; different actions use different
          combinations of die rolls to determine initiative position. Initiative goes from lowest
          to highest.


          **Plus (+) button**: Once a combatant rolls initiative, the '+' button allows for additional
          actions to be taken and added to their initiative score.


          **Reset button**: A combatant can re-roll initiative completely using the reset button.
          (Given the additional complexity of initiative choices here, it is sometimes preferable to
          re-roll a single combatant rather than everyone.)


          **Settings**: A variety of settings are provided. You can choose to vary initiative by
          spell level as well as weapon damage or weapon properties. A configuration button allows
          you to change default dice rolls for each. Feel free to add an issue to the
          [git repository](https://github.com/caewok/fvtt-action-initiative/issues)
          if you encounter problems or really want a different setting.
          `
    })
    .build()
    ?.render(true);
});


/**
 * Display a dialog with changes; store changes as entries.
 */
class ChangelogBuilder {
  #entries = [];

  addEntry({ version, title = "", body }) {
    this.#entries.push({ version, title, body });
    return this;
  }

  build() {
    const converter = new showdown.Converter();
    const curr = getSetting(CHANGELOG);
    const next = this.#entries.length;
    let content = "";

    if (curr >= next) {
      return;
    }

    for (let [index, { version, title, body }] of this.#entries.entries()) {
      let entry = `<strong>v${version}</strong>${title ? ": " + title : ""}`;

      if (index < curr) {
        entry = `<summary>${entry}</summary>`;
      } else {
        entry = `<h3>${entry}</h3>`;
      }

      let indentation = 0;

      while (body[indentation] === " ") indentation++;

      if (indentation) {
        body = body.replace(new RegExp(`^ {0,${indentation}}`, "gm"), "");
      }

      entry += converter.makeHtml(body);

      if (index < curr) {
        entry = `<details>${entry}</details><hr>`;
      } else if (index === curr) {
        entry += "<hr><hr>";
      }

      content = entry + content;
    }

    return new Dialog({
      title: "Action Initiative: Changelog",
      content,
      buttons: {
        view_documentation: {
          icon: `<i class="fas fa-book"></i>`,
          label: "View documentation",
          callback: () => window.open("https://github.com/caewok/fvtt-action-initiative/blob/master/README.md")
        },
        dont_show_again: {
          icon: `<i class="fas fa-times"></i>`,
          label: "Don't show again",
          callback: () => setSetting(CHANGELOG, next)
        }
      },
      default: "dont_show_again"
    });
  }
}
