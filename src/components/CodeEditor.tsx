import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Undo,
  Redo,
  Search,
  Replace,
  Type,
  WrapText,
  HelpCircle,
  X,
  Code2,
  Check
} from 'lucide-react';
import { tokenizeLine, Token } from '../utils/syntaxHighlighter';
import { getCompletionsAtCursor, CompletionItem } from '../utils/autocomplete';
import { CQ_HELP_DOCS, FunctionHelpDoc } from '../utils/cadqueryHelp';

interface CodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  errorLine?: number | null;
  onClearError?: () => void;
  fontSize?: number;
  wordWrap?: boolean;
}

const QUICK_SYMBOLS = ['(', ')', '[', ']', '"', "'", '.', '=', '|', '<', '>', ':', '_', ',', '#'];

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  errorLine,
  onClearError,
  fontSize = 14,
  wordWrap = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const linesContainerRef = useRef<HTMLDivElement>(null);

  // Editor states
  const [cursorPos, setCursorPos] = useState(0);
  const [activeLineNumber, setActiveLineNumber] = useState(1);
  const [ghostText, setGhostText] = useState('');
  const [activeCompletions, setActiveCompletions] = useState<CompletionItem[]>([]);
  const [showCompletionDropdown, setShowCompletionDropdown] = useState(false);
  const [selectedCompletionIdx, setSelectedCompletionIdx] = useState(0);

  // Search & Replace
  const [showSearchReplace, setShowSearchReplace] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');

  // Contextual help modal
  const [activeHelp, setActiveHelp] = useState<FunctionHelpDoc | null>(null);

  // Undo/Redo history stack
  const historyRef = useRef<string[]>([code]);
  const historyIdxRef = useRef<number>(0);
  const isInternalChangeRef = useRef(false);

  // Lines split
  const lines = code.split('\n');

  // Push to undo history when code changes externally or with debounce
  const updateCodeWithHistory = useCallback((newCode: string) => {
    isInternalChangeRef.current = true;
    const currentHist = historyRef.current.slice(0, historyIdxRef.current + 1);
    currentHist.push(newCode);
    if (currentHist.length > 50) currentHist.shift();
    historyRef.current = currentHist;
    historyIdxRef.current = currentHist.length - 1;
    onChange(newCode);
  }, [onChange]);

  // Handle Undo
  const handleUndo = () => {
    if (historyIdxRef.current > 0) {
      historyIdxRef.current--;
      const prev = historyRef.current[historyIdxRef.current];
      onChange(prev);
    }
  };

  // Handle Redo
  const handleRedo = () => {
    if (historyIdxRef.current < historyRef.current.length - 1) {
      historyIdxRef.current++;
      const next = historyRef.current[historyIdxRef.current];
      onChange(next);
    }
  };

  // Scroll to error line if present
  useEffect(() => {
    if (errorLine && errorLine > 0 && containerRef.current) {
      const lineElements = containerRef.current.querySelectorAll('[data-line-number]');
      const targetElem = Array.from(lineElements).find(
        (el) => el.getAttribute('data-line-number') === String(errorLine)
      );
      if (targetElem) {
        targetElem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [errorLine]);

  // Update autocompletion & line position on cursor change
  const handleSelectionOrTextChange = useCallback(() => {
    if (!textareaRef.current) return;
    const selStart = textareaRef.current.selectionStart || 0;
    setCursorPos(selStart);

    // Calculate line number
    const textBefore = code.substring(0, selStart);
    const lineNum = textBefore.split('\n').length;
    setActiveLineNumber(lineNum);

    // Compute completions
    const { ghostSuffix, items } = getCompletionsAtCursor(code, selStart);
    setGhostText(ghostSuffix);
    setActiveCompletions(items);
    setShowCompletionDropdown(items.length > 1 && ghostSuffix.length > 0);
    setSelectedCompletionIdx(0);
  }, [code]);

  // Insert text at current cursor
  const insertTextAtCursor = (insert: string, moveCursorDelta = 0) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart || 0;
    const end = textareaRef.current.selectionEnd || 0;

    const before = code.substring(0, start);
    const after = code.substring(end);
    const updated = before + insert + after;

    updateCodeWithHistory(updated);

    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = start + insert.length + moveCursorDelta;
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
        textareaRef.current.focus();
        handleSelectionOrTextChange();
      }
    }, 10);
  };

  // Accept current ghost suggestion
  const acceptSuggestion = (item?: CompletionItem) => {
    const textToInsert = item ? item.insertText : ghostText;
    if (!textToInsert) return;

    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart || 0;
    
    // If completing a dot or prefix, replace prefix or append
    if (item) {
      // Find what prefix was typed on this line
      const before = code.substring(0, start);
      const dotIdx = before.lastIndexOf('.');
      const wordMatch = /([a-zA-Z0-9_]+)$/.exec(before);
      
      let replaceFrom = start;
      if (dotIdx !== -1 && start > dotIdx) {
        replaceFrom = dotIdx + 1;
      } else if (wordMatch) {
        replaceFrom = start - wordMatch[1].length;
      }

      const updated = code.substring(0, replaceFrom) + item.insertText + code.substring(start);
      updateCodeWithHistory(updated);

      setTimeout(() => {
        if (textareaRef.current) {
          const newPos = replaceFrom + item.insertText.length;
          textareaRef.current.selectionStart = newPos;
          textareaRef.current.selectionEnd = newPos;
          textareaRef.current.focus();
          setGhostText('');
          setShowCompletionDropdown(false);
          handleSelectionOrTextChange();
        }
      }, 10);
    } else {
      insertTextAtCursor(ghostText);
      setGhostText('');
      setShowCompletionDropdown(false);
    }
  };

  // Key down event handler for keyboard shortcuts & Tab
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Accept suggestion with Tab or ArrowRight at end of word
    if (e.key === 'Tab' || (e.key === 'ArrowRight' && ghostText.length > 0)) {
      if (ghostText.length > 0 || (showCompletionDropdown && activeCompletions.length > 0)) {
        e.preventDefault();
        acceptSuggestion(showCompletionDropdown ? activeCompletions[selectedCompletionIdx] : undefined);
        return;
      }
      // If no suggestion, insert 4 spaces for indent
      e.preventDefault();
      insertTextAtCursor('    ');
      return;
    }

    // 2. Navigation inside dropdown
    if (showCompletionDropdown && activeCompletions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCompletionIdx((prev) => (prev + 1) % activeCompletions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCompletionIdx((prev) => (prev - 1 + activeCompletions.length) % activeCompletions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        acceptSuggestion(activeCompletions[selectedCompletionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setShowCompletionDropdown(false);
        return;
      }
    }

    // 3. Auto-closing brackets and quotes
    const pairMap: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'"
    };
    if (pairMap[e.key]) {
      const closeChar = pairMap[e.key];
      e.preventDefault();
      insertTextAtCursor(e.key + closeChar, -1); // place cursor inside
      return;
    }

    // 4. Auto-indentation on Enter
    if (e.key === 'Enter') {
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const textBefore = code.substring(0, start);
        const currentLineText = textBefore.split('\n').pop() || '';
        
        // Match leading whitespace
        const indentMatch = currentLineText.match(/^(\s*)/);
        let indent = indentMatch ? indentMatch[1] : '';

        // If line ends with colon or open paren, add 4 extra spaces
        if (currentLineText.trim().endsWith(':') || currentLineText.trim().endsWith('(')) {
          indent += '    ';
        }

        e.preventDefault();
        insertTextAtCursor('\n' + indent);
        return;
      }
    }

    // 5. Comment / Uncomment toggle with Ctrl+/ or Cmd+/
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      toggleCommentBlock();
      return;
    }
  };

  // Toggle comments on active line or selection
  const toggleCommentBlock = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    const allLines = code.split('\n');
    const startLineIdx = code.substring(0, start).split('\n').length - 1;
    const endLineIdx = code.substring(0, end).split('\n').length - 1;

    let allCommented = true;
    for (let i = startLineIdx; i <= endLineIdx; i++) {
      if (!allLines[i].trim().startsWith('#')) {
        allCommented = false;
        break;
      }
    }

    for (let i = startLineIdx; i <= endLineIdx; i++) {
      if (allCommented) {
        // Uncomment
        allLines[i] = allLines[i].replace(/^(\s*)#\s?/, '$1');
      } else {
        // Comment
        allLines[i] = allLines[i].replace(/^(\s*)/, '$1# ');
      }
    }

    updateCodeWithHistory(allLines.join('\n'));
  };

  // Search & Replace actions
  const handleReplaceAll = () => {
    if (!searchQuery) return;
    const updated = code.replaceAll(searchQuery, replaceQuery);
    updateCodeWithHistory(updated);
  };

  // Sync scrolling between overlay syntax highlighter and invisible textarea
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (linesContainerRef.current) {
      linesContainerRef.current.scrollTop = e.currentTarget.scrollTop;
      linesContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  // Render highlighted tokens with color styles
  const renderToken = (token: Token, tokenIdx: number) => {
    switch (token.type) {
      case 'keyword':
        return <span key={tokenIdx} className="text-purple-400 font-semibold">{token.text}</span>;
      case 'cadquery-method':
        return (
          <span
            key={tokenIdx}
            className="text-cyan-300 font-semibold cursor-pointer hover:underline"
            onClick={() => {
              if (CQ_HELP_DOCS[token.text]) {
                setActiveHelp(CQ_HELP_DOCS[token.text]);
              }
            }}
            title="Toca para ver ayuda contextual"
          >
            {token.text}
          </span>
        );
      case 'cadquery-class':
        return <span key={tokenIdx} className="text-amber-400 font-bold">{token.text}</span>;
      case 'cadquery-selector-dir':
        // Mandatory requirement: |Z, >Y, <X in yellow!
        return <span key={tokenIdx} className="text-yellow-300 font-bold bg-yellow-950/40 px-0.5 rounded">{token.text}</span>;
      case 'cadquery-selector-op':
        // Mandatory requirement: and, or, not in blue!
        return <span key={tokenIdx} className="text-sky-400 font-bold px-0.5">{token.text}</span>;
      case 'cadquery-selector-type':
        // %CIRCLE, %LINE in orange
        return <span key={tokenIdx} className="text-amber-300 font-semibold">{token.text}</span>;
      case 'string':
        return <span key={tokenIdx} className="text-emerald-300">{token.text}</span>;
      case 'comment':
        return <span key={tokenIdx} className="text-slate-500 italic">{token.text}</span>;
      case 'number':
        return <span key={tokenIdx} className="text-orange-400 font-mono">{token.text}</span>;
      case 'operator':
        return <span key={tokenIdx} className="text-pink-400">{token.text}</span>;
      case 'punctuation':
        return <span key={tokenIdx} className="text-slate-400">{token.text}</span>;
      default:
        return <span key={tokenIdx} className="text-slate-100">{token.text}</span>;
    }
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 text-slate-100 font-mono select-none overflow-hidden border-r border-slate-800">
      {/* Quick Mobile Symbols Bar (Section 3.3) */}
      <div className="shrink-0 flex items-center justify-between px-2 py-1 bg-slate-900 border-b border-slate-800/80 overflow-x-auto text-xs scrollbar-none z-10">
        <div className="flex items-center gap-1">
          {QUICK_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => insertTextAtCursor(sym)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-sky-600 text-slate-200 active:text-white rounded text-xs font-semibold font-mono transition-colors"
            >
              {sym}
            </button>
          ))}
        </div>

        {/* Action icons: Undo, Redo, Search, Help */}
        <div className="flex items-center gap-1 pl-2 shrink-0 border-l border-slate-800">
          <button
            onClick={handleUndo}
            disabled={historyIdxRef.current <= 0}
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIdxRef.current >= historyRef.current.length - 1}
            className="p-1.5 text-slate-400 hover:text-slate-200 disabled:opacity-30 rounded hover:bg-slate-800 transition-colors"
            title="Rehacer (Ctrl+Y)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowSearchReplace(!showSearchReplace)}
            className={`p-1.5 rounded transition-colors ${
              showSearchReplace ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title="Buscar y reemplazar"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search & Replace Inline Panel */}
      {showSearchReplace && (
        <div className="shrink-0 px-3 py-2 bg-slate-900/95 border-b border-slate-800 text-xs flex flex-wrap items-center gap-2 z-10 animate-in slide-in-from-top-2">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1 min-w-[120px]"
          />
          <input
            type="text"
            placeholder="Reemplazar por..."
            value={replaceQuery}
            onChange={(e) => setReplaceQuery(e.target.value)}
            className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 flex-1 min-w-[120px]"
          />
          <button
            onClick={handleReplaceAll}
            className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded font-medium flex items-center gap-1 transition-colors"
          >
            <Replace className="w-3 h-3" />
            <span>Reemplazar todo</span>
          </button>
          <button
            onClick={() => setShowSearchReplace(false)}
            className="p-1 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Editor Body: Line numbers + Overlay Code Container */}
      <div ref={containerRef} className="relative flex-1 flex overflow-hidden">
        {/* Line Numbers Column */}
        <div className="shrink-0 w-11 py-3 bg-slate-950 border-r border-slate-800/60 select-none text-right pr-2 text-slate-600 text-[12px] font-mono leading-6">
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isError = errorLine === lineNum;
            const isActive = activeLineNumber === lineNum;
            return (
              <div
                key={lineNum}
                data-line-number={lineNum}
                className={`transition-colors ${
                  isError
                    ? 'text-rose-500 font-bold bg-rose-950/60 -mr-2 pr-2'
                    : isActive
                    ? 'text-sky-400 font-medium'
                    : ''
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Text Area & Syntax Overlay Area */}
        <div className="relative flex-1 h-full overflow-hidden">
          {/* Syntax Highlighted Render (Visual Layer) */}
          <div
            ref={linesContainerRef}
            className={`absolute inset-0 py-3 pl-3 pr-4 pointer-events-none select-none font-mono leading-6 overflow-hidden ${
              wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
            }`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isError = errorLine === lineNum;
              const isActive = activeLineNumber === lineNum;
              const tokens = tokenizeLine(line);

              return (
                <div
                  key={idx}
                  data-line-number={lineNum}
                  className={`min-h-[24px] ${
                    isError
                      ? 'bg-rose-950/40 border-l-2 border-rose-500 -ml-3 pl-2.5'
                      : isActive
                      ? 'bg-slate-900/40'
                      : ''
                  }`}
                >
                  {tokens.map((token, tIdx) => renderToken(token, tIdx))}
                  {/* Invisible placeholder for empty lines to maintain height */}
                  {tokens.length === 0 && <span>&nbsp;</span>}
                </div>
              );
            })}
          </div>

          {/* Actual Editable Textarea (Input Layer) */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => {
              updateCodeWithHistory(e.target.value);
              if (onClearError) onClearError();
            }}
            onKeyDown={handleKeyDown}
            onClick={handleSelectionOrTextChange}
            onKeyUp={handleSelectionOrTextChange}
            onScroll={handleScroll}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className={`absolute inset-0 w-full h-full py-3 pl-3 pr-4 bg-transparent text-transparent caret-sky-400 resize-none font-mono leading-6 focus:outline-none selection:bg-sky-500/30 selection:text-transparent ${
              wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'
            }`}
            style={{ fontSize: `${fontSize}px` }}
          />

          {/* Inline Ghost Suggestion Overlay (Requirement 3.2: Pending characters in light gray) */}
          {ghostText && (
            <div
              onClick={() => acceptSuggestion()}
              className="absolute bottom-2 right-4 z-20 px-3 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-sky-300 border border-slate-700/80 rounded-lg text-xs font-mono shadow-lg cursor-pointer flex items-center gap-1.5 backdrop-blur transition-all"
              title="Toca para autocompletar o presiona Tab"
            >
              <span className="text-slate-500">Sugerencia:</span>
              <span className="text-sky-400 font-semibold">{ghostText}</span>
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Tab / Tocar</span>
            </div>
          )}

          {/* Autocomplete Dropdown Menu */}
          {showCompletionDropdown && activeCompletions.length > 0 && (
            <div className="absolute top-12 left-16 z-30 w-72 max-h-56 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md overflow-y-auto p-1 text-xs">
              <div className="px-2 py-1 text-[10px] text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-800 mb-1">
                Sugerencias CadQuery
              </div>
              {activeCompletions.map((comp, idx) => (
                <div
                  key={idx}
                  onClick={() => acceptSuggestion(comp)}
                  className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                    selectedCompletionIdx === idx
                      ? 'bg-sky-600/30 text-sky-200 border border-sky-500/40'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold text-slate-100 font-mono truncate">{comp.label}</span>
                    <span className="text-[10px] text-slate-400 truncate">{comp.detail}</span>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-semibold bg-slate-800 text-slate-400 shrink-0">
                    {comp.kind}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contextual Function Help Modal (Requirement 14) */}
      {activeHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-5 text-xs text-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                <span className="font-bold text-sm text-slate-100 font-mono">
                  {activeHelp.name}()
                </span>
              </div>
              <button
                onClick={() => setActiveHelp(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="font-mono text-[11px] bg-slate-950 p-2.5 rounded-lg text-sky-300 border border-slate-800">
              {activeHelp.signature}
            </div>

            <p className="text-slate-300 leading-relaxed text-xs">
              {activeHelp.description}
            </p>

            {activeHelp.parameters.length > 0 && (
              <div>
                <span className="font-semibold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
                  Parámetros:
                </span>
                <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  {activeHelp.parameters.map((p) => (
                    <div key={p.name} className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-amber-300">{p.name}</span>
                        <span className="text-[10px] text-purple-400 font-mono">({p.type})</span>
                        {p.defaultValue && (
                          <span className="text-[10px] text-slate-500">defecto: {p.defaultValue}</span>
                        )}
                      </div>
                      <span className="text-slate-400 text-[11px] pl-2">{p.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="font-semibold text-slate-400 block mb-1 uppercase tracking-wider text-[10px]">
                Ejemplo de uso:
              </span>
              <pre className="bg-slate-950 p-2.5 rounded-lg text-[11px] text-emerald-300 font-mono overflow-x-auto border border-slate-800">
                {activeHelp.example}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveHelp(null)}
                className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
