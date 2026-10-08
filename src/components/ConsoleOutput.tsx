import React, { useState } from 'react';
import {
  Terminal,
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink
} from 'lucide-react';
import { ExecutionResult } from '../types';

interface ConsoleOutputProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  onJumpToLine?: (line: number) => void;
  onClear: () => void;
}

export const ConsoleOutput: React.FC<ConsoleOutputProps> = ({
  result,
  isRunning,
  onJumpToLine,
  onClear,
}) => {
  const [copied, setCopied] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const handleCopyLog = () => {
    if (!result) return;
    const text = `ESTADO: ${result.success ? 'ÉXITO' : 'ERROR'}\nTIEMPO: ${
      result.execution_time_ms || result.executionTimeMs || 0
    }ms\n\nSALIDA STDOUT:\n${result.stdout || '(vacío)'}\n\nERROR:\n${
      result.error || '(ninguno)'
    }\n${result.stderr || ''}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const errorLine = result?.error_line ?? result?.errorLine;

  return (
    <div className="w-full h-full bg-slate-950 flex flex-col font-mono text-xs border-t border-slate-800 select-text">
      {/* Console Header Bar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-200">Consola de Ejecución</span>

          {isRunning && (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Ejecutando script...
            </span>
          )}

          {!isRunning && result && (
            <span
              className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-medium ${
                result.success
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
              }`}
            >
              {result.success ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Correcto</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-rose-400" />
                  <span>Error</span>
                </>
              )}
            </span>
          )}

          {result && (
            <span className="hidden sm:flex items-center gap-1 text-slate-500 text-[11px]">
              <Clock className="w-3 h-3" />
              <span>{result.execution_time_ms || result.executionTimeMs || 0} ms</span>
            </span>
          )}
        </div>

        {/* Toolbar Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyLog}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
            title="Copiar registro de ejecución"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClear}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
            title="Limpiar consola"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Console Log Content Area */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {copied && (
          <div className="text-[11px] text-emerald-400 bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/40">
            Registro copiado al portapapeles.
          </div>
        )}

        {/* Clickable Error Banner (Requirement 5: ERROR EN LA LÍNEA X) */}
        {!isRunning && result && !result.success && result.error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl space-y-2 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wide">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  {errorLine ? `ERROR EN LA LÍNEA ${errorLine}` : 'ERROR DE EJECUCIÓN'}
                </span>
              </div>

              {errorLine && onJumpToLine && (
                <button
                  onClick={() => onJumpToLine(errorLine)}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[11px] font-sans font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Ir a línea {errorLine}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="text-rose-200 text-xs font-mono font-medium whitespace-pre-wrap pl-6">
              {result.error_type ? `${result.error_type}: ` : ''}
              {result.error}
            </div>

            {/* Toggle technical traceback */}
            {result.stderr && (
              <div className="pt-2 border-t border-rose-900/60">
                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  {showTechnicalDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  <span>{showTechnicalDetails ? 'Ocultar detalles técnicos' : 'Ver traza de error completa (Traceback)'}</span>
                </button>

                {showTechnicalDetails && (
                  <pre className="mt-2 p-2 bg-slate-950 rounded text-[10px] text-slate-300 overflow-x-auto border border-slate-800 leading-relaxed">
                    {result.stderr}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stdout Messages (from print() statements) */}
        {result?.stdout && (
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Salida estándar (print):
            </div>
            <pre className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-lg text-emerald-300 text-xs font-mono whitespace-pre-wrap">
              {result.stdout}
            </pre>
          </div>
        )}

        {/* Success summary */}
        {!isRunning && result && result.success && (
          <div className="text-slate-400 text-xs flex flex-col gap-1">
            <div className="flex items-center gap-2 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Modelo geométrico generado correctamente.</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Piezas generadas: {result.objects.length} · Motor: {result.engine || 'CadQuery OpenCASCADE'}
            </span>
          </div>
        )}

        {/* Empty state */}
        {!isRunning && !result && (
          <p className="text-slate-600 italic py-4 text-center">
            Pulsa ▶ para ejecutar el script y ver aquí los resultados o advertencias.
          </p>
        )}
      </div>
    </div>
  );
};
