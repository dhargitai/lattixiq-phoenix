import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SprintNavigation } from './SprintNavigation';
import * as useSprintStoreModule from '../../lib/stores/useSprintStore';

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: vi.fn(),
});

// Mock the store
const mockUseSprintStore = vi.fn();
vi.mock('../../lib/stores/useSprintStore', () => ({
  useSprintStore: () => mockUseSprintStore(),
}));

describe('SprintNavigation', () => {
  const defaultStoreState = {
    currentStage: 'diagnostic-interview' as useSprintStoreModule.SprintStage,
    completedStages: ['problem-intake'] as useSprintStoreModule.SprintStage[],
    sessionId: 'sprint_12345_abcdef',
    isCompleted: false,
    canAdvanceToStage: vi.fn().mockReturnValue(true),
    setCurrentStage: vi.fn(),
    resetSession: vi.fn(),
  };

  beforeEach(() => {
    mockUseSprintStore.mockReturnValue(defaultStoreState);
    vi.clearAllMocks();
  });

  it('renders navigation buttons correctly', () => {
    render(<SprintNavigation />);

    expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('shows current step information', () => {
    render(<SprintNavigation />);

    expect(screen.getByText('Step 2 of 7')).toBeInTheDocument();
    expect(screen.getByText('1 completed')).toBeInTheDocument();
  });

  it('disables previous button on first stage', () => {
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      currentStage: 'problem-intake',
      completedStages: [],
    });

    render(<SprintNavigation />);

    const previousButton = screen.getByRole('button', { name: /previous/i });
    expect(previousButton).toBeDisabled();
  });

  it('disables continue button when cannot advance', () => {
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      canAdvanceToStage: vi.fn().mockReturnValue(false),
    });

    render(<SprintNavigation />);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
  });

  it('shows completed button when sprint is finished', () => {
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      currentStage: 'commitment-memo',
      isCompleted: true,
    });

    render(<SprintNavigation />);

    expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
  });

  it('handles next button click correctly', () => {
    const setCurrentStage = vi.fn();
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      setCurrentStage,
    });

    render(<SprintNavigation />);

    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);

    expect(setCurrentStage).toHaveBeenCalledWith('decision-classification');
  });

  it('handles previous button click correctly', () => {
    const setCurrentStage = vi.fn();
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      setCurrentStage,
    });

    render(<SprintNavigation />);

    const previousButton = screen.getByRole('button', { name: /previous/i });
    fireEvent.click(previousButton);

    expect(setCurrentStage).toHaveBeenCalledWith('problem-intake');
  });

  it('renders save/reset actions when showSaveRestore is true', () => {
    render(<SprintNavigation showSaveRestore={true} />);

    expect(screen.getByRole('button', { name: /save progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset sprint/i })).toBeInTheDocument();
  });

  it('hides save/reset actions when showSaveRestore is false', () => {
    render(<SprintNavigation showSaveRestore={false} />);

    expect(screen.queryByRole('button', { name: /save progress/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset sprint/i })).not.toBeInTheDocument();
  });

  it('calls onSave callback when save button is clicked', () => {
    const onSave = vi.fn();
    render(<SprintNavigation onSave={onSave} />);

    const saveButton = screen.getByRole('button', { name: /save progress/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalled();
  });

  it('shows confirmation dialog when reset button is clicked', () => {
    const mockConfirm = vi.mocked(window.confirm);
    mockConfirm.mockReturnValue(true);
    
    const resetSession = vi.fn();
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      resetSession,
    });

    render(<SprintNavigation />);

    const resetButton = screen.getByRole('button', { name: /reset sprint/i });
    fireEvent.click(resetButton);

    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to reset this sprint? All progress will be lost.'
    );
    expect(resetSession).toHaveBeenCalled();
  });

  it('does not reset when user cancels confirmation', () => {
    const mockConfirm = vi.mocked(window.confirm);
    mockConfirm.mockReturnValue(false);
    
    const resetSession = vi.fn();
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      resetSession,
    });

    render(<SprintNavigation />);

    const resetButton = screen.getByRole('button', { name: /reset sprint/i });
    fireEvent.click(resetButton);

    expect(mockConfirm).toHaveBeenCalled();
    expect(resetSession).not.toHaveBeenCalled();
  });

  it('displays session ID when available', () => {
    render(<SprintNavigation />);

    expect(screen.getByText('Session: abcdef')).toBeInTheDocument();
  });

  it('disables save button when no session ID', () => {
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      sessionId: null,
    });

    render(<SprintNavigation />);

    const saveButton = screen.getByRole('button', { name: /save progress/i });
    expect(saveButton).toBeDisabled();
  });
});