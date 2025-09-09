import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SprintProgress } from './SprintProgress';
import * as useSprintStoreModule from '../../lib/stores/useSprintStore';

// Mock the store
const mockUseSprintStore = vi.fn();
vi.mock('../../lib/stores/useSprintStore', () => ({
  useSprintStore: () => mockUseSprintStore(),
}));

describe('SprintProgress', () => {
  const defaultStoreState = {
    completedStages: ['problem-intake'] as useSprintStoreModule.SprintStage[],
    canAdvanceToStage: vi.fn().mockReturnValue(true),
  };

  beforeEach(() => {
    mockUseSprintStore.mockReturnValue(defaultStoreState);
  });

  it('renders progress bar with correct percentage', () => {
    render(
      <SprintProgress 
        currentStage="diagnostic-interview" 
        showNavigation={false} 
      />
    );

    // Should show 29% complete (step 2 of 7)
    expect(screen.getByText('29% Complete')).toBeInTheDocument();
  });

  it('displays all sprint stages with correct icons', () => {
    render(
      <SprintProgress 
        currentStage="problem-intake" 
        showNavigation={false} 
      />
    );

    expect(screen.getByText('Problem Intake')).toBeInTheDocument();
    expect(screen.getByText('Diagnostic')).toBeInTheDocument();
    expect(screen.getByText('Classification')).toBeInTheDocument();
    expect(screen.getByText('Problem Brief')).toBeInTheDocument();
    expect(screen.getByText('Framework Selection')).toBeInTheDocument();
    expect(screen.getByText('Application')).toBeInTheDocument();
    expect(screen.getByText('Commitment Memo')).toBeInTheDocument();
  });

  it('shows completed checkmarks for finished stages', () => {
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      completedStages: ['problem-intake', 'diagnostic-interview'],
    });

    render(
      <SprintProgress 
        currentStage="decision-classification" 
        showNavigation={false} 
      />
    );

    // Should have checkmarks for completed stages
    const checkmarks = screen.getAllByText('✓');
    expect(checkmarks).toHaveLength(2);
  });

  it('highlights current stage correctly', () => {
    render(
      <SprintProgress 
        currentStage="framework-selection" 
        showNavigation={false} 
      />
    );

    const currentStageElement = screen.getByText('Framework Selection').closest('div');
    expect(currentStageElement).toHaveClass('text-primary', 'font-semibold');
  });

  it('renders navigation legend when showNavigation is true', () => {
    render(
      <SprintProgress 
        currentStage="problem-intake" 
        showNavigation={true} 
      />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Current')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('calls onStageClick when stage is clicked and navigation is enabled', () => {
    const onStageClick = vi.fn();
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      completedStages: ['problem-intake'],
      canAdvanceToStage: vi.fn((stage) => 
        ['problem-intake', 'diagnostic-interview'].includes(stage)
      ),
    });

    render(
      <SprintProgress 
        currentStage="diagnostic-interview" 
        showNavigation={true}
        onStageClick={onStageClick} 
      />
    );

    // Click on an available stage
    const problemIntakeStage = screen.getByText('Problem Intake').closest('div');
    fireEvent.click(problemIntakeStage!);

    expect(onStageClick).toHaveBeenCalledWith('problem-intake');
  });

  it('does not call onStageClick for locked stages', () => {
    const onStageClick = vi.fn();
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      completedStages: [],
      canAdvanceToStage: vi.fn((stage) => stage === 'problem-intake'),
    });

    render(
      <SprintProgress 
        currentStage="problem-intake" 
        showNavigation={true}
        onStageClick={onStageClick} 
      />
    );

    // Click on a locked stage
    const lockedStage = screen.getByText('Classification').closest('div');
    fireEvent.click(lockedStage!);

    expect(onStageClick).not.toHaveBeenCalled();
  });

  it('applies correct CSS classes for different stage statuses', () => {
    mockUseSprintStore.mockReturnValue({
      ...defaultStoreState,
      completedStages: ['problem-intake'],
      canAdvanceToStage: vi.fn((stage) => 
        ['problem-intake', 'diagnostic-interview', 'decision-classification'].includes(stage)
      ),
    });

    render(
      <SprintProgress 
        currentStage="diagnostic-interview" 
        showNavigation={true} 
      />
    );

    // Completed stage should have success styling
    const completedStage = screen.getByText('Problem Intake').previousElementSibling;
    expect(completedStage).toHaveClass('bg-success');

    // Current stage should have primary styling and pulse animation
    const currentStage = screen.getByText('Diagnostic').previousElementSibling;
    expect(currentStage).toHaveClass('bg-primary', 'ring-2', 'ring-primary');
    
    // Available stage should have info styling
    const availableStage = screen.getByText('Classification').previousElementSibling;
    expect(availableStage).toHaveClass('bg-info');
  });

  it('shows current stage pulse animation', () => {
    render(
      <SprintProgress 
        currentStage="framework-selection" 
        showNavigation={false} 
      />
    );

    // Current stage should have pulse animation
    const pulseElement = screen.getByText('🧠').parentElement?.querySelector('.animate-ping');
    expect(pulseElement).toBeInTheDocument();
  });
});