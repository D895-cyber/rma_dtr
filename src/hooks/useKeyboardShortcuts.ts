import { useEffect, useCallback } from 'react';

export interface ShortcutHandlers {
  onNewCase?: () => void;
  onSave?: () => void;
  onClose?: () => void;
  onSearch?: () => void;
  onShowHelp?: () => void;
  canSave?: boolean;
  canClose?: boolean;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const {
    onNewCase,
    onSave,
    onClose,
    onSearch,
    onShowHelp,
    canSave = true,
    canClose = true,
  } = handlers;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs/textarea/contenteditable
      const target = e.target as HTMLElement;
      const tag = target.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || target.isContentEditable;
      if (isInput && !['Escape', 'Enter'].includes(e.key)) return;

      const ctrlOrMeta = e.ctrlKey || e.metaKey;

      // ? - Show shortcuts help
      if (e.key === '?' && !ctrlOrMeta && !e.shiftKey) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      // Ctrl+K or Cmd+K - Search
      if (e.key === 'k' && ctrlOrMeta) {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Escape - Close modal/sheet
      if (e.key === 'Escape' && canClose) {
        onClose?.();
        return;
      }

      // N - New case (when not in input)
      if ((e.key === 'n' || e.key === 'N') && !ctrlOrMeta) {
        if (!isInput) {
          e.preventDefault();
          onNewCase?.();
        }
        return;
      }

      // Ctrl+S or Cmd+S - Save
      if (e.key === 's' && ctrlOrMeta && canSave) {
        e.preventDefault();
        onSave?.();
      }
    },
    [onNewCase, onSave, onClose, onSearch, onShowHelp, canSave, canClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
