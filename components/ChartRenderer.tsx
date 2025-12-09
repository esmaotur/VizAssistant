import React, { useMemo } from 'react';
import { ChartTypeId, DatasetStats } from '../types';

interface ChartRendererProps {
  type: ChartTypeId;
  data: Record<string, any>[];
  columns: DatasetStats['columns'];
}

// --- Helpers ---

// Maps a value from data domain [min, max] to pixel range [outMin, outMax]
const scale = (val: number, min: number, max: number, outMin: number, outMax: number) => {
  if (max === min) return (outMin + outMax) / 2;
  return outMin + ((val - min) / (max - min)) * (outMax - outMin);
};

const getQuantiles = (data: number[]) => {
  if (data.length === 0) return { min: 0, q1: 0, median: 0, q3: 0, max: 0 };
  const sorted = [...data].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: sorted[Math.floor(sorted.length * 0.25)],
    median: sorted[Math.floor(sorted.length * 0.5)],
    q3: sorted[Math.floor(sorted.length * 0.75)],
    max: sorted[sorted.length - 1]
  };
};

const getDensity = (data: number[], binCount = 30) => {
  if (data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const bins = Array(binCount).fill(0);
  
  data.forEach(v => {
    const idx = Math.min(Math.floor(((v - min) / range) * binCount), binCount - 1);
    bins[idx]++;
  });
  
  // Smoothing (Moving Average)
  const smoothed = bins.map((val, i, arr) => {
    const prev = arr[i - 1] || val;
    const next = arr[i + 1] || val;
    return (prev + val * 2 + next) / 4;
  });

  return smoothed.map((val, i) => ({
    x: min + (i / binCount) * range,
    y: val
  }));
};

const calculateCorrelation = (x: number[], y: number[]) => {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
};

const ChartRenderer: React.FC<ChartRendererProps> = ({ type, data, columns }) => {
  
  // --- Constants ---
  const width = 600;
  const height = 350;
  const padding = 60; // Increased padding for labels
  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  // --- Data Processing ---
  const processed = useMemo(() => {
    const numCols = columns.filter(c => c.type === 'numeric').map(c => c.name);
    const catCols = columns.filter(c => c.type === 'categorical').map(c => c.name);

    // Helpers to safely get numbers
    const getNums = (col: string) => data.map(d => Number(d[col])).filter(n => !isNaN(n));

    // 1. Histogram & Density
    if ((type === ChartTypeId.HISTOGRAM || type === ChartTypeId.DENSITY) && numCols.length > 0) {
      const col = numCols[0];
      const vals = getNums(col);
      const min = Math.min(...vals);
      const max = Math.max(...vals);

      if (type === ChartTypeId.DENSITY) {
        return { type: 'density', points: getDensity(vals), xLabel: col, range: [min, max] };
      }
      
      const binCount = 15;
      const binSize = (max - min) / binCount || 1;
      const bins = Array(binCount).fill(0);
      vals.forEach(v => {
        const idx = Math.min(Math.floor((v - min) / binSize), binCount - 1);
        bins[idx]++;
      });
      return { 
        type: 'bar', values: bins, 
        labels: bins.map((_, i) => (min + i * binSize).toFixed(1)),
        xLabel: col, yLabel: 'Count'
      };
    }

    // 2. Bar (Categorical)
    if (type === ChartTypeId.BAR && catCols.length > 0 && numCols.length > 0) {
      const cat = catCols[0];
      const num = numCols[0];
      const groups: Record<string, number> = {};
      
      data.forEach(d => {
        const k = String(d[cat]);
        const v = Number(d[num]) || 0;
        groups[k] = (groups[k] || 0) + v;
      });

      const keys = Object.keys(groups).slice(0, 8); // Top 8
      return { 
        type: 'bar', 
        values: keys.map(k => groups[k]), 
        labels: keys, 
        xLabel: cat, yLabel: num 
      };
    }

    // 3. Line & Area
    if ((type === ChartTypeId.LINE || type === ChartTypeId.AREA) && numCols.length > 0) {
      const yCol = numCols[0];
      const xCol = numCols.length > 1 ? numCols[1] : (data[0]['date'] ? 'date' : 'Index');
      const vals = data.slice(0, 50).map((d, i) => Number(d[yCol]) || 0);
      const labels = data.slice(0, 50).map((d, i) => xCol === 'Index' ? i : String(d[xCol]));
      
      return { 
        type: 'line', 
        values: vals, 
        labels: labels, 
        xLabel: xCol !== 'Index' ? xCol : 'Index', 
        yLabel: yCol,
        isArea: type === ChartTypeId.AREA
      };
    }

    // 4. Scatter
    if (type === ChartTypeId.SCATTER && numCols.length >= 2) {
      const xCol = numCols[0];
      const yCol = numCols[1];
      const points = data.slice(0, 100).map(d => ({ x: Number(d[xCol]), y: Number(d[yCol]) }));
      return { type: 'scatter', points, xLabel: xCol, yLabel: yCol };
    }

    // 5. Box & Violin
    if ((type === ChartTypeId.BOX || type === ChartTypeId.VIOLIN) && numCols.length > 0) {
      const numCol = numCols[0];
      const catCol = catCols.length > 0 ? catCols[0] : null;
      const groups: Record<string, number[]> = {};

      data.forEach(d => {
        const v = Number(d[numCol]);
        if (!isNaN(v)) {
          const k = catCol ? String(d[catCol]) : 'All';
          if (!groups[k]) groups[k] = [];
          groups[k].push(v);
        }
      });

      const keys = Object.keys(groups).slice(0, 5);
      
      if (type === ChartTypeId.VIOLIN) {
        const violins = keys.map(k => ({ label: k, density: getDensity(groups[k], 20) }));
        // Calculate global Y range for scaling
        const allVals = keys.flatMap(k => groups[k]);
        return { 
          type: 'violin', 
          data: violins, 
          yRange: [Math.min(...allVals), Math.max(...allVals)],
          xLabel: catCol || '', yLabel: numCol 
        };
      }

      const boxes = keys.map(k => ({ label: k, stats: getQuantiles(groups[k]) }));
      // Global range
      const min = Math.min(...boxes.map(b => b.stats.min));
      const max = Math.max(...boxes.map(b => b.stats.max));
      return { type: 'box', data: boxes, yRange: [min, max], xLabel: catCol || '', yLabel: numCol };
    }

    // 6. Ridgeline
    if (type === ChartTypeId.RIDGELINE && numCols.length > 0) {
      const numCol = numCols[0];
      const catCol = catCols.length > 0 ? catCols[0] : 'Category';
      const groups: Record<string, number[]> = {};

      data.forEach(d => {
        const v = Number(d[numCol]);
        if (!isNaN(v)) {
           const k = catCol !== 'Category' ? String(d[catCol]) : 'Group 1';
           if (!groups[k]) groups[k] = [];
           groups[k].push(v);
        }
      });

      const keys = Object.keys(groups).slice(0, 5);
      const lines = keys.map(k => ({ label: k, points: getDensity(groups[k], 40) }));
      
      // Global X range
      const allVals = keys.flatMap(k => groups[k]);
      return { type: 'ridgeline', lines, xRange: [Math.min(...allVals), Math.max(...allVals)], xLabel: numCol };
    }

    // 7. Heatmap
    if (type === ChartTypeId.HEATMAP && numCols.length >= 2) {
      const cols = numCols.slice(0, 6);
      const matrix = [];
      for(let i=0; i<cols.length; i++) {
        for(let j=0; j<cols.length; j++) {
           matrix.push({
             x: cols[i], y: cols[j],
             value: calculateCorrelation(getNums(cols[i]), getNums(cols[j]))
           });
        }
      }
      return { type: 'heatmap', matrix, labels: cols, size: cols.length };
    }

    return null;
  }, [type, data, columns]);

  // --- Common Elements ---
  const AxisLines = () => (
    <>
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="2" />
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="2" />
    </>
  );

  const GridLinesHorizontal = ({ count = 5 }) => (
    <>
      {Array.from({ length: count }).map((_, i) => {
         const y = padding + (i / (count - 1)) * plotH;
         return <line key={i} x1={padding} y1={y} x2={width-padding} y2={y} stroke="#f1f5f9" strokeDasharray="4 4" />;
      })}
    </>
  );

  // --- Main Render Switch ---

  if (!processed) return <div className="text-slate-400 flex items-center justify-center h-full">Insufficient Data</div>;

  // 1. Heatmap
  if (processed.type === 'heatmap') {
    const { matrix, size, labels } = processed as any;
    const cellSize = Math.min(plotW, plotH) / size;
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans">
        {matrix.map((cell: any, i: number) => {
          const r = Math.floor(i / size);
          const c = i % size;
          const val = cell.value; // -1 to 1
          // Red (neg) -> White (0) -> Blue (pos)
          const fill = val > 0 
            ? `rgba(99, 102, 241, ${Math.abs(val)})` // Indigo
            : `rgba(244, 63, 94, ${Math.abs(val)})`; // Rose
          
          return (
            <g key={i}>
              <rect x={padding + c * cellSize} y={padding + r * cellSize} width={cellSize-2} height={cellSize-2} fill={fill} rx="4" />
              <text 
                x={padding + c * cellSize + cellSize/2} y={padding + r * cellSize + cellSize/2 + 5} 
                textAnchor="middle" fill={Math.abs(val) > 0.5 ? "white" : "#475569"} fontSize="12" fontWeight="bold"
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}
        {/* Labels */}
        {(labels as string[]).map((l, i) => (
          <React.Fragment key={i}>
            <text x={padding + i * cellSize + cellSize/2} y={padding - 10} textAnchor="middle" fontSize="11" fill="#64748b" className="uppercase font-bold">{l.substring(0, 6)}</text>
            <text x={padding - 10} y={padding + i * cellSize + cellSize/2} textAnchor="end" fontSize="11" fill="#64748b" className="uppercase font-bold">{l.substring(0, 6)}</text>
          </React.Fragment>
        ))}
      </svg>
    );
  }

  // 2. Bar (Includes Histogram)
  if (processed.type === 'bar') {
    const { values, labels, xLabel, yLabel } = processed as any;
    const maxVal = Math.max(...(values as number[]));
    const barW = (plotW / values.length) * 0.7;
    const gap = (plotW / values.length) * 0.3;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans">
        <GridLinesHorizontal />
        <AxisLines />
        {values.map((v: number, i: number) => {
           const barH = scale(v, 0, maxVal, 0, plotH);
           const x = padding + gap/2 + i * (barW + gap);
           const y = height - padding - barH;
           return (
             <g key={i} className="group">
               <rect x={x} y={y} width={barW} height={barH} fill="url(#barGrad)" rx="4" className="hover:opacity-80 transition-opacity" />
               <text x={x + barW/2} y={y - 5} textAnchor="middle" fontSize="10" fill="#64748b" opacity="0" className="group-hover:opacity-100 transition-opacity">{v}</text>
             </g>
           );
        })}
        {/* X Labels */}
        {values.length < 12 && labels.map((l: string, i: number) => (
           <text key={i} x={padding + gap/2 + i * (barW + gap) + barW/2} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#64748b">
             {l.substring(0, 6)}
           </text>
        ))}
        {/* Axis Titles */}
        <text x={width/2} y={height - 15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#475569">{xLabel}</text>
        <text x={15} y={height/2} textAnchor="middle" transform={`rotate(-90, 15, ${height/2})`} fontSize="12" fontWeight="bold" fill="#475569">{yLabel}</text>
        
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 3. Line / Area
  if (processed.type === 'line') {
    const { values, labels, xLabel, yLabel, isArea } = processed as any;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const points = values.map((v: number, i: number) => {
       const x = scale(i, 0, values.length - 1, padding, width - padding);
       const y = scale(v, min, max, height - padding, padding);
       return `${x},${y}`;
    }).join(' ');

    const areaPath = `${padding},${height-padding} ${points} ${width-padding},${height-padding}`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans">
        <GridLinesHorizontal />
        <AxisLines />
        
        {isArea && <polygon points={areaPath} fill="rgba(99, 102, 241, 0.2)" />}
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Max/Min Labels on Y Axis */}
        <text x={padding - 10} y={padding} textAnchor="end" fontSize="10" fill="#94a3b8">{max.toFixed(1)}</text>
        <text x={padding - 10} y={height - padding} textAnchor="end" fontSize="10" fill="#94a3b8">{min.toFixed(1)}</text>
        
        <text x={width/2} y={height - 15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#475569">{xLabel}</text>
        <text x={15} y={height/2} textAnchor="middle" transform={`rotate(-90, 15, ${height/2})`} fontSize="12" fontWeight="bold" fill="#475569">{yLabel}</text>
      </svg>
    );
  }

  // 4. Scatter
  if (processed.type === 'scatter') {
    const { points, xLabel, yLabel } = processed as any;
    const xVals = points.map((p:any) => p.x);
    const yVals = points.map((p:any) => p.y);
    const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
    const yMin = Math.min(...yVals), yMax = Math.max(...yVals);

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans">
        <GridLinesHorizontal />
        <AxisLines />
        {points.map((p: any, i: number) => (
           <circle 
             key={i}
             cx={scale(p.x, xMin, xMax, padding, width-padding)}
             cy={scale(p.y, yMin, yMax, height-padding, padding)}
             r="5"
             fill="rgba(236, 72, 153, 0.6)"
             className="hover:r-7 transition-all"
           />
        ))}
        {/* Axis Text */}
        <text x={width-padding} y={height - 15} textAnchor="end" fontSize="10" fill="#94a3b8">{xMax.toFixed(1)}</text>
        <text x={padding} y={height - 15} textAnchor="start" fontSize="10" fill="#94a3b8">{xMin.toFixed(1)}</text>
        <text x={padding - 10} y={padding} textAnchor="end" fontSize="10" fill="#94a3b8">{yMax.toFixed(1)}</text>
        
        <text x={width/2} y={height - 15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#475569">{xLabel}</text>
        <text x={15} y={height/2} textAnchor="middle" transform={`rotate(-90, 15, ${height/2})`} fontSize="12" fontWeight="bold" fill="#475569">{yLabel}</text>
      </svg>
    );
  }

  // 5. Box Plot
  if (processed.type === 'box') {
     const { data, yRange, xLabel, yLabel } = processed as any;
     const [min, max] = yRange;
     const boxW = plotW / data.length;

     return (
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans">
         <GridLinesHorizontal />
         <AxisLines />
         {data.map((d: any, i: number) => {
           const cx = padding + i * boxW + boxW/2;
           const s = d.stats;
           const yMax = scale(s.max, min, max, height-padding, padding);
           const yMin = scale(s.min, min, max, height-padding, padding);
           const yQ3 = scale(s.q3, min, max, height-padding, padding);
           const yQ1 = scale(s.q1, min, max, height-padding, padding);
           const yMed = scale(s.median, min, max, height-padding, padding);
           const w = boxW * 0.4;
           
           return (
             <g key={i}>
                <line x1={cx} y1={yMax} x2={cx} y2={yQ3} stroke="#475569" />
                <line x1={cx} y1={yMin} x2={cx} y2={yQ1} stroke="#475569" />
                <rect x={cx - w} y={yQ3} width={w*2} height={Math.abs(yQ1 - yQ3)} fill="rgba(129, 140, 248, 0.5)" stroke="#6366f1" />
                <line x1={cx - w} y1={yMed} x2={cx + w} y2={yMed} stroke="#312e81" strokeWidth="2" />
                <text x={cx} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#64748b">{d.label.substring(0,8)}</text>
             </g>
           );
         })}
         <text x={padding - 10} y={padding} textAnchor="end" fontSize="10" fill="#94a3b8">{max.toFixed(1)}</text>
         <text x={padding - 10} y={height - padding} textAnchor="end" fontSize="10" fill="#94a3b8">{min.toFixed(1)}</text>
         <text x={15} y={height/2} textAnchor="middle" transform={`rotate(-90, 15, ${height/2})`} fontSize="12" fontWeight="bold" fill="#475569">{yLabel}</text>
       </svg>
     );
  }

  // 6. Violin Plot
  if (processed.type === 'violin') {
    const { data, yRange, yLabel } = processed as any;
    const [minY, maxY] = yRange;
    const sectionW = plotW / data.length;

    // Find max density globally to scale width properly
    const maxDensity = Math.max(...data.flatMap((d:any) => d.density.map((p:any) => p.y)));

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans">
        <AxisLines />
        {data.map((d: any, i: number) => {
          const cx = padding + i * sectionW + sectionW/2;
          const points = d.density;

          // Build path
          const right = points.map((p:any) => {
             const y = scale(p.x, minY, maxY, height-padding, padding);
             const xOff = (p.y / maxDensity) * (sectionW * 0.45);
             return `${cx + xOff},${y}`;
          });
          const left = points.reverse().map((p:any) => {
            const y = scale(p.x, minY, maxY, height-padding, padding);
            const xOff = (p.y / maxDensity) * (sectionW * 0.45);
            return `${cx - xOff},${y}`;
         });

         return (
           <g key={i}>
             <path d={`M ${cx},${height-padding} L ${right.join(' L ')} L ${cx},${padding} L ${left.join(' L ')} Z`} fill="rgba(236, 72, 153, 0.4)" stroke="#db2777" />
             <text x={cx} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#64748b">{d.label.substring(0,8)}</text>
           </g>
         );
        })}
        <text x={15} y={height/2} textAnchor="middle" transform={`rotate(-90, 15, ${height/2})`} fontSize="12" fontWeight="bold" fill="#475569">{yLabel}</text>
      </svg>
    );
  }

  // 7. Ridgeline
  if (processed.type === 'ridgeline') {
    const { lines, xRange, xLabel } = processed as any;
    const [minX, maxX] = xRange;
    const layerH = plotH / (lines.length + 1);
    const maxFreq = Math.max(...lines.flatMap((l:any) => l.points.map((p:any) => p.y)));

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans">
         {lines.map((l: any, i: number) => {
           const yBase = height - padding - (i * layerH * 0.7);
           const polyPoints = l.points.map((p: any) => {
             const x = scale(p.x, minX, maxX, padding, width-padding);
             const y = yBase - (p.y / maxFreq) * layerH * 2.5; // Amplify
             return `${x},${y}`;
           }).join(' ');

           return (
             <g key={i}>
               <polygon points={`${padding},${yBase} ${polyPoints} ${width-padding},${yBase}`} fill="rgba(20, 184, 166, 0.6)" stroke="#0d9488" />
               <text x={padding - 10} y={yBase} textAnchor="end" fontSize="10" fontWeight="bold" fill="#475569">{l.label.substring(0,8)}</text>
             </g>
           );
         })}
         <text x={width/2} y={height - 15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#475569">{xLabel}</text>
      </svg>
    );
  }
  
  // 8. Density (Simple)
  if (processed.type === 'density') {
     const { points, range, xLabel } = processed as any;
     const maxFreq = Math.max(...points.map((p:any) => p.y));
     
     const svgPoints = points.map((p:any) => {
        const x = scale(p.x, range[0], range[1], padding, width-padding);
        const y = scale(p.y, 0, maxFreq, height-padding, padding);
        return `${x},${y}`;
     }).join(' ');

     return (
       <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full font-sans">
          <defs>
             <linearGradient id="densGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.1" />
             </linearGradient>
          </defs>
          <AxisLines />
          <polygon points={`${padding},${height-padding} ${svgPoints} ${width-padding},${height-padding}`} fill="url(#densGrad)" />
          <polyline points={svgPoints} fill="none" stroke="#d97706" strokeWidth="2" />
          <text x={width/2} y={height - 15} textAnchor="middle" fontSize="12" fontWeight="bold" fill="#475569">{xLabel}</text>
       </svg>
     );
  }

  return <div>Rendering...</div>;
};

export default ChartRenderer;