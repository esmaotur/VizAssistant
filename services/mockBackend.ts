import { DatasetStats } from "../types";

export const analyzeCSV = async (file: File): Promise<DatasetStats> => {
  return new Promise((resolve, reject) => {
    // PERFORMANCE OPTIMIZATION: 
    // Only read the first 50KB of the file. 
    // This allows instant analysis even for multi-gigabyte CSV files
    // because we only need headers and the first ~100 rows for the preview dashboard.
    const CHUNK_SIZE = 50 * 1024; // 50KB
    const blob = file.slice(0, CHUNK_SIZE);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        reject("Empty file");
        return;
      }

      // Handle potential cut-off line at the end of the chunk
      let lines = text.split('\n');
      if (file.size > CHUNK_SIZE) {
        lines.pop(); // Remove the last potentially incomplete line
      }
      lines = lines.filter(l => l.trim().length > 0);

      if (lines.length < 2) {
        reject("Invalid CSV: Not enough rows");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      // We estimate total row count based on file size if we only read a chunk
      const estimatedTotalRows = file.size > CHUNK_SIZE 
        ? Math.floor((file.size / CHUNK_SIZE) * lines.length) 
        : lines.length - 1;
        
      const colCount = headers.length;

      // Simple type inference based on first 5 rows
      const sampleRows = lines.slice(1, 6).map(row => row.split(','));
      
      const columns = headers.map((name, index) => {
        const values = sampleRows.map(row => row[index]?.trim());
        const isNumeric = values.every(val => !isNaN(Number(val)) && val !== '');
        
        // Count unique values in available rows for simple heuristic
        const allValuesInCol = lines.slice(1, 101).map(l => l.split(',')[index]?.trim());
        const uniqueCount = new Set(allValuesInCol).size;
        
        return {
          name,
          type: (isNumeric ? 'numeric' : 'categorical') as 'numeric' | 'categorical',
          uniqueCount,
          sample: values.slice(0, 3)
        };
      });

      // Parse data for visualization (limit to 100 rows)
      const dataLimit = 100;
      const data = lines.slice(1, dataLimit + 1).map(line => {
        const values = line.split(',');
        const obj: Record<string, string | number> = {};
        headers.forEach((h, i) => {
           const val = values[i]?.trim();
           // Attempt to convert to number if it looks like one
           obj[h] = !isNaN(Number(val)) && val !== '' ? Number(val) : val;
        });
        return obj;
      });

      // Reduced simulated delay from 1000ms to 100ms for snappier UI
      setTimeout(() => {
        resolve({
          rowCount: estimatedTotalRows,
          colCount,
          columns,
          data
        });
      }, 100);
    };
    reader.readAsText(blob);
  });
};