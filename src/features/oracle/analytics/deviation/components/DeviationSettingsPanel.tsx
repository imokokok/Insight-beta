'use client';

import { useState, useEffect, useCallback } from 'react';

import { Settings, Save, RotateCcw, X } from 'lucide-react';

import { deviationConfigService } from '@/features/oracle/services/deviationConfig';
import type { DeviationThresholds } from '@/types/analytics/deviation';

interface DeviationSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeviationSettingsPanel({ isOpen, onClose }: DeviationSettingsPanelProps) {
  const [thresholds, setThresholds] = useState<DeviationThresholds>({
    low: 0.005,
    medium: 0.01,
    high: 0.02,
    critical: 0.05,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = deviationConfigService.getConfig();
      setThresholds(config.thresholds);
    }
  }, [isOpen]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      if (thresholds.low >= thresholds.medium || 
          thresholds.medium >= thresholds.high || 
          thresholds.high >= thresholds.critical) {
        setMessage({ type: 'error', text: 'Thresholds must be in ascending order: low < medium < high < critical' });
        setIsSaving(false);
        return;
      }

      deviationConfigService.updateThresholds(thresholds);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  }, [thresholds, onClose]);

  const handleReset = useCallback(() => {
    const defaults = deviationConfigService.resetToDefaults();
    setThresholds(defaults.thresholds);
    setMessage({ type: 'success', text: 'Settings reset to defaults' });
  }, []);

  const handleThresholdChange = (key: keyof DeviationThresholds, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
      setThresholds(prev => ({ ...prev, [key]: numValue }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Deviation Thresholds</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 space-y-4">
          <p className="text-sm text-gray-600">
            Configure the deviation thresholds for different severity levels. Values are expressed as percentages (e.g., 0.01 = 1%).
          </p>

          <div className="grid grid-cols-2 gap-4">
            {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
              <div key={level} className="space-y-1">
                <label className="text-sm font-medium capitalize">{level}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="1"
                    value={thresholds[level]}
                    onChange={(e) => handleThresholdChange(level, e.target.value)}
                    className="w-full rounded border px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                  />
                  <span className="text-sm text-gray-500">{(thresholds[level] * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>

          {message && (
            <div className={`rounded p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
