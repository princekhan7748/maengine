/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MAEngine contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { EditorInputCapabilities } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';

export class MaterialEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.maengine.material';
	static readonly EDITOR_ID: string = 'workbench.editors.maengine.materialEditor';

	constructor(readonly resource: URI) {
		super();
	}

	override get typeId(): string {
		return MaterialEditorInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.None;
	}

	override getName(): string {
		return localize('materialEditor.name', "03 Materials");
	}

	override getIcon(): ThemeIcon {
		return Codicon.symbolStructure;
	}

	override matches(other: EditorInput): boolean {
		return other instanceof MaterialEditorInput && other.resource.toString() === this.resource.toString();
	}
}

