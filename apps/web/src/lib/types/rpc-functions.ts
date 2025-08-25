/**
 * Type definitions for custom Supabase RPC functions
 *
 * These types extend the Supabase client to provide type safety
 * for custom database functions without using 'as any' or disabling linting.
 */

import type { PostgrestError } from "@supabase/supabase-js";


// Type-safe RPC response wrapper
export interface RpcResponse<T> {
  data: T | null;
  error: PostgrestError | null;
}