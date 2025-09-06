-- Add Knowledge Content ENUM Types Migration
-- Creates proper ENUM types for target_persona, startup_phase, and problem_category
-- and migrates the existing knowledge_content table to use these ENUMs

-- ============================================================================
-- CREATE ENUM TYPES
-- ============================================================================

-- Target personas for knowledge content
CREATE TYPE "public"."target_persona" AS ENUM (
    'founder',
    'executive',
    'investor',
    'product_manager'
);

-- Startup phases for knowledge content targeting
CREATE TYPE "public"."startup_phase" AS ENUM (
    'ideation',
    'seed',
    'growth',
    'scale-up',
    'crisis'
);

-- Problem categories for knowledge content classification
CREATE TYPE "public"."problem_category" AS ENUM (
    'pivot',
    'hiring',
    'fundraising',
    'co-founder_conflict',
    'product-market_fit',
    'go-to-market',
    'team_and_culture',
    'operations',
    'competitive_strategy',
    'pricing',
    'risk_management'
);

-- ============================================================================
-- MIGRATE KNOWLEDGE_CONTENT TABLE TO USE ENUM ARRAYS
-- ============================================================================

-- Add new columns with ENUM array types
ALTER TABLE "public"."knowledge_content" 
ADD COLUMN "target_persona_enum" target_persona[],
ADD COLUMN "startup_phase_enum" startup_phase[],
ADD COLUMN "problem_category_enum" problem_category[];

-- Create a function to safely cast text arrays to enum arrays
CREATE OR REPLACE FUNCTION cast_text_array_to_enum_array(
    text_array text[],
    enum_type_name text
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    result text := '{';
    element text;
    first boolean := true;
BEGIN
    IF text_array IS NULL THEN
        RETURN NULL;
    END IF;
    
    FOREACH element IN ARRAY text_array
    LOOP
        IF NOT first THEN
            result := result || ',';
        END IF;
        first := false;
        result := result || quote_literal(element);
    END LOOP;
    
    result := result || '}';
    RETURN result;
END;
$$;

-- Migrate existing data from text arrays to enum arrays
-- Note: This will only work if existing data conforms to the enum values
UPDATE "public"."knowledge_content" SET
    "target_persona_enum" = CASE 
        WHEN "target_persona" IS NOT NULL THEN 
            ("target_persona")::target_persona[]
        ELSE NULL 
    END,
    "startup_phase_enum" = CASE 
        WHEN "startup_phase" IS NOT NULL THEN 
            ("startup_phase")::startup_phase[]
        ELSE NULL 
    END,
    "problem_category_enum" = CASE 
        WHEN "problem_category" IS NOT NULL THEN 
            ("problem_category")::problem_category[]
        ELSE NULL 
    END;

-- Drop the old text array columns and their constraints
ALTER TABLE "public"."knowledge_content" 
DROP CONSTRAINT IF EXISTS "check_target_persona_values",
DROP CONSTRAINT IF EXISTS "check_startup_phase_values", 
DROP CONSTRAINT IF EXISTS "check_problem_category_values",
DROP COLUMN IF EXISTS "target_persona",
DROP COLUMN IF EXISTS "startup_phase",
DROP COLUMN IF EXISTS "problem_category";

-- Rename the new enum columns to the original names
ALTER TABLE "public"."knowledge_content" 
RENAME COLUMN "target_persona_enum" TO "target_persona";

ALTER TABLE "public"."knowledge_content" 
RENAME COLUMN "startup_phase_enum" TO "startup_phase";

ALTER TABLE "public"."knowledge_content" 
RENAME COLUMN "problem_category_enum" TO "problem_category";

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS cast_text_array_to_enum_array(text[], text);

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Create GIN indexes for efficient array queries
CREATE INDEX IF NOT EXISTS "idx_knowledge_content_target_persona" 
ON "public"."knowledge_content" USING gin ("target_persona");

CREATE INDEX IF NOT EXISTS "idx_knowledge_content_startup_phase" 
ON "public"."knowledge_content" USING gin ("startup_phase");

CREATE INDEX IF NOT EXISTS "idx_knowledge_content_problem_category" 
ON "public"."knowledge_content" USING gin ("problem_category");

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TYPE "public"."target_persona" IS 'Target personas for knowledge content: founder, executive, investor, product_manager';
COMMENT ON TYPE "public"."startup_phase" IS 'Startup phases for knowledge content targeting: ideation, seed, growth, scale-up, crisis';
COMMENT ON TYPE "public"."problem_category" IS 'Problem categories for knowledge content classification: pivot, hiring, fundraising, etc.';

COMMENT ON COLUMN "public"."knowledge_content"."target_persona" IS 'Array of target personas this knowledge content is relevant for';
COMMENT ON COLUMN "public"."knowledge_content"."startup_phase" IS 'Array of startup phases this knowledge content is relevant for';
COMMENT ON COLUMN "public"."knowledge_content"."problem_category" IS 'Array of problem categories this knowledge content addresses';