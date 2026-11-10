/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { MaterialEditor } from './materialEditor.js';
import { MaterialEditorInput } from './materialEditorInput.js';

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(MaterialEditor, MaterialEditorInput.EDITOR_ID, localize('materialEditor', "03 Materials")),
	[new SyncDescriptor(MaterialEditorInput)]
);

