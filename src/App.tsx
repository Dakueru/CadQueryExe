/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Toolbar } from './components/Toolbar';
import { CodeEditor } from './components/CodeEditor';
import { CadViewer3D } from './components/CadViewer3D';
import { ConsoleOutput } from './components/ConsoleOutput';
import { ParametricPanel } from './components/ParametricPanel';
import { ScriptExplorer } from './components/ScriptExplorer';
import { ExportModal } from './components/ExportModal';
import { VersionHistoryModal } from './components/VersionHistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { AndroidAuditModal } from './components/AndroidAuditModal';
import { CADQUERY_TEMPLATES } from './utils/cadqueryTemplates';
import {
  SavedScript,
  ExecutionResult,
  CadQueryMeshObject,
  LayoutMode,
  VersionSnapshot
} from './types';

const INITIAL_SCRIPTS: SavedScript[] = CADQUERY_TEMPLATES.map((tmpl, idx) => ({
  id: `script_${tmpl.id}`,
  name: `${tmpl.name.split('(')[0].trim().toLowerCase().replace(/\s+/g, '_')}.py`,
  code: tmpl.code,
  updatedAt: Date.now() - idx * 3600000,
}));

export default function App() {
  // Scripts repository
  const [scripts, setScripts] = useState<SavedScript[]>(() => {
    try {
      const saved = localStorage.getItem('cadquery_studio_scripts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SCRIPTS;
  });

  // Active script state
  const [activeScriptId, setActiveScriptId] = useState<string>(() => {
    try {
      const lastActive = localStorage.getItem('cadquery_studio_active_id');
      if (lastActive) return lastActive;
    } catch {}
    return INITIAL_SCRIPTS[0].id;
  });

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];
  const [code, setCode] = useState<string>(activeScript ? activeScript.code : CADQUERY_TEMPLATES[0].code);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Version history
  const [versions, setVersions] = useState<VersionSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('cadquery_studio_versions');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [currentObjects, setCurrentObjects] = useState<CadQueryMeshObject[]>([]);
  const [isStaleGeometry, setIsStaleGeometry] = useState<boolean>(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const activeExecutionIdRef = useRef<string | null>(null);

  // Layout & UI panels
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [showConsole, setShowConsole] = useState<boolean>(true);
  const [showParametric, setShowParametric] = useState<boolean>(false);

  // Modals
  const [showExplorer, setShowExplorer] = useState<boolean>(false);
  const [showExport, setShowExport] = useState<boolean>(false);
  const [showVersionHistory, setShowVersionHistory] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showAudit, setShowAudit] = useState<boolean>(false);

  // Unsaved changes confirmation dialog
  const [pendingScriptSwitchId, setPendingScriptSwitchId] = useState<string | null>(null);

  // Editor settings
  const [fontSize, setFontSize] = useState<number>(13);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [autoSaveInterval, setAutoSaveInterval] = useState<number>(2000);
  const [externalEngineUrl, setExternalEngineUrl] = useState<string>('');
  const [serverHealth, setServerHealth] = useState<any>(null);

  // Fetch server health on mount
  useEffect(() => {
    fetch('/api/cadquery/health')
      .then((r) => r.json())
      .then((data) => setServerHealth(data))
      .catch((err) => console.error('Health check failed:', err));
  }, []);

  // Restore draft or pending document on mount (Requirement 9 & 11)
  useEffect(() => {
    try {
      const draft = localStorage.getItem('cadquery_studio_draft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed.code && parsed.code !== code) {
          setCode(parsed.code);
          setHasUnsavedChanges(true);
        }
      }
    } catch {}
  }, []);

  // Persist scripts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cadquery_studio_scripts', JSON.stringify(scripts));
    } catch {}
  }, [scripts]);

  // Persist active script id
  useEffect(() => {
    try {
      localStorage.setItem('cadquery_studio_active_id', activeScriptId);
    } catch {}
  }, [activeScriptId]);

  // Automatic draft saving on inactivity (Requirement 9)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          'cadquery_studio_draft',
          JSON.stringify({
            scriptId: activeScriptId,
            code,
            timestamp: Date.now(),
          })
        );
      } catch {}
    }, autoSaveInterval);

    return () => clearTimeout(timer);
  }, [code, activeScriptId, autoSaveInterval]);

  // Periodic version snapshot saving (Requirement 16)
  useEffect(() => {
    const snapshotTimer = setInterval(() => {
      if (code && code.trim().length > 20) {
        setVersions((prev) => {
          // Avoid duplicate snapshots if code hasn't changed
          if (prev.length > 0 && prev[0].code === code) return prev;
          const newSnap: VersionSnapshot = {
            id: `ver_${Date.now()}`,
            scriptId: activeScriptId,
            code,
            timestamp: Date.now(),
            label: `Revisión automática (${new Date().toLocaleTimeString()})`,
          };
          const updated = [newSnap, ...prev.slice(0, 30)];
          try {
            localStorage.setItem('cadquery_studio_versions', JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    }, 60000); // Snapshot every 60 seconds

    return () => clearInterval(snapshotTimer);
  }, [code, activeScriptId]);

  // Run CadQuery Code (Requirement 4)
  const handleRunCode = useCallback(async (codeToRun?: string) => {
    const targetCode = codeToRun || code;
    setIsRunning(true);
    setErrorLine(null);
    const execId = `exec_${Date.now()}`;
    activeExecutionIdRef.current = execId;

    try {
      const endpoint = externalEngineUrl
        ? `${externalEngineUrl}/execute`
        : '/api/cadquery/execute';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: targetCode, executionId: execId }),
      });

      const data: ExecutionResult = await response.json();

      if (data.success && data.objects && data.objects.length > 0) {
        // Success: update 3D meshes
        setCurrentObjects(data.objects);
        setIsStaleGeometry(false);
        setErrorLine(null);
        setExecutionResult(data);
      } else {
        // Error: keep last good geometry visible (Requirement 4.6 & 4.7)
        setIsStaleGeometry(currentObjects.length > 0);
        setErrorLine(data.error_line || data.errorLine || null);
        setExecutionResult({
          ...data,
          isStale: currentObjects.length > 0,
        });
        // Auto-open console so user sees the error immediately
        setShowConsole(true);
      }
    } catch (err: any) {
      setIsStaleGeometry(currentObjects.length > 0);
      setExecutionResult({
        success: false,
        stdout: '',
        error: err.message || 'Error al comunicarse con el motor de CadQuery',
        objects: currentObjects,
        isStale: currentObjects.length > 0,
      });
      setShowConsole(true);
    } finally {
      setIsRunning(false);
      activeExecutionIdRef.current = null;
    }
  }, [code, currentObjects, externalEngineUrl]);

  // Run on initial load to display default geometry
  useEffect(() => {
    handleRunCode(activeScript?.code || CADQUERY_TEMPLATES[0].code);
  }, []);

  // Stop / Abort running execution (Requirement 4.3)
  const handleStopExecution = async () => {
    if (!isRunning) return;
    try {
      await fetch('/api/cadquery/abort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId: activeExecutionIdRef.current }),
      });
    } catch {}
    setIsRunning(false);
    activeExecutionIdRef.current = null;
  };

  // Code modification handler from editor
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setHasUnsavedChanges(true);
  };

  // Save script manually (Requirement 10)
  const handleSaveScript = () => {
    setScripts((prev) =>
      prev.map((s) =>
        s.id === activeScriptId
          ? { ...s, code, updatedAt: Date.now(), isDraft: false }
          : s
      )
    );
    setHasUnsavedChanges(false);
    try {
      localStorage.removeItem('cadquery_studio_draft');
    } catch {}
  };

  // Switch script with unsaved changes confirmation (Requirement 10)
  const handleRequestSwitchScript = (targetId: string) => {
    if (hasUnsavedChanges) {
      setPendingScriptSwitchId(targetId);
    } else {
      performSwitchScript(targetId);
    }
  };

  const performSwitchScript = (targetId: string) => {
    const target = scripts.find((s) => s.id === targetId);
    if (target) {
      setActiveScriptId(target.id);
      setCode(target.code);
      setHasUnsavedChanges(false);
      setErrorLine(null);
      handleRunCode(target.code);
    }
    setPendingScriptSwitchId(null);
  };

  // Create new script from template
  const handleCreateScript = (name: string, templateCode: string) => {
    const newScript: SavedScript = {
      id: `script_${Date.now()}`,
      name,
      code: templateCode,
      updatedAt: Date.now(),
    };
    setScripts((prev) => [newScript, ...prev]);
    setActiveScriptId(newScript.id);
    setCode(templateCode);
    setHasUnsavedChanges(false);
    handleRunCode(templateCode);
  };

  // Rename, duplicate, delete
  const handleRenameScript = (id: string, newName: string) => {
    setScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName, updatedAt: Date.now() } : s))
    );
  };

  const handleDuplicateScript = (id: string) => {
    const s = scripts.find((item) => item.id === id);
    if (!s) return;
    const duplicated: SavedScript = {
      id: `script_${Date.now()}`,
      name: `${s.name.replace(/\.py$/, '')}_copia.py`,
      code: s.code,
      updatedAt: Date.now(),
    };
    setScripts((prev) => [duplicated, ...prev]);
  };

  const handleDeleteScript = (id: string) => {
    if (scripts.length <= 1) return; // Keep at least one script
    const remaining = scripts.filter((s) => s.id !== id);
    setScripts(remaining);
    if (activeScriptId === id) {
      const next = remaining[0];
      setActiveScriptId(next.id);
      setCode(next.code);
      setHasUnsavedChanges(false);
      handleRunCode(next.code);
    }
  };

  // Import local file
  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        handleCreateScript(file.name, content);
      }
    };
    reader.readAsText(file);
  };

  // Object management in 3D viewer (Requirement 7)
  const handleToggleObjectVisibility = (id: string, visible: boolean) => {
    setCurrentObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, visible } : obj))
    );
  };

  const handleChangeObjectColor = (id: string, color: string) => {
    setCurrentObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, color } : obj))
    );
  };

  const handleChangeObjectAlpha = (id: string, alpha: number) => {
    setCurrentObjects((prev) =>
      prev.map((obj) => (obj.id === id ? { ...obj, alpha } : obj))
    );
  };

  // Jump to error line in editor
  const handleJumpToErrorLine = (line: number) => {
    setErrorLine(line);
    // Ensure editor is visible
    if (layoutMode === 'viewer_only') {
      setLayoutMode('split');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* Main Top Toolbar (Section 2) */}
      <Toolbar
        onRun={() => handleRunCode()}
        onStop={handleStopExecution}
        isRunning={isRunning}
        onSave={handleSaveScript}
        hasUnsavedChanges={hasUnsavedChanges}
        onCopyAll={() => navigator.clipboard.writeText(code)}
        onUndo={() => {}}
        onRedo={() => {}}
        onExport={() => setShowExport(true)}
        layoutMode={layoutMode}
        onChangeLayoutMode={setLayoutMode}
        showConsole={showConsole}
        onToggleConsole={() => setShowConsole(!showConsole)}
        showParametric={showParametric}
        onToggleParametric={() => setShowParametric(!showParametric)}
        onOpenExplorer={() => setShowExplorer(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenAudit={() => setShowAudit(true)}
        activeScriptName={activeScript?.name || 'script.py'}
      />

      {/* Main Content Workspace (Split or Solo Layouts) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Editor Pane */}
        {(layoutMode === 'split' || layoutMode === 'editor_only') && (
          <div
            className={`flex flex-col h-full overflow-hidden ${
              layoutMode === 'split' ? 'w-full md:w-1/2 h-1/2 md:h-full' : 'w-full h-full'
            }`}
          >
            <CodeEditor
              code={code}
              onChange={handleCodeChange}
              errorLine={errorLine}
              onClearError={() => setErrorLine(null)}
              fontSize={fontSize}
              wordWrap={wordWrap}
            />
          </div>
        )}

        {/* 3D Viewport Pane */}
        {(layoutMode === 'split' || layoutMode === 'viewer_only') && (
          <div
            className={`relative flex-1 h-full overflow-hidden ${
              layoutMode === 'split' ? 'w-full md:w-1/2 h-1/2 md:h-full' : 'w-full h-full'
            }`}
          >
            <CadViewer3D
              objects={currentObjects}
              onToggleObjectVisibility={handleToggleObjectVisibility}
              onChangeObjectColor={handleChangeObjectColor}
              onChangeObjectAlpha={handleChangeObjectAlpha}
              isStale={isStaleGeometry}
            />
          </div>
        )}

        {/* Parametric Side Drawer (Section 13) */}
        {showParametric && (
          <div className="absolute top-0 right-0 bottom-0 z-20 shadow-2xl animate-in slide-in-from-right">
            <ParametricPanel
              code={code}
              onUpdateCode={handleCodeChange}
              onApplyAndExecute={() => handleRunCode()}
              onClose={() => setShowParametric(false)}
            />
          </div>
        )}
      </div>

      {/* Console Drawer (Section 5) */}
      {showConsole && (
        <div className="h-44 shrink-0 z-20 animate-in slide-in-from-bottom">
          <ConsoleOutput
            result={executionResult}
            isRunning={isRunning}
            onJumpToLine={handleJumpToErrorLine}
            onClear={() => setExecutionResult(null)}
          />
        </div>
      )}

      {/* Modals & Dialogs */}
      {showExplorer && (
        <ScriptExplorer
          scripts={scripts}
          activeScriptId={activeScriptId}
          onSelectScript={handleRequestSwitchScript}
          onCreateScript={handleCreateScript}
          onRenameScript={handleRenameScript}
          onDuplicateScript={handleDuplicateScript}
          onDeleteScript={handleDeleteScript}
          onImportScript={handleImportFile}
          onClose={() => setShowExplorer(false)}
        />
      )}

      {showExport && (
        <ExportModal
          code={code}
          objects={currentObjects}
          onClose={() => setShowExport(false)}
        />
      )}

      {showVersionHistory && (
        <VersionHistoryModal
          versions={versions.filter((v) => v.scriptId === activeScriptId)}
          onRestoreVersion={(restoredCode) => {
            handleCodeChange(restoredCode);
            handleRunCode(restoredCode);
          }}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          fontSize={fontSize}
          onChangeFontSize={setFontSize}
          wordWrap={wordWrap}
          onToggleWordWrap={() => setWordWrap(!wordWrap)}
          autoSaveInterval={autoSaveInterval}
          onChangeAutoSaveInterval={setAutoSaveInterval}
          externalEngineUrl={externalEngineUrl}
          onChangeExternalEngineUrl={setExternalEngineUrl}
          onClose={() => setShowSettings(false)}
          serverHealth={serverHealth}
        />
      )}

      {showAudit && (
        <AndroidAuditModal
          onClose={() => setShowAudit(false)}
          serverHealth={serverHealth}
        />
      )}

      {/* Unsaved Changes Confirmation Dialog (Section 10) */}
      {pendingScriptSwitchId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-xs text-slate-200 space-y-3">
            <h3 className="font-bold text-sm text-slate-100">¿Quieres guardar los cambios?</h3>
            <p className="text-slate-400 leading-relaxed text-xs">
              El documento actual contiene modificaciones que todavía no se han guardado en el archivo .py.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPendingScriptSwitchId(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => performSwitchScript(pendingScriptSwitchId)}
                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg font-medium"
              >
                Descartar
              </button>
              <button
                onClick={() => {
                  handleSaveScript();
                  performSwitchScript(pendingScriptSwitchId);
                }}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold shadow-md shadow-sky-900/30"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
