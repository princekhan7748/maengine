/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MAEngine contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { $, append, clearNode } from '../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ScrollbarVisibility } from '../../../../base/common/scrollable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorOpenContext } from '../../../common/editor.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { IMAEngineProjectService, UnitSystem } from '../../../services/maengineProject/common/maengineProject.js';
import { StartEditorInput } from './startEditorInput.js';

export class StartEditor extends EditorPane {

	private container!: HTMLElement;
	private scrollable!: DomScrollableElement;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IInstantiationService instantiationService: IInstantiationService,
		@INotificationService private readonly notificationService: INotificationService,
		@ICommandService private readonly commandService: ICommandService,
		@IMAEngineProjectService private readonly projectService: IMAEngineProjectService,
	) {
		super(StartEditorInput.EDITOR_ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.maengine-start-page');
		this.container.style.cssText = 'height: 100%; width: 100%; overflow: auto; padding: 40px; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		this.scrollable = this._register(new DomScrollableElement(this.container, { horizontal: ScrollbarVisibility.Hidden, vertical: ScrollbarVisibility.Auto }));
		append(parent, this.scrollable.getDomNode());
	}

	override async setInput(input: StartEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.render();
	}

	private render(): void {
		clearNode(this.container);

		const wrapper = append(this.container, $('.start-wrapper'));
		wrapper.style.cssText = 'max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 32px;';

		// Header Banner
		const header = append(wrapper, $('.start-header'));
		header.style.cssText = 'border-bottom: 1px solid var(--vscode-widget-border, #333); padding-bottom: 24px;';

		const titleRow = append(header, $('.title-row'));
		titleRow.style.cssText = 'display: flex; align-items: center; gap: 16px; margin-bottom: 8px;';

		const logo = append(titleRow, $('div.logo-icon'));
		logo.style.cssText = 'width: 48px; height: 48px; border-radius: 8px; background: linear-gradient(135deg, #0984e3, #00cec9); display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 20px; letter-spacing: -0.5px;';
		logo.textContent = 'MAE';

		const title = append(titleRow, $('h1'));
		title.style.cssText = 'margin: 0; font-size: 32px; font-weight: 600; color: var(--vscode-foreground);';
		title.textContent = 'MAEngine';

		const subtitle = append(header, $('p'));
		subtitle.style.cssText = 'margin: 0; font-size: 15px; color: var(--vscode-descriptionForeground, #888);';
		subtitle.textContent = localize('start.subtitle', "Mechanical Analysis Engine: 3D CAD Parametrics, Gmsh Meshing, CalculiX FEA & Post-Processing");

		// Grid Layout for Actions
		const grid = append(wrapper, $('.start-grid'));
		grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 24px;';

		// Left Card: New Project
		const newCard = append(grid, $('.start-card'));
		newCard.style.cssText = 'background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border, #333); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 16px;';

		const newTitle = append(newCard, $('h2'));
		newTitle.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: var(--vscode-foreground);';
		newTitle.textContent = localize('start.newProject', "New Simulation Project");

		const nameLabel = append(newCard, $('label'));
		nameLabel.style.cssText = 'font-size: 12px; font-weight: 500; color: var(--vscode-descriptionForeground);';
		nameLabel.textContent = localize('start.projectName', "Project Name");

		const nameInput = append(newCard, $('input')) as HTMLInputElement;
		nameInput.style.cssText = 'background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 8px 12px; font-size: 14px;';
		nameInput.value = 'Cantilever_FEA_Study';

		const unitLabel = append(newCard, $('label'));
		unitLabel.style.cssText = 'font-size: 12px; font-weight: 500; color: var(--vscode-descriptionForeground);';
		unitLabel.textContent = localize('start.unitSystem', "Standard Unit System");

		const unitSelect = append(newCard, $('select')) as HTMLSelectElement;
		unitSelect.style.cssText = 'background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border, #444); border-radius: 4px; padding: 8px 12px; font-size: 14px;';
		
		const u1 = append(unitSelect, $('option')) as HTMLOptionElement;
		u1.value = 'mm_N_MPa_tonne_s';
		u1.textContent = 'mm, N, MPa, tonne, s (Standard Mechanical CAE)';
		u1.selected = true;

		const u2 = append(unitSelect, $('option')) as HTMLOptionElement;
		u2.value = 'm_N_Pa_kg_s';
		u2.textContent = 'm, N, Pa, kg, s (Standard SI)';

		const u3 = append(unitSelect, $('option')) as HTMLOptionElement;
		u3.value = 'in_lbf_psi';
		u3.textContent = 'in, lbf, psi, slug, s (US Customary)';

		const createBtn = append(newCard, $('button')) as HTMLButtonElement;
		createBtn.style.cssText = 'background: var(--vscode-button-background, #0984e3); color: var(--vscode-button-foreground, #fff); border: none; border-radius: 4px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px;';
		createBtn.textContent = localize('start.createButton', "Create Project Workspace");
		createBtn.onclick = async () => {
			const name = nameInput.value.trim() || 'New_Simulation_Project';
			const units = unitSelect.value as UnitSystem;
			try {
				// Create inside user's MyDocuments/MAEngine Projects
				this.commandService.executeCommand('maengine.project.create', { name, units });
			} catch (e) {
				this.notificationService.error(String(e));
			}
		};

		// Right Card: Open & Benchmarks
		const openCard = append(grid, $('.start-card'));
		openCard.style.cssText = 'background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border, #333); border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 16px;';

		const openTitle = append(openCard, $('h2'));
		openTitle.style.cssText = 'margin: 0; font-size: 18px; font-weight: 600; color: var(--vscode-foreground);';
		openTitle.textContent = localize('start.openProject', "Open Existing Project");

		const openDesc = append(openCard, $('p'));
		openDesc.style.cssText = 'margin: 0; font-size: 13px; color: var(--vscode-descriptionForeground);';
		openDesc.textContent = localize('start.openDesc', "Open any folder containing a .maengine simulation manifest.");

		const openBtn = append(openCard, $('button')) as HTMLButtonElement;
		openBtn.style.cssText = 'background: var(--vscode-button-secondaryBackground, #333); color: var(--vscode-button-secondaryForeground, #fff); border: none; border-radius: 4px; padding: 10px 16px; font-size: 14px; font-weight: 500; cursor: pointer;';
		openBtn.textContent = localize('start.openFolderBtn', "Browse Project Folder...");
		openBtn.onclick = () => {
			this.commandService.executeCommand('workbench.action.files.openFolder');
		};

		// Benchmarks Section
		const benchmarkTitle = append(openCard, $('h3'));
		benchmarkTitle.style.cssText = 'margin: 12px 0 0 0; font-size: 14px; font-weight: 600; color: var(--vscode-foreground);';
		benchmarkTitle.textContent = localize('start.sampleBenchmarks', "Pre-configured Benchmarks");

		const bmList = append(openCard, $('div.benchmark-list'));
		bmList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

		const benchmarks = [
			{ title: 'Cantilever Beam Static Stress', desc: 'TET10 high-order mesh with tip load and fixed root' },
			{ title: 'Square Plate Eigenfrequency Vibration', desc: 'Lanczos modal extraction with first 10 mode shapes' },
			{ title: 'Thermal Conduction Block', desc: 'Steady-state temperature distribution under flux' }
		];

		for (const bm of benchmarks) {
			const item = append(bmList, $('div.bm-item'));
			item.style.cssText = 'padding: 8px 12px; border-radius: 4px; border: 1px solid var(--vscode-widget-border, #444); cursor: pointer; display: flex; flex-direction: column; gap: 2px; transition: background 0.2s;';
			item.onmouseenter = () => item.style.background = 'var(--vscode-list-hoverBackground, rgba(255,255,255,0.05))';
			item.onmouseleave = () => item.style.background = 'transparent';
			item.onclick = () => {
				this.commandService.executeCommand('maengine.project.loadBenchmark', bm.title);
			};

			const itemTitle = append(item, $('span'));
			itemTitle.style.cssText = 'font-size: 13px; font-weight: 500; color: var(--vscode-textLink-foreground, #3498db);';
			itemTitle.textContent = bm.title;

			const itemDesc = append(item, $('span'));
			itemDesc.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground);';
			itemDesc.textContent = bm.desc;
		}

		// Parts Workflow Bar at the bottom
		const workflowSec = append(wrapper, $('.workflow-overview'));
		workflowSec.style.cssText = 'border-top: 1px solid var(--vscode-widget-border, #333); padding-top: 24px;';

		const wfTitle = append(workflowSec, $('h3'));
		wfTitle.style.cssText = 'margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: var(--vscode-foreground);';
		wfTitle.textContent = localize('start.workflowParts', "MAEngine Mechanical Analysis Workflow");

		const wfGrid = append(workflowSec, $('.wf-grid'));
		wfGrid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;';

		const parts = [
			{ no: '01', name: 'Project Settings' },
			{ no: '02', name: 'Geometry & CAD' },
			{ no: '03', name: 'Materials' },
			{ no: '04', name: '3D Conformal Mesh' },
			{ no: '05', name: 'Physics & BCs' },
			{ no: '06', name: 'Solver Manager' },
			{ no: '07', name: 'Analysis Results' },
			{ no: '08', name: 'Marketplace Hub' },
			{ no: '09', name: 'Reports & Exports' }
		];

		for (const p of parts) {
			const cell = append(wfGrid, $('.wf-cell'));
			cell.style.cssText = 'background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border, #333); border-radius: 6px; padding: 12px; display: flex; align-items: center; gap: 10px;';
			
			const num = append(cell, $('span'));
			num.style.cssText = 'font-size: 12px; font-weight: bold; color: #00cec9;';
			num.textContent = p.no;

			const name = append(cell, $('span'));
			name.style.cssText = 'font-size: 12px; font-weight: 500; color: var(--vscode-foreground);';
			name.textContent = p.name;
		}
	}

	override layout(dimension: { width: number; height: number }): void {
		this.scrollable.getDomNode().style.width = `${dimension.width}px`;
		this.scrollable.getDomNode().style.height = `${dimension.height}px`;
		this.scrollable.scanDomNode();
	}
}

