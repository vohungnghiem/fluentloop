import { useEffect, useRef } from 'react';

/**
 * Enter runs the screen's primary action. Inside a textarea it takes Ctrl/Cmd + Enter, so plain
 * Enter still makes a new line.
 */
export function useEnter(action: (() => void) | undefined) {
  const ref = useRef(action);
  ref.current = action;
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.isComposing || !ref.current) return;
      const target = event.target as HTMLElement | null;
      const inTextarea = target?.tagName === 'TEXTAREA';
      if (inTextarea && !(event.ctrlKey || event.metaKey)) return;
      if (target?.tagName === 'BUTTON' && !inTextarea) return;
      event.preventDefault();
      ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
