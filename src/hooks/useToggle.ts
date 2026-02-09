/**
 * useToggle Hook
 *
 * 布尔状态切换 Hook
 */

import { useCallback, useState } from 'react';

export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue((v) => !v);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return {
    value,
    setValue,
    toggle,
    setTrue,
    setFalse,
    reset,
  };
}

export function useToggleArray<T>(initialValues: T[] = []) {
  const [selected, setSelected] = useState<T[]>(initialValues);

  const toggle = useCallback((item: T) => {
    setSelected((prev) => {
      const index = prev.indexOf(item);
      if (index === -1) {
        return [...prev, item];
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const select = useCallback((item: T) => {
    setSelected((prev) => {
      if (prev.includes(item)) return prev;
      return [...prev, item];
    });
  }, []);

  const deselect = useCallback((item: T) => {
    setSelected((prev) => prev.filter((i) => i !== item));
  }, []);

  const clear = useCallback(() => {
    setSelected([]);
  }, []);

  const isSelected = useCallback((item: T) => selected.includes(item), [selected]);

  return {
    selected,
    setSelected,
    toggle,
    select,
    deselect,
    clear,
    isSelected,
  };
}
