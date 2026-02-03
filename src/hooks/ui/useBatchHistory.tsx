import { useState, useCallback, useRef, useEffect } from 'react';
import { Undo2, Redo2, History, Save, Trash2, Clock } from 'lucide-react';

interface HistoryEntry<T> {
  id: string;
  data: T;
  timestamp: number;
  description: string;
  userId?: string;
}

interface BatchTemplate {
  id: string;
  name: string;
  description: string;
  operations: Array<{
    type: string;
    params: Record<string, unknown>;
  }>;
  createdAt: number;
  lastUsed?: number;
  usageCount: number;
}

interface UseBatchHistoryReturn<T> {
  history: HistoryEntry<T>[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  push: (data: T, description: string) => string;
  goTo: (index: number) => void;
  clear: () => void;
  getHistorySize: () => number;
  saveTemplate: (name: string, description: string) => string;
  applyTemplate: (templateId: string) => void;
  templates: BatchTemplate[];
  deleteTemplate: (templateId: string) => void;
}

export function useBatchHistory<T>(
  config: {
    maxHistorySize?: number;
    maxHistoryAge?: number;
    autoSave?: boolean;
    storageKey?: string;
  } = {},
): UseBatchHistoryReturn<T> {
  const {
    maxHistorySize = 50,
    maxHistoryAge = 7 * 24 * 60 * 60 * 1000,
    autoSave = false,
    storageKey = 'batch-history',
  } = config;

  const [history, setHistory] = useState<HistoryEntry<T>[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [templates, setTemplates] = useState<BatchTemplate[]>([]);
  const historyRef = useRef<HistoryEntry<T>[]>([]);
  const currentIndexRef = useRef(-1);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.history)) {
          const filteredHistory = parsed.history.filter(
            (entry: HistoryEntry<T>) => Date.now() - entry.timestamp < maxHistoryAge,
          );
          setHistory(filteredHistory);
          historyRef.current = filteredHistory;
          setCurrentIndex(filteredHistory.length - 1);
          currentIndexRef.current = filteredHistory.length - 1;
        }
        if (Array.isArray(parsed.templates)) {
          setTemplates(parsed.templates);
        }
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }, [storageKey, maxHistoryAge]);

  const saveToStorage = useCallback(
    (newHistory: HistoryEntry<T>[], newTemplates: BatchTemplate[]) => {
      if (!autoSave) return;

      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            history: newHistory.slice(-maxHistorySize),
            templates: newTemplates,
          }),
        );
      } catch (error) {
        console.error('Failed to save history:', error);
      }
    },
    [autoSave, storageKey, maxHistorySize],
  );

  const canUndo = currentIndex >= 0;
  const canRedo = currentIndex < history.length - 1;

  const push = useCallback(
    (data: T, description: string): string => {
      const entry: HistoryEntry<T> = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        data,
        timestamp: Date.now(),
        description,
      };

      const newHistory = [...historyRef.current.slice(0, currentIndexRef.current + 1), entry];

      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
      }

      historyRef.current = newHistory;
      currentIndexRef.current = newHistory.length - 1;

      setHistory(newHistory);
      setCurrentIndex(newHistory.length - 1);

      saveToStorage(newHistory, templates);

      return entry.id;
    },
    [maxHistorySize, saveToStorage, templates],
  );

  const undo = useCallback(() => {
    if (!canUndo) return;

    const newIndex = currentIndexRef.current - 1;
    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;

    const newIndex = currentIndexRef.current + 1;
    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
  }, [canRedo]);

  const goTo = useCallback((index: number) => {
    if (index < 0 || index >= historyRef.current.length) return;

    currentIndexRef.current = index;
    setCurrentIndex(index);
  }, []);

  const clear = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
    setHistory([]);
    setCurrentIndex(-1);
    saveToStorage([], templates);
  }, [saveToStorage, templates]);

  const getHistorySize = useCallback(() => {
    return historyRef.current.length;
  }, []);

  const saveTemplate = useCallback(
    (name: string, description: string): string => {
      const template: BatchTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name,
        description,
        operations: [],
        createdAt: Date.now(),
        usageCount: 0,
      };

      const newTemplates = [...templates, template];
      setTemplates(newTemplates);
      saveToStorage(historyRef.current, newTemplates);

      return template.id;
    },
    [templates, saveToStorage],
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      const newTemplates = templates.map((t) =>
        t.id === templateId ? { ...t, lastUsed: Date.now(), usageCount: t.usageCount + 1 } : t,
      );

      setTemplates(newTemplates);
      saveToStorage(historyRef.current, newTemplates);
    },
    [templates, saveToStorage],
  );

  const deleteTemplate = useCallback(
    (templateId: string) => {
      const newTemplates = templates.filter((t) => t.id !== templateId);
      setTemplates(newTemplates);
      saveToStorage(historyRef.current, newTemplates);
    },
    [templates, saveToStorage],
  );

  return {
    history,
    currentIndex,
    canUndo,
    canRedo,
    undo,
    redo,
    push,
    goTo,
    clear,
    getHistorySize,
    saveTemplate,
    applyTemplate,
    templates,
    deleteTemplate,
  };
}

interface BatchHistoryPanelProps<T> {
  history: HistoryEntry<T>[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onItemClick: (index: number) => void;
  className?: string;
}

export function BatchHistoryPanel<T>({
  history,
  currentIndex,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onItemClick,
  className = '',
}: BatchHistoryPanelProps<T>) {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">History</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {history.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Undo"
          >
            <Undo2 className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="rounded-lg p-2 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            title="Redo"
          >
            <Redo2 className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={onClear}
            className="rounded-lg p-2 transition-colors hover:bg-red-50"
            title="Clear history"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {history.length === 0 ? (
          <p className="py-8 text-center text-gray-500">No history yet</p>
        ) : (
          history.map((entry, index) => (
            <div
              key={entry.id}
              onClick={() => onItemClick(index)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors ${
                index === currentIndex
                  ? 'border border-purple-200 bg-purple-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Clock className="h-4 w-4 text-gray-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{entry.description}</p>
                <p className="text-xs text-gray-500">{formatTime(entry.timestamp)}</p>
              </div>
              {index === currentIndex && (
                <div className="flex-shrink-0">
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                    Current
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface BatchTemplatesPanelProps {
  templates: BatchTemplate[];
  onApply: (templateId: string) => void;
  onDelete: (templateId: string) => void;
  onSave: () => void;
  className?: string;
}

export function BatchTemplatesPanel({
  templates,
  onApply,
  onDelete,
  onSave,
  className = '',
}: BatchTemplatesPanelProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Save className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {templates.length}
          </span>
        </div>
        <button
          onClick={onSave}
          className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
        >
          Save Current
        </button>
      </div>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {templates.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            No templates saved yet. Save your current batch operations as a template.
          </p>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">{template.name}</p>
                <p className="truncate text-xs text-gray-500">{template.description}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {template.operations.length} operations
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-400">Used {template.usageCount} times</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onApply(template.id)}
                  className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-200"
                >
                  Apply
                </button>
                <button
                  onClick={() => onDelete(template.id)}
                  className="rounded-lg p-1.5 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
