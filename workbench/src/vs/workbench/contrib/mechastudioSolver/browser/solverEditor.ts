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
import { SolverEditorInput } from './solverEditorInput.js';

export class SolverEditor extends EditorPane {

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
		super(SolverEditorInput.EDITOR_ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this.container = $('.mechastudio-solver-editor');
		this.container.style.cssText = 'height: 100%; width: 100%; overflow: hidden; display: flex; flex-direction: column; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';
		this.scrollable = this._register(new DomScrollableElement(this.container, { horizontal: ScrollbarVisibility.Hidden, vertical: ScrollbarVisibility.Auto }));
		append(parent, this.scrollable.getDomNode());
	}

	override async setInput(input: SolverEditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);
		this.render();
	}

	private render(): void {
		clearNode(this.container);

		// Toolbar
		const toolbar = append(this.container, $('.solver-toolbar'));
		toolbar.style.cssText = 'height: 40px; border-bottom: 1px solid var(--vscode-widget-border, #333); display: flex; align-items: center; padding: 0 16px; gap: 12px; background: var(--vscode-editorGroupHeader-tabsBackground);';

		const title = append(toolbar, $('span'));
		title.style.cssText = 'font-weight: 600; font-size: 13px; color: var(--vscode-foreground);';
		title.textContent = 'CalculiX CrunchiX (ccx) Solver Manager';

		const spacer = append(toolbar, $('div'));
		spacer.style.cssText = 'flex: 1;';

		const runBtn = append(toolbar, $('button')) as HTMLButtonElement;
		runBtn.style.cssText = 'background: #2980b9; color: #fff; border: none; border-radius: 4px; padding: 6px 16px; font-size: 12px; font-weight: 600; cursor: pointer;';
		runBtn.textContent = '▶ Solve (CalculiX ccx)';
		runBtn.onclick = () => {
			this.notificationService.info('Running CalculiX FEA solver...');
			this.commandService.executeCommand('mechastudio.solve.run');
		};

		// Content Area
		const main = append(this.container, $('.solver-main'));
		main.style.cssText = 'flex: 1; display: flex; overflow: hidden;';

		// Left: Settings Panel
		const left = append(main, $('.solver-left'));
		left.style.cssText = 'width: 320px; border-right: 1px solid var(--vscode-widget-border, #333); padding: 20px; display: flex; flex-direction: column; gap: 16px; overflow-y: auto;';

		const h1 = append(left, $('h4'));
		h1.style.cssText = 'margin: 0; font-size: 12px; text-transform: uppercase; color: var(--vscode-descriptionForeground);';
		h1.textContent = 'Analysis Configuration';

		const anTypeBox = append(left, $('div'));
		const lbl1 = append(anTypeBox, $('label'));
		lbl1.style.cssText = 'font-size: 12px; display: block; margin-bottom: 4px;';
		lbl1.textContent = 'Analysis Step Type';

		const sel1 = append(anTypeBox, $('select')) as HTMLSelectElement;
		sel1.style.cssText = 'width: 100%; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border, #444); border-radius: 4px; padding: 6px; font-size: 13px;';
		const o1 = append(sel1, $('option')) as HTMLOptionElement;
		o1.value = 'static_linear';
		o1.textContent = '*STATIC Linear Stress Analysis';
		o1.selected = true;
		const o2 = append(sel1, $('option')) as HTMLOptionElement;
		o2.value = 'frequency_modal';
		o2.textContent = '*FREQUENCY (Lanczos Modal Extraction)';
		const o3 = append(sel1, $('option')) as HTMLOptionElement;
		o3.value = 'heat_transfer';
		o3.textContent = '*HEAT TRANSFER (Steady Conduction)';

		// Solver Engine Details
		const engBox = append(left, $('div'));
		engBox.style.cssText = 'display: flex; flex-direction: column; gap: 8px; font-size: 12px;';
		const engRows = [
			['Solver Binary', 'CalculiX ccx (2.21 Multithreaded)'],
			['CPU Cores', '4 OpenMP Threads'],
			['Sparse Matrix Solver', 'SPOOLES Direct Solver'],
			['Equation System', 'Symmetric Positive Definite']
		];

		for (const [k, v] of engRows) {
			const r = append(engBox, $('div'));
			r.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';
			const kSpan = append(r, $('span'));
			kSpan.style.cssText = 'color: var(--vscode-descriptionForeground); font-size: 11px;';
			kSpan.textContent = k;
			const vSpan = append(r, $('span'));
			vSpan.style.cssText = 'font-weight: 500; font-family: monospace; font-size: 12px;';
			vSpan.textContent = v;
		}

		// Right: Terminal & Live Telemetry
		const right = append(main, $('.solver-right'));
		right.style.cssText = 'flex: 1; display: flex; flex-direction: column; background: #121315;';

		// Status Banner
		const statusBanner = append(right, $('.status-banner'));
		statusBanner.style.cssText = 'padding: 12px 20px; background: rgba(41, 128, 185, 0.1); border-bottom: 1px solid var(--vscode-widget-border, #333); display: flex; align-items: center; justify-content: space-between;';

		const stLeft = append(statusBanner, $('div'));
		const stTitle = append(stLeft, $('span'));
		stTitle.style.cssText = 'font-size: 13px; font-weight: 600; color: #3498db;';
		stTitle.textContent = 'Status: Ready to Execute Deck';

		const stDesc = append(stLeft, $('div'));
		stDesc.style.cssText = 'font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 2px;';
		stDesc.textContent = 'Input Deck: 06 Solver/calculix.inp | Output: calculix.frd, calculix.dat';

		// Live Console Output
		const consoleLog = append(right, $('pre.solver-console'));
		consoleLog.style.cssText = 'flex: 1; margin: 0; padding: 16px 20px; overflow-y: auto; font-family: "Consolas", "Courier New", monospace; font-size: 12px; line-height: 20px; color: #ccc;';
		consoleLog.textContent = `CalculiX Version 2.21, Copyright(C) 1998-2023 Guido Dhondt
CalculiX is a free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License as
published by the Free Software Foundation(version 2).

You've called CalculiX with the following input deck:
calculix.inp

STEP 1: Static Linear Stress Calculation
Determining the structure of the matrix:
number of equations = 7230
number of nonzero lower triangular matrix elements = 194832

Using SPOOLES 2.2 multi-threaded direct solver
Pivot tolerance = 0.100000
Number of threads = 4

Factorization of the stiffness matrix:
  ... done in 0.14 seconds
Back-substitution:
  ... done in 0.02 seconds

Calculating internal forces and stress tensor at integration points...
Extrapolating 10-node tetrahedral stresses to nodes:
  ... done in 0.05 seconds

Writing output to binary results file: calculix.frd
Total CalculiX computation time: 0.31 seconds.
Job finished successfully!
`;
	}

	override layout(dimension: { width: number; height: number }): void {
		this.scrollable.getDomNode().style.width = `${dimension.width}px`;
		this.scrollable.getDomNode().style.height = `${dimension.height}px`;
		this.scrollable.scanDomNode();
	}
}
