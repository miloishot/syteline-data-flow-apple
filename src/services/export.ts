import { Job, FilterValues } from "../types";
import * as XLSX from 'xlsx';

// Export service - equivalent to your Python export_data function
export class ExportService {
  static async exportData(
    items: any[],
    jobName: string,
    outputFormat: string = "csv",
    outputDir?: string
  ): Promise<{ filePath: string; recordCount: number }> {
    if (!items || items.length === 0) {
      throw new Error("No data to export");
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split(".")[0];
    const fileName = `${jobName}_${timestamp}.${outputFormat.toLowerCase()}`;
    
    let blob: Blob;
    let mimeType: string;

    if (outputFormat.toLowerCase() === "csv") {
      const csvContent = this.convertToCSV(items);
      blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      mimeType = "text/csv";
    } else if (outputFormat.toLowerCase() === "xlsx") {
      const workbook = this.convertToXLSX(items);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else {
      throw new Error(`Unsupported format: ${outputFormat}`);
    }

    // Download the file
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    const filePath = outputDir ? `${outputDir}/${fileName}` : fileName;
    return { filePath, recordCount: items.length };
  }

  private static convertToCSV(items: any[]): string {
    if (items.length === 0) return "";

    const headers = Object.keys(items[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.map(header => this.escapeCsvValue(header)).join(","));

    // Add data rows
    for (const item of items) {
      const values = headers.map(header => {
        const value = item[header];
        return this.escapeCsvValue(value);
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }

  private static escapeCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return "";
    }
    
    const stringValue = String(value);
    
    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  private static convertToXLSX(items: any[]): XLSX.WorkBook {
    const worksheet = XLSX.utils.json_to_sheet(items);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    return workbook;
  }
}

// Filter utilities - equivalent to your Python build_filters_from_values function
export class FilterUtils {
  static buildFiltersFromValues(
    filterableFields: Job["filterable_fields"],
    values: FilterValues
  ): { filter: string; error?: string } {
    const filters: string[] = [];

    for (const field of filterableFields) {
      const val = values[field.name]?.trim();
      if (!val) {
        continue; // Skip empty fields
      }

      if (field.type === "date") {
        try {
          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(val)) {
            return { filter: "", error: `Invalid date format for ${field.name}: ${val}. Expected YYYY-MM-DD` };
          }
          
          // Try to parse the date
          const date = new Date(val);
          if (isNaN(date.getTime())) {
            return { filter: "", error: `Invalid date for ${field.name}: ${val}` };
          }
          
          filters.push(`${field.name} ${field.operator} '${val}'`);
        } catch (error) {
          return { filter: "", error: `Invalid date for ${field.name}: ${val}` };
        }
      } else if (field.type === "number") {
        try {
          const numVal = parseFloat(val);
          if (isNaN(numVal)) {
            return { filter: "", error: `Invalid number for ${field.name}: ${val}` };
          }
          filters.push(`${field.name} ${field.operator} ${numVal}`);
        } catch (error) {
          return { filter: "", error: `Invalid number for ${field.name}: ${val}` };
        }
      } else {
        // String field
        filters.push(`${field.name} ${field.operator} '${val}'`);
      }
    }

    return { filter: filters.length > 0 ? filters.join(" AND ") : "" };
  }

  static validateFilterValue(field: Job["filterable_fields"][0], value: string): string | null {
    if (!value.trim()) {
      return null; // Empty values are allowed
    }

    if (field.type === "date") {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(value)) {
        return "Date must be in YYYY-MM-DD format";
      }
      
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
    } else if (field.type === "number") {
      const numVal = parseFloat(value);
      if (isNaN(numVal)) {
        return "Must be a valid number";
      }
    }

    return null; // Valid
  }
}