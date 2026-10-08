import React, { useState } from 'react';
import {
  Settings,
  Type,
  WrapText,
  Clock,
  Server,
  Download,
  Check,
  X,
  Smartphone,
  Info
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsModalProps {
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  autoSaveInterval: number;
  onChangeAutoSaveInterval: (secs: number) => void;
  externalEngineUrl: string;
  onChangeExternalEngineUrl: (url: string) => void;
  onClose: () => void;
  serverHealth: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  fontSize,
  onChangeFontSize,
  wordWrap,
  onToggleWordWrap,
  autoSaveInterval,
  onChangeAutoSaveInterval,
  externalEngineUrl,
  onChangeExternalEngineUrl,
  onClose,
  serverHealth,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-sky-400" />
            <h2 className="font-bold text-sm text-slate-100">Configuración del Entorno</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PWA Android Install Banner */}
        <div className="p-3 bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-800/60 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sky-300">
              <Smartphone className="w-4 h-4" />
              <span>Instalación en Dispositivo Android (PWA)</span>
            </div>
            {isInstalled ? (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded border border-emerald-800">
                Instalada
              </span>
            ) : null}
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Puedes instalar CadQuery Studio como una aplicación nativa en tu pantalla de inicio Android con soporte offline y pantalla completa.
          </p>

          {isInstallable && (
            <button
              onClick={install}
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-sky-900/30 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Instalar Aplicación en Android</span>
            </button>
          )}

          {isIOS && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px]"
            >
              Instrucciones de instalación en iOS Safari
            </button>
          )}

          {showIOSGuide && (
            <div className="p-2.5 bg-slate-950 rounded-lg text-[11px] text-slate-300 border border-slate-800 space-y-1">
              <p>1. Pulsa el botón <strong>Compartir</strong> en la barra de Safari.</p>
              <p>2. Selecciona <strong>Añadir a la pantalla de inicio</strong>.</p>
            </div>
          )}
        </div>

        {/* Editor Settings */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            Editor de Código
          </h3>

          {/* Font size */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <div className="font-medium text-slate-200">Tamaño de Fuente</div>
              <div className="text-[11px] text-slate-500">Ajusta la legibilidad en pantallas táctiles</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="11"
                max="22"
                step="1"
                value={fontSize}
                onChange={(e) => onChangeFontSize(parseInt(e.target.value))}
                className="w-24 accent-sky-500"
              />
              <span className="font-mono text-sky-400 font-semibold w-6 text-right">
                {fontSize}px
              </span>
            </div>
          </div>

          {/* Word wrap */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <div className="font-medium text-slate-200">Ajuste Automático de Línea</div>
              <div className="text-[11px] text-slate-500">Evita el desplazamiento horizontal continuo</div>
            </div>
            <input
              type="checkbox"
              checked={wordWrap}
              onChange={onToggleWordWrap}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 w-4 h-4 cursor-pointer"
            />
          </div>

          {/* Auto-save interval */}
          <div className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <div className="font-medium text-slate-200">Guardado Automático de Borrador</div>
              <div className="text-[11px] text-slate-500">Tiempo de inactividad antes de guardar</div>
            </div>
            <select
              value={autoSaveInterval}
              onChange={(e) => onChangeAutoSaveInterval(parseInt(e.target.value))}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 font-mono text-[11px]"
            >
              <option value={1000}>1 segundo</option>
              <option value={2000}>2 segundos</option>
              <option value={5000}>5 segundos</option>
              <option value={10000}>10 segundos</option>
            </select>
          </div>
        </div>

        {/* Execution Engine Settings (Requirement 1) */}
        <div className="space-y-2">
          <h3 className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            Motor de Ejecución de CadQuery
          </h3>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Motor Predeterminado:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                Servidor Nativo ({serverHealth?.pythonEnvironment?.version || 'CadQuery 2.8.0'})
              </span>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                URL del Motor Externo Personalizado (Opcional):
              </label>
              <input
                type="text"
                placeholder="http://localhost:5000 o servidor remoto"
                value={externalEngineUrl}
                onChange={(e) => onChangeExternalEngineUrl(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-600 font-mono text-[11px] focus:outline-none focus:border-sky-500"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Deja vacío para usar el motor local integrado con OpenCASCADE en el backend.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-medium transition-colors"
          >
            Guardar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
