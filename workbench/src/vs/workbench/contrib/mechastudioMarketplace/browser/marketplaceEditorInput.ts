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

export class MarketplaceEditorInput extends EditorInput {

	static readonly ID: string = 'workbench.input.mechastudio.marketplace';
	static readonly EDITOR_ID: string = 'workbench.editors.mechastudio.marketplaceEditor';

	constructor(readonly resource?: URI) {
		super();
	}

	override get typeId(): string {
		return MarketplaceEditorInput.ID;
	}

	override get capabilities(): EditorInputCapabilities {
		return EditorInputCapabilities.None;
	}

	override getName(): string {
		return localize('marketplaceEditor.name', "08 Marketplace Hub");
	}

	override getIcon(): ThemeIcon {
		return Codicon.extensions;
	}

	override matches(other: EditorInput): boolean {
		return other instanceof MarketplaceEditorInput;
	}
}
