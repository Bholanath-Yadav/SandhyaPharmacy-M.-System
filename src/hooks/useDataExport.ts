import { useCallback } from 'react';
import * as XLSX from 'xlsx';

interface ExportOptions {
  filename: string;
  title?: string;
  dateRange?: { from: string; to: string };
}

export function useDataExport() {
  const exportToJSON = useCallback((data: any[], options: ExportOptions) => {
    const exportData = {
      exportDate: new Date().toISOString(),
      dateRange: options.dateRange,
      title: options.title || options.filename,
      records: data,
      totalRecords: data.length,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${options.filename}.json`);
  }, []);

  const exportToCSV = useCallback((data: any[], options: ExportOptions) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${options.filename}.csv`);
  }, []);

  const exportToExcel = useCallback((data: any[], options: ExportOptions) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, options.title || 'Data');
    
    // Auto-size columns
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(
        key.length,
        ...data.map(row => String(row[key] || '').length)
      ) + 2
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `${options.filename}.xlsx`);
  }, []);

  const exportToPDF = useCallback(async (data: any[], options: ExportOptions) => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Create a printable HTML table and use browser's print to PDF
    const headers = Object.keys(data[0]);
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${options.title || options.filename}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #333; font-size: 18px; margin-bottom: 5px; }
          .subtitle { color: #666; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f0f0f0; border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 600; }
          td { border: 1px solid #ddd; padding: 8px; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 20px; font-size: 10px; color: #666; }
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        <h1>${options.title || options.filename}</h1>
        ${options.dateRange ? `<div class="subtitle">Period: ${options.dateRange.from} to ${options.dateRange.to}</div>` : ''}
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${formatHeader(h)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>${headers.map(h => `<td>${formatValue(row[h])}</td>`).join('')}</tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Records: ${data.length}</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  }, []);

  const exportData = useCallback((
    format: 'json' | 'csv' | 'excel' | 'pdf',
    data: any[],
    options: ExportOptions
  ) => {
    switch (format) {
      case 'json':
        exportToJSON(data, options);
        break;
      case 'csv':
        exportToCSV(data, options);
        break;
      case 'excel':
        exportToExcel(data, options);
        break;
      case 'pdf':
        exportToPDF(data, options);
        break;
    }
  }, [exportToJSON, exportToCSV, exportToExcel, exportToPDF]);

  return { exportData, exportToJSON, exportToCSV, exportToExcel, exportToPDF };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatHeader(header: string): string {
  return header
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}
