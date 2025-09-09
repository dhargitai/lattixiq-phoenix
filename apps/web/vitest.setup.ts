import '@testing-library/jest-dom';
import { beforeEach, afterEach, vi } from 'vitest';

// Mock environment variables
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  process.env.OPENAI_API_KEY = 'mock-openai-key';
  process.env.GOOGLE_API_KEY = 'mock-google-key';
});

// Mock console.error to suppress expected error logs in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

// Restore console.error after each test
afterEach(() => {
  console.error = originalConsoleError;
});