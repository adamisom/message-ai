/**
 * Modal Manager Hook
 * Simplifies modal state management in complex screens
 * 
 * Refactoring: Reduces 15 useState calls to 1 in chat screen
 */

import { useState, useCallback } from 'react';

export type ModalName = 
  | 'aiMenu'
  | 'search'
  | 'summary'
  | 'actionItems'
  | 'decisions'
  | 'meetingScheduler'
  | 'upgrade'
  | 'participants'
  | 'pinned'
  | 'capacity'
  | 'edit';

export interface ModalManager {
  openModal: ModalName | null;
  isOpen: (name: ModalName) => boolean;
  open: (name: ModalName) => void;
  close: () => void;
  toggle: (name: ModalName) => void;
}

/**
 * Hook to manage multiple modals with a single state
 * 
 * @example
 * const modals = useModalManager();
 * 
 * // Open modal
 * modals.open('summary');
 * 
 * // Check if open
 * {modals.isOpen('summary') && <SummaryModal onClose={modals.close} />}
 * 
 * // Toggle
 * modals.toggle('aiMenu');
 */
export function useModalManager(): ModalManager {
  const [openModal, setOpenModal] = useState<ModalName | null>(null);
  
  const isOpen = useCallback((name: ModalName) => openModal === name, [openModal]);
  
  const open = useCallback((name: ModalName) => setOpenModal(name), []);
  
  const close = useCallback(() => setOpenModal(null), []);
  
  const toggle = useCallback((name: ModalName) => {
    setOpenModal(prev => prev === name ? null : name);
  }, []);
  
  return {
    openModal,
    isOpen,
    open,
    close,
    toggle,
  };
}

