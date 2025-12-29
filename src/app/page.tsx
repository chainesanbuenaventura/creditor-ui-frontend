"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  FileText,
  FolderOpen,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileSearch,
  Layers,
  Brain,
  Scale,
  Upload,
  RefreshCw,
} from "lucide-react";
import PDFViewer from "@/components/PDFViewer";
import ComparisonTable from "@/components/ComparisonTable";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

interface Folder {
  name: string;
  path: string;
  pdf_count: number;
  has_ground_truth: boolean;
}

interface DocumentResult {
  filename: string;
  ocr: {
    pages: number;
    tables: number;
    page_previews: string[];
  } | null;
  segments: Array<{
    pages: number[];
    text_length: number;
    text_preview: string;
  }>;
  extracted_creditors: Array<Record<string, unknown>>;
}

interface ComparisonRow {
  gt_idx: number;
  gt_name: string;
  gt_summe: number;
  ext_name: string | null;
  ext_summe: number;
  status: string;
}

interface ExtractionResult {
  folder: string;
  documents: DocumentResult[];
  all_raw_creditors: Array<Record<string, unknown>>;
  final_creditors: Array<Record<string, unknown>>;
}

interface ComparisonResult {
  total_gt: number;
  total_extracted: number;
  exact_match: number;
  close_match: number;
  name_only: number;
  amount_only: number;
  missing: number;
  extra: number;
  match_rate: number;
  rows: ComparisonRow[];
  extra_rows: Array<Record<string, unknown>>;
}

interface FullResult {
  extraction: ExtractionResult;
  ground_truth: Array<Record<string, unknown>>;
  comparison: ComparisonResult;
}

export default function Home() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FullResult | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [viewStep, setViewStep] = useState<number>(1);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
    try {
      // Check if we're on Vercel and API_URL is not configured
      const isVercel = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
      if (isVercel && (!API_URL || API_URL === "http://localhost:8001")) {
        setUploadError("Backend not configured. Please set NEXT_PUBLIC_API_URL in Vercel environment variables. See VERCEL_SETUP.md for instructions.");
        return;
      }
      
      if (!API_URL || API_URL === "http://localhost:8001") {
        console.warn("API_URL not configured. Please set NEXT_PUBLIC_API_URL environment variable.");
      }
      // Remove trailing slash from API_URL if present
      const apiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const res = await fetch(`${apiUrl}/folders`);
      if (!res.ok) {
        throw new Error(`Failed to fetch folders: ${res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setFolders(data.folders);
      setUploadError(null); // Clear error on success
    } catch (err) {
      console.error("Failed to fetch folders:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to connect to backend";
      if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError") || errorMessage.includes("TypeError")) {
        setUploadError(`Cannot connect to backend at ${API_URL}. Make sure: 1) Backend is deployed and running, 2) NEXT_PUBLIC_API_URL is set correctly in Vercel, 3) CORS_ORIGINS includes your frontend URL.`);
      } else {
        setUploadError(errorMessage);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
      setUploadError(null);
      setUploadSuccess(null);
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.statusText} - ${errorText}`);
      }

      const data = await res.json();
      const hasGroundTruth = selectedFiles.some(
        (f) => f.name.toLowerCase() === "creditors_list.pdf"
      );
      
      setUploadSuccess(
        `Successfully uploaded ${data.count} file(s) to folder "${data.folder_name}"${
          hasGroundTruth ? " (includes ground truth)" : ""
        }`
      );
      
      // Refresh folders list
      await fetchFolders();
      // Select the newly uploaded folder
      setSelectedFolder(data.folder_name);
      
      // Clear selection
      setSelectedFiles([]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const runExtraction = async (folderName: string) => {
    setLoading(true);
    setResult(null);
    setActiveStep(0);
    setUploadError(null);

    try {
      // Step 1-4: Run comparison (includes extraction)
      const apiUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
      const res = await fetch(`${apiUrl}/compare/${folderName}`, {
        method: "POST",
      });
      
      if (!res.ok) {
        if (res.status === 504 || res.status === 408) {
          throw new Error("Extraction timed out. Vercel free tier has a 10-second limit. OCR + extraction can take 30-60+ seconds. Consider using Railway instead (no timeout limits).");
        }
        const errorText = await res.text();
        throw new Error(`Extraction failed: ${res.statusText} (${res.status}) - ${errorText}`);
      }
      
      const data = await res.json();
      setResult(data);
      setActiveStep(4);
    } catch (err) {
      console.error("Extraction failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Extraction failed";
      setUploadError(errorMessage);
      
      // Show timeout warning
      if (errorMessage.includes("timeout") || errorMessage.includes("504")) {
        setUploadError("⏱️ Extraction timed out! Vercel free tier limits functions to 10 seconds. OCR + extraction takes 30-60+ seconds. Solution: Use Railway (no timeout limits) - see RAILWAY_QUICK_SETUP.md");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDoc = (filename: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedDocs(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "exact":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "close":
        return <CheckCircle2 className="w-5 h-5 text-lime-500" />;
      case "name_only":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "amount_only":
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "missing":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-accent-400/20 border border-accent-400/30">
            <Image
              src="/cropped-favicon-180x180.png"
              alt="Logo"
              width={32}
              height={32}
              className="rounded"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-accent-300 to-accent-400 bg-clip-text text-transparent">
              Creditor Extraction Dashboard
            </h1>
            <p className="text-gray-400 text-sm">
              Debug and visualize the extraction pipeline
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar - Folder Selection */}
        <aside className="col-span-3">
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-accent-400" />
                Folders
              </h2>
              <button
                onClick={fetchFolders}
                className="p-2 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                title="Refresh folders"
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Upload Section */}
            <div className="mb-4 p-3 bg-[#1a1a1a] rounded-lg border border-[var(--border)]">
              <div className="mb-2 text-xs text-gray-400">
                Upload all PDFs together (including <code className="text-accent-400">creditors_list.pdf</code> for ground truth)
              </div>
              
              {selectedFiles.length === 0 ? (
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="hidden"
                  />
                  <div className="flex items-center justify-center gap-2 py-2 px-3 bg-accent-400/20 hover:bg-accent-400/30 border border-accent-400/50 rounded-lg transition-all text-sm font-medium">
                    <Upload className="w-4 h-4" />
                    Select PDFs
                  </div>
                </label>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs text-gray-300 font-medium">
                    {selectedFiles.length} file(s) selected:
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-[#222] rounded text-xs"
                      >
                        <span className="truncate flex-1">
                          {file.name === "creditors_list.pdf" ? (
                            <span className="text-green-400 font-medium">
                              {file.name} ✓ GT
                            </span>
                          ) : (
                            file.name
                          )}
                        </span>
                        <span className="text-gray-500 ml-2">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFileUpload}
                      disabled={uploading}
                      className="flex-1 py-2 px-3 bg-accent-400 hover:bg-accent-500 disabled:bg-gray-600 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all text-black"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload
                        </>
                      )}
                    </button>
                    <button
                      onClick={clearSelection}
                      disabled={uploading}
                      className="py-2 px-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 rounded-lg text-sm transition-all"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              
              {uploadError && (
                <div className="mt-2 text-xs text-red-400">{uploadError}</div>
              )}
              {uploadSuccess && (
                <div className="mt-2 text-xs text-green-400">{uploadSuccess}</div>
              )}
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {folders.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">
                  No folders found. Upload PDFs to get started.
                </div>
              ) : (
                folders.map((folder) => (
                  <button
                    key={folder.name}
                    onClick={() => setSelectedFolder(folder.name)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedFolder === folder.name
                        ? "bg-accent-400/20 border-accent-400/50"
                        : "bg-[#1a1a1a] border-[var(--border)] hover:border-accent-400/30"
                    }`}
                  >
                    <div className="font-medium">{folder.name}</div>
                    <div className="text-sm text-gray-400">
                      {folder.pdf_count} PDFs
                      {folder.has_ground_truth && (
                        <span className="ml-2 text-green-400">✓ GT</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>

            {selectedFolder && (
              <button
                onClick={() => runExtraction(selectedFolder)}
                disabled={loading}
                className="w-full mt-4 py-3 px-4 bg-accent-400 hover:bg-accent-500 disabled:bg-gray-600 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all text-black"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Run Extraction
                  </>
                )}
              </button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div className="col-span-9 space-y-6">
          {/* Pipeline Steps */}
          <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
            <h2 className="text-lg font-semibold mb-4">Pipeline Steps</h2>
            <div className="flex items-center gap-4">
              {[
                { icon: FileSearch, label: "OCR", step: 1 },
                { icon: Layers, label: "Segments", step: 2 },
                { icon: Brain, label: "Extract", step: 3 },
                { icon: Scale, label: "Compare", step: 4 },
              ].map(({ icon: Icon, label, step }) => (
                <button
                  key={step}
                  onClick={() => result && setViewStep(step)}
                  className={`flex-1 flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    activeStep >= step
                      ? viewStep === step
                        ? "bg-accent-400/30 border-accent-400"
                        : "bg-accent-400/20 border-accent-400/50"
                      : "bg-[#1a1a1a] border-[var(--border)]"
                  } ${activeStep >= step ? "cursor-pointer hover:bg-accent-400/25" : "cursor-not-allowed opacity-50"}`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      activeStep >= step ? "text-accent-400" : "text-gray-500"
                    }`}
                  />
                  <span
                    className={
                      activeStep >= step ? "text-white" : "text-gray-500"
                    }
                  >
                    {label}
                  </span>
                  {activeStep >= step && (
                    <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                  <div className="text-3xl font-bold text-green-400">
                    {result.comparison.match_rate}%
                  </div>
                  <div className="text-sm text-gray-400">Match Rate</div>
                </div>
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                  <div className="text-3xl font-bold text-white">
                    {result.comparison.exact_match}
                  </div>
                  <div className="text-sm text-gray-400">Exact Matches</div>
                </div>
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                  <div className="text-3xl font-bold text-yellow-400">
                    {result.comparison.name_only + result.comparison.close_match}
                  </div>
                  <div className="text-sm text-gray-400">Partial Matches</div>
                </div>
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                  <div className="text-3xl font-bold text-red-400">
                    {result.comparison.missing}
                  </div>
                  <div className="text-sm text-gray-400">Missing</div>
                </div>
              </div>

              {/* Step-by-Step Visualization */}
              {viewStep === 1 && (
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                  <h2 className="text-lg font-semibold mb-4">Step 1: OCR - Document View</h2>
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block">Select Document:</label>
                    <select
                      value={selectedDoc || ""}
                      onChange={(e) => setSelectedDoc(e.target.value)}
                      className="bg-[#1a1a1a] border border-[var(--border)] rounded-lg px-4 py-2 text-white"
                    >
                      <option value="">Select a document...</option>
                      {result.extraction.documents.map((doc) => (
                        <option key={doc.filename} value={doc.filename}>
                          {doc.filename} ({doc.ocr?.pages || 0} pages)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedDoc && (
                    <PDFViewer
                      pdfUrl={`${API_URL}/pdf/${selectedFolder}/${selectedDoc}`}
                      width={800}
                    />
                  )}
                </div>
              )}

              {viewStep === 2 && (
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                  <h2 className="text-lg font-semibold mb-4">Step 2: Segment Detection</h2>
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block">Select Document:</label>
                    <select
                      value={selectedDoc || ""}
                      onChange={(e) => setSelectedDoc(e.target.value)}
                      className="bg-[#1a1a1a] border border-[var(--border)] rounded-lg px-4 py-2 text-white"
                    >
                      <option value="">Select a document...</option>
                      {result.extraction.documents.map((doc) => (
                        <option key={doc.filename} value={doc.filename}>
                          {doc.filename} ({doc.segments.length} segments)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedDoc && (() => {
                    const doc = result.extraction.documents.find(d => d.filename === selectedDoc);
                    if (!doc) return null;
                    // Colors based on #7B6CFF palette - variations of purple/violet
                    const colors = [
                      "rgba(123, 108, 255, 0.7)", // #7B6CFF - Main accent
                      "rgba(157, 143, 255, 0.7)", // Lighter purple
                      "rgba(90, 77, 255, 0.7)",   // Darker purple
                      "rgba(168, 85, 247, 0.7)",  // Purple
                      "rgba(139, 92, 246, 0.7)",  // Violet
                      "rgba(99, 102, 241, 0.7)",  // Indigo
                      "rgba(79, 70, 229, 0.7)",   // Deep indigo
                      "rgba(196, 181, 253, 0.7)", // Light lavender
                      "rgba(124, 58, 237, 0.7)", // Deep violet
                      "rgba(109, 40, 217, 0.7)", // Dark violet
                      "rgba(147, 51, 234, 0.7)", // Purple
                      "rgba(167, 139, 250, 0.7)", // Lavender
                      "rgba(88, 28, 135, 0.7)",  // Very dark purple
                      "rgba(192, 132, 252, 0.7)", // Light purple
                      "rgba(74, 61, 255, 0.7)",  // Bright purple-blue
                    ];
                    const segments = doc.segments.map((seg, idx) => ({
                      pages: seg.pages,
                      color: colors[idx % colors.length],
                    }));
                    return (
                      <PDFViewer
                        pdfUrl={`${API_URL}/pdf/${selectedFolder}/${selectedDoc}`}
                        segments={segments}
                        width={800}
                      />
                    );
                  })()}
                </div>
              )}

              {viewStep === 3 && (
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                  <h2 className="text-lg font-semibold mb-4">Step 3: Extraction - Highlighted Pages</h2>
                  <div className="mb-4">
                    <label className="text-sm text-gray-400 mb-2 block">Select Document:</label>
                    <select
                      value={selectedDoc || ""}
                      onChange={(e) => setSelectedDoc(e.target.value)}
                      className="bg-[#1a1a1a] border border-[var(--border)] rounded-lg px-4 py-2 text-white"
                    >
                      <option value="">Select a document...</option>
                      {result.extraction.documents.map((doc) => (
                        <option key={doc.filename} value={doc.filename}>
                          {doc.filename} ({doc.extracted_creditors.length} creditors)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedDoc && (() => {
                    const doc = result.extraction.documents.find(d => d.filename === selectedDoc);
                    if (!doc) return null;
                    const highlightedPages = Array.from(
                      new Set(
                        doc.extracted_creditors.flatMap((c) => c.source_pages as number[] || [])
                      )
                    );
                    return (
                      <PDFViewer
                        pdfUrl={`${API_URL}/pdf/${selectedFolder}/${selectedDoc}`}
                        highlightedPages={highlightedPages}
                        width={800}
                      />
                    );
                  })()}
                </div>
              )}

              {viewStep === 4 && (
                <>
                  <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                    <h2 className="text-lg font-semibold mb-4">Step 4: Comparison - Final Results</h2>
                    <ComparisonTable
                      groundTruth={result.ground_truth}
                      extracted={result.extraction.final_creditors}
                      comparison={result.comparison}
                    />
                  </div>
                  
                  {/* Side-by-side PDF comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                      <h3 className="text-md font-semibold mb-4 text-green-400">Ground Truth PDF</h3>
                      <PDFViewer
                        pdfUrl={`${API_URL}/pdf/${selectedFolder}/creditors_list.pdf`}
                        width={500}
                      />
                    </div>
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                      <h3 className="text-md font-semibold mb-4 text-accent-400">Source Documents</h3>
                      <div className="space-y-2 max-h-[600px] overflow-y-auto">
                        {result.extraction.documents.map((doc) => (
                          <div key={doc.filename} className="p-2 bg-[#1a1a1a] rounded border border-[var(--border)]">
                            <button
                              onClick={() => setSelectedDoc(doc.filename)}
                              className={`w-full text-left ${selectedDoc === doc.filename ? "text-accent-400" : "text-gray-300"}`}
                            >
                              {doc.filename}
                            </button>
                          </div>
                        ))}
                      </div>
                      {selectedDoc && (
                        <div className="mt-4">
                          <PDFViewer
                            pdfUrl={`${API_URL}/pdf/${selectedFolder}/${selectedDoc}`}
                            width={500}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Old Comparison Table - Hidden */}
              <div className="hidden bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                <h2 className="text-lg font-semibold mb-4">
                  Ground Truth Comparison
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left p-3 text-gray-400">#</th>
                        <th className="text-left p-3 text-gray-400">Status</th>
                        <th className="text-left p-3 text-gray-400">
                          GT Creditor
                        </th>
                        <th className="text-right p-3 text-gray-400">
                          GT Sum
                        </th>
                        <th className="text-left p-3 text-gray-400">
                          Extracted
                        </th>
                        <th className="text-right p-3 text-gray-400">
                          Ext Sum
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.comparison.rows.map((row) => (
                        <tr
                          key={row.gt_idx}
                          className="border-b border-[var(--border)]/50 hover:bg-white/5"
                        >
                          <td className="p-3 text-gray-500">{row.gt_idx}</td>
                          <td className="p-3">{getStatusIcon(row.status)}</td>
                          <td className="p-3 font-medium">{row.gt_name}</td>
                          <td className="p-3 text-right font-mono">
                            {formatCurrency(row.gt_summe)}
                          </td>
                          <td className="p-3">
                            {row.ext_name || (
                              <span className="text-gray-500">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono">
                            {row.ext_summe > 0
                              ? formatCurrency(row.ext_summe)
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Extra Rows */}
                {result.comparison.extra_rows.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[var(--border)]">
                    <h3 className="text-sm font-semibold text-purple-400 mb-3">
                      Extra Rows ({result.comparison.extra_rows.length})
                    </h3>
                    <div className="space-y-2">
                      {result.comparison.extra_rows.map((row, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-purple-900/20 rounded-lg border border-purple-900/30"
                        >
                          <span>{String(row.creditor_name) || "Unknown"}</span>
                          <span className="font-mono">
                            {formatCurrency(Number(row.summe) || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Document Details */}
              <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-4">
                <h2 className="text-lg font-semibold mb-4">Document Details</h2>
                <div className="space-y-2">
                  {result.extraction.documents.map((doc) => (
                    <div
                      key={doc.filename}
                      className="border border-[var(--border)] rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleDoc(doc.filename)}
                        className="w-full flex items-center justify-between p-3 bg-[#1a1a1a] hover:bg-[#222]"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-accent-400" />
                          <span className="font-medium">{doc.filename}</span>
                          <span className="text-sm text-gray-400">
                            {doc.ocr?.pages || 0} pages,{" "}
                            {doc.segments.length} segments,{" "}
                            {doc.extracted_creditors.length} creditors
                          </span>
                        </div>
                        {expandedDocs.has(doc.filename) ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      {expandedDocs.has(doc.filename) && (
                        <div className="p-4 space-y-4 animate-fade-in">
                          {/* Segments */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">
                              Segments
                            </h4>
                            <div className="grid grid-cols-3 gap-2">
                              {doc.segments.map((seg, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-[#222] rounded border border-[var(--border)]"
                                >
                                  <div className="text-xs text-accent-400">
                                    Segment {idx + 1}
                                  </div>
                                  <div className="text-sm">
                                    Pages: {seg.pages.join(", ")}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {seg.text_preview.slice(0, 50)}...
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Extracted Creditors */}
                          <div>
                            <h4 className="text-sm font-semibold text-gray-400 mb-2">
                              Extracted Creditors
                            </h4>
                            <div className="space-y-2">
                              {doc.extracted_creditors.map((cred, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-[#222] rounded border border-[var(--border)]"
                                >
                                  <div>
                                    <div className="font-medium">
                                      {String(cred.creditor_name) || "Unknown"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {String(cred.aktenzeichen) || "No ref"} |{" "}
                                      Pages: {String((cred.source_pages as number[])?.join(", ") || "?")}
                                    </div>
                                  </div>
                                  <div className="font-mono text-accent-400">
                                    {formatCurrency(Number(cred.summe) || 0)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Empty State */}
          {!result && !loading && (
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-12 text-center">
              <Scale className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                Select a folder and run extraction
              </h3>
              <p className="text-gray-500">
                Choose a folder from the sidebar and click &quot;Run Extraction&quot; to
                start
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] p-12 text-center animate-pulse-glow">
              <Loader2 className="w-16 h-16 text-accent-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-semibold mb-2">Processing...</h3>
              <p className="text-gray-400">
                Running OCR, segmentation, extraction, and comparison
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

