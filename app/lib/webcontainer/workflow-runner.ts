import { WebContainer } from '@webcontainer/api';
import type { FileSystemTree } from '@webcontainer/api';

interface WorkflowFiles {
  [path: string]: string;
}

export class WorkflowRunner {
  private webcontainer: WebContainer | null = null;
  private serverProcess: any = null;
  
  async initialize(): Promise<WebContainer> {
    if (!this.webcontainer) {
      this.webcontainer = await WebContainer.boot();
    }
    return this.webcontainer;
  }
  
  async mountWorkflow(files: WorkflowFiles): Promise<void> {
    const container = await this.initialize();
    
    // Convert flat file structure to FileSystemTree
    const fileTree = this.convertToFileSystemTree(files);
    
    // Mount the files
    await container.mount(fileTree);
  }
  
  async installDependencies(): Promise<void> {
    const container = await this.initialize();
    
    // Install npm dependencies
    const installProcess = await container.spawn('npm', ['install']);
    
    installProcess.output.pipeTo(new WritableStream({
      write(data) {
        console.log('[npm install]', data);
      }
    }));
    
    // Wait for install to complete
    const exitCode = await installProcess.exit;
    if (exitCode !== 0) {
      throw new Error(`npm install failed with exit code ${exitCode}`);
    }
  }
  
  async startServer(): Promise<string> {
    const container = await this.initialize();
    
    // Kill existing server if running
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    
    // Start the workflow server
    this.serverProcess = await container.spawn('npm', ['run', 'dev']);
    
    this.serverProcess.output.pipeTo(new WritableStream({
      write(data) {
        console.log('[workflow server]', data);
      }
    }));
    
    // Wait for server to be ready
    const url = await new Promise<string>((resolve) => {
      container.on('server-ready', (port, url) => {
        console.log(`Workflow server ready at ${url}`);
        resolve(url);
      });
    });
    
    return url;
  }
  
  async updateFile(path: string, content: string): Promise<void> {
    const container = await this.initialize();
    await container.fs.writeFile(path, content);
  }
  
  async restartServer(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      await this.startServer();
    }
  }
  
  private convertToFileSystemTree(files: WorkflowFiles): FileSystemTree {
    const tree: FileSystemTree = {};
    
    for (const [path, content] of Object.entries(files)) {
      const parts = path.split('/');
      let current = tree;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        current = (current[part] as any).directory;
      }
      
      const filename = parts[parts.length - 1];
      current[filename] = {
        file: { contents: content }
      };
    }
    
    return tree;
  }
  
  async destroy(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
    }
    // WebContainer cleanup happens automatically
  }
}

// Singleton instance
export const workflowRunner = new WorkflowRunner();