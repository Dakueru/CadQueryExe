import React from 'react';
import { History, RotateCcw, Clock, X, FileCode } from 'lucide-react';
import { VersionSnapshot } from '../types';

interface VersionHistoryModalProps {
  versions: VersionSnapshot[];
  onRestoreVersion: (code: string) => void;
  onClose: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  versions,
  onRestoreVersion,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            <h2 className="font-bold text-sm text-slate-100">Historial de Versiones</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {versions.length === 0 ? (
            <div className="text-slate-500 italic py-6 text-center">
              No hay instantáneas previas guardadas aún.
            </div>
          ) : (
            versions.map((ver, idx) => (
              <div
                key={ver.id}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-slate-900 text-sky-400 rounded-lg shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 truncate">
                      {ver.label || `Versión #${versions.length - idx}`}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(ver.timestamp).toLocaleTimeString()}
                      </span>
                      <span>·</span>
                      <span>{ver.code.split('\n').length} líneas</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onRestoreVersion(ver.code);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-sky-600/30 hover:bg-sky-600 text-sky-300 hover:text-white rounded-lg font-medium flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Restaurar</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
