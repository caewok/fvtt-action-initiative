## 0.3.1
Correct listing of weapon types and properties in the config menu. Closes issue #13.
Correct spell selection so that it does not alway report "Cantrip." Closes issue #14.

## 0.3.0
Switch to Foundry v12 DialogV2.
Refactor to use helper classes to handle initiative for combatants, actors, and to handle weapon categorization for actors. Most properties that were standalone in `CONFIG.actioninitiative` are now in classes in `CONFIG.actioninitiative`
- `ActorInitiativeHandler`: Instantiated at `actor.actioninitiative.initiativeHandler`.
- `WeaponsHandler`: Instantiated at `actor.actioninitiative.WeaponsHandler`.
- `CombatantInitiativeHandler`: Instantiated at `combatant.actioninitiative.initiativeHandler`.

Similarly, dialog classes are now stored at `CONFIG.actioninitiative`:
- `ActionSelectionDialog`: Actions for 1+ combatants.
- `WeaponSelectionDialog`: Weapon selections for 1+ combatants.
- `MultipleCombatantDialog`: Filters to select 1+ combatants.

Each of these classes can be subclassed for use with different systems. See A5E and DND5E subclasses set in `module.js`.

In the initiative dialogs, a separate weapon selection dialog is presented after action selection, only as needed. If the actor has equipped weapons, only those weapons will be considered. Weapon selection will not be presented if the actor has 0 or 1 weapons for melee/ranged, respectively.

Removed some unnecessary patches for dnd5e and simplified the initiative workflow.
Added Level Up (a5e) compatibility. Closes #9.
Refactoring address #12, #10.

## 0.2.0
Foundry v12 combatibility. Address warnings re deprecated utility method calls. Address change from `getCombatant` to `getCombatants`. Requires v12, because of the deprecated methods.

## 0.1.4
Fix for weapon properties not properly accounted for in the roll. Closes #7.

## 0.1.3
Fix for the initiative roll defaulting to 1d20 in dnd5e v3.1 or higher. Closes #6.

## 0.1.2
Fix for combatant dialog not displaying properly. Closes issue #4. Thanks @DreamyNiri for the PR!
Fix for token weapons not getting picked up in dnd5e version 3.
Fix for weapon property localization in dnd5e version 3.
Reorganize the files to take advantage of Patcher and ModuleSettingsAbstract. Add a separate config file to handle the various config settings.

## 0.1.1
Add a checkbox next to Combatants in the multi-combatant GM selection to select all combatants. Closes issue #2. Sync filter checkboxes so that selecting or deselecting combatants changes the checked filter boxes accordingly.

Correct rolling for "bonus" and "other" action selections, which were using the default without regard to the settings. Closes issue #3. Correct setting description for weapon type die formula, which should correspond to the weapon type setting (not the weapon damage setting, which uses actual weapon damage dice). If custom formula entered into the "bonus" and "other" action selections, check the corresponding box automatically.

## 0.1.0
Updated for v11 and dnd5e 2.2.1.

## 0.0.1

Initial release.