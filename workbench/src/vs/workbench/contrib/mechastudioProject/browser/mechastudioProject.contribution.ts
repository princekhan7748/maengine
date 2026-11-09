/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkspaceContextService, WorkbenchState } from '../../../../platform/workspace/common/workspace.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IMechastudioProjectService, UnitSystem } from '../../../services/mechastudioProject/common/mechastudioProject.js';
import { StartEditor } from './startEditor.js';
import { StartEditorInput } from './startEditorInput.js';

const category = localize2('mechastudio.category', "MechaStudio");

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(StartEditor, StartEditorInput.EDITOR_ID, localize('mechastudioStartEditor', "MechaStudio Start")),
	[new SyncDescriptor(StartEditorInput)]
);

export function openStartPage(editorService: IEditorService): Promise<unknown> {
	return editorService.openEditor(StartEditorInput.instance, { pinned: true });
}

class StartWindowContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.mechastudio.startWindow';

	constructor(
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IEditorService private readonly editorService: IEditorService,
		@IMechastudioProjectService private readonly projectService: IMechastudioProjectService,
	) {
		super();
		void this.showIfNoProject();
	}

	private async showIfNoProject(): Promise<void> {
		const folder = this.contextService.getWorkbenchState() === WorkbenchState.EMPTY ? undefined : this.contextService.getWorkspace().folders[0]?.uri;
		if (!folder || !await this.projectService.findProject(folder)) {
			await openStartPage(this.editorService);
		}
	}
}

registerWorkbenchContribution2(StartWindowContribution.ID, StartWindowContribution, WorkbenchPhase.AfterRestored);

registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'mechastudio.project.showStart',
			title: localize2('mechastudio.showStart', "Show MechaStudio Start Window"),
			category,
			f1: true,
		});
	}

	override run(accessor: ServicesAccessor): unknown {
		return openStartPage(accessor.get(IEditorService));
	}
});

CommandsRegistry.registerCommand('mechastudio.project.create', async (accessor: ServicesAccessor, args?: { name: string; units: UnitSystem }) => {
	const projectService = accessor.get(IMechastudioProjectService);
	const commandService = accessor.get(ICommandService);
	const contextService = accessor.get(IWorkspaceContextService);

	const name = args?.name || 'New_Simulation_Project';
	const units = args?.units || 'mm_N_MPa_tonne_s';

	// Default target directory
	const root = contextService.getWorkspace().folders[0]?.uri || URI.file('C:\\Users\\rashe\\Documents\\MechaStudio Projects');
	const project = await projectService.createProject(root, name, units);
	await commandService.executeCommand('vscode.openFolder', project.root);
});
