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

export class CadEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.mechastudio.cad';
	static readonly EDITOR_ID: string = 'workbench.editors.mechastudio.cadEditor';

	constructor(readonly resource: URI) {
		super();
	}

	override get typeId(): string {
		return CadEditorInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.None;
	}

	override getName(): string {
		return localize('cadEditor.name', "02 Geometry & CAD");
	}

	override getIcon(): ThemeIcon {
		return Codicon.package;
	}

	override matches(other: EditorInput): boolean {
		return other instanceof CadEditorInput && other.resource.toString() === this.resource.toString();
	}
}
