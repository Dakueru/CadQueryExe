import React, { useState } from 'react';
import {
  Folder,
  FileCode,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Search,
  ArrowUpDown,
  Download,
  Upload,
  X,
  Check,
  Clock,
  Sparkles
} from 'lucide-react';
import { SavedScript } from '../types';
import { CADQUERY_TEMPLATES, TemplateItem } from '../utils/cadqueryTemplates';

interface ScriptExplorerProps {
  scripts: SavedScript[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onCreateScript: (name: string, templateCode: string) => void;
  onRenameScript: (id: string, newName: string) => void;
  onDuplicateScript: (id: string) => void;
  onDeleteScript: (id: string) => void;
  onImportScript: (file: File) => void;
  onClose: () => void;
}

export const ScriptExplorer: React.FC<ScriptExplorerProps> = ({
  scripts,
  activeScriptId,
  onSelectScript,
  onCreateScript,
  onRenameScript,
  onDuplicateScript,
  onDeleteScript,
  onImportScript,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter & Sort
  const filtered = scripts
    .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b.updatedAt - a.updatedAt;
    });

  const handleStartRename = (s: SavedScript) => {
    setEditingId(s.id);
    setEditingName(s.name.replace(/\.py$/, ''));
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      onRenameScript(id, `${editingName.trim()}.py`);
    }
    setEditingId(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportScript(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] text-xs text-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Folder className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="font-bold text-sm text-slate-100">Explorador de Scripts CadQuery</h2>
              <p className="text-[11px] text-slate-400">Directorio de modelos Python (.py) locales</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search, Sort, New Script, Import */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar script..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Sort toggle */}
          <button
            onClick={() => setSortBy(sortBy === 'date' ? 'name' : 'date')}
            className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1.5"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
            <span>{sortBy === 'date' ? 'Más recientes' : 'Por nombre'}</span>
          </button>

          {/* Import file */}
          <label className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 cursor-pointer flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importar .py</span>
            <input type="file" accept=".py,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          {/* New script button */}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg flex items-center gap-1.5 shadow-md shadow-sky-900/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Script</span>
          </button>
        </div>

        {/* Script List */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500 italic">
              No se encontraron scripts. Crea uno nuevo con el botón (+).
            </div>
          ) : (
            filtered.map((s) => {
              const isActive = s.id === activeScriptId;
              const isDeleting = deleteConfirmId === s.id;

              return (
                <div
                  key={s.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-sky-950/30 border-sky-500/60 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Script info */}
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => {
                      onSelectScript(s.id);
                      onClose();
                    }}
                  >
                    <div className="p-2 bg-slate-800/80 rounded-lg text-sky-400 shrink-0">
                      <FileCode className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingId === s.id ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(s.id)}
                            autoFocus
                            className="px-2 py-0.5 bg-slate-900 border border-sky-500 rounded text-slate-100 font-mono text-xs focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveRename(s.id)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-slate-700 text-slate-300 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 font-mono truncate">
                            {s.name}
                          </span>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-sky-500/20 text-sky-400 rounded border border-sky-500/30 font-medium">
                              Abierto
                            </span>
                          )}
                          {s.isDraft && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">
                              Borrador recuperado
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(s.updatedAt).toLocaleString()}
                        </span>
                        <span>·</span>
                        <span>{s.code.split('\n').length} líneas</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {isDeleting ? (
                      <div className="flex items-center gap-1 bg-rose-950 p-1 rounded-lg border border-rose-800">
                        <span className="text-[10px] text-rose-300 px-1">¿Eliminar?</span>
                        <button
                          onClick={() => {
                            onDeleteScript(s.id);
                            setDeleteConfirmId(null);
                          }}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-semibold"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[10px]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartRename(s)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                          title="Renombrar script"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateScript(s.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
                          title="Duplicar script"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(s.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                          title="Eliminar script"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Template Selector Modal (Requirement 15) */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 text-xs text-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm text-slate-100">
                  Seleccionar Plantilla CadQuery
                </span>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {CADQUERY_TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    const baseName = tmpl.name.split('(')[0].trim().toLowerCase().replace(/\s+/g, '_');
                    onCreateScript(`${baseName}.py`, tmpl.code);
                    setShowTemplateModal(false);
                    onClose();
                  }}
                  className="p-3 bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/60 rounded-xl cursor-pointer transition-all space-y-1 group"
                >
                  <div className="font-semibold text-slate-100 group-hover:text-sky-300">
                    {tmpl.name}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
