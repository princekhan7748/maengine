/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MechaStudio contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { basename, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { FileChangeType, IFileService } from '../../../../platform/files/common/files.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import {
	createManifest,
	IMechastudioProject,
	IMechastudioProjectService,
	IProjectManifest,
	PROJECT_MANIFEST_EXTENSION,
	LEGACY_PROJECT_MANIFEST_EXTENSION,
	PROJECT_PARTS,
	UnitSystem
} from '../common/mechastudioProject.js';

export class MechastudioProjectService extends Disposable implements IMechastudioProjectService {

	declare readonly _serviceBrand: undefined;

	private _project: IMechastudioProject | undefined;
	get project(): IMechastudioProject | undefined { return this._project; }

	private readonly _onDidChangeProject = this._register(new Emitter<IMechastudioProject | undefined>());
	readonly onDidChangeProject = this._onDidChangeProject.event;

	private protectedResources: ResourceSet;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService,
		@INotificationService private readonly notificationService: INotificationService,
		@ILogService private readonly logService: ILogService,
	) {
		super();
		this.protectedResources = new ResourceSet(uri => this.uriIdentityService.extUri.getComparisonKey(uri));

		this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.detect()));
		this._register(this.fileService.onDidFilesChange(e => {
			if (this._project && (e.contains(this._project.manifestUri, FileChangeType.DELETED) || e.contains(this._project.manifestUri, FileChangeType.UPDATED))) {
				void this.detect();
			}
		}));

		void this.detect();
	}

	async detect(): Promise<void> {
		const folders = this.contextService.getWorkspace().folders;
		if (folders.length === 0) {
			this.setProject(undefined);
			return;
		}

		const root = folders[0].uri;
		const project = await this.findProject(root);
		this.setProject(project);
	}

	async findProject(folder: URI): Promise<IMechastudioProject | undefined> {
		try {
			const stat = await this.fileService.resolve(folder);
			if (!stat.children) {
				return undefined;
			}
			const manifestEntry = stat.children.find(child => child.name.endsWith(PROJECT_MANIFEST_EXTENSION) || child.name.endsWith(LEGACY_PROJECT_MANIFEST_EXTENSION));
			if (!manifestEntry) {
				return undefined;
			}

			const content = await this.fileService.readFile(manifestEntry.resource);
			const manifest = JSON.parse(content.value.toString()) as IProjectManifest;
			return {
				root: folder,
				manifest,
				manifestUri: manifestEntry.resource
			};
		} catch (error) {
			this.logService.warn(`[MechaStudio] Error checking project at ${folder.toString()}:`, error);
			return undefined;
		}
	}

	async createProject(targetFolder: URI, projectName: string, unitSystem: UnitSystem): Promise<IMechastudioProject> {
		const sanitizedName = projectName.trim().replace(/[\\/:*?"<>|]/g, '_');
		const projectDir = joinPath(targetFolder, sanitizedName);
		await this.fileService.createFolder(projectDir);

		const manifest = createManifest(sanitizedName, unitSystem);
		const manifestUri = joinPath(projectDir, `${sanitizedName}${PROJECT_MANIFEST_EXTENSION}`);
		await this.fileService.writeFile(manifestUri, VSBuffer.fromString(JSON.stringify(manifest, undefined, '\t') + '\n'));

		// Create standard workflow folders and initial files
		for (const part of PROJECT_PARTS) {
			const partFolder = joinPath(projectDir, part.folder);
			await this.fileService.createFolder(partFolder);
			if (part.mainFile) {
				const mainFileUri = joinPath(partFolder, part.mainFile);
				const content = part.initialContent(sanitizedName, unitSystem);
				await this.fileService.writeFile(mainFileUri, VSBuffer.fromString(content));
			}
		}

		const project: IMechastudioProject = {
			root: projectDir,
			manifest,
			manifestUri
		};

		return project;
	}

	async openProject(folder: URI): Promise<void> {
		const project = await this.findProject(folder);
		this.setProject(project);
	}

	isProtected(uri: URI): boolean {
		return this.protectedResources.has(uri);
	}

	private setProject(project: IMechastudioProject | undefined): void {
		if (this._project?.manifestUri.toString() === project?.manifestUri.toString()) {
			return;
		}

		this._project = project;
		this.protectedResources.clear();

		if (project) {
			this.protectedResources.add(project.manifestUri);
			for (const part of PROJECT_PARTS) {
				const partFolder = joinPath(project.root, part.folder);
				this.protectedResources.add(partFolder);
				if (part.mainFile) {
					this.protectedResources.add(joinPath(partFolder, part.mainFile));
				}
			}
		}

		this._onDidChangeProject.fire(this._project);
	}
}

registerSingleton(IMechastudioProjectService, MechastudioProjectService, InstantiationType.Delayed);

