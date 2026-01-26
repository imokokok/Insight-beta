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

export function useBatchHistory<T>(config: {
  maxHistorySize?: number;
  maxHistoryAge?: number;
  autoSave?: boolean;
  storageKey?: string;
} = {}): UseBatchHistoryReturn<T> {
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
            (entry: HistoryEntry<T>) =>
              Date.now() - entry.timestamp < maxHistoryAge
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
          })
        );
      } catch (error) {
        console.error('Failed to save history:', error);
      }
    },
    [autoSave, storageKey, maxHistorySize]
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
    [maxHistorySize, saveToStorage, templates]
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
    [templates, saveToStorage]
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      const newTemplates = templates.map((t) =>
        t.id === templateId ? { ...t, lastUsed: Date.now(), usageCount: t.usageCount + 1 } : t
      );

      setTemplates(newTemplates);
      saveToStorage(historyRef.current, newTemplates);
    },
    [templates, saveToStorage]
  );

  const deleteTemplate = useCallback(
    (templateId: string) => {
      const newTemplates = templates.filter((t) => t.id !== templateId);
      setTemplates(newTemplates);
      saveToStorage(historyRef.current, newTemplates);
    },
    [templates, saveToStorage]
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
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">History</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {history.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo2 className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo2 className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={onClear}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear history"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {history.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No history yet</p>
        ) : (
          history.map((entry, index) => (
            <div
              key={entry.id}
              onClick={() => onItemClick(index)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                index === currentIndex
                  ? 'bg-purple-50 border border-purple-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {entry.description}
                </p>
                <p className="text-xs text-gray-500">{formatTime(entry.timestamp)}</p>
              </div>
              {index === currentIndex && (
                <div className="flex-shrink-0">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
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
    <div className={`bg-white rounded-xl border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Save className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
            {templates.length}
          </span>
        </div>
        <button
          onClick={onSave}
          className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
        >
          Save Current
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {templates.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No templates saved yet. Save your current batch operations as a template.
          </p>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{template.name}</p>
                <p className="text-xs text-gray-500 truncate">{template.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {template.operations.length} operations
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-400">
                    Used {template.usageCount} times
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onApply(template.id)}
                  className="px-3 py-1.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-200 transition-colors"
                >
                  Apply
                </button>
                <button
                  onClick={() => onDelete(template.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
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
