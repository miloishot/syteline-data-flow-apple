// Electron-specific services for file operations
export class ElectronFileService {
  static isElectron(): boolean {
    return !!(window as any).electronAPI;
  }

  static async saveFile(data: string, defaultName: string, filters: any[] = []): Promise<string | null> {
    if (!this.isElectron()) {
      throw new Error("This method is only available in Electron");
    }

    const electronAPI = (window as any).electronAPI;
    
    const result = await electronAPI.showSaveDialog({
      defaultPath: defaultName,
      filters: filters.length > 0 ? filters : [
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return null;
    }

    const writeResult = await electronAPI.writeFile(result.filePath, data);
    if (!writeResult.success) {
      throw new Error(`Failed to save file: ${writeResult.error}`);
    }

    return result.filePath;
  }

  static async selectDirectory(): Promise<string | null> {
    if (!this.isElectron()) {
      throw new Error("This method is only available in Electron");
    }

    const electronAPI = (window as any).electronAPI;
    
    const result = await electronAPI.showOpenDialog({
      properties: ['openDirectory']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  }

  static async readFile(filePath: string): Promise<string> {
    if (!this.isElectron()) {
      throw new Error("This method is only available in Electron");
    }

    const electronAPI = (window as any).electronAPI;
    
    const result = await electronAPI.readFile(filePath);
    if (!result.success) {
      throw new Error(`Failed to read file: ${result.error}`);
    }

    return result.data;
  }

  static getPlatform(): string {
    if (!this.isElectron()) {
      return 'web';
    }

    return (window as any).electronAPI.platform;
  }

  static getVersion(): string {
    if (!this.isElectron()) {
      return '1.0.0';
    }

    return (window as any).electronAPI.getVersion();
  }
}