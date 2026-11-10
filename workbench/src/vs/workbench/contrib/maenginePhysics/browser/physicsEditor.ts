/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MAEngine contributors. All rights reserved.
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
import { PhysicsEditorInput } from './physicsEditorInput.js';

export class PhysicsEditor extends EditorPane {

	private container!: HTMLElement;
	private scrollable!: DomScrollableElement;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IFileService private readonly fileService: IFileService,
	) {
		super(PhysicsEditorInput.EDITOR_ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.maengine-physics-editor');
		this.container.style.cssText = 'height: 100%; width: 100%; overflow: auto; padding: 32px; box-sizing: border-box; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		this.scrollable = this._register(new DomScrollableElement(this.container, { horizontal: ScrollbarVisibility.Hidden, vertical: ScrollbarVisibility.Auto }));
		append(parent, this.scrollable.getDomNode());
	}

	override async setInput(input: PhysicsEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.render();
	}

	private render(): void {
		clearNode(this.container);

		const wrapper = append(this.container, $('.physics-wrapper'));
		wrapper.style.cssText = 'max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;';

		// Header
		const header = append(wrapper, $('.physics-header'));
		header.style.cssText = 'border-bottom: 1px solid var(--vscode-widget-border, #333); padding-bottom: 16px; display: flex; justify-content: space-between; align-items: center;';

		const titleBlock = append(header, $('div'));
		const title = append(titleBlock, $('h2'));
		title.style.cssText = 'margin: 0; font-size: 20px; font-weight: 600;';
		title.textContent = 'Physics, Boundary Conditions & Loads';

		const sub = append(titleBlock, $('p'));
		sub.style.cssText = 'margin: 4px 0 0 0; font-size: 13px; color: var(--vscode-descriptionForeground);';
		sub.textContent = 'Kinematic constraints, surface tractions, point forces, pressures, and thermal boundary conditions.';

		const addRow = append(header, $('div'));
		addRow.style.cssText = 'display: flex; gap: 10px;';

		const addBcBtn = append(addRow, $('button')) as HTMLButtonElement;
		addBcBtn.style.cssText = 'background: #e74c3c; color: #fff; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;';
		addBcBtn.textContent = '+ Add Constraint';

		const addLoadBtn = append(addRow, $('button')) as HTMLButtonElement;
		addLoadBtn.style.cssText = 'background: #0984e3; color: #fff; border: none; border-radius: 4px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;';
		addLoadBtn.textContent = '+ Add Mechanical Load';

		// Section: Constraints
		const bcSec = append(wrapper, $('.sec-block'));
		const bcH3 = append(bcSec, $('h3'));
		bcH3.style.cssText = 'margin: 0 0 12px 0; font-size: 15px; font-weight: 600;';
		bcH3.textContent = 'Boundary Constraints';

		const bcTable = append(bcSec, $('table'));
		bcTable.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border, #333); border-radius: 6px; overflow: hidden;';

		const bcHeader = append(bcTable, $('tr'));
		bcHeader.style.cssText = 'background: var(--vscode-editorGroupHeader-tabsBackground); text-align: left; font-weight: 600; line-height: 32px;';
		for (const h of ['ID', 'Type', 'Target Selector', 'Degrees of Freedom (DOFs)', 'Actions']) {
			const th = append(bcHeader, $('th'));
			th.style.cssText = 'padding: 0 12px; border-bottom: 1px solid var(--vscode-widget-border, #333);';
			th.textContent = h;
		}

		const bcRow = append(bcTable, $('tr'));
		bcRow.style.cssText = 'line-height: 36px; border-bottom: 1px solid var(--vscode-widget-border, #222);';
		const bcData = ['bc_fix_root', 'Fixed Support (Encastre)', 'fixed_face (bbox: Z=0)', 'UX=0, UY=0, UZ=0 (All Fixed)', 'Edit | Remove'];
		for (let i = 0; i < bcData.length; i++) {
			const td = append(bcRow, $('td'));
			td.style.cssText = 'padding: 0 12px; font-family: monospace;';
			if (i === 1) td.style.color = '#e74c3c';
			if (i === 4) {
				td.style.color = 'var(--vscode-textLink-foreground)';
				td.style.cursor = 'pointer';
			}
			td.textContent = bcData[i];
		}

		// Section: Mechanical Loads
		const loadSec = append(wrapper, $('.sec-block'));
		loadSec.style.cssText = 'margin-top: 12px;';
		const loadH3 = append(loadSec, $('h3'));
		loadH3.style.cssText = 'margin: 0 0 12px 0; font-size: 15px; font-weight: 600;';
		loadH3.textContent = 'Applied Loads & Forces';

		const loadTable = append(loadSec, $('table'));
		loadTable.style.cssText = 'width: 100%; border-collapse: collapse; font-size: 12px; background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border, #333); border-radius: 6px; overflow: hidden;';

		const loadHeader = append(loadTable, $('tr'));
		loadHeader.style.cssText = 'background: var(--vscode-editorGroupHeader-tabsBackground); text-align: left; font-weight: 600; line-height: 32px;';
		for (const h of ['ID', 'Load Type', 'Target Selector', 'Magnitude & Direction', 'Actions']) {
			const th = append(loadHeader, $('th'));
			th.style.cssText = 'padding: 0 12px; border-bottom: 1px solid var(--vscode-widget-border, #333);';
			th.textContent = h;
		}

		const lRow = append(loadTable, $('tr'));
		lRow.style.cssText = 'line-height: 36px; border-bottom: 1px solid var(--vscode-widget-border, #222);';
		const lData = ['load_tip_force', 'Point / Surface Force', 'loaded_face (bbox: Z=500)', 'Fy = -10,000 N (-10 kN)', 'Edit | Remove'];
		for (let i = 0; i < lData.length; i++) {
			const td = append(lRow, $('td'));
			td.style.cssText = 'padding: 0 12px; font-family: monospace;';
			if (i === 1) td.style.color = '#0984e3';
			if (i === 4) {
				td.style.color = 'var(--vscode-textLink-foreground)';
				td.style.cursor = 'pointer';
			}
			td.textContent = lData[i];
		}

		// Gravity Block
		const gravBox = append(wrapper, $('.grav-box'));
		gravBox.style.cssText = 'background: rgba(255,255,255,0.02); border: 1px solid var(--vscode-widget-border, #333); border-radius: 6px; padding: 16px; display: flex; align-items: center; justify-content: space-between;';

		const gText = append(gravBox, $('div'));
		const gTitle = append(gText, $('h4'));
		gTitle.style.cssText = 'margin: 0; font-size: 13px; font-weight: 600;';
		gTitle.textContent = 'Global Gravitational Acceleration';

		const gDesc = append(gText, $('p'));
		gDesc.style.cssText = 'margin: 2px 0 0 0; font-size: 11px; color: var(--vscode-descriptionForeground);';
		gDesc.textContent = 'Included in static body force and modal self-weight extraction.';

		const gVal = append(gravBox, $('span'));
		gVal.style.cssText = 'font-family: monospace; font-size: 13px; font-weight: bold; color: #f39c12;';
		gVal.textContent = 'g = [0, 0, -9810] mm/s² (-Z Direction)';
	}

	override layout(dimension: { width: number; height: number }): void {
		this.scrollable.getDomNode().style.width = `${dimension.width}px`;
		this.scrollable.getDomNode().style.height = `${dimension.height}px`;
		this.scrollable.scanDomNode();
	}
}

