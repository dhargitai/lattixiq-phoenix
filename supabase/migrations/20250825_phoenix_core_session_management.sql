-- Phoenix Core Session Management Migration
-- Adds comprehensive session management, message history with branching, 
-- phase tracking, and framework selection capabilities

-- ============================================================================
-- ENUMS AND TYPES
-- ============================================================================

-- Session status tracking
CREATE TYPE "public"."session_status" AS ENUM (
    'active',
    'completed',
    'abandoned',
    'paused'
);

-- Phoenix Framework phases
CREATE TYPE "public"."phoenix_phase" AS ENUM (
    'problem_intake',
    'diagnostic_interview', 
    'type_classification',
    'framework_selection',
    'framework_application',
    'commitment_memo_generation'
);

-- Artifact types for session artifacts
CREATE TYPE "public"."artifact_type" AS ENUM (
    'problem_brief',
    'commitment_memo',
    'diagnostic_notes',
    'classification_result',
    'framework_application_notes',
    'user_insights'
);

-- AI model types for tracking which model was used
CREATE TYPE "public"."ai_model_type" AS ENUM (
    'gpt-4.1',
    'gpt-4.1-mini',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'claude-3.5-sonnet'
);

-- Message roles
CREATE TYPE "public"."message_role" AS ENUM (
    'user',
    'assistant',
    'system'
);

-- ============================================================================
-- MAIN TABLES
-- ============================================================================

-- Sessions table - tracks Phoenix Framework decision sprint sessions
CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "user_id" UUID NOT NULL,
    "status" session_status DEFAULT 'active' NOT NULL,
    "current_phase" phoenix_phase DEFAULT 'problem_intake' NOT NULL,
    "phase_states" JSONB DEFAULT '{}' NOT NULL,
    "config" JSONB DEFAULT '{}' NOT NULL,
    "metadata" JSONB DEFAULT '{}' NOT NULL,
    "started_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "completed_at" TIMESTAMP WITH TIME ZONE,
    "last_activity_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") 
        REFERENCES "public"."users"("id") ON DELETE CASCADE
);

-- Messages table - stores conversation history with branching support
CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "session_id" UUID NOT NULL,
    "parent_message_id" UUID,
    "role" message_role NOT NULL,
    "content" TEXT NOT NULL,
    "model_used" ai_model_type,
    "phase_number" phoenix_phase NOT NULL,
    "is_active_branch" BOOLEAN DEFAULT true NOT NULL,
    "metadata" JSONB DEFAULT '{}' NOT NULL,
    "performance_metrics" JSONB DEFAULT '{}' NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "messages_session_id_fkey" FOREIGN KEY ("session_id") 
        REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "messages_parent_message_id_fkey" FOREIGN KEY ("parent_message_id") 
        REFERENCES "public"."messages"("id") ON DELETE CASCADE
);

-- Message embeddings - for semantic search and problem understanding
CREATE TABLE IF NOT EXISTS "public"."message_embeddings" (
    "message_id" UUID NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "embedding_model" TEXT DEFAULT 'text-embedding-3-small' NOT NULL,
    "generated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    CONSTRAINT "message_embeddings_pkey" PRIMARY KEY ("message_id"),
    CONSTRAINT "message_embeddings_message_id_fkey" FOREIGN KEY ("message_id") 
        REFERENCES "public"."messages"("id") ON DELETE CASCADE
);

-- Session artifacts - stores problem briefs, commitment memos, etc.
CREATE TABLE IF NOT EXISTS "public"."session_artifacts" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "session_id" UUID NOT NULL,
    "artifact_type" artifact_type NOT NULL,
    "content" JSONB NOT NULL,
    "phase_created" phoenix_phase NOT NULL,
    "created_from_message_id" UUID,
    "version" INTEGER DEFAULT 1 NOT NULL,
    "is_current" BOOLEAN DEFAULT true NOT NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    CONSTRAINT "session_artifacts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "session_artifacts_session_id_fkey" FOREIGN KEY ("session_id") 
        REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "session_artifacts_created_from_message_id_fkey" FOREIGN KEY ("created_from_message_id") 
        REFERENCES "public"."messages"("id") ON DELETE SET NULL,
    CONSTRAINT "session_artifacts_version_positive" CHECK ("version" > 0)
);

-- Phase transitions - tracks progression through Phoenix Framework phases
CREATE TABLE IF NOT EXISTS "public"."phase_transitions" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "session_id" UUID NOT NULL,
    "from_phase" phoenix_phase,
    "to_phase" phoenix_phase NOT NULL,
    "validation_results" JSONB DEFAULT '{}' NOT NULL,
    "transition_reason" TEXT,
    "triggered_by_message_id" UUID,
    "transitioned_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    
    CONSTRAINT "phase_transitions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "phase_transitions_session_id_fkey" FOREIGN KEY ("session_id") 
        REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "phase_transitions_triggered_by_message_id_fkey" FOREIGN KEY ("triggered_by_message_id") 
        REFERENCES "public"."messages"("id") ON DELETE SET NULL
);

-- Framework selections - tracks which frameworks were selected and why
CREATE TABLE IF NOT EXISTS "public"."framework_selections" (
    "id" UUID DEFAULT gen_random_uuid() NOT NULL,
    "session_id" UUID NOT NULL,
    "knowledge_content_id" UUID NOT NULL,
    "relevance_score" FLOAT NOT NULL,
    "score_breakdown" JSONB DEFAULT '{}' NOT NULL,
    "selection_rank" INTEGER NOT NULL,
    "selection_reason" TEXT,
    "was_applied" BOOLEAN DEFAULT false NOT NULL,
    "application_notes" TEXT,
    "selected_at" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    "applied_at" TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT "framework_selections_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "framework_selections_session_id_fkey" FOREIGN KEY ("session_id") 
        REFERENCES "public"."sessions"("id") ON DELETE CASCADE,
    CONSTRAINT "framework_selections_knowledge_content_id_fkey" FOREIGN KEY ("knowledge_content_id") 
        REFERENCES "public"."knowledge_content"("id") ON DELETE CASCADE,
    CONSTRAINT "framework_selections_relevance_score_range" 
        CHECK ("relevance_score" >= 0.0 AND "relevance_score" <= 1.0),
    CONSTRAINT "framework_selections_selection_rank_positive" 
        CHECK ("selection_rank" > 0)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Sessions indexes
CREATE INDEX "idx_sessions_user_id" ON "public"."sessions" USING btree ("user_id");
CREATE INDEX "idx_sessions_status" ON "public"."sessions" USING btree ("status");
CREATE INDEX "idx_sessions_current_phase" ON "public"."sessions" USING btree ("current_phase");
CREATE INDEX "idx_sessions_last_activity" ON "public"."sessions" USING btree ("last_activity_at" DESC);
CREATE INDEX "idx_sessions_user_active" ON "public"."sessions" USING btree ("user_id", "status") 
    WHERE "status" = 'active';

-- Messages indexes
CREATE INDEX "idx_messages_session_id" ON "public"."messages" USING btree ("session_id");
CREATE INDEX "idx_messages_parent_message_id" ON "public"."messages" USING btree ("parent_message_id") 
    WHERE "parent_message_id" IS NOT NULL;
CREATE INDEX "idx_messages_phase" ON "public"."messages" USING btree ("phase_number");
CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING btree ("created_at" DESC);
CREATE INDEX "idx_messages_active_branch" ON "public"."messages" USING btree ("session_id", "is_active_branch") 
    WHERE "is_active_branch" = true;
CREATE INDEX "idx_messages_conversation_thread" ON "public"."messages" USING btree ("session_id", "created_at");

-- Message embeddings indexes (vector search)
CREATE INDEX "idx_message_embeddings_embedding" ON "public"."message_embeddings" 
    USING hnsw ("embedding" vector_cosine_ops);

-- Session artifacts indexes
CREATE INDEX "idx_session_artifacts_session_id" ON "public"."session_artifacts" USING btree ("session_id");
CREATE INDEX "idx_session_artifacts_type" ON "public"."session_artifacts" USING btree ("artifact_type");
CREATE INDEX "idx_session_artifacts_current" ON "public"."session_artifacts" USING btree ("session_id", "artifact_type") 
    WHERE "is_current" = true;
CREATE INDEX "idx_session_artifacts_created_at" ON "public"."session_artifacts" USING btree ("created_at" DESC);

-- Phase transitions indexes
CREATE INDEX "idx_phase_transitions_session_id" ON "public"."phase_transitions" USING btree ("session_id");
CREATE INDEX "idx_phase_transitions_phases" ON "public"."phase_transitions" USING btree ("from_phase", "to_phase");
CREATE INDEX "idx_phase_transitions_transitioned_at" ON "public"."phase_transitions" USING btree ("transitioned_at" DESC);

-- Framework selections indexes
CREATE INDEX "idx_framework_selections_session_id" ON "public"."framework_selections" USING btree ("session_id");
CREATE INDEX "idx_framework_selections_knowledge_content" ON "public"."framework_selections" USING btree ("knowledge_content_id");
CREATE INDEX "idx_framework_selections_score" ON "public"."framework_selections" USING btree ("relevance_score" DESC);
CREATE INDEX "idx_framework_selections_rank" ON "public"."framework_selections" USING btree ("session_id", "selection_rank");
CREATE INDEX "idx_framework_selections_applied" ON "public"."framework_selections" USING btree ("was_applied") 
    WHERE "was_applied" = true;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Auto-update timestamps for sessions
CREATE OR REPLACE TRIGGER "update_sessions_updated_at" 
    BEFORE UPDATE ON "public"."sessions" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Auto-update timestamps for session artifacts
CREATE OR REPLACE TRIGGER "update_session_artifacts_updated_at" 
    BEFORE UPDATE ON "public"."session_artifacts" 
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Auto-update last_activity_at on sessions when messages are added
CREATE OR REPLACE FUNCTION "public"."update_session_last_activity"()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "public"."sessions" 
    SET "last_activity_at" = NEW."created_at"
    WHERE "id" = NEW."session_id";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER "update_session_last_activity_trigger"
    AFTER INSERT ON "public"."messages"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_session_last_activity"();

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."message_embeddings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_artifacts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."phase_transitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."framework_selections" ENABLE ROW LEVEL SECURITY;

-- Sessions policies
CREATE POLICY "Users can view their own sessions" ON "public"."sessions"
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON "public"."sessions"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON "public"."sessions"
    FOR UPDATE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages from their sessions" ON "public"."messages"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "messages"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

CREATE POLICY "Users can create messages in their sessions" ON "public"."messages"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "messages"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

CREATE POLICY "Users can update messages in their sessions" ON "public"."messages"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "messages"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

-- Message embeddings policies
CREATE POLICY "Users can view embeddings from their messages" ON "public"."message_embeddings"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."messages" m
            JOIN "public"."sessions" s ON s."id" = m."session_id"
            WHERE m."id" = "message_embeddings"."message_id" 
            AND s."user_id" = auth.uid()
        )
    );

CREATE POLICY "Users can create embeddings for their messages" ON "public"."message_embeddings"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."messages" m
            JOIN "public"."sessions" s ON s."id" = m."session_id"
            WHERE m."id" = "message_embeddings"."message_id" 
            AND s."user_id" = auth.uid()
        )
    );

-- Session artifacts policies
CREATE POLICY "Users can view artifacts from their sessions" ON "public"."session_artifacts"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "session_artifacts"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

CREATE POLICY "Users can create artifacts in their sessions" ON "public"."session_artifacts"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "session_artifacts"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

CREATE POLICY "Users can update artifacts in their sessions" ON "public"."session_artifacts"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "session_artifacts"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

-- Phase transitions policies
CREATE POLICY "Users can view phase transitions from their sessions" ON "public"."phase_transitions"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "phase_transitions"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

CREATE POLICY "Users can create phase transitions in their sessions" ON "public"."phase_transitions"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "phase_transitions"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

-- Framework selections policies
CREATE POLICY "Users can view framework selections from their sessions" ON "public"."framework_selections"
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "framework_selections"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

CREATE POLICY "Users can create framework selections in their sessions" ON "public"."framework_selections"
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "framework_selections"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

CREATE POLICY "Users can update framework selections in their sessions" ON "public"."framework_selections"
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM "public"."sessions" 
            WHERE "sessions"."id" = "framework_selections"."session_id" 
            AND "sessions"."user_id" = auth.uid()
        )
    );

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE "public"."sessions" IS 'Phoenix Framework decision sprint sessions with phase tracking and configuration';
COMMENT ON COLUMN "public"."sessions"."phase_states" IS 'JSONB object tracking readiness and validation state for each phase';
COMMENT ON COLUMN "public"."sessions"."config" IS 'Session configuration including model preferences, timeouts, and feature flags';

COMMENT ON TABLE "public"."messages" IS 'Conversation messages with branching support for exploration and rollback';
COMMENT ON COLUMN "public"."messages"."parent_message_id" IS 'Reference to parent message for conversation branching';
COMMENT ON COLUMN "public"."messages"."is_active_branch" IS 'Whether this message is part of the currently active conversation branch';
COMMENT ON COLUMN "public"."messages"."performance_metrics" IS 'Timing, token usage, and other performance data for the message';

COMMENT ON TABLE "public"."message_embeddings" IS 'Vector embeddings for messages to enable semantic search and problem understanding';

COMMENT ON TABLE "public"."session_artifacts" IS 'Structured artifacts generated during the session (problem briefs, commitment memos, etc.)';
COMMENT ON COLUMN "public"."session_artifacts"."version" IS 'Version number for artifact evolution and history tracking';
COMMENT ON COLUMN "public"."session_artifacts"."is_current" IS 'Whether this is the current version of this artifact type';

COMMENT ON TABLE "public"."phase_transitions" IS 'Log of phase transitions with validation results and reasoning';
COMMENT ON COLUMN "public"."phase_transitions"."validation_results" IS 'Detailed validation results that triggered or prevented the transition';

COMMENT ON TABLE "public"."framework_selections" IS 'Tracks which knowledge frameworks were selected, scored, and applied during the session';
COMMENT ON COLUMN "public"."framework_selections"."score_breakdown" IS 'Detailed scoring breakdown for transparency in framework selection';
COMMENT ON COLUMN "public"."framework_selections"."selection_rank" IS 'Ranking of this framework among all selected frameworks for the session';