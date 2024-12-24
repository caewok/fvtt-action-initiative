/* globals
Dialog,
Roll
*/
"use strict";

import { Settings } from "./settings.js";

export class ActionInitiativeDialog extends foundry.applications.api.DialogV2 {

  static get defaultOptions() {
    const opts = super.defaultOptions;
    opts.height = "auto";
    return opts;
  }

  /**
   * Activate additional listeners to display/hide spell levels and weapon properties
   * Also monitor for incorrect dice formulae.
   */
  _attachFrameListeners() {
    super._attachFrameListeners();
    this.element.addEventListener("change", this._actionChanged.bind(this));
    this.element.addEventListener("change", this._textBoxChanged.bind(this));

    // html.on("change", ".actioninitiative-actionCheckbox", this._actionChanged.bind(this));
    // html.on("change", ".actioninitiative-actionTextbox", this._textBoxChanged.bind(this));
  }

  _actionChanged(event) {
    let elem;
    const KEYS = Settings.KEYS;
    switch ( event.target.name ) {
      case "MeleeAttack": {
        if ( Settings.get(KEYS.VARIANTS.KEY) === KEYS.VARIANTS.TYPES.BASIC ) break;
        elem = document.getElementById("actioninitiative-sectionWeaponTypeMelee");
        break;
      }

      case "RangedAttack": {
        if ( Settings.get(KEYS.VARIANTS.KEY) === KEYS.VARIANTS.TYPES.BASIC ) break;
        elem = document.getElementById("actioninitiative-sectionWeaponTypeRanged");
        break;
      }

      case "CastSpell": {
        if ( !Settings.get(KEYS.SPELL_LEVELS) ) break;
        elem = document.getElementById("actioninitiative-sectionSpellLevel");
        break;
      }
    }

    if ( elem ) elem.style.display = event.target.checked ? "block" : "none";
  }

  _textBoxChanged(event) {
    const elem = document.getElementById(event.target.name);
    const formula = elem.value;

    // If a formula is added, toggle the checkbox to be on.
    if ( formula !== "" && Roll.validate(formula) ) {
      let checkboxName;
      switch ( elem.name ) {
        case "OtherAction.Text": checkboxName = "OtherAction.Checkbox"; break;
        case "BonusAction.Text": checkboxName = "BonusAction.Checkbox"; break;
      }
      const checkbox = document.getElementById(checkboxName);
      checkbox.checked = true;
    }

    if ( formula === "" || Roll.validate(formula) ) elem.className.replace(" actionInitiativeError", "");
    else elem.className = `${elem.className} actionInitiativeError`;
  }
}
