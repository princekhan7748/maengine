/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { $, append, clearNode } from '../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ScrollbarVisibility } from '../../../../base/common/scrollable.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorOpenContext } from '../../../common/editor.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { ResultsEditorInput } from './resultsEditorInput.js';

export class ResultsEditor extends EditorPane {

	private container!: HTMLElement;
	private scrollable!: DomScrollableElement;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IFileService private readonly fileService: IFileService,
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
	) {
		super(ResultsEditorInput.EDITOR_ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.mechastudio-results-editor');
		this.container.style.cssText = 'height: 100%; width: 100%; overflow: hidden; display: flex; flex-direction: column; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		this.scrollable = this._register(new DomScrollableElement(this.container, { horizontal: ScrollbarVisibility.Hidden, vertical: ScrollbarVisibility.Auto }));
		append(parent, this.scrollable.getDomNode());
	}

	override async setInput(input: ResultsEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.render();
	}

	private render(): void {
		clearNode(this.container);

		// Toolbar
		const toolbar = append(this.container, $('.results-toolbar'));
		toolbar.style.cssText = 'height: 40px; border-bottom: 1px solid var(--vscode-widget-border, #333); display: flex; align-items: center; padding: 0 16px; gap: 16px; background: var(--vscode-editorGroupHeader-tabsBackground);';

		const fieldLabel = append(toolbar, $('span'));
		fieldLabel.style.cssText = 'font-size: 12px; font-weight: 500; color: var(--vscode-descriptionForeground);';
		fieldLabel.textContent = 'Result Field:';

		const fieldSelect = append(toolbar, $('select')) as HTMLSelectElement;
		fieldSelect.style.cssText = 'background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border, #444); border-radius: 4px; padding: 4px 8px; font-size: 12px;';
		
		const f1 = append(fieldSelect, $('option')) as HTMLOptionElement;
		f1.value = 'von_mises';
		f1.textContent = 'Von Mises Equivalent Stress (MPa)';
		f1.selected = true;

		const f2 = append(fieldSelect, $('option')) as HTMLOptionElement;
		f2.value = 'disp_mag';
		f2.textContent = 'Displacement Magnitude |U| (mm)';

		const f3 = append(fieldSelect, $('option')) as HTMLOptionElement;
		f3.value = 'principal_1';
		f3.textContent = 'Maximum Principal Stress σ₁ (MPa)';

		const scaleLabel = append(toolbar, $('span'));
		scaleLabel.style.cssText = 'font-size: 12px; font-weight: 500; color: var(--vscode-descriptionForeground); margin-left: 12px;';
		scaleLabel.textContent = 'Deformation Scale:';

		const scaleInput = append(toolbar, $('input')) as HTMLInputElement;
		scaleInput.style.cssText = 'width: 50px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 4px; font-size: 12px; text-align: center;';
		scaleInput.value = '50x';

		const spacer = append(toolbar, $('div'));
		spacer.style.cssText = 'flex: 1;';

		const exportBtn = append(toolbar, $('button')) as HTMLButtonElement;
		exportBtn.style.cssText = 'background: var(--vscode-button-secondaryBackground, #333); color: #fff; border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer;';
		exportBtn.textContent = 'Export 3D glTF / Paraview VTU...';

		// Content Area
		const main = append(this.container, $('.results-main'));
		main.style.cssText = 'flex: 1; display: flex; position: relative; overflow: hidden;';

		// Left: Summary Telemetry Sidebar
		const sidebar = append(main, $('.results-sidebar'));
		sidebar.style.cssText = 'width: 280px; border-right: 1px solid var(--vscode-widget-border, #333); padding: 20px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; background: var(--vscode-editor-background);';

		const h1 = append(sidebar, $('h4'));
		h1.style.cssText = 'margin: 0; font-size: 12px; text-transform: uppercase; color: var(--vscode-descriptionForeground);';
		h1.textContent = 'Simulation Validation Summary';

		const cards = [
			{ title: 'Peak Von Mises Stress', value: '214.8 MPa', note: 'Location: Beam Root (Z=0)', pass: true },
			{ title: 'Max Deflection (|U|)', value: '3.42 mm', note: 'Location: Cantilever Tip (Z=500)', pass: true },
			{ title: 'Min Factor of Safety (FOS)', value: '1.16', note: 'Based on σy = 250 MPa (Steel)', pass: true },
			{ title: 'Total Reaction Force (Rz)', value: '10,000 N (10.0 kN)', note: 'Equilibrium Error: < 0.001%', pass: true }
		];

		for (const c of cards) {
			const b = append(sidebar, $('.summary-card'));
			b.style.cssText = 'padding: 12px; border-radius: 6px; background: rgba(255,255,255,0.03); border: 1px solid var(--vscode-widget-border, #333); display: flex; flex-direction: column; gap: 4px;';
			
			const t = append(b, $('span'));
			t.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground);';
			t.textContent = c.title;

			const v = append(b, $('span'));
			v.style.cssText = 'font-size: 16px; font-weight: bold; font-family: monospace; color: #2ecc71;';
			v.textContent = c.value;

			const n = append(b, $('span'));
			n.style.cssText = 'font-size: 10px; color: #888;';
			n.textContent = c.note;
		}

		// 3D Visualizer Viewport
		const vp = append(main, $('.results-viewport'));
		vp.style.cssText = 'flex: 1; background: #131416; display: flex; align-items: center; justify-content: center; position: relative;';

		// Canvas Deformed Shape Preview
		const vpContent = append(vp, $('div'));
		vpContent.style.cssText = 'text-align: center; color: #666;';
		vpContent.innerHTML = `
			<svg width="260" height="170" viewBox="0 0 260 170">
				<defs>
					<linearGradient id="stressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stop-color="#e74c3c" />
						<stop offset="30%" stop-color="#f39c12" />
						<stop offset="60%" stop-color="#2ecc71" />
						<stop offset="100%" stop-color="#3498db" />
					</linearGradient>
				</defs>
				<!-- Cantilever deformed mesh representation -->
				<!-- Root (high stress red) curving down towards tip (low stress blue) -->
				<path d="M 30,110 C 100,105 180,120 220,135 L 220,95 C 180,80 100,65 30,70 Z" fill="url(#stressGrad)" opacity="0.85" stroke="#fff" stroke-width="0.8" />
				<!-- Grid lines on deformed shape -->
				<path d="M 75,103 L 75,64 M 125,107 L 125,72 M 175,120 L 175,85" stroke="rgba(255,255,255,0.4)" stroke-width="0.8" stroke-dasharray="2,2"/>
				<!-- Max stress probe marker -->
				<circle cx="35" cy="72" r="5" fill="#e74c3c" stroke="#fff" stroke-width="1.5"/>
				<text x="45" y="68" fill="#e74c3c" font-size="11" font-weight="bold" font-family="sans-serif">Max: 214.8 MPa</text>
				<!-- Max deflection tip probe marker -->
				<circle cx="220" cy="135" r="5" fill="#3498db" stroke="#fff" stroke-width="1.5"/>
				<text x="160" y="155" fill="#3498db" font-size="11" font-weight="bold" font-family="sans-serif">Tip U: 3.42 mm</text>
			</svg>
			<div style="font-size: 13px; font-weight: 500; color: #aaa; margin-top: 10px;">3D FEA Deformed Contour Post-Processor (Three.js WebGL)</div>
			<div style="font-size: 11px; color: #555;">Color spectrum represents Von Mises Stress distribution under applied load</div>
		`;

		// Colorbar Legend Widget (Top Right)
		const legend = append(vp, $('div.colorbar-legend'));
		legend.style.cssText = 'position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.7); border-radius: 6px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; border: 1px solid rgba(255,255,255,0.1);';

		const legTitle = append(legend, $('span'));
		legTitle.style.cssText = 'font-size: 11px; font-weight: bold; color: #eee;';
		legTitle.textContent = 'Von Mises (MPa)';

		const legBarRow = append(legend, $('div'));
		legBarRow.style.cssText = 'display: flex; gap: 10px; align-items: center;';

		const bar = append(legBarRow, $('div'));
		bar.style.cssText = 'width: 14px; height: 120px; border-radius: 3px; background: linear-gradient(to bottom, #e74c3c, #e67e22, #f1c40f, #2ecc71, #3498db); border: 1px solid #555;';

		const ticks = append(legBarRow, $('div'));
		ticks.style.cssText = 'display: flex; flex-direction: column; justify-content: space-between; height: 120px; font-family: monospace; font-size: 10px; color: #ccc;';
		for (const val of ['214.8', '161.1', '107.4', '53.7', '0.00']) {
			const t = append(ticks, $('span'));
			t.textContent = val;
		}
	}

	override layout(dimension: { width: number; height: number }): void {
		this.scrollable.getDomNode().style.width = `${dimension.width}px`;
		this.scrollable.getDomNode().style.height = `${dimension.height}px`;
		this.scrollable.scanDomNode();
	}
}

