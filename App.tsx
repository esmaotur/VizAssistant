import React, { useState } from 'react';
import { 
  BarChart, Image, UploadCloud, FileText, ChevronRight, 
  ArrowLeft, Code, Download, CheckCircle, AlertCircle, TrendingUp, Camera 
} from 'lucide-react';
import Button from './components/Button';
import Card from './components/Card';
import ChartRenderer from './components/ChartRenderer';
import { CHART_TYPES, R_TEMPLATES, PYTHON_TEMPLATES } from './constants';
import { VisualizationMode, DatasetStats, ChartDefinition, DetectionResult } from './types';
import { analyzeCSV } from './services/mockBackend';
import geminiService from './services/geminiService';

// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [mode, setMode] = useState<VisualizationMode>(null);

  // CSV State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null);
  const [isAnalyzingCsv, setIsAnalyzingCsv] = useState(false);
  const [selectedChart, setSelectedChart] = useState<ChartDefinition | null>(null);

  // Image Detection State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Shared State
  const [activeTab, setActiveTab] = useState<'R' | 'Python'>('R');
  
  // API Key Modal
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // --- HANDLERS ---

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCsvFile(file);
      setIsAnalyzingCsv(true);
      try {
        const stats = await analyzeCSV(file);
        setDatasetStats(stats);
      } catch (err) {
        alert("Error analyzing CSV: " + err);
      } finally {
        setIsAnalyzingCsv(false);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImageFile(null);
    setImagePreview(null);
    setDetectionResult(null);
    // Reset input value to allow re-selecting same file
    const input = document.getElementById('img-upload') as HTMLInputElement;
    if(input) input.value = '';
  };

  const runDetection = async () => {
    if (!imagePreview) return;
    
    // Check for API key if not in env (frontend simulation)
    if (!process.env.API_KEY && !window.sessionStorage.getItem('gemini_key')) {
        setShowApiKeyModal(true);
        return;
    }
    
    // Inject key dynamically if needed for the demo
    if (window.sessionStorage.getItem('gemini_key')) {
        process.env.API_KEY = window.sessionStorage.getItem('gemini_key') || '';
    }

    setIsDetecting(true);
    try {
      const result = await geminiService.detectChartType(imagePreview);
      setDetectionResult(result);
    } catch (error) {
      alert("Detection failed. Please check your API Key.");
    } finally {
      setIsDetecting(false);
    }
  };

  const saveApiKey = () => {
      if(apiKeyInput.length > 10) {
          window.sessionStorage.setItem('gemini_key', apiKeyInput);
          setShowApiKeyModal(false);
          runDetection(); // Retry
      }
  };

  const resetAll = () => {
    setMode(null);
    setCsvFile(null);
    setDatasetStats(null);
    setSelectedChart(null);
    setImageFile(null);
    setImagePreview(null);
    setDetectionResult(null);
  };

  // --- RENDERERS ---

  if (mode === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center space-y-8 animate-fade-in-up">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-pink-600 tracking-tight">
              Visualization Assistant
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              Your AI-powered companion for generating beautiful plots from data and decoding complex charts from images.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <Card 
              hoverEffect 
              onClick={() => setMode('CSV')}
              className="group flex flex-col items-center text-center p-10 border-2 border-transparent hover:border-indigo-200"
            >
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart className="text-indigo-600 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">CSV Analysis Mode</h3>
              <p className="text-slate-500 mb-6">
                Upload a dataset, get automatic summaries, and generate R/Python visualization code for 10+ chart types.
              </p>
              <Button variant="primary" className="w-full">Start Visualization</Button>
            </Card>

            <Card 
              hoverEffect 
              onClick={() => setMode('IMAGE')}
              className="group flex flex-col items-center text-center p-10 border-2 border-transparent hover:border-pink-200"
            >
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Image className="text-pink-600 w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Image Detection Mode</h3>
              <p className="text-slate-500 mb-6">
                Upload a chart image. AI will detect its type, explain it, and generate the code to recreate it.
              </p>
              <Button variant="secondary" className="w-full">Detect Chart</Button>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- CSV MODE ---
  if (mode === 'CSV') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 font-sans">
        <header className="max-w-7xl mx-auto flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={resetAll} className="!px-2">
              <ArrowLeft size={20} />
            </Button>
            <h2 className="text-2xl font-bold text-slate-800">CSV Visualization</h2>
          </div>
        </header>

        <main className="max-w-7xl mx-auto space-y-8">
          
          {/* STEP 1: UPLOAD */}
          {!datasetStats && (
            <Card className="max-w-2xl mx-auto py-16 text-center border-dashed border-2 border-indigo-200">
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-indigo-50 rounded-full">
                  <UploadCloud className="w-12 h-12 text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700">Upload your CSV Dataset</h3>
                <p className="text-slate-500">Drag and drop or click to browse</p>
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden" 
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button as="span" variant="primary" isLoading={isAnalyzingCsv} onClick={() => document.getElementById('csv-upload')?.click()}>
                    Select File
                  </Button>
                </label>
              </div>
            </Card>
          )}

          {/* STEP 2: SUMMARY & SELECTION */}
          {datasetStats && !selectedChart && (
            <div className="space-y-8 animate-fade-in">
              {/* Dataset Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                  <p className="opacity-80 text-sm font-medium">Total Rows</p>
                  <p className="text-3xl font-bold">{datasetStats.rowCount.toLocaleString()}</p>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                  <p className="opacity-80 text-sm font-medium">Total Columns</p>
                  <p className="text-3xl font-bold">{datasetStats.colCount}</p>
                </Card>
                <div className="md:col-span-2">
                  <Card className="h-full flex flex-col justify-center">
                    <p className="text-sm text-slate-500 mb-2 font-medium uppercase tracking-wider">Detected Columns</p>
                    <div className="flex flex-wrap gap-2">
                      {datasetStats.columns.map(col => (
                        <span key={col.name} className={`px-2 py-1 rounded text-xs font-medium border ${col.type === 'numeric' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {col.name} ({col.type})
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Chart Grid */}
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <TrendingUp className="text-indigo-600" /> Recommended Visualizations
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {CHART_TYPES.map((chart) => (
                    <Card 
                      key={chart.id} 
                      hoverEffect 
                      onClick={() => setSelectedChart(chart)}
                      className="group relative overflow-hidden"
                    >
                      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 bg-gradient-to-br ${chart.gradient}`} />
                      
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 text-white bg-gradient-to-br ${chart.gradient}`}>
                        {chart.icon}
                      </div>
                      <h4 className="text-lg font-bold text-slate-800 mb-2">{chart.name}</h4>
                      <p className="text-sm text-slate-500 mb-4 h-10 leading-snug">{chart.description}</p>
                      
                      <div className="flex justify-end mt-2">
                        <span className="text-sm font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform flex items-center">
                          Generate <ChevronRight size={16} />
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RESULTS */}
          {selectedChart && (
            <div className="animate-fade-in space-y-6">
              <div className="flex items-center gap-4 mb-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedChart(null)}>
                  <ArrowLeft size={16} className="mr-2" /> Back to Selection
                </Button>
                <span className="text-slate-300">|</span>
                <span className="font-semibold text-slate-700">{selectedChart.name}</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Placeholder (Simulated Result) */}
                <div className="space-y-4">
                  <Card className="min-h-[400px] flex items-center justify-center bg-slate-100 border-slate-200 relative overflow-hidden p-0">
                   <div className="w-full h-full min-h-[400px]">
                    <ChartRenderer 
                        type={selectedChart.id} 
                        data={datasetStats.data} 
                        columns={datasetStats.columns} 
                    />
                   </div>
                  </Card>
                </div>

                {/* Code Tabs */}
                <div className="space-y-4">
                  <div className="flex p-1 bg-slate-200 rounded-xl w-fit">
                    <button 
                      onClick={() => setActiveTab('R')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'R' ? 'bg-white shadow text-indigo-600' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      R (ggplot2)
                    </button>
                    <button 
                      onClick={() => setActiveTab('Python')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'Python' ? 'bg-white shadow text-pink-600' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      Python (Seaborn)
                    </button>
                  </div>

                  <Card className="bg-[#1e1e1e] text-slate-300 font-mono text-sm overflow-hidden p-0 border-none">
                    <div className="flex items-center justify-between px-4 py-3 bg-[#252526] border-b border-[#333]">
                      <span className="flex items-center gap-2">
                        <Code size={14} /> {activeTab} Source Code
                      </span>
                      <button className="hover:text-white transition-colors">
                        <Download size={14} />
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto">
                      <code>
                        {activeTab === 'R' 
                          ? R_TEMPLATES[selectedChart.id] 
                          : PYTHON_TEMPLATES[selectedChart.id]
                        }
                      </code>
                    </pre>
                  </Card>
                </div>
              </div>
              
              {/* Backend Code for Reviewer */}
              <div className="mt-12 pt-8 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-700 mb-4">Backend Implementation Guide</h3>
                <p className="text-slate-500 mb-4 text-sm">Use the following FastAPI code to deploy the real backend for this application.</p>
                <Card className="bg-slate-50 p-4 font-mono text-xs text-slate-600 max-h-48 overflow-y-auto">
                  <pre>{`from fastapi import FastAPI, File, UploadFile
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

app = FastAPI()

@app.post("/analyze-csv")
async def analyze_csv(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    return {
        "rowCount": len(df),
        "colCount": len(df.columns),
        "columns": [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
    }

@app.post("/generate-plot-python")
async def generate_plot(chart_type: str):
    # Logic to run python script via subprocess or direct execution
    pass
`}</pre>
                </Card>
              </div>

            </div>
          )}
        </main>
      </div>
    );
  }

  // --- IMAGE MODE ---
  if (mode === 'IMAGE') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-indigo-50 p-6 font-sans">
        <header className="max-w-5xl mx-auto flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={resetAll} className="!px-2">
              <ArrowLeft size={20} />
            </Button>
            <h2 className="text-2xl font-bold text-slate-800">Chart Detection</h2>
          </div>
        </header>

        <main className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
            
            {/* Left: Upload */}
            <div className="space-y-6">
              <input 
                type="file" 
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden" 
                id="img-upload"
              />
              
              <Card 
                className={`
                  p-8 border-dashed border-2 border-pink-200 flex flex-col items-center justify-center text-center min-h-[300px] transition-all
                  ${!imagePreview ? 'cursor-pointer hover:bg-pink-50/50 hover:border-pink-300 active:scale-[0.98] tap-highlight-transparent' : ''}
                `}
                onClick={() => {
                  if (!imagePreview) {
                    document.getElementById('img-upload')?.click();
                  }
                }}
              >
                 {imagePreview ? (
                    <div className="relative w-full h-full" onClick={(e) => e.stopPropagation()}>
                       <img src={imagePreview} alt="Uploaded" className="max-h-[300px] mx-auto rounded-lg shadow-lg" />
                       <button 
                        onClick={clearImage}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-slate-100 z-10"
                       >
                         <AlertCircle className="text-red-500" size={20} />
                       </button>
                    </div>
                 ) : (
                    <>
                      <div className="p-4 bg-pink-50 rounded-full mb-4">
                        <Camera className="w-10 h-10 text-pink-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700">Upload Chart Image</h3>
                      <p className="text-slate-400 text-sm mb-6">Tap to take a photo or select from gallery</p>
                      
                      <Button as="span" variant="secondary" className="pointer-events-none">
                        Open Camera / Gallery
                      </Button>
                    </>
                 )}
              </Card>
              
              <Button 
                className="w-full" 
                variant="primary" 
                size="lg"
                disabled={!imageFile}
                isLoading={isDetecting}
                onClick={runDetection}
              >
                Analyze Chart
              </Button>
            </div>

            {/* Right: Results */}
            <div className="space-y-6">
              {detectionResult ? (
                <div className="space-y-6 animate-fade-in">
                  <Card className="border-l-4 border-l-emerald-400">
                    <h3 className="text-sm uppercase tracking-wide text-slate-400 font-semibold mb-1">Detected Type</h3>
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-bold text-slate-800">{detectionResult.chartType}</h2>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium flex items-center gap-1">
                        <CheckCircle size={14} /> {detectionResult.confidence}% Confidence
                      </span>
                    </div>
                    <p className="mt-4 text-slate-600 leading-relaxed">
                      {detectionResult.explanation}
                    </p>
                  </Card>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-700">Recreation Code</h4>
                    <div className="flex gap-2 mb-2">
                       <button onClick={() => setActiveTab('R')} className={`text-xs px-3 py-1 rounded ${activeTab === 'R' ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>R</button>
                       <button onClick={() => setActiveTab('Python')} className={`text-xs px-3 py-1 rounded ${activeTab === 'Python' ? 'bg-pink-600 text-white' : 'bg-slate-200'}`}>Python</button>
                    </div>
                    <Card className="bg-[#1e1e1e] p-0 overflow-hidden text-white font-mono text-xs">
                      <pre className="p-4 overflow-x-auto">
                        {activeTab === 'R' ? detectionResult.rCode : detectionResult.pythonCode}
                      </pre>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 border-2 border-slate-100 rounded-2xl border-dashed">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <FileText className="text-slate-300" size={24} />
                  </div>
                  <p>Upload an image and click Analyze to see AI detection results.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* API Key Modal */}
        {showApiKeyModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="w-full max-w-md p-6">
                    <h3 className="text-xl font-bold mb-4">Gemini API Key Required</h3>
                    <p className="text-sm text-slate-500 mb-4">
                        To use the AI vision detection features, please provide a valid Google GenAI API key.
                        This is only stored in your browser session for this demo.
                    </p>
                    <input 
                        type="password" 
                        className="w-full p-3 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="sk-..."
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setShowApiKeyModal(false)}>Cancel</Button>
                        <Button onClick={saveApiKey}>Save & Continue</Button>
                    </div>
                </Card>
            </div>
        )}

      </div>
    );
  }

  return null;
};

export default App;