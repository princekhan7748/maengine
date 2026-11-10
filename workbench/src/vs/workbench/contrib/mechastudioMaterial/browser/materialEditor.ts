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
import { MaterialEditorInput } from './materialEditorInput.js';

export class MaterialEditor extends EditorPane {

	private container!: HTMLElement;
	private scrollable!: DomScrollableElement;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IFileService private readonly fileService: IFileService,
	) {
		super(MaterialEditorInput.EDITOR_ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.mechastudio-material-editor');
		this.container.style.cssText = 'height: 100%; width: 100%; overflow: auto; padding: 32px; box-sizing: border-box; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		this.scrollable = this._register(new DomScrollableElement(this.container, { horizontal: ScrollbarVisibility.Hidden, vertical: ScrollbarVisibility.Auto }));
		append(parent, this.scrollable.getDomNode());
	}

	override async setInput(input: MaterialEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.render();
	}

	private render(): void {
		clearNode(this.container);

		const wrapper = append(this.container, $('.mat-wrapper'));
		wrapper.style.cssText = 'max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;';

		// Header
		const header = append(wrapper, $('.mat-header'));
		header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--vscode-widget-border, #333); padding-bottom: 16px;';

		const titleBlock = append(header, $('div'));
		const title = append(titleBlock, $('h2'));
		title.style.cssText = 'margin: 0; font-size: 20px; font-weight: 600;';
		title.textContent = 'Engineering Material Library';

		const sub = append(titleBlock, $('p'));
		sub.style.cssText = 'margin: 4px 0 0 0; font-size: 13px; color: var(--vscode-descriptionForeground);';
		sub.textContent = 'Elastic-plastic, thermal, and density property models for CalculiX FEA.';

		const addBtn = append(header, $('button')) as HTMLButtonElement;
		addBtn.style.cssText = 'background: var(--vscode-button-background, #0984e3); color: var(--vscode-button-foreground, #fff); border: none; border-radius: 4px; padding: 8px 16px; font-size: 13px; font-weight: 600; cursor: pointer;';
		addBtn.textContent = '+ Add New Material';

		// Materials Grid
		const grid = append(wrapper, $('.mat-grid'));
		grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 20px;';

		const materials = [
			{
				id: 'structural_steel',
				name: 'Structural Steel (ASTM A36)',
				category: 'Ferrous Metal',
				e: '210,000 MPa',
				nu: '0.30',
				density: '7.85 × 10⁻⁹ tonne/mm³ (7,850 kg/m³)',
				yield: '250 MPa',
				thermalK: '60.5 W/(m·K)',
				alpha: '1.2 × 10⁻⁵ 1/K',
				active: true
			},
			{
				id: 'aluminum_6061_t6',
				name: 'Aluminum 6061-T6',
				category: 'Non-Ferrous Metal',
				e: '68,900 MPa',
				nu: '0.33',
				density: '2.70 × 10⁻⁹ tonne/mm³ (2,700 kg/m³)',
				yield: '276 MPa',
				thermalK: '167.0 W/(m·K)',
				alpha: '2.3 × 10⁻⁵ 1/K',
				active: false
			},
			{
				id: 'titanium_ti6al4v',
				name: 'Titanium Ti-6Al-4V (Grade 5)',
				category: 'High-Strength Aerospace Alloy',
				e: '113,800 MPa',
				nu: '0.342',
				density: '4.43 × 10⁻⁹ tonne/mm³ (4,430 kg/m³)',
				yield: '880 MPa',
				thermalK: '6.7 W/(m·K)',
				alpha: '8.6 × 10⁻⁶ 1/K',
				active: false
			},
			{
				id: 'gray_cast_iron',
				name: 'Gray Cast Iron (ASTM Class 35)',
				category: 'Cast Iron',
				e: '100,000 MPa',
				nu: '0.26',
				density: '7.20 × 10⁻⁹ tonne/mm³ (7,200 kg/m³)',
				yield: '240 MPa (Ultimate Tensile)',
				thermalK: '46.0 W/(m·K)',
				alpha: '1.1 × 10⁻⁵ 1/K',
				active: false
			}
		];

		for (const mat of materials) {
			const card = append(grid, $('.mat-card'));
			card.style.cssText = `background: var(--vscode-editor-background); border: 1px solid ${mat.active ? '#0984e3' : 'var(--vscode-widget-border, #333)'}; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; gap: 14px; position: relative;`;

			if (mat.active) {
				const badge = append(card, $('span'));
				badge.style.cssText = 'position: absolute; top: 12px; right: 12px; font-size: 10px; font-weight: bold; background: #0984e3; color: #fff; padding: 2px 8px; border-radius: 10px;';
				badge.textContent = 'ASSIGNED TO CAD';
			}

			const cardHeader = append(card, $('div'));
			const cardName = append(cardHeader, $('h3'));
			cardName.style.cssText = 'margin: 0; font-size: 15px; font-weight: 600;';
			cardName.textContent = mat.name;

			const cardCat = append(cardHeader, $('span'));
			cardCat.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground);';
			cardCat.textContent = mat.category;

			// Properties Table
			const table = append(card, $('table'));
			table.style.cssText = 'width: 100%; font-size: 12px; border-collapse: collapse;';

			const rows = [
				['Young\'s Modulus (E)', mat.e],
				['Poisson\'s Ratio (ν)', mat.nu],
				['Mass Density (ρ)', mat.density],
				['Yield Strength (σy)', mat.yield],
				['Thermal Conductivity (k)', mat.thermalK],
				['Thermal Expansion (α)', mat.alpha]
			];

			for (const [k, v] of rows) {
				const tr = append(table, $('tr'));
				tr.style.cssText = 'border-bottom: 1px solid var(--vscode-widget-border, #222); line-height: 24px;';
				const td1 = append(tr, $('td'));
				td1.style.cssText = 'color: var(--vscode-descriptionForeground); width: 55%;';
				td1.textContent = k;
				const td2 = append(tr, $('td'));
				td2.style.cssText = 'font-weight: 500; font-family: monospace;';
				td2.textContent = v;
			}
		}
	}

	override layout(dimension: { width: number; height: number }): void {
		this.scrollable.getDomNode().style.width = `${dimension.width}px`;
		this.scrollable.getDomNode().style.height = `${dimension.height}px`;
		this.scrollable.scanDomNode();
	}
}

