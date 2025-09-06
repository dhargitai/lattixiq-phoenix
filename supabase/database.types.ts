export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      content_blocks: {
        Row: {
          content: string
          content_id: string
          created_at: string
          id: string
          metadata: Json | null
          published: boolean
          updated_at: string
        }
        Insert: {
          content: string
          content_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          published?: boolean
          updated_at?: string
        }
        Update: {
          content?: string
          content_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          published?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      framework_selections: {
        Row: {
          application_notes: string | null
          applied_at: string | null
          id: string
          knowledge_content_id: string
          relevance_score: number
          score_breakdown: Json
          selected_at: string
          selection_rank: number
          selection_reason: string | null
          session_id: string
          was_applied: boolean
        }
        Insert: {
          application_notes?: string | null
          applied_at?: string | null
          id?: string
          knowledge_content_id: string
          relevance_score: number
          score_breakdown?: Json
          selected_at?: string
          selection_rank: number
          selection_reason?: string | null
          session_id: string
          was_applied?: boolean
        }
        Update: {
          application_notes?: string | null
          applied_at?: string | null
          id?: string
          knowledge_content_id?: string
          relevance_score?: number
          score_breakdown?: Json
          selected_at?: string
          selection_rank?: number
          selection_reason?: string | null
          session_id?: string
          was_applied?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "framework_selections_knowledge_content_id_fkey"
            columns: ["knowledge_content_id"]
            isOneToOne: false
            referencedRelation: "knowledge_content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "framework_selections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_content: {
        Row: {
          analogy_or_metaphor: string | null
          classic_example: string | null
          definition: string | null
          dive_deeper_mechanism: string | null
          dive_deeper_origin_story: string | null
          dive_deeper_pitfalls_nuances: string | null
          embedding: string | null
          extra_content: string | null
          hook: string | null
          id: string
          key_takeaway: string | null
          language: string | null
          main_category: Database["public"]["Enums"]["main_category"] | null
          modern_example: string | null
          payoff: string | null
          pitfall: string | null
          problem_category:
            | Database["public"]["Enums"]["problem_category"][]
            | null
          startup_phase: Database["public"]["Enums"]["startup_phase"][] | null
          subcategory: Database["public"]["Enums"]["subcategory"] | null
          super_model: boolean | null
          target_persona: Database["public"]["Enums"]["target_persona"][] | null
          title: string
          type: Database["public"]["Enums"]["knowledge_content_type"]
          visual_metaphor: string | null
          visual_metaphor_url: string | null
        }
        Insert: {
          analogy_or_metaphor?: string | null
          classic_example?: string | null
          definition?: string | null
          dive_deeper_mechanism?: string | null
          dive_deeper_origin_story?: string | null
          dive_deeper_pitfalls_nuances?: string | null
          embedding?: string | null
          extra_content?: string | null
          hook?: string | null
          id?: string
          key_takeaway?: string | null
          language?: string | null
          main_category?: Database["public"]["Enums"]["main_category"] | null
          modern_example?: string | null
          payoff?: string | null
          pitfall?: string | null
          problem_category?:
            | Database["public"]["Enums"]["problem_category"][]
            | null
          startup_phase?: Database["public"]["Enums"]["startup_phase"][] | null
          subcategory?: Database["public"]["Enums"]["subcategory"] | null
          super_model?: boolean | null
          target_persona?:
            | Database["public"]["Enums"]["target_persona"][]
            | null
          title: string
          type: Database["public"]["Enums"]["knowledge_content_type"]
          visual_metaphor?: string | null
          visual_metaphor_url?: string | null
        }
        Update: {
          analogy_or_metaphor?: string | null
          classic_example?: string | null
          definition?: string | null
          dive_deeper_mechanism?: string | null
          dive_deeper_origin_story?: string | null
          dive_deeper_pitfalls_nuances?: string | null
          embedding?: string | null
          extra_content?: string | null
          hook?: string | null
          id?: string
          key_takeaway?: string | null
          language?: string | null
          main_category?: Database["public"]["Enums"]["main_category"] | null
          modern_example?: string | null
          payoff?: string | null
          pitfall?: string | null
          problem_category?:
            | Database["public"]["Enums"]["problem_category"][]
            | null
          startup_phase?: Database["public"]["Enums"]["startup_phase"][] | null
          subcategory?: Database["public"]["Enums"]["subcategory"] | null
          super_model?: boolean | null
          target_persona?:
            | Database["public"]["Enums"]["target_persona"][]
            | null
          title?: string
          type?: Database["public"]["Enums"]["knowledge_content_type"]
          visual_metaphor?: string | null
          visual_metaphor_url?: string | null
        }
        Relationships: []
      }
      message_embeddings: {
        Row: {
          embedding: string
          embedding_model: string
          generated_at: string
          message_id: string
        }
        Insert: {
          embedding: string
          embedding_model?: string
          generated_at?: string
          message_id: string
        }
        Update: {
          embedding?: string
          embedding_model?: string
          generated_at?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_embeddings_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active_branch: boolean
          metadata: Json
          model_used: Database["public"]["Enums"]["ai_model_type"] | null
          parent_message_id: string | null
          performance_metrics: Json
          phase_number: Database["public"]["Enums"]["phoenix_phase"]
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active_branch?: boolean
          metadata?: Json
          model_used?: Database["public"]["Enums"]["ai_model_type"] | null
          parent_message_id?: string | null
          performance_metrics?: Json
          phase_number: Database["public"]["Enums"]["phoenix_phase"]
          role: Database["public"]["Enums"]["message_role"]
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active_branch?: boolean
          metadata?: Json
          model_used?: Database["public"]["Enums"]["ai_model_type"] | null
          parent_message_id?: string | null
          performance_metrics?: Json
          phase_number?: Database["public"]["Enums"]["phoenix_phase"]
          role?: Database["public"]["Enums"]["message_role"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      phase_transitions: {
        Row: {
          from_phase: Database["public"]["Enums"]["phoenix_phase"] | null
          id: string
          session_id: string
          to_phase: Database["public"]["Enums"]["phoenix_phase"]
          transition_reason: string | null
          transitioned_at: string
          triggered_by_message_id: string | null
          validation_results: Json
        }
        Insert: {
          from_phase?: Database["public"]["Enums"]["phoenix_phase"] | null
          id?: string
          session_id: string
          to_phase: Database["public"]["Enums"]["phoenix_phase"]
          transition_reason?: string | null
          transitioned_at?: string
          triggered_by_message_id?: string | null
          validation_results?: Json
        }
        Update: {
          from_phase?: Database["public"]["Enums"]["phoenix_phase"] | null
          id?: string
          session_id?: string
          to_phase?: Database["public"]["Enums"]["phoenix_phase"]
          transition_reason?: string | null
          transitioned_at?: string
          triggered_by_message_id?: string | null
          validation_results?: Json
        }
        Relationships: [
          {
            foreignKeyName: "phase_transitions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "phase_transitions_triggered_by_message_id_fkey"
            columns: ["triggered_by_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      session_artifacts: {
        Row: {
          artifact_type: Database["public"]["Enums"]["artifact_type"]
          content: Json
          created_at: string
          created_from_message_id: string | null
          id: string
          is_current: boolean
          phase_created: Database["public"]["Enums"]["phoenix_phase"]
          session_id: string
          updated_at: string
          version: number
        }
        Insert: {
          artifact_type: Database["public"]["Enums"]["artifact_type"]
          content: Json
          created_at?: string
          created_from_message_id?: string | null
          id?: string
          is_current?: boolean
          phase_created: Database["public"]["Enums"]["phoenix_phase"]
          session_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          artifact_type?: Database["public"]["Enums"]["artifact_type"]
          content?: Json
          created_at?: string
          created_from_message_id?: string | null
          id?: string
          is_current?: boolean
          phase_created?: Database["public"]["Enums"]["phoenix_phase"]
          session_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_artifacts_created_from_message_id_fkey"
            columns: ["created_from_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_artifacts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          config: Json
          created_at: string
          current_phase: Database["public"]["Enums"]["phoenix_phase"]
          id: string
          last_activity_at: string
          metadata: Json
          phase_states: Json
          started_at: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          current_phase?: Database["public"]["Enums"]["phoenix_phase"]
          id?: string
          last_activity_at?: string
          metadata?: Json
          phase_states?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          config?: Json
          created_at?: string
          current_phase?: Database["public"]["Enums"]["phoenix_phase"]
          id?: string
          last_activity_at?: string
          metadata?: Json
          phase_states?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_current_period_end: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_current_period_end?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          free_roadmaps_used: boolean | null
          id: string
          reminder_enabled: boolean | null
          reminder_last_sent: string | null
          reminder_time: string | null
          reminder_timezone: string | null
          roadmap_count: number | null
          shown_modals: Json | null
          testimonial_bonus_used: boolean | null
          testimonial_state:
            | Database["public"]["Enums"]["testimonial_state"]
            | null
          testimonial_url: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          free_roadmaps_used?: boolean | null
          id: string
          reminder_enabled?: boolean | null
          reminder_last_sent?: string | null
          reminder_time?: string | null
          reminder_timezone?: string | null
          roadmap_count?: number | null
          shown_modals?: Json | null
          testimonial_bonus_used?: boolean | null
          testimonial_state?:
            | Database["public"]["Enums"]["testimonial_state"]
            | null
          testimonial_url?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          free_roadmaps_used?: boolean | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_last_sent?: string | null
          reminder_time?: string | null
          reminder_timezone?: string | null
          roadmap_count?: number | null
          shown_modals?: Json | null
          testimonial_bonus_used?: boolean | null
          testimonial_state?:
            | Database["public"]["Enums"]["testimonial_state"]
            | null
          testimonial_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      complete_step_and_unlock_next: {
        Args: { p_roadmap_id: string; p_step_id: string }
        Returns: Json
      }
      create_roadmap_with_tracking: {
        Args: {
          p_ai_generated_content?: Json
          p_goal_description: string
          p_steps: Json
          p_user_id: string
        }
        Returns: string
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      match_knowledge_content: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          category: string
          id: string
          similarity: number
          summary: string
          title: string
          type: Database["public"]["Enums"]["knowledge_content_type"]
        }[]
      }
      match_knowledge_content_by_language: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          target_language?: string
        }
        Returns: {
          category: string
          id: string
          similarity: number
          summary: string
          title: string
          type: Database["public"]["Enums"]["knowledge_content_type"]
        }[]
      }
      match_knowledge_content_by_subcategory: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
          subcategories?: string[]
          target_language?: string
        }
        Returns: {
          category: string
          id: string
          main_category: string
          similarity: number
          subcategory: string
          summary: string
          title: string
          type: Database["public"]["Enums"]["knowledge_content_type"]
        }[]
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
    }
    Enums: {
      ai_model_type:
        | "gpt-4.1"
        | "gpt-4.1-mini"
        | "gemini-2.5-flash"
        | "gemini-2.5-pro"
        | "claude-3.5-sonnet"
      artifact_type:
        | "problem_brief"
        | "commitment_memo"
        | "diagnostic_notes"
        | "classification_result"
        | "framework_application_notes"
        | "user_insights"
      knowledge_content_type:
        | "mental-model"
        | "cognitive-bias"
        | "fallacy"
        | "strategic-framework"
        | "tactical-tool"
      main_category:
        | "Core Sciences & Mathematics"
        | "Biology & Evolution"
        | "Psychology & Human Behavior"
        | "Thinking & Learning Processes"
        | "Human Systems & Strategy"
      message_role: "user" | "assistant" | "system"
      phoenix_phase:
        | "problem_intake"
        | "diagnostic_interview"
        | "type_classification"
        | "framework_selection"
        | "framework_application"
        | "commitment_memo_generation"
      problem_category:
        | "pivot"
        | "hiring"
        | "fundraising"
        | "co-founder_conflict"
        | "product-market_fit"
        | "go-to-market"
        | "team_and_culture"
        | "operations"
        | "competitive_strategy"
        | "pricing"
        | "risk_management"
      session_status: "active" | "completed" | "abandoned" | "paused"
      startup_phase: "ideation" | "seed" | "growth" | "scale-up" | "crisis"
      subcategory:
        | "Physics & Engineering"
        | "Mathematics & Statistics"
        | "Chemistry"
        | "Evolutionary Principles"
        | "Ecosystems & Systems Biology"
        | "Cognitive Biases"
        | "Social & Behavioral Psychology"
        | "Motivation & Human Drives"
        | "General Thinking Concepts"
        | "Problem Solving & Decision Making"
        | "Learning & Personal Growth"
        | "Communication & Persuasion"
        | "Logical Fallacies"
        | "Economics & Markets"
        | "Business & Management"
        | "Military & Competitive Strategy"
        | "Philosophy & Foundational Ideas"
        | "Politics & Governance"
      subscription_status: "free" | "premium"
      target_persona: "founder" | "executive" | "investor" | "product_manager"
      testimonial_state:
        | "not_asked"
        | "asked_first"
        | "dismissed_first"
        | "submitted"
        | "asked_second"
        | "dismissed_second"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ai_model_type: [
        "gpt-4.1",
        "gpt-4.1-mini",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "claude-3.5-sonnet",
      ],
      artifact_type: [
        "problem_brief",
        "commitment_memo",
        "diagnostic_notes",
        "classification_result",
        "framework_application_notes",
        "user_insights",
      ],
      knowledge_content_type: [
        "mental-model",
        "cognitive-bias",
        "fallacy",
        "strategic-framework",
        "tactical-tool",
      ],
      main_category: [
        "Core Sciences & Mathematics",
        "Biology & Evolution",
        "Psychology & Human Behavior",
        "Thinking & Learning Processes",
        "Human Systems & Strategy",
      ],
      message_role: ["user", "assistant", "system"],
      phoenix_phase: [
        "problem_intake",
        "diagnostic_interview",
        "type_classification",
        "framework_selection",
        "framework_application",
        "commitment_memo_generation",
      ],
      problem_category: [
        "pivot",
        "hiring",
        "fundraising",
        "co-founder_conflict",
        "product-market_fit",
        "go-to-market",
        "team_and_culture",
        "operations",
        "competitive_strategy",
        "pricing",
        "risk_management",
      ],
      session_status: ["active", "completed", "abandoned", "paused"],
      startup_phase: ["ideation", "seed", "growth", "scale-up", "crisis"],
      subcategory: [
        "Physics & Engineering",
        "Mathematics & Statistics",
        "Chemistry",
        "Evolutionary Principles",
        "Ecosystems & Systems Biology",
        "Cognitive Biases",
        "Social & Behavioral Psychology",
        "Motivation & Human Drives",
        "General Thinking Concepts",
        "Problem Solving & Decision Making",
        "Learning & Personal Growth",
        "Communication & Persuasion",
        "Logical Fallacies",
        "Economics & Markets",
        "Business & Management",
        "Military & Competitive Strategy",
        "Philosophy & Foundational Ideas",
        "Politics & Governance",
      ],
      subscription_status: ["free", "premium"],
      target_persona: ["founder", "executive", "investor", "product_manager"],
      testimonial_state: [
        "not_asked",
        "asked_first",
        "dismissed_first",
        "submitted",
        "asked_second",
        "dismissed_second",
      ],
    },
  },
} as const

