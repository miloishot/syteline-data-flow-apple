import { ElectronFileService } from "./electron";
import { ExportService } from "./export";
import * as XLSX from 'xlsx';

// Enhanced export service for Electron with native file dialogs
export class ElectronExportService extends ExportService {
  static async exportData(
    items: any[],
    jobName: string,
    outputFormat: string = "csv",
    outputDir?: string
  ): Promise<{ filePath: string; recordCount: number }> {
    if (!items || items.length === 0) {
      throw new Error("No data to export");
    }

    // If running in Electron, use native file dialogs
    if (ElectronFileService.isElectron()) {
      return this.exportDataElectron(items, jobName, outputFormat, outputDir);
    }

    // Fallback to web export
    return super.exportData(items, jobName, outputFormat, outputDir);
  }

  private static async exportDataElectron(
    items: any[],
    jobName: string,
    outputFormat: string,
    outputDir?: string
  ): Promise<{ filePath: string; recordCount: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split(".")[0];
    const fileName = `${jobName}_${timestamp}.${outputFormat.toLowerCase()}`;
    
    let data: string;
    let filters: any[];

    if (outputFormat.toLowerCase() === "csv") {
      data = this.convertToCSV(items);
      filters = [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ];
    } else if (outputFormat.toLowerCase() === "xlsx") {
      const workbook = this.convertToXLSX(items);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'binary' });
      data = excelBuffer;
      filters = [
        { name: 'Excel Files', extensions: ['xlsx'] },
        { name: 'All Files', extensions: ['*'] }
      ];
    } else {
      throw new Error(`Unsupported format: ${outputFormat}`);
    }

    // Use native save dialog
    const defaultPath = outputDir ? `${outputDir}/${fileName}` : fileName;
    const filePath = await ElectronFileService.saveFile(data, defaultPath, filters);
    
    if (!filePath) {
      throw new Error("Export cancelled by user");
    }

    return { filePath, recordCount: items.length };
  }

  static async selectOutputDirectory(): Promise<string | null> {
    if (ElectronFileService.isElectron()) {
      return ElectronFileService.selectDirectory();
    }
    return null;
  }
}