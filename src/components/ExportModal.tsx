import React, { useState } from 'react';
import { Download, FileBox, X, Check, Loader2, AlertCircle } from 'lucide-react';
import { CadQueryMeshObject } from '../types';

interface ExportModalProps {
  code: string;
  objects: CadQueryMeshObject[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ code, objects, onClose }) => {
  const [format, setFormat] = useState<'step' | 'stl' | 'amf' | 'svg'>('step');
  const [filename, setFilename] = useState('modelo_cadquery');
  const [exportScope, setExportScope] = useState<'all' | 'selected'>('all');
  const [selectedObjectId, setSelectedObjectId] = useState<string>(objects[0]?.id || '');
  const [tolerance, setTolerance] = useState<number>(0.1);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const response = await fetch('/api/cadquery/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          format,
          filename: filename.trim() || 'modelo_cadquery',
          tolerance,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({ error: 'Error en la exportación' }));
        throw new Error(errJson.error || `Error ${response.status}: Fallo al exportar`);
      }

      // Download file stream blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.trim() || 'modelo'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      onClose();
    } catch (err: any) {
      setExportError(err.message || 'Error al exportar');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-sky-400" />
            <h2 className="font-bold text-sm text-slate-100">Exportar Modelo 3D</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selection (Requirement 12) */}
        <div>
          <label className="font-semibold text-slate-400 block mb-1.5 uppercase tracking-wider text-[10px]">
            Formato de Archivo CAD:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'step', name: 'STEP (.step)', desc: 'Sólido CAD B-Rep estándar' },
              { id: 'stl', name: 'STL (.stl)', desc: 'Malla triangular para impresión 3D' },
              { id: 'amf', name: 'AMF (.amf)', desc: 'Formato aditivo con compresión' },
              { id: 'svg', name: 'SVG (.svg)', desc: 'Plano vectorial 2D en proyección' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id as any)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  format === f.id
                    ? 'bg-sky-600/20 border-sky-500 text-sky-300 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold font-mono">{f.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Filename input */}
        <div>
          <label className="font-semibold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
            Nombre del Archivo:
          </label>
          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 focus-within:border-sky-500">
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="bg-transparent text-slate-100 font-mono flex-1 focus:outline-none"
            />
            <span className="text-slate-500 font-mono text-[11px]">.{format}</span>
          </div>
        </div>

        {/* Triangulation Quality for STL */}
        {format === 'stl' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                Calidad de Triangulación (Deflexión):
              </label>
              <span className="font-mono text-sky-400">{tolerance} mm</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={tolerance}
              onChange={(e) => setTolerance(parseFloat(e.target.value))}
              className="w-full accent-sky-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Alta precisión (0.01 mm)</span>
              <span>Rápido (0.5 mm)</span>
            </div>
          </div>
        )}

        {/* Error notification */}
        {exportError && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-tight">{exportError}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-900/30 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exportando...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Descargar {format.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
