[![Version (latest)](https://img.shields.io/github/v/release/caewok/fvtt-action-initiative)](https://github.com/caewok/fvtt-action-initiative/releases/latest)
[![Foundry Version](https://img.shields.io/badge/dynamic/json.svg?url=https://github.com/caewok/fvtt-action-initiative/releases/latest/download/module.json&label=Foundry%20Version&query=$.minimumCoreVersion&colorB=blueviolet)](https://github.com/caewok/fvtt-action-initiative/releases/latest)
[![License](https://img.shields.io/github/license/caewok/fvtt-action-initiative)](LICENSE)

![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https://forge-vtt.com/api/bazaar/package/actioninitiative&colorB=4aa94a)
![Latest Release Download Count](https://img.shields.io/github/downloads/caewok/fvtt-action-initiative/latest/module.zip)
![All Downloads](https://img.shields.io/github/downloads/caewok/fvtt-action-initiative/total)

# Action Initiative

Action Initiative implements initiative similar to that of the [Unearthed Arcana Greyhawk Initiative](https://media.wizards.com/2017/dnd/downloads/UAGreyhawkInitiative.pdf).          Combatants declare actions in advance each turn; different actions use different        combinations of die rolls to determine initiative position. Initiative goes from lowest to highest.

To facilitate this, users are presented with a dialog to select among various actions when rolling initiative. A filter dialog is presented to the GM when rolling for multiple combatants.

# Installation

Add this [Manifest URL](https://github.com/caewok/fvtt-action-initiative/releases/latest/download/module.json) in Foundry to install.

## Dependencies
- [libWrapper](https://github.com/ruipin/fvtt-lib-wrapper)

## Conflicts
- Modules that change the combat tracker or otherwise modify the initiative sequence are likely to conflict with this module.

# Systems

For the moment, this is only tested in dnd5e and likely will not work with other systems. But if there is interest, I can work on making it more generic to work with other systems. The various settings and the `CONFIG.actioninitiative` provides the foundation for use with other systems.

If you would like your system supported, please submit an issue in the git.

# Usage

## PCs

When a user hits the initiative button in the Combat Tracker, a dialog requests the user to select one or more actions. The "Other Action" and "Bonus Action" allow the user to enter an arbitrary dice formula, or leave the existing default.

After selections are made, the chat message lists actions selected. Hovering over the initiative number in the Combat Tracker will also list actions selected.

The user can also choose to add to or reset initiative, by using the buttons in the Combat Tracker.

## GM

The GM can roll initiative for any combatant as normal. In addition, the "RollAll" and "RollNPCs" buttons will present the GM with a filter dialog, listing combatants and some checkboxes to filter combatants by specific characteristics. After selecting one or more combatants, the GM will be presented with the action selection dialog. Actions will be applied to all selected combatants.

The GM can change a setting in the Combat Tracker configuration to group by actor or not. When grouping by actor, combatants that share the same actor roll as one.

# Settings and Variants

The settings provide a variety of configurations.

## Basic, Weapon Damage, Weapon Type

The Basic variant allows the user to select between basic actions. Weapon damage uses the base damage die of the weapon for melee or ranged attacks. The action selection dialog will include weapon selection, based on available weapons to the combatant. Weapon type uses weapon characteristics (e.g., light, finesse, heavy).

## Spell Level

If enabled, the user must select a spell level when selecting Cast a Spell action. Initiative die formula then will vary by level.

## Advanced Configuration

The advanced configuration allows the GM to define specific dice formula to use for each action, each spell level, and each weapon characteristic. If not defined, the default (in gray) will be used. Actions with 0 will be ignored.

## Configs

More specialized configurations are available at `CONFIG.actioninitiative`. These define where to find weapon properties, spell levels, etc. for the system.
