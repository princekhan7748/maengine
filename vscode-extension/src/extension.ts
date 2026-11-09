import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
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
        terminal.sendText(`${pythonPath} -m mechastudio run examples/cantilever_beam/simulation.yaml`);
    });

    const generateMeshCmd = vscode.commands.registerCommand('mechastudio.generateMesh', async () => {
        vscode.window.showInformationMessage('MechaStudio: Generating conformal 3D quadratic mesh via Gmsh...');
        const terminal = getOrCreateTerminal();
        terminal.show();
        terminal.sendText(`${pythonPath} -m mechastudio mesh examples/cantilever_beam/simulation.yaml`);
    });

    const solveCalculixCmd = vscode.commands.registerCommand('mechastudio.solveCalculix', async () => {
        vscode.window.showInformationMessage('MechaStudio: Launching CalculiX CrunchiX implicit solver...');
        const terminal = getOrCreateTerminal();
        terminal.show();
        terminal.sendText(`${pythonPath} -m mechastudio solve examples/cantilever_beam/simulation.yaml`);
    });

    // 3. Register 3D Results Viewport Command
    const viewResultsCmd = vscode.commands.registerCommand('mechastudio.viewResults', async () => {
        const panel = vscode.window.createWebviewPanel(
            'mechastudioResults',
            'MechaStudio: 3D Simulation Viewport',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.file(context.extensionPath),
                    vscode.Uri.file(path.join(context.extensionPath, '..'))
                ]
            }
        );

        const htmlPath = path.join(context.extensionPath, 'webview', 'results_viewer.html');
        if (fs.existsSync(htmlPath)) {
            panel.webview.html = fs.readFileSync(htmlPath, 'utf8');
        } else {
            panel.webview.html = `<h3>Error: results_viewer.html not found</h3>`;
        }

        // Send Cantilever Beam simulation results data if available
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        const gltfFile = path.join(rootPath, 'examples', 'cantilever_beam', 'sim_output', 'results.gltf');
        if (fs.existsSync(gltfFile)) {
            const gltfUri = panel.webview.asWebviewUri(vscode.Uri.file(gltfFile));
            panel.webview.postMessage({
                command: 'loadModel',
                gltfUrl: gltfUri.toString(),
                summary: {
                    max_stress: '3,918.36',
                    max_disp: '12.41'
                }
            });
        }
    });

    // 4. Register Simulation Marketplace Command
    const openMarketplaceCmd = vscode.commands.registerCommand('mechastudio.openMarketplace', async () => {
        const panel = vscode.window.createWebviewPanel(
            'mechastudioMarketplace',
            'MechaStudio: Simulation Marketplace',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const htmlPath = path.join(context.extensionPath, 'webview', 'marketplace_viewer.html');
        if (fs.existsSync(htmlPath)) {
            panel.webview.html = fs.readFileSync(htmlPath, 'utf8');
        } else {
            panel.webview.html = `<h3>Error: marketplace_viewer.html not found</h3>`;
        }

        // Handle install / uninstall actions from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'installPackage') {
                const packageId = message.packageId;
                vscode.window.showInformationMessage(`MechaStudio Marketplace: Installing ${packageId}...`);
                exec(`${pythonPath} -m mechastudio marketplace install ${packageId}`, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Installation failed: ${stderr || error.message}`);
                    } else {
                        vscode.window.showInformationMessage(`Successfully installed template '${packageId}'!`);
                        syncMarketplaceCatalog(panel, pythonPath);
                    }
                });
            } else if (message.command === 'uninstallPackage') {
                const packageId = message.packageId;
                vscode.window.showInformationMessage(`MechaStudio Marketplace: Removing ${packageId}...`);
                exec(`${pythonPath} -m mechastudio marketplace uninstall ${packageId}`, (error, stdout, stderr) => {
                    if (error) {
                        vscode.window.showErrorMessage(`Removal failed: ${stderr || error.message}`);
                    } else {
                        vscode.window.showInformationMessage(`Removed package '${packageId}'.`);
                        syncMarketplaceCatalog(panel, pythonPath);
                    }
                });
            }
        });

        // Initial sync of marketplace catalog
        syncMarketplaceCatalog(panel, pythonPath);
    });

    // 5. Register Model Tree View
    const treeDataProvider = new MechaStudioTreeDataProvider();
    vscode.window.registerTreeDataProvider('mechastudio.modelTree', treeDataProvider);

    context.subscriptions.push(
        runPipelineCmd,
        generateMeshCmd,
        solveCalculixCmd,
        viewResultsCmd,
        openMarketplaceCmd
    );
}

function syncMarketplaceCatalog(panel: vscode.WebviewPanel, pythonPath: string) {
    exec(`${pythonPath} -m mechastudio marketplace export-json`, (error, stdout) => {
        if (!error && stdout) {
            try {
                const packages = JSON.parse(stdout);
                panel.webview.postMessage({
                    command: 'updateCatalog',
                    packages: packages
                });
            } catch (e) {
                console.error('Failed to parse marketplace JSON:', e);
            }
        }
    });
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
                new TreeItem('Results & Post-Processing', vscode.TreeItemCollapsibleState.None, 'graph-line', 'mechastudio.viewResults'),
                new TreeItem('Simulation Marketplace (Hub)', vscode.TreeItemCollapsibleState.None, 'extensions', 'mechastudio.openMarketplace')
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
        iconName?: string,
        commandId?: string
    ) {
        super(label, collapsibleState);
        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        }
        if (commandId) {
            this.command = {
                command: commandId,
                title: label
            };
        }
    }
}
