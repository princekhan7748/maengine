/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { EditorInputCapabilities, IUntypedEditorInput } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';

export class StartEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.mechastudio.start';
	static readonly EDITOR_ID: string = 'workbench.editors.mechastudio.startEditor';

	static readonly instance = new StartEditorInput();

	override get typeId(): string {
		return StartEditorInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.Readonly | EditorInputCapabilities.Singleton;
	}

	override getName(): string {
		return localize('startEditor.name', "Start Page");
	}

	override getIcon(): ThemeIcon {
		return Codicon.home;
	}

	override matches(other: EditorInput | IUntypedEditorInput): boolean {
		return other instanceof StartEditorInput;
	}
}
