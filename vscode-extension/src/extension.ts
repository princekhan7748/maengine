import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
    console.log('MechaStudio extension is now active!');

    // 1. Initialize Language Server Protocol (pygls server)
    const pythonPath = getPythonInterpreterPath();
    const serverScript = context.asAbsolutePath(path.join('..', 'mechastudio', 'lsp', 'server.py'));

    if (fs.existsSync(serverScript)) {
        const serverOptions: ServerOptions = {
            command: pythonPath,
            args: [serverScript]
        };

        const clientOptions: LanguageClientOptions = {
            documentSelector: [{ scheme: 'file', language: 'calculix' }]
        };

        client = new LanguageClient(
            'mechastudioLSP',
            'MechaStudio Language Server',
            serverOptions,
            clientOptions
        );

        client.start();
    }

    // 2. Register Commands
    const runPipelineCmd = vscode.commands.registerCommand('mechastudio.runPipeline', async () => {
        const terminal = getOrCreateTerminal();
        terminal.show();
        terminal.sendText(`${pythonPath} examples/cantilever_beam/run_pipeline.py`);
    });

    const generateMeshCmd = vscode.commands.registerCommand('mechastudio.generateMesh', async () => {
        vscode.window.showInformationMessage('MechaStudio: Generating conformal 3D quadratic mesh via Gmsh...');
        const terminal = getOrCreateTerminal();
        terminal.show();
        terminal.sendText(`${pythonPath} -c "from mechastudio.pipeline import SimulationPipeline; SimulationPipeline.from_yaml('examples/cantilever_beam/simulation.yaml').generate_mesh()"`);
    });

    const solveCalculixCmd = vscode.commands.registerCommand('mechastudio.solveCalculix', async () => {
        vscode.window.showInformationMessage('MechaStudio: Launching CalculiX CrunchiX implicit solver...');
        const terminal = getOrCreateTerminal();
        terminal.show();
        terminal.sendText(`${pythonPath} -c "from mechastudio.pipeline import SimulationPipeline; SimulationPipeline.from_yaml('examples/cantilever_beam/simulation.yaml').solve()"`);
    });

    // 3. Register Model Tree View
    const treeDataProvider = new MechaStudioTreeDataProvider();
    vscode.window.registerTreeDataProvider('mechastudio.modelTree', treeDataProvider);

    context.subscriptions.push(runPipelineCmd, generateMeshCmd, solveCalculixCmd);
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) {
        return undefined;
    }
    return client.stop();
}

function getPythonInterpreterPath(): string {
    const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const venvPython = path.join(rootPath, '.venv', 'Scripts', 'python.exe');
    if (fs.existsSync(venvPython)) {
        return `"${venvPython}"`;
    }
    return 'python';
}

function getOrCreateTerminal(): vscode.Terminal {
    const name = 'MechaStudio Engine';
    const existing = vscode.window.terminals.find(t => t.name === name);
    return existing || vscode.window.createTerminal(name);
}

class MechaStudioTreeDataProvider implements vscode.TreeDataProvider<TreeItem> {
    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Thenable<TreeItem[]> {
        if (!element) {
            return Promise.resolve([
                new TreeItem('Geometry: beam.step', vscode.TreeItemCollapsibleState.None, 'file-media'),
                new TreeItem('Materials (1)', vscode.TreeItemCollapsibleState.Collapsed, 'symbol-structure'),
                new TreeItem('Mesh: Conformal TET10', vscode.TreeItemCollapsibleState.None, 'symbol-array'),
                new TreeItem('Steps: Tip_Load_Step', vscode.TreeItemCollapsibleState.Collapsed, 'play-circle'),
                new TreeItem('Boundary Conditions: Fixed', vscode.TreeItemCollapsibleState.None, 'lock'),
                new TreeItem('Loads: Tip Pressure (10 MPa)', vscode.TreeItemCollapsibleState.None, 'arrow-down'),
                new TreeItem('Results & Post-Processing', vscode.TreeItemCollapsibleState.None, 'graph-line')
            ]);
        }
        if (element.label === 'Materials (1)') {
            return Promise.resolve([
                new TreeItem('Structural_Steel (E=210 GPa, nu=0.3)', vscode.TreeItemCollapsibleState.None, 'shield')
            ]);
        }
        if (element.label === 'Steps: Tip_Load_Step') {
            return Promise.resolve([
                new TreeItem('Analysis Type: Static Linear', vscode.TreeItemCollapsibleState.None, 'gear'),
                new TreeItem('Solver: CalculiX CrunchiX', vscode.TreeItemCollapsibleState.None, 'cpu')
            ]);
        }
        return Promise.resolve([]);
    }
}

class TreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        iconName?: string
    ) {
        super(label, collapsibleState);
        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        }
    }
}
