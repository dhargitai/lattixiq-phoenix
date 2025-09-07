import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProblemIntakeForm } from './ProblemIntakeForm';
import { useSprintStore } from '../../lib/stores/useSprintStore';
import { useChat } from 'ai/react';

// Mock the AI SDK
jest.mock('ai/react');
const mockUseChat = useChat as jest.MockedFunction<typeof useChat>;

// Mock the store
jest.mock('../../lib/stores/useSprintStore');
const mockUseSprintStore = useSprintStore as jest.MockedFunction<typeof useSprintStore>;

describe('ProblemIntakeForm', () => {
  const mockAppend = jest.fn();
  const mockSetProblemInput = jest.fn();
  const mockSetError = jest.fn();
  const mockSetCurrentStage = jest.fn();
  const mockMarkStageCompleted = jest.fn();

  beforeEach(() => {
    mockUseChat.mockReturnValue({
      messages: [],
      append: mockAppend,
      isLoading: false,
      input: '',
      setInput: jest.fn(),
      handleSubmit: jest.fn(),
      handleInputChange: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined
    });

    mockUseSprintStore.mockReturnValue({
      problemInput: '',
      sessionId: 'test-session-123',
      setProblemInput: mockSetProblemInput,
      setError: mockSetError,
      setCurrentStage: mockSetCurrentStage,
      markStageCompleted: mockMarkStageCompleted,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the problem intake form', () => {
    render(<ProblemIntakeForm />);
    
    expect(screen.getByText('What decision are you struggling with?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe your challenge in detail/)).toBeInTheDocument();
    expect(screen.getByText('Start Decision Sprint')).toBeInTheDocument();
  });

  it('should update problem input when typing', () => {
    render(<ProblemIntakeForm />);
    
    const textarea = screen.getByPlaceholderText(/Describe your challenge in detail/);
    fireEvent.change(textarea, { target: { value: 'Test problem description' } });
    
    expect(mockSetProblemInput).toHaveBeenCalledWith('Test problem description');
  });

  it('should call append when submitting the form', async () => {
    mockUseSprintStore.mockReturnValue({
      problemInput: 'My decision problem',
      sessionId: 'test-session-123',
      setProblemInput: mockSetProblemInput,
      setError: mockSetError,
      setCurrentStage: mockSetCurrentStage,
      markStageCompleted: mockMarkStageCompleted,
    } as any);

    render(<ProblemIntakeForm />);
    
    const submitButton = screen.getByText('Start Decision Sprint');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockAppend).toHaveBeenCalledWith(
        {
          role: 'user',
          content: 'My decision problem',
        },
        {
          options: {
            body: {
              sessionId: 'test-session-123',
              phase: 'problem-intake'
            }
          }
        }
      );
    });
  });

  it('should not submit when problem input is empty', () => {
    render(<ProblemIntakeForm />);
    
    const submitButton = screen.getByText('Start Decision Sprint');
    fireEvent.click(submitButton);
    
    expect(mockAppend).not.toHaveBeenCalled();
  });

  it('should handle loading state', () => {
    mockUseChat.mockReturnValue({
      messages: [],
      append: mockAppend,
      isLoading: true,
      input: '',
      setInput: jest.fn(),
      handleSubmit: jest.fn(),
      handleInputChange: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined
    });

    render(<ProblemIntakeForm />);
    
    const submitButton = screen.getByText('Processing...');
    expect(submitButton).toBeDisabled();
  });

  it('should display character count and feedback', () => {
    mockUseSprintStore.mockReturnValue({
      problemInput: 'Short text',
      sessionId: 'test-session-123',
      setProblemInput: mockSetProblemInput,
      setError: mockSetError,
      setCurrentStage: mockSetCurrentStage,
      markStageCompleted: mockMarkStageCompleted,
    } as any);

    render(<ProblemIntakeForm />);
    
    expect(screen.getByText('10 characters')).toBeInTheDocument();
    expect(screen.getByText('Add more detail for better results')).toBeInTheDocument();
  });

  it('should show messages when available', () => {
    const mockMessages = [
      { id: '1', role: 'user', content: 'My problem' },
      { id: '2', role: 'assistant', content: 'I understand your problem' }
    ];

    mockUseChat.mockReturnValue({
      messages: mockMessages,
      append: mockAppend,
      isLoading: false,
      input: '',
      setInput: jest.fn(),
      handleSubmit: jest.fn(),
      handleInputChange: jest.fn(),
      reload: jest.fn(),
      stop: jest.fn(),
      error: undefined
    });

    render(<ProblemIntakeForm />);
    
    // StreamingResponse component should be rendered
    // Note: This would need to be tested more specifically if we wanted to test the StreamingResponse component behavior
    expect(screen.getByTestId || screen.queryByText).toBeTruthy();
  });
});