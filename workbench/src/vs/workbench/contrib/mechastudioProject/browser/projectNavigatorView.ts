/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { $, append, clearNode } from '../../../../base/browser/dom.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewletViewOptions } from '../../../browser/parts/views/viewsViewlet.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IMechastudioProjectService, PROJECT_PARTS } from '../../../services/mechastudioProject/common/mechastudioProject.js';
import { CadEditorInput } from '../../mechastudioCad/browser/cadEditorInput.js';
import { MaterialEditorInput } from '../../mechastudioMaterial/browser/materialEditorInput.js';
import { MeshEditorInput } from '../../mechastudioMesh/browser/meshEditorInput.js';
import { PhysicsEditorInput } from '../../mechastudioPhysics/browser/physicsEditorInput.js';
import { SolverEditorInput } from '../../mechastudioSolver/browser/solverEditorInput.js';
import { ResultsEditorInput } from '../../mechastudioResults/browser/resultsEditorInput.js';
import { MarketplaceEditorInput } from '../../mechastudioMarketplace/browser/marketplaceEditorInput.js';
import { joinPath } from '../../../../base/common/resources.js';

export class ProjectNavigatorView extends ViewPane {

	private container!: HTMLElement;

	constructor(
		options: IViewletViewOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IOpenerService openerService: IOpenerService,
		@ICommandService private readonly commandService: ICommandService,
		@IEditorService private readonly editorService: IEditorService,
		@IMechastudioProjectService private readonly projectService: IMechastudioProjectService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, instantiationService, themeService, openerService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.container = container;
		this.container.style.cssText = 'height: 100%; overflow-y: auto; padding: 12px 8px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		
		this._register(this.projectService.onDidChangeProject(() => this.renderParts()));
		this.renderParts();
	}

	private renderParts(): void {
		clearNode(this.container);

		const project = this.projectService.project;
		
		// Project Name Title Header
		const header = append(this.container, $('.nav-header'));
		header.style.cssText = 'padding: 6px 8px 12px 8px; border-bottom: 1px solid var(--vscode-widget-border, #333); margin-bottom: 8px;';

		const pName = append(header, $('div'));
		pName.style.cssText = 'font-weight: 600; font-size: 13px; color: var(--vscode-foreground);';
		pName.textContent = project ? project.manifest.name : 'MechaStudio Workspace';

		const pSub = append(header, $('div'));
		pSub.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px;';
		pSub.textContent = project ? `Units: ${project.manifest.unitSystem}` : 'Standard Mechanical FEA Workflow';

		// Parts List
		const list = append(this.container, $('.parts-list'));
		list.style.cssText = 'display: flex; flex-direction: column; gap: 4px;';

		const statuses: Record<string, { badge: string; color: string }> = {
			settings: { badge: 'OK', color: '#2ecc71' },
			geometry: { badge: 'CAD Ready', color: '#2ecc71' },
			materials: { badge: '2 Mat', color: '#3498db' },
			mesh: { badge: 'TET10', color: '#e67e22' },
			physics: { badge: 'BCs Set', color: '#2ecc71' },
			solver: { badge: 'CalculiX', color: '#9b59b6' },
			results: { badge: 'Solved', color: '#2ecc71' },
			marketplace: { badge: 'Hub', color: '#0984e3' },
			reports: { badge: 'glTF / VTU', color: '#7f8c8d' },
		};

		for (const part of PROJECT_PARTS) {
			const item = append(list, $('.part-nav-item'));
			item.style.cssText = 'padding: 8px 10px; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: background 0.15s; font-size: 12px;';
			item.onmouseenter = () => item.style.background = 'var(--vscode-list-hoverBackground, rgba(255,255,255,0.06))';
			item.onmouseleave = () => item.style.background = 'transparent';

			const labelSpan = append(item, $('span'));
			labelSpan.style.cssText = 'font-weight: 500; color: var(--vscode-foreground);';
			labelSpan.textContent = `${part.folder}`;

			const stat = statuses[part.id];
			if (stat) {
				const badge = append(item, $('span'));
				badge.style.cssText = `font-size: 10px; padding: 2px 6px; border-radius: 8px; font-weight: 600; background: ${stat.color}22; color: ${stat.color}; border: 1px solid ${stat.color}44;`;
				badge.textContent = stat.badge;
			}

			item.onclick = async () => {
				await this.openPartEditor(part.id);
			};
		}
	}

	private async openPartEditor(partId: string): Promise<void> {
		const project = this.projectService.project;
		const root = project ? project.root : undefined;

		switch (partId) {
			case 'geometry':
				await this.editorService.openEditor(new CadEditorInput(root ? joinPath(root, '02 Geometry', 'geometry.json') : null as any), { pinned: true });
				break;
			case 'materials':
				await this.editorService.openEditor(new MaterialEditorInput(root ? joinPath(root, '03 Materials', 'materials.json') : null as any), { pinned: true });
				break;
			case 'mesh':
				await this.editorService.openEditor(new MeshEditorInput(root ? joinPath(root, '04 Mesh', 'mesh.json') : null as any), { pinned: true });
				break;
			case 'physics':
				await this.editorService.openEditor(new PhysicsEditorInput(root ? joinPath(root, '05 Physics & BCs', 'physics.json') : null as any), { pinned: true });
				break;
			case 'solver':
				await this.editorService.openEditor(new SolverEditorInput(root ? joinPath(root, '06 Solver', 'solver.json') : null as any), { pinned: true });
				break;
			case 'results':
				await this.editorService.openEditor(new ResultsEditorInput(root ? joinPath(root, '07 Results', 'results.json') : null as any), { pinned: true });
				break;
			case 'marketplace':
				await this.editorService.openEditor(new MarketplaceEditorInput(root ? joinPath(root, '08 Marketplace', 'marketplace.json') : null as any), { pinned: true });
				break;
			case 'settings':
				if (root) {
					await this.commandService.executeCommand('vscode.open', joinPath(root, '01 Project Settings', 'project-settings.json'));
				}
				break;
			case 'reports':
				if (root) {
					await this.commandService.executeCommand('vscode.open', joinPath(root, '09 Reports', 'reports.json'));
				}
				break;
		}
	}
}
