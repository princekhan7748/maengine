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

export class PhysicsEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.mechastudio.physics';
	static readonly EDITOR_ID: string = 'workbench.editors.mechastudio.physicsEditor';

	constructor(readonly resource: URI) {
		super();
	}

	override get typeId(): string {
		return PhysicsEditorInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.None;
	}

	override getName(): string {
		return localize('physicsEditor.name', "05 Physics & BCs");
	}

	override getIcon(): ThemeIcon {
		return Codicon.compass;
	}

	override matches(other: EditorInput): boolean {
		return other instanceof PhysicsEditorInput && other.resource.toString() === this.resource.toString();
	}
}
