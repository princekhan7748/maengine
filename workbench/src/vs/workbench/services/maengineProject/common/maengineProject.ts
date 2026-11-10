/*---------------------------------------------------------------------------------------------
 *  Copyright (c) MAEngine contributors. All rights reserved.
 *  Licensed under the MIT license.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';

export const PROJECT_MANIFEST_EXTENSION = '.maengine';
export const LEGACY_PROJECT_MANIFEST_EXTENSION = '.maengine';
export const PROJECT_MANIFEST_SCHEMA = 1;

export type UnitSystem = 'mm_N_MPa_tonne_s' | 'm_N_Pa_kg_s' | 'in_lbf_psi';

export interface IProjectPart {
	readonly id: string;
	readonly label: string;
	readonly description: string;
	readonly icon: string;
	readonly folder: string;
	readonly mainFile: string;
	readonly initialContent: (projectName: string, unitSystem: UnitSystem) => string;
}

function json(value: unknown): string {
	return JSON.stringify(value, undefined, '\t') + '\n';
}

export const PROJECT_PARTS: readonly IProjectPart[] = [
	{
		id: 'settings',
		label: localize('part.settings', "Project Settings"),
		description: localize('part.settingsDesc', "Unit systems, simulation titles, analysis types, and global options."),
		icon: 'settings-gear',
		folder: '01 Project Settings',
		mainFile: 'project-settings.json',
		initialContent: (name, units) => json({
			schema: 1,
			project: {
				name,
				author: 'MAEngine User',
				description: 'Mechanical Analysis Engine Simulation Project',
				unitSystem: units,
				defaultSolver: 'calculix'
			}
		})
	},
	{
		id: 'geometry',
		label: localize('part.geometry', "Geometry & CAD"),
		description: localize('part.geometryDesc', "3D CAD B-Rep / STEP model parameters, dimensions, and topological naming entities."),
		icon: 'package',
		folder: '02 Geometry',
		mainFile: 'geometry.json',
		initialContent: () => json({
			schema: 1,
			cadFile: 'model.step',
			bodies: [
				{ id: 'body_1', name: 'Main Body', material: 'structural_steel', volume_mm3: 125000 }
			],
			selectors: [
				{ name: 'fixed_face', type: 'face', rule: 'box', bounds: [-1, -1, -1, 1, 51, 51] },
				{ name: 'loaded_face', type: 'face', rule: 'box', bounds: [499, -1, -1, 501, 51, 51] }
			]
		})
	},
	{
		id: 'materials',
		label: localize('part.materials', "Materials"),
		description: localize('part.materialsDesc', "Elastic, plastic, and thermal material definitions, density, and yield criteria."),
		icon: 'symbol-structure',
		folder: '03 Materials',
		mainFile: 'materials.json',
		initialContent: () => json({
			schema: 1,
			materials: [
				{
					id: 'structural_steel',
					name: 'Structural Steel',
					elasticModulus_MPa: 210000,
					poissonsRatio: 0.3,
					density_tonne_mm3: 7.85e-9,
					yieldStrength_MPa: 250,
					thermalConductivity_W_mK: 60.5,
					expansionCoefficient_perK: 1.2e-5
				},
				{
					id: 'aluminum_6061_t6',
					name: 'Aluminum 6061-T6',
					elasticModulus_MPa: 68900,
					poissonsRatio: 0.33,
					density_tonne_mm3: 2.7e-9,
					yieldStrength_MPa: 276,
					thermalConductivity_W_mK: 167,
					expansionCoefficient_perK: 2.3e-5
				}
			]
		})
	},
	{
		id: 'mesh',
		label: localize('part.mesh', "3D Conformal Mesh"),
		description: localize('part.meshDesc', "Gmsh quadratic 10-node tetrahedral meshing, element sizing, and quality checks."),
		icon: 'circuit-board',
		folder: '04 Mesh',
		mainFile: 'mesh.json',
		initialContent: () => json({
			schema: 1,
			mesher: 'gmsh',
			elementType: 'TET10',
			meshOrder: 2,
			globalSize: 10.0,
			minSize: 2.0,
			maxSize: 15.0,
			optimizeHighOrder: true,
			conformalInterface: true,
			status: 'ready_to_generate'
		})
	},
	{
		id: 'physics',
		label: localize('part.physics', "Physics & BCs"),
		description: localize('part.physicsDesc', "Fixed supports, displacements, point forces, surface pressures, and temperatures."),
		icon: 'compass',
		folder: '05 Physics & BCs',
		mainFile: 'physics.json',
		initialContent: () => json({
			schema: 1,
			constraints: [
				{ id: 'bc_fix_root', type: 'fixed', selector: 'fixed_face' }
			],
			loads: [
				{ id: 'load_tip_force', type: 'force', selector: 'loaded_face', vector: [0, -10000, 0] }
			],
			gravity: [0, 0, -9810]
		})
	},
	{
		id: 'solver',
		label: localize('part.solver', "Solver Manager"),
		description: localize('part.solverDesc', "CalculiX CrunchiX linear static, modal vibration, and thermal deck execution."),
		icon: 'play',
		folder: '06 Solver',
		mainFile: 'solver.json',
		initialContent: () => json({
			schema: 1,
			solver: 'calculix',
			executable: 'ccx',
			analysisType: 'static_linear',
			threads: 4,
			status: 'idle',
			convergenceResidual: 1e-4,
			maxIterations: 100
		})
	},
	{
		id: 'results',
		label: localize('part.results', "Analysis Results"),
		description: localize('part.resultsDesc', "Von Mises stress contours, deformed shape scaling, displacement fields, probe points."),
		icon: 'graph-line',
		folder: '07 Results',
		mainFile: 'results.json',
		initialContent: () => json({
			schema: 1,
			hasResults: false,
			summary: {
				maxVonMises_MPa: null,
				maxDisplacement_mm: null,
				minSafetyFactor: null
			}
		})
	},
	{
		id: 'marketplace',
		label: localize('part.marketplace', "Marketplace Hub"),
		description: localize('part.marketplaceDesc', "Browse, download, and install additional material cards, CAD templates, and solver decks."),
		icon: 'extensions',
		folder: '08 Marketplace',
		mainFile: 'marketplace.json',
		initialContent: () => json({
			schema: 1,
			installedPackages: [
				{ id: 'materials.metals.structural', version: '1.0.0', name: 'Structural Steels & Alloys' },
				{ id: 'templates.cantilever', version: '1.0.0', name: 'Cantilever Benchmark Template' }
			]
		})
	},
	{
		id: 'reports',
		label: localize('part.reports', "Reports & Exports"),
		description: localize('part.reportsDesc', "CAE validation reports, glTF 3D web exports, and VTU Paraview datasets."),
		icon: 'file-text',
		folder: '09 Reports',
		mainFile: 'reports.json',
		initialContent: () => json({
			schema: 1,
			exports: ['report.html', 'model.vtu', 'model.gltf']
		})
	}
];

export function partById(id: string): IProjectPart | undefined {
	return PROJECT_PARTS.find(p => p.id === id);
}

export interface IProjectManifest {
	readonly schema: number;
	readonly name: string;
	readonly created: string;
	readonly unitSystem: UnitSystem;
	readonly parts: readonly string[];
}

export function createManifest(name: string, unitSystem: UnitSystem = 'mm_N_MPa_tonne_s'): IProjectManifest {
	return {
		schema: PROJECT_MANIFEST_SCHEMA,
		name,
		created: new Date().toISOString(),
		unitSystem,
		parts: PROJECT_PARTS.map(p => p.id)
	};
}

export interface IMechastudioProject {
	readonly root: URI;
	readonly manifest: IProjectManifest;
	readonly manifestUri: URI;
}

export const IMAEngineProjectService = createDecorator<IMAEngineProjectService>('maengineProjectService');

export interface IMAEngineProjectService {
	readonly _serviceBrand: undefined;
	readonly project: IMechastudioProject | undefined;
	readonly onDidChangeProject: Event<IMechastudioProject | undefined>;
	findProject(folder: URI): Promise<IMechastudioProject | undefined>;
	openProject(folder: URI): Promise<void>;
	createProject(targetFolder: URI, projectName: string, unitSystem: UnitSystem): Promise<IMechastudioProject>;
	isProtected(uri: URI): boolean;
}

