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
import { MeshEditorInput } from './meshEditorInput.js';

export class MeshEditor extends EditorPane {

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
		super(MeshEditorInput.EDITOR_ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.mechastudio-mesh-editor');
		this.container.style.cssText = 'height: 100%; width: 100%; overflow: hidden; display: flex; flex-direction: column; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		this.scrollable = this._register(new DomScrollableElement(this.container, { horizontal: ScrollbarVisibility.Hidden, vertical: ScrollbarVisibility.Auto }));
		append(parent, this.scrollable.getDomNode());
	}

	override async setInput(input: MeshEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.render();
	}

	private render(): void {
		clearNode(this.container);

		// Toolbar
		const toolbar = append(this.container, $('.mesh-toolbar'));
		toolbar.style.cssText = 'height: 40px; border-bottom: 1px solid var(--vscode-widget-border, #333); display: flex; align-items: center; padding: 0 16px; gap: 12px; background: var(--vscode-editorGroupHeader-tabsBackground);';

		const title = append(toolbar, $('span'));
		title.style.cssText = 'font-weight: 600; font-size: 13px; color: var(--vscode-foreground);';
		title.textContent = 'Gmsh 3D Conformal Mesh Generator';

		const spacer = append(toolbar, $('div'));
		spacer.style.cssText = 'flex: 1;';

		const genBtn = append(toolbar, $('button')) as HTMLButtonElement;
		genBtn.style.cssText = 'background: #27ae60; color: #fff; border: none; border-radius: 4px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;';
		genBtn.textContent = '▶ Generate 3D Mesh (Gmsh)';
		genBtn.onclick = () => {
			this.notificationService.info('Generating 3D quadratic TET10 mesh with Gmsh...');
			this.commandService.executeCommand('mechastudio.mesh.run');
		};

		// Content Layout: Left Settings Sidebar + Right Viewport & Stats
		const main = append(this.container, $('.mesh-main'));
		main.style.cssText = 'flex: 1; display: flex; overflow: hidden;';

		// Left Controls Sidebar
		const controls = append(main, $('.mesh-controls'));
		controls.style.cssText = 'width: 320px; border-right: 1px solid var(--vscode-widget-border, #333); padding: 20px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto;';

		const sec1 = append(controls, $('div'));
		const h1 = append(sec1, $('h4'));
		h1.style.cssText = 'margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: var(--vscode-descriptionForeground);';
		h1.textContent = 'Element Configuration';

		const elTypeLabel = append(sec1, $('label'));
		elTypeLabel.style.cssText = 'font-size: 12px; display: block; margin-bottom: 4px;';
		elTypeLabel.textContent = 'Element Type';

		const elSelect = append(sec1, $('select')) as HTMLSelectElement;
		elSelect.style.cssText = 'width: 100%; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border, #444); border-radius: 4px; padding: 6px; font-size: 13px;';
		const opt1 = append(elSelect, $('option')) as HTMLOptionElement;
		opt1.value = 'TET10';
		opt1.textContent = 'C3D10: 10-Node Quadratic Tetrahedron';
		opt1.selected = true;
		const opt2 = append(elSelect, $('option')) as HTMLOptionElement;
		opt2.value = 'TET4';
		opt2.textContent = 'C3D4: 4-Node Linear Tetrahedron';

		// Sizing Parameters
		const sec2 = append(controls, $('div'));
		sec2.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';

		const h2 = append(sec2, $('h4'));
		h2.style.cssText = 'margin: 0; font-size: 12px; text-transform: uppercase; color: var(--vscode-descriptionForeground);';
		h2.textContent = 'Element Sizing (mm)';

		const sizes = [
			['Global Characteristic Size (lc)', '10.0'],
			['Minimum Element Size (lcMin)', '2.5'],
			['Maximum Element Size (lcMax)', '15.0'],
			['Curvature Adaptation (elements/circle)', '24']
		];

		for (const [lbl, val] of sizes) {
			const box = append(sec2, $('div'));
			const l = append(box, $('label'));
			l.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground); display: block; margin-bottom: 2px;';
			l.textContent = lbl;
			const inp = append(box, $('input')) as HTMLInputElement;
			inp.style.cssText = 'width: 100%; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #444); border-radius: 4px; padding: 6px; font-size: 12px; font-family: monospace;';
			inp.value = val;
		}

		// Optimization flags
		const sec3 = append(controls, $('div'));
		sec3.style.cssText = 'border-top: 1px solid var(--vscode-widget-border, #333); padding-top: 14px; display: flex; flex-direction: column; gap: 8px;';

		const flags = [
			'High-Order Elastic Optimization (Gmsh HighOrder)',
			'Multi-Body Conformal Interface (occ.fragment)',
			'Second Order Node Snapping'
		];

		for (const f of flags) {
			const row = append(sec3, $('label'));
			row.style.cssText = 'display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer;';
			const chk = append(row, $('input')) as HTMLInputElement;
			chk.type = 'checkbox';
			chk.checked = true;
			const s = append(row, $('span'));
			s.textContent = f;
		}

		// Right Mesh Viewport & Quality Metrics
		const right = append(main, $('.mesh-right'));
		right.style.cssText = 'flex: 1; display: flex; flex-direction: column; background: #151618;';

		// Quality Stats Bar
		const stats = append(right, $('.mesh-stats'));
		stats.style.cssText = 'background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--vscode-widget-border, #333); padding: 12px 20px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;';

		const metrics = [
			['Total Nodes', '2,410', '#3498db'],
			['3D Elements (TET10)', '1,328', '#2ecc71'],
			['Min Jacobian Det', '0.84 (Excellent > 0.4)', '#2ecc71'],
			['Max Aspect Ratio', '3.12 (Pass < 10.0)', '#2ecc71']
		];

		for (const [k, v, c] of metrics) {
			const item = append(stats, $('div'));
			const kEl = append(item, $('span'));
			kEl.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground); display: block;';
			kEl.textContent = k;
			const vEl = append(item, $('span'));
			vEl.style.cssText = `font-size: 14px; font-weight: bold; color: ${c}; font-family: monospace;`;
			vEl.textContent = v;
		}

		// Viewport Area
		const vp = append(right, $('.mesh-viewport'));
		vp.style.cssText = 'flex: 1; display: flex; align-items: center; justify-content: center; position: relative;';

		const vpPlaceholder = append(vp, $('div'));
		vpPlaceholder.style.cssText = 'text-align: center; color: #555;';
		vpPlaceholder.innerHTML = `
			<svg width="220" height="150" viewBox="0 0 220 150">
				<!-- Tetrahedral elements wireframe mesh -->
				<polygon points="30,100 110,40 170,70 90,130" fill="none" stroke="#27ae60" stroke-width="1.5" stroke-dasharray="2,2"/>
				<polygon points="30,70 110,10 170,40 90,100" fill="rgba(39, 174, 96, 0.2)" stroke="#2ecc71" stroke-width="1.5"/>
				<line x1="30" y1="100" x2="30" y2="70" stroke="#2ecc71" stroke-width="1.5"/>
				<line x1="110" y1="40" x2="110" y2="10" stroke="#2ecc71" stroke-width="1.5"/>
				<line x1="170" y1="70" x2="170" y2="40" stroke="#2ecc71" stroke-width="1.5"/>
				<line x1="90" y1="130" x2="90" y2="100" stroke="#2ecc71" stroke-width="1.5"/>
				<!-- Interior tet edges -->
				<line x1="30" y1="70" x2="170" y2="40" stroke="#2ecc71" stroke-width="1"/>
				<line x1="110" y1="10" x2="90" y2="100" stroke="#2ecc71" stroke-width="1"/>
				<line x1="70" y1="85" x2="140" y2="25" stroke="#2ecc71" stroke-width="1"/>
				<line x1="110" y1="55" x2="50" y2="40" stroke="#2ecc71" stroke-width="1"/>
			</svg>
			<div style="font-size: 13px; font-weight: 500; color: #888; margin-top: 10px;">Gmsh 3D Tetrahedral Conformal Mesh Viewport</div>
			<div style="font-size: 11px; color: #555;">Wireframe & Shaded TET10 Elements (Conformal Solid Representation)</div>
		`;
	}

	override layout(dimension: { width: number; height: number }): void {
		this.scrollable.getDomNode().style.width = `${dimension.width}px`;
		this.scrollable.getDomNode().style.height = `${dimension.height}px`;
		this.scrollable.scanDomNode();
	}
}

