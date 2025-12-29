"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

interface Segment {
  pages: number[];
  color?: string;
}

interface PDFViewerProps {
  pdfUrl: string;
  segments?: Segment[];
  highlightedPages?: number[];
  onPageClick?: (pageNumber: number) => void;
  width?: number;
}

export default function PDFViewer({
  pdfUrl,
  segments = [],
  highlightedPages = [],
  onPageClick,
  width = 600,
}: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const getSegmentColor = (pageNum: number): string | undefined => {
    for (const seg of segments) {
      // Pages are 1-indexed in segments
      if (seg.pages.includes(pageNum)) {
        return seg.color || "rgba(123, 108, 255, 0.5)";
      }
    }
    return undefined;
  };

  const isHighlighted = (pageNum: number): boolean => {
    return highlightedPages.includes(pageNum);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setPageNumber((prev) => Math.max(1, prev - 1))}
          disabled={pageNumber <= 1}
          className="px-3 py-1 bg-accent-400/20 border border-accent-400/50 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm">
          Page {pageNumber} of {numPages}
        </span>
        <button
          onClick={() => setPageNumber((prev) => Math.min(numPages, prev + 1))}
          disabled={pageNumber >= numPages}
          className="px-3 py-1 bg-accent-400/20 border border-accent-400/50 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <div className="relative border-2 border-accent-400/30 rounded-lg overflow-hidden">
        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => {
            console.error("PDF load error:", error);
          }}
          loading={<div className="p-8 text-gray-400">Loading PDF...</div>}
          error={
            <div className="p-8 text-red-400">
              Failed to load PDF. Check console for details.
              <div className="text-xs mt-2 text-gray-500">URL: {pdfUrl}</div>
            </div>
          }
          options={{
            cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/cmaps/`,
            cMapPacked: true,
          }}
        >
          <div className="relative">
            <Page
              pageNumber={pageNumber}
              width={width}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
            {/* Segment overlay */}
            {segments.length > 0 && getSegmentColor(pageNumber) && (
              <div
                className="absolute inset-0 pointer-events-none border-4 rounded"
                style={{
                  borderColor: getSegmentColor(pageNumber),
                  backgroundColor: `${getSegmentColor(pageNumber)}30`,
                  boxShadow: `0 0 20px ${getSegmentColor(pageNumber)}40`,
                }}
              />
            )}
            {/* Highlight overlay */}
            {isHighlighted(pageNumber) && (
              <div className="absolute inset-0 pointer-events-none border-4 border-yellow-400 rounded bg-yellow-400/20" />
            )}
          </div>
        </Document>
      </div>

      {/* Page thumbnails */}
      {numPages > 1 && (
        <div className="flex flex-wrap gap-2 max-w-4xl justify-center">
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => {
            const segColor = getSegmentColor(pageNum);
            const highlighted = isHighlighted(pageNum);
            return (
              <button
                key={pageNum}
                onClick={() => {
                  setPageNumber(pageNum);
                  onPageClick?.(pageNum);
                }}
                className={`relative w-16 h-20 border-2 rounded overflow-hidden ${
                  pageNumber === pageNum
                    ? "border-accent-400 scale-110"
                    : "border-gray-600"
                } ${highlighted ? "ring-2 ring-yellow-400" : ""}`}
                style={{
                  backgroundColor: segColor
                    ? `${segColor}60`
                    : "rgba(255, 255, 255, 0.05)",
                  borderColor: segColor || undefined,
                  borderWidth: segColor ? "3px" : "2px",
                  boxShadow: segColor ? `0 0 8px ${segColor}50` : undefined,
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                  {pageNum}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Segment legend */}
      {segments.length > 0 && (
        <div className="mt-4 p-4 bg-[var(--card-bg)] rounded-lg border border-[var(--border)]">
          <h4 className="text-sm font-semibold mb-2">Segments:</h4>
          <div className="flex flex-wrap gap-2">
            {segments.map((seg, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                style={{
                  backgroundColor: `${seg.color || "rgba(123, 108, 255, 0.2)"}`,
                }}
              >
                <div
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: seg.color || "rgba(123, 108, 255, 0.8)",
                  }}
                />
                <span>
                  Segment {idx + 1}: Pages {seg.pages.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

