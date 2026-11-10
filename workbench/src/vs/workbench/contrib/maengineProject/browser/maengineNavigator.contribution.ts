/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MAEngine contributors. All rights reserved.
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

export const MAENGINE_VIEW_CONTAINER_ID = 'workbench.view.maengine.project';

const projectViewIcon = registerIcon('maengine-project-view-icon', Codicon.project, localize('projectViewIcon', "View icon of the MAEngine engineering project sidebar."));

const container = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: MAENGINE_VIEW_CONTAINER_ID,
	title: localize2('project', "MAEngine"),
	icon: projectViewIcon,
	order: 0,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [MAENGINE_VIEW_CONTAINER_ID, { 'merge-view-with-container': true } as any]),
	storageId: 'workbench.view.maengine.project.state',
	hideIfEmpty: false,
}, ViewContainerLocation.Sidebar, { isDefault: true });

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: 'workbench.view.maengine.navigator',
	name: localize2('navigator', "Mechanical Analysis Engine (MAE)"),
	container,
	ctorDescriptor: new SyncDescriptor(ProjectNavigatorView),
	canToggleVisibility: false,
	canMoveView: true,
	order: 0,
	collapsed: false,
}], container);
