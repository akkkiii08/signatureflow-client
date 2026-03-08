import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useDraggable, DndContext, DragEndEvent } from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { Trash2, Move, ChevronLeft, ChevronRight } from 'lucide-react';
import { SignatureField } from '../../types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PlacedSignature {
  id: string;
  type: 'signature' | 'initials' | 'stamp';
  method: 'typed' | 'drawn' | 'uploaded';
  data: string;
  fontStyle?: string;
  color: string;
  page: number;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  fieldId?: string;
}

interface DraggableSignatureProps {
  sig: PlacedSignature;
  containerWidth: number;
  containerHeight: number;
  onDelete: (id: string) => void;
  onResize: (id: string, w: number, h: number) => void;
}

const DraggableSignatureItem: React.FC<DraggableSignatureProps> = ({
  sig, containerWidth, containerHeight, onDelete, onResize,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: sig.id });
  const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null);

  const absX = (sig.x / 100) * containerWidth;
  const absY = (sig.y / 100) * containerHeight;
  const absW = (sig.width / 100) * containerWidth;
  const absH = (sig.height / 100) * containerHeight;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: absX + (transform?.x || 0),
    top: absY + (transform?.y || 0),
    width: absW,
    height: absH,
    opacity: isDragging ? 0.7 : 1,
    zIndex: isDragging ? 100 : 10,
    cursor: 'grab',
  };

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: absW, startH: absH };
    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const newW = Math.max(60, resizeRef.current.startW + (ev.clientX - resizeRef.current.startX));
      const newH = Math.max(30, resizeRef.current.startH + (ev.clientY - resizeRef.current.startY));
      onResize(sig.id, (newW / containerWidth) * 100, (newH / containerHeight) * 100);
    };
    const onUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div className="relative w-full h-full border-2 border-brand-400 rounded-lg bg-white/90 overflow-hidden group shadow-lg">
        {/* Signature preview */}
        {sig.method === 'typed' ? (
          <div
            className="w-full h-full flex items-center justify-center px-2"
            style={{ fontFamily: sig.fontStyle, color: sig.color, fontSize: Math.min(absH * 0.6, 28) }}
          >
            {sig.data}
          </div>
        ) : (
          <img src={sig.data} alt="signature" className="w-full h-full object-contain p-1" />
        )}

        {/* Controls overlay */}
        <div className="absolute inset-0 bg-brand-600/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between px-1">
          <Move className="w-3 h-3 text-brand-600" />
          <button
            onMouseDown={e => { e.stopPropagation(); onDelete(sig.id); }}
            className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={startResize}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-brand-500 rounded-tl-lg opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  );
};

interface PDFViewerProps {
  fileUrl: string;
  placedSignatures: PlacedSignature[];
  onSignaturesChange: (sigs: PlacedSignature[]) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  numPages: number;
  onNumPagesChange: (n: number) => void;
  onDropSignature?: (x: number, y: number, page: number, containerW: number, containerH: number) => void;
  dropTarget?: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  fileUrl, placedSignatures, onSignaturesChange, currentPage, onPageChange,
  numPages, onNumPagesChange, onDropSignature, dropTarget = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    const sigId = active.id as string;
    const sig = placedSignatures.find(s => s.id === sigId);
    if (!sig || !containerSize.width) return;

    const absX = (sig.x / 100) * containerSize.width + delta.x;
    const absY = (sig.y / 100) * containerSize.height + delta.y;
    const newX = Math.max(0, Math.min(100 - sig.width, (absX / containerSize.width) * 100));
    const newY = Math.max(0, Math.min(100 - sig.height, (absY / containerSize.height) * 100));

    onSignaturesChange(placedSignatures.map(s => s.id === sigId ? { ...s, x: newX, y: newY } : s));
  }, [placedSignatures, containerSize, onSignaturesChange]);

  const handleDelete = (id: string) => {
    onSignaturesChange(placedSignatures.filter(s => s.id !== id));
  };

  const handleResize = (id: string, w: number, h: number) => {
    onSignaturesChange(placedSignatures.map(s => s.id === id ? { ...s, width: w, height: h } : s));
  };

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!onDropSignature || !dropTarget) return;
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onDropSignature(x, y, currentPage, rect.width, rect.height);
  }, [onDropSignature, dropTarget, currentPage]);

  const currentPageSigs = placedSignatures.filter(s => s.page === currentPage);

  return (
    <div className="flex flex-col h-full">
      {/* Page controls */}
      {numPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-2 bg-white/80 backdrop-blur-sm border-b border-slate-100">
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-slate-600">{currentPage} / {numPages}</span>
          <button
            onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
            disabled={currentPage === numPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 disabled:opacity-30 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PDF + overlay */}
      <div className="flex-1 overflow-auto bg-slate-200 flex items-center justify-center p-4">
        <DndContext onDragEnd={handleDragEnd} modifiers={[restrictToParentElement]}>
          <div
            ref={containerRef}
            className={`relative shadow-2xl ${dropTarget ? 'cursor-crosshair' : ''}`}
            onClick={handleContainerClick}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">Loading PDF...</p>
                </div>
              </div>
            )}

            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages: n }) => { onNumPagesChange(n); setIsLoading(false); }}
              loading=""
            >
              <Page
                pageNumber={currentPage}
                width={Math.min(containerSize.width || 700, 800)}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </Document>

            {/* Signature overlays */}
            {currentPageSigs.map(sig => (
              <DraggableSignatureItem
                key={sig.id}
                sig={sig}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
                onDelete={handleDelete}
                onResize={handleResize}
              />
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
};

export default PDFViewer;
export type { PlacedSignature };
