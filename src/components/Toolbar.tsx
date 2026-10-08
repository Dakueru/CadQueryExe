import React from 'react';
import {
  Play,
  Square,
  Save,
  Copy,
  Undo2,
  Redo2,
  Download,
  Eye,
  EyeOff,
  Terminal,
  FolderOpen,
  Settings,
  Columns2,
  Code2,
  Box,
  Sliders,
  Check,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { LayoutMode } from '../types';

interface ToolbarProps {
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
  onSave: () => void;
  hasUnsavedChanges: boolean;
  onCopyAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  layoutMode: LayoutMode;
  onChangeLayoutMode: (mode: LayoutMode) => void;
  showConsole: boolean;
  onToggleConsole: () => void;
  showParametric: boolean;
  onToggleParametric: () => void;
  onOpenExplorer: () => void;
  onOpenSettings: () => void;
  onOpenAudit: () => void;
  activeScriptName: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onRun,
  onStop,
  isRunning,
  onSave,
  hasUnsavedChanges,
  onCopyAll,
  onUndo,
  onRedo,
  onExport,
  layoutMode,
  onChangeLayoutMode,
  showConsole,
  onToggleConsole,
  showParametric,
  onToggleParametric,
  onOpenExplorer,
  onOpenSettings,
  onOpenAudit,
  activeScriptName,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    onCopyAll();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="shrink-0 h-13 px-2 sm:px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs select-none z-30">
      {/* Zone 1: Brand & Current Script Info */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenExplorer}
          className="flex items-center gap-1.5 p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
          title="Abrir explorador de scripts"
        >
          <FolderOpen className="w-4 h-4 text-sky-400" />
          <span className="font-semibold text-slate-100 hidden md:inline">CadQuery Studio</span>
        </button>

        <span className="text-slate-600 hidden md:inline">/</span>

        {/* Script Name & Dirty State */}
        <div
          onClick={onOpenExplorer}
          className="flex items-center gap-1.5 cursor-pointer px-2 py-1 bg-slate-950/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 truncate max-w-[130px] sm:max-w-[200px]"
          title="Cambiar de script"
        >
          <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="font-mono text-slate-200 truncate">{activeScriptName}</span>
          {hasUnsavedChanges && (
            <span className="text-amber-400 font-bold text-xs" title="Modificaciones sin guardar">
              *
            </span>
          )}
        </div>
      </div>

      {/* Zone 2: Primary Action Center (Play, Stop, Save, Copy, Undo, Redo, Export) */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Run / Stop Button */}
        {isRunning ? (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold shadow-md shadow-rose-900/30 active:scale-95 transition-all"
            title="Detener ejecución (■)"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Detener</span>
          </button>
        ) : (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-md shadow-emerald-900/30 active:scale-95 transition-all"
            title="Ejecutar código (▶)"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Ejecutar</span>
          </button>
        )}

        {/* Save button */}
        <button
          onClick={onSave}
          className={`p-2 rounded-lg border transition-colors ${
            hasUnsavedChanges
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30'
              : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
          }`}
          title="Guardar script (.py)"
        >
          <Save className="w-4 h-4" />
        </button>

        {/* Copy All */}
        <button
          onClick={handleCopy}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-colors"
          title="Copiar todo el código"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>

        {/* Export Geometry */}
        <button
          onClick={onExport}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 rounded-lg font-medium transition-colors"
          title="Exportar geometría (STEP, STL, OBJ)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Exportar</span>
        </button>

        {/* Parametric Panel Toggle */}
        <button
          onClick={onToggleParametric}
          className={`p-2 rounded-lg border transition-colors ${
            showParametric
              ? 'bg-sky-500/20 text-sky-400 border-sky-500/60'
              : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
          }`}
          title="Panel de parámetros numéricos"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* Zone 3: Viewport Layout Modes, Console & Settings */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Layout Mode Selector (Editor / Split / 3D Viewer) */}
        <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
          <button
            onClick={() => onChangeLayoutMode('editor_only')}
            className={`p-1.5 rounded transition-colors ${
              layoutMode === 'editor_only'
                ? 'bg-slate-800 text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Solo Editor de Código"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeLayoutMode('split')}
            className={`p-1.5 rounded transition-colors ${
              layoutMode === 'split'
                ? 'bg-slate-800 text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Vista Dividida (Editor + Visor 3D)"
          >
            <Columns2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChangeLayoutMode('viewer_only')}
            className={`p-1.5 rounded transition-colors ${
              layoutMode === 'viewer_only'
                ? 'bg-slate-800 text-sky-400 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Solo Visor 3D"
          >
            <Box className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Console Toggle */}
        <button
          onClick={onToggleConsole}
          className={`p-2 rounded-lg border transition-colors ${
            showConsole
              ? 'bg-sky-500/20 text-sky-400 border-sky-500/60'
              : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:bg-slate-700'
          }`}
          title="Mostrar / ocultar consola"
        >
          <Terminal className="w-4 h-4" />
        </button>

        {/* Android Audit & Technical Info */}
        <button
          onClick={onOpenAudit}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700/60 transition-colors"
          title="Auditoría Técnica y Arquitectura Android"
        >
          <Smartphone className="w-4 h-4" />
        </button>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700/60 transition-colors"
          title="Configuración"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
