import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, X, Check } from 'lucide-react';
import { ParametricVariable } from '../types';

interface ParametricPanelProps {
  code: string;
  onUpdateCode: (newCode: string) => void;
  onApplyAndExecute: () => void;
  onClose: () => void;
}

export const ParametricPanel: React.FC<ParametricPanelProps> = ({
  code,
  onUpdateCode,
  onApplyAndExecute,
  onClose,
}) => {
  const [variables, setVariables] = useState<ParametricVariable[]>([]);

  // Parse top-level numerical variables from Python code
  useEffect(() => {
    const lines = code.split('\n');
    const detected: ParametricVariable[] = [];
    const varRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([0-9]+(?:\.[0-9]+)?)\s*(?:#.*)?$/;

    lines.forEach((line, lineIdx) => {
      const match = line.trim().match(varRegex);
      if (match) {
        const name = match[1];
        const val = parseFloat(match[2]);
        if (!isNaN(val)) {
          // Heuristic range for sliders: 0.1x to 4x of current value or min 1 max 200
          const min = val > 0 ? Math.max(1, Math.floor(val * 0.2)) : 0;
          const max = val > 0 ? Math.ceil(val * 3) : 100;
          const step = Number.isInteger(val) ? 1 : 0.5;

          detected.push({
            name,
            value: val,
            rawStr: match[2],
            line: lineIdx,
            min,
            max,
            step,
          });
        }
      }
    });

    setVariables(detected);
  }, [code]);

  // Update a single parameter's value in state and code
  const handleChangeParam = (varName: string, lineIndex: number, newVal: number) => {
    const lines = code.split('\n');
    if (lineIndex < lines.length) {
      const currentLine = lines[lineIndex];
      // Safely replace value on this specific line: name = value
      const updatedLine = currentLine.replace(
        new RegExp(`^(\\s*${varName}\\s*=\\s*)[0-9]+(?:\\.[0-9]+)?`),
        `$1${newVal}`
      );
      lines[lineIndex] = updatedLine;
      const updatedCode = lines.join('\n');
      onUpdateCode(updatedCode);
    }
  };

  return (
    <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full text-xs text-slate-200 shadow-xl z-20">
      {/* Header */}
      <div className="p-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-100 uppercase tracking-wide">
            Parámetros del Modelo
          </span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Variables list */}
      <div className="flex-1 p-3 overflow-y-auto space-y-4">
        {variables.length === 0 ? (
          <div className="text-slate-500 italic py-6 text-center leading-relaxed">
            No se detectaron variables numéricas en el script (ej. <code className="text-sky-400">largo = 120</code>).
          </div>
        ) : (
          variables.map((param) => (
            <div
              key={`${param.name}_${param.line}`}
              className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-sky-300 capitalize">
                  {param.name.replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={param.value}
                    step={param.step}
                    onChange={(e) =>
                      handleChangeParam(param.name, param.line, parseFloat(e.target.value) || 0)
                    }
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded font-mono text-right text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <span className="text-[10px] text-slate-500">mm</span>
                </div>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={param.min}
                max={param.max}
                step={param.step}
                value={param.value}
                onChange={(e) =>
                  handleChangeParam(param.name, param.line, parseFloat(e.target.value))
                }
                className="w-full accent-sky-500 cursor-pointer"
              />

              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>{param.min}</span>
                <span>Línea {param.line + 1}</span>
                <span>{param.max}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Update Button */}
      {variables.length > 0 && (
        <div className="p-3 bg-slate-900/90 border-t border-slate-800">
          <button
            onClick={onApplyAndExecute}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-900/20 active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualizar Modelo (▶)</span>
          </button>
        </div>
      )}
    </div>
  );
};
