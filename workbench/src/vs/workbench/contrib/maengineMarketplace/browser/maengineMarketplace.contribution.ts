/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MAEngine contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { EditorExtensions } from '../../../common/editor.js';
import { MarketplaceEditor } from './marketplaceEditor.js';
import { MarketplaceEditorInput } from './marketplaceEditorInput.js';

Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(MarketplaceEditor, MarketplaceEditorInput.EDITOR_ID, localize('marketplaceEditor', "08 Marketplace Hub")),
	[new SyncDescriptor(MarketplaceEditorInput)]
);

