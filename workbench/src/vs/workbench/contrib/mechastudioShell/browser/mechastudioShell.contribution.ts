/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { localize, localize2 } from '../../../../nls.js';
import { Extensions as ConfigurationExtensions, ConfigurationScope, IConfigurationRegistry } from '../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../platform/registry/common/platform.js';

export const DEVELOPER_MODE_SETTING = 'mechastudio.developerMode';

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
	id: 'maengineShell',
	title: localize('maengine.configurationTitle', "MAEngine"),
	type: 'object',
	properties: {
		[DEVELOPER_MODE_SETTING]: {
			type: 'boolean',
			default: false,
			scope: ConfigurationScope.APPLICATION,
			markdownDescription: localize('maengine.developerMode', "Shows the developer code-editor features of the workbench (source control, debug, terminal). When off, MAEngine presents an engineering-first desktop interface."),
		},
	},
});

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerDefaultConfigurations([{
	overrides: {
		'workbench.startupEditor': 'none',
		'workbench.welcomePage.walkthroughs.openOnInstall': false,
		'workbench.welcomePage.experimentalOnboarding': false,
		'security.workspace.trust.enabled': false,
		'window.menuBarVisibility': 'compact',
		'window.commandCenter': true,
		'workbench.activityBar.location': 'top',
		'workbench.editor.tabSizing': 'shrink',
		'files.associations': { '*.maengine': 'json', '*.mechastudio': 'json' },
	},
}]);

