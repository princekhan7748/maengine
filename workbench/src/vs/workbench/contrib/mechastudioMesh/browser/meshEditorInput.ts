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

export class MeshEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.mechastudio.mesh';
	static readonly EDITOR_ID: string = 'workbench.editors.mechastudio.meshEditor';

	constructor(readonly resource: URI) {
		super();
	}

	override get typeId(): string {
		return MeshEditorInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.None;
	}

	override getName(): string {
		return localize('meshEditor.name', "04 3D Conformal Mesh");
	}

	override getIcon(): ThemeIcon {
		return Codicon.circuitBoard;
	}

	override matches(other: EditorInput): boolean {
		return other instanceof MeshEditorInput && other.resource.toString() === this.resource.toString();
	}
}
