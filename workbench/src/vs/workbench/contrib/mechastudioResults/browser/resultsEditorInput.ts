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

export class ResultsEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.mechastudio.results';
	static readonly EDITOR_ID: string = 'workbench.editors.mechastudio.resultsEditor';

	constructor(readonly resource: URI) {
		super();
	}

	override get typeId(): string {
		return ResultsEditorInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.None;
	}

	override getName(): string {
		return localize('resultsEditor.name', "07 Analysis Results");
	}

	override getIcon(): ThemeIcon {
		return Codicon.graphLine;
	}

	override matches(other: EditorInput): boolean {
		return other instanceof ResultsEditorInput && other.resource.toString() === this.resource.toString();
	}
}
