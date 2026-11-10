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
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorOpenContext } from '../../../common/editor.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { MarketplaceEditorInput } from './marketplaceEditorInput.js';

export class MarketplaceEditor extends EditorPane {

	private container!: HTMLElement;
	private scrollable!: DomScrollableElement;

	constructor(
		group: IEditorGroup,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService,
	) {
		super(MarketplaceEditorInput.EDITOR_ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.mechastudio-marketplace-editor');
		this.container.style.cssText = 'height: 100%; width: 100%; overflow: auto; padding: 32px; box-sizing: border-box; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		this.scrollable = this._register(new DomScrollableElement(this.container, { horizontal: ScrollbarVisibility.Hidden, vertical: ScrollbarVisibility.Auto }));
		append(parent, this.scrollable.getDomNode());
	}

	override async setInput(input: MarketplaceEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.render();
	}

	private render(): void {
		clearNode(this.container);

		const wrapper = append(this.container, $('.market-wrapper'));
		wrapper.style.cssText = 'max-width: 960px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px;';

		// Header
		const header = append(wrapper, $('.market-header'));
		header.style.cssText = 'border-bottom: 1px solid var(--vscode-widget-border, #333); padding-bottom: 20px;';

		const titleRow = append(header, $('div'));
		titleRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;';

		const title = append(titleRow, $('h2'));
		title.style.cssText = 'margin: 0; font-size: 22px; font-weight: 600;';
		title.textContent = 'MAEngine Engineering Marketplace';

		const searchBox = append(header, $('input')) as HTMLInputElement;
		searchBox.style.cssText = 'width: 100%; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #444); border-radius: 6px; padding: 10px 14px; font-size: 14px; box-sizing: border-box;';
		searchBox.placeholder = 'Search material cards, CAD component templates (Bolts, Flanges, Gears), solver decks...';

		// Categories filter
		const catRow = append(wrapper, $('.cat-row'));
		catRow.style.cssText = 'display: flex; gap: 8px;';

		for (const cat of ['All Extras', 'Material Libraries', 'CAD Object Templates', 'Solver Decks', 'Benchmarks']) {
			const tag = append(catRow, $('span'));
			tag.style.cssText = 'padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; cursor: pointer; border: 1px solid var(--vscode-widget-border, #444); background: var(--vscode-editor-background);';
			if (cat === 'All Extras') {
				tag.style.background = '#0984e3';
				tag.style.color = '#fff';
				tag.style.borderColor = '#0984e3';
			}
			tag.textContent = cat;
		}

		// Marketplace Items Grid
		const grid = append(wrapper, $('.market-grid'));
		grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px;';

		const items = [
			{
				id: 'pkg.templates.fasteners',
				name: 'ISO / ASME Fastener Catalog',
				author: 'MAEngine Official',
				desc: 'Parametric Hex Bolts (ISO 4014), Socket Head Caps (ISO 4762), Flange Nuts, and Flat Washers ready for automated contact pairing.',
				ver: '1.2.0',
				category: 'CAD Object Template',
				installed: true
			},
			{
				id: 'pkg.materials.aerospace',
				name: 'Aerospace & Superalloys Material Pack',
				author: 'CAE Materials Hub',
				desc: 'High-temperature Inconel 718, Haynes 282, René 41, and Ti-6Al-4V ELI temperature-dependent non-linear stress-strain curves.',
				ver: '2.0.1',
				category: 'Material Library',
				installed: false
			},
			{
				id: 'pkg.templates.pressure_vessel',
				name: 'ASME Section VIII Div 1 & 2 Vessel Template',
				author: 'Pressure Vessel WG',
				desc: 'Pre-parameterized cylindrical shells, 2:1 semi-ellipsoidal heads, torispherical heads, and nozzle reinforcement pads with internal pressure BCs.',
				ver: '1.0.4',
				category: 'CAD Object Template',
				installed: false
			},
			{
				id: 'pkg.templates.gears',
				name: 'Spur & Helical Involute Gear Generator',
				author: 'MAEngine Official',
				desc: 'AGMA 2001-D04 rating compliant gear tooth profiles with root fillet radius, module, pressure angle, and face width parameters.',
				ver: '1.1.0',
				category: 'CAD Object Template',
				installed: false
			},
			{
				id: 'pkg.solver.calculix_contact',
				name: 'Mortar Surface-to-Surface Contact Pack',
				author: 'Dhondt FEA Lab',
				desc: 'Pre-configured CalculiX non-linear penalty contact decks with Coulomb friction and chattering damping.',
				ver: '1.0.0',
				category: 'Solver Deck',
				installed: false
			},
			{
				id: 'pkg.templates.flanges',
				name: 'ASME B16.5 Pipe Flanges (Classes 150-2500)',
				author: 'Piping Design Group',
				desc: 'Weld Neck, Slip-On, and Blind Flanges with pre-selected bolt hole boundary selectors.',
				ver: '1.3.0',
				category: 'CAD Object Template',
				installed: false
			}
		];

		for (const it of items) {
			const card = append(grid, $('.item-card'));
			card.style.cssText = 'background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border, #333); border-radius: 8px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; gap: 12px;';

			const top = append(card, $('div'));
			const cardName = append(top, $('h3'));
			cardName.style.cssText = 'margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: var(--vscode-foreground);';
			cardName.textContent = it.name;

			const meta = append(top, $('div'));
			meta.style.cssText = 'display: flex; gap: 8px; font-size: 11px; color: var(--vscode-descriptionForeground); margin-bottom: 8px;';
			meta.textContent = `${it.category} • v${it.ver} • by ${it.author}`;

			const desc = append(top, $('p'));
			desc.style.cssText = 'margin: 0; font-size: 12px; line-height: 18px; color: var(--vscode-descriptionForeground);';
			desc.textContent = it.desc;

			const btm = append(card, $('div'));
			btm.style.cssText = 'display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid var(--vscode-widget-border, #222); padding-top: 12px;';

			const btn = append(btm, $('button')) as HTMLButtonElement;
			if (it.installed) {
				btn.style.cssText = 'background: var(--vscode-button-secondaryBackground, #333); color: var(--vscode-button-secondaryForeground, #fff); border: none; border-radius: 4px; padding: 5px 12px; font-size: 12px; cursor: default;';
				btn.textContent = '✓ Installed';
			} else {
				btn.style.cssText = 'background: #0984e3; color: #fff; border: none; border-radius: 4px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer;';
				btn.textContent = 'Install Package';
				btn.onclick = () => {
					this.notificationService.info(`Downloading & installing ${it.name}...`);
					btn.textContent = '✓ Installed';
					btn.style.background = 'var(--vscode-button-secondaryBackground, #333)';
				};
			}
		}
	}

	override layout(dimension: { width: number; height: number }): void {
		this.scrollable.getDomNode().style.width = `${dimension.width}px`;
		this.scrollable.getDomNode().style.height = `${dimension.height}px`;
		this.scrollable.scanDomNode();
	}
}

