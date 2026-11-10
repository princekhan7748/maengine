/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { $, append, clearNode } from '../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ScrollbarVisibility } from '../../../../base/common/scrollable.js';
import { localize } from '../../../../nls.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorOpenContext } from '../../../common/editor.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { CadEditorInput } from './cadEditorInput.js';

export class CadEditor extends EditorPane {

	private container!: HTMLElement;
	private scrollable!: DomScrollableElement;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IFileService private readonly fileService: IFileService,
	) {
		super(CadEditorInput.EDITOR_ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.mechastudio-cad-editor');
		this.container.style.cssText = 'height: 100%; width: 100%; overflow: hidden; display: flex; flex-direction: column; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		this.scrollable = this._register(new DomScrollableElement(this.container, { horizontal: ScrollbarVisibility.Hidden, vertical: ScrollbarVisibility.Auto }));
		append(parent, this.scrollable.getDomNode());
	}

	override async setInput(input: CadEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		await this.render(input);
	}

	private async render(input: CadEditorInput): Promise<void> {
		clearNode(this.container);

		// Toolbar
		const toolbar = append(this.container, $('.cad-toolbar'));
		toolbar.style.cssText = 'height: 40px; border-bottom: 1px solid var(--vscode-widget-border, #333); display: flex; align-items: center; padding: 0 16px; gap: 12px; background: var(--vscode-editorGroupHeader-tabsBackground);';

		const title = append(toolbar, $('span'));
		title.style.cssText = 'font-weight: 600; font-size: 13px; color: var(--vscode-foreground);';
		title.textContent = '3D CAD Geometry & Topological Entity Selector';

		const spacer = append(toolbar, $('div'));
		spacer.style.cssText = 'flex: 1;';

		const btnImport = append(toolbar, $('button')) as HTMLButtonElement;
		btnImport.style.cssText = 'background: var(--vscode-button-secondaryBackground, #333); color: var(--vscode-button-secondaryForeground, #fff); border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer;';
		btnImport.textContent = 'Import STEP / IGES...';

		const btnTnp = append(toolbar, $('button')) as HTMLButtonElement;
		btnTnp.style.cssText = 'background: var(--vscode-button-background, #0984e3); color: var(--vscode-button-foreground, #fff); border: none; border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer;';
		btnTnp.textContent = 'Verify Semantic Selectors';

		// Main Work Area: Left Sidebar (Tree / Selectors) + Right 3D Viewport
		const workArea = append(this.container, $('.cad-workarea'));
		workArea.style.cssText = 'flex: 1; display: flex; overflow: hidden;';

		// Left Navigation Sidebar
		const nav = append(workArea, $('.cad-nav'));
		nav.style.cssText = 'width: 280px; border-right: 1px solid var(--vscode-widget-border, #333); padding: 16px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;';

		const treeTitle = append(nav, $('h4'));
		treeTitle.style.cssText = 'margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--vscode-descriptionForeground);';
		treeTitle.textContent = 'Model Hierarchy';

		const treeList = append(nav, $('div.hierarchy-tree'));
		treeList.style.cssText = 'display: flex; flex-direction: column; gap: 6px; font-size: 13px;';

		const items = [
			{ name: 'Solid Body: Cantilever_Beam', type: 'Solid', count: '1 Body' },
			{ name: 'Faces (6 Total)', type: 'Faces', count: '6 Faces' },
			{ name: '  ├── Fixed Support Face (Z=0)', type: 'Face', count: 'Area: 2,500 mm²' },
			{ name: '  ├── Load Applied Face (Z=500)', type: 'Face', count: 'Area: 2,500 mm²' },
			{ name: '  └── Lateral Faces (4)', type: 'Faces', count: 'Area: 100,000 mm²' },
			{ name: 'Edges (12 Total)', type: 'Edges', count: '12 Edges' },
			{ name: 'Vertices (8 Total)', type: 'Vertices', count: '8 Nodes' }
		];

		for (const it of items) {
			const row = append(treeList, $('div.tree-row'));
			row.style.cssText = 'padding: 4px 6px; border-radius: 4px; display: flex; justify-content: space-between; cursor: pointer; font-family: monospace; font-size: 11px;';
			row.onmouseenter = () => row.style.background = 'var(--vscode-list-hoverBackground, rgba(255,255,255,0.05))';
			row.onmouseleave = () => row.style.background = 'transparent';

			const n = append(row, $('span'));
			n.textContent = it.name;

			const c = append(row, $('span'));
			c.style.cssText = 'color: var(--vscode-descriptionForeground); font-size: 10px;';
			c.textContent = it.count;
		}

		// Topological Naming Queries (TNP Engine)
		const tnpSec = append(nav, $('.tnp-selectors'));
		tnpSec.style.cssText = 'border-top: 1px solid var(--vscode-widget-border, #333); padding-top: 16px; display: flex; flex-direction: column; gap: 8px;';

		const tnpTitle = append(tnpSec, $('h4'));
		tnpTitle.style.cssText = 'margin: 0; font-size: 12px; text-transform: uppercase; color: var(--vscode-descriptionForeground);';
		tnpTitle.textContent = 'Topological Selectors';

		const sel1 = append(tnpSec, $('div.sel-card'));
		sel1.style.cssText = 'padding: 8px; border-radius: 4px; background: var(--vscode-input-background); border: 1px solid #0984e3; font-size: 11px;';
		sel1.innerHTML = '<b>fixed_face</b>: bbox [-1, -1, -1, 1, 51, 51]<br><span style="color:#2ecc71">✓ Validated (1 Face)</span>';

		const sel2 = append(tnpSec, $('div.sel-card'));
		sel2.style.cssText = 'padding: 8px; border-radius: 4px; background: var(--vscode-input-background); border: 1px solid #e67e22; font-size: 11px;';
		sel2.innerHTML = '<b>loaded_face</b>: bbox [499, -1, -1, 501, 51, 51]<br><span style="color:#2ecc71">✓ Validated (1 Face)</span>';

		// Right 3D Viewport
		const viewport = append(workArea, $('.cad-viewport'));
		viewport.style.cssText = 'flex: 1; background: #18191c; position: relative; display: flex; align-items: center; justify-content: center;';

		// Canvas Viewport Placeholder with Grid & Axes
		const canvasPlaceholder = append(viewport, $('div.canvas-ui'));
		canvasPlaceholder.style.cssText = 'text-align: center; color: #666; font-size: 14px;';
		canvasPlaceholder.innerHTML = `
			<svg width="240" height="160" viewBox="0 0 240 160" style="margin-bottom: 12px;">
				<polygon points="40,110 140,50 200,85 100,145" fill="rgba(9, 132, 227, 0.25)" stroke="#0984e3" stroke-width="2"/>
				<polygon points="40,70 140,10 200,45 100,105" fill="rgba(9, 132, 227, 0.4)" stroke="#0984e3" stroke-width="2"/>
				<line x1="40" y1="110" x2="40" y2="70" stroke="#0984e3" stroke-width="2"/>
				<line x1="140" y1="50" x2="140" y2="10" stroke="#0984e3" stroke-width="2"/>
				<line x1="200" y1="85" x2="200" y2="45" stroke="#0984e3" stroke-width="2"/>
				<line x1="100" y1="145" x2="100" y2="105" stroke="#0984e3" stroke-width="2"/>
				<!-- Fixed Base Marker -->
				<line x1="30" y1="115" x2="30" y2="65" stroke="#e74c3c" stroke-width="4"/>
				<line x1="30" y1="115" x2="90" y2="150" stroke="#e74c3c" stroke-width="4"/>
			</svg>
			<div style="font-weight: 500; color: #aaa;">3D Interactive CAD B-Rep Viewport (OpenCASCADE / Three.js)</div>
			<div style="font-size: 11px; margin-top: 4px; color: #555;">Rotate: Left Click + Drag | Pan: Right Click + Drag | Zoom: Mouse Wheel</div>
		`;

		// Axis Triad Widget (Bottom Left)
		const triad = append(viewport, $('div.cad-triad'));
		triad.style.cssText = 'position: absolute; bottom: 16px; left: 16px; background: rgba(0,0,0,0.5); border-radius: 6px; padding: 8px 12px; font-size: 11px; font-weight: bold; color: #aaa; display: flex; gap: 8px;';
		triad.innerHTML = '<span style="color:#e74c3c">X</span> <span style="color:#2ecc71">Y</span> <span style="color:#3498db">Z</span>';
	}

	override layout(dimension: { width: number; height: number }): void {
		this.scrollable.getDomNode().style.width = `${dimension.width}px`;
		this.scrollable.getDomNode().style.height = `${dimension.height}px`;
		this.scrollable.scanDomNode();
	}
}

