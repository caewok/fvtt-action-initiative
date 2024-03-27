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