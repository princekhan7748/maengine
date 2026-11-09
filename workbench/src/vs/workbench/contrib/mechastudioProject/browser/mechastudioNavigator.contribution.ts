/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { localize, localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { Extensions as ViewExtensions, IViewContainersRegistry, IViewsRegistry, ViewContainerLocation } from '../../../common/views.js';
import { ProjectNavigatorView } from './projectNavigatorView.js';

export const MECHASTUDIO_VIEW_CONTAINER_ID = 'workbench.view.mechastudio.project';

const projectViewIcon = registerIcon('mechastudio-project-view-icon', Codicon.project, localize('projectViewIcon', "View icon of the MechaStudio engineering project sidebar."));

const container = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: MECHASTUDIO_VIEW_CONTAINER_ID,
	title: localize2('project', "MechaStudio"),
	icon: projectViewIcon,
	order: 0,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [MECHASTUDIO_VIEW_CONTAINER_ID, { 'merge-view-with-container': true } as any]),
	storageId: 'workbench.view.mechastudio.project.state',
	hideIfEmpty: false,
}, ViewContainerLocation.Sidebar, { isDefault: true });

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: 'workbench.view.mechastudio.navigator',
	name: localize2('navigator', "Mechanical CAE Workflow"),
	container,
	ctorDescriptor: new SyncDescriptor(ProjectNavigatorView),
	canToggleVisibility: false,
	canMoveView: true,
	order: 0,
	collapsed: false,
}], container);
