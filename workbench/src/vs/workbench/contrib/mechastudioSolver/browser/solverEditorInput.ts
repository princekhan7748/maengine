/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { EditorInputCapabilities } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';

export class SolverEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.mechastudio.solver';
	static readonly EDITOR_ID: string = 'workbench.editors.mechastudio.solverEditor';

	constructor(readonly resource: URI) {
		super();
	}

	override get typeId(): string {
		return SolverEditorInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.None;
	}

	override getName(): string {
		return localize('solverEditor.name', "06 Solver Manager");
	}

	override getIcon(): ThemeIcon {
		return Codicon.play;
	}

	override matches(other: EditorInput): boolean {
		return other instanceof SolverEditorInput && other.resource.toString() === this.resource.toString();
	}
}

