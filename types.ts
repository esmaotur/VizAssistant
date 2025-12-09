import React from 'react';

export type VisualizationMode = 'CSV' | 'IMAGE' | null;

export enum ChartTypeId {
  HISTOGRAM = 'histogram',
  BAR = 'bar',
  BOX = 'box',
  VIOLIN = 'violin',
  SCATTER = 'scatter',
  LINE = 'line',
  DENSITY = 'density',
  RIDGELINE = 'ridgeline',
  HEATMAP = 'heatmap',
  AREA = 'area',
}

export interface ChartDefinition {
  id: ChartTypeId;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
}

export interface DatasetStats {
  rowCount: number;
  colCount: number;
  columns: {
    name: string;
    type: 'numeric' | 'categorical' | 'date' | 'unknown';
    uniqueCount: number;
    sample: string[];
  }[];
  data: Record<string, string | number>[]; // Store parsed data for visualization
}

export interface DetectionResult {
  chartType: string;
  confidence: number;
  explanation: string;
  rCode: string;
  pythonCode: string;
}

export interface GeneratedCode {
  r: string;
  python: string;
  imageUrl?: string;
}