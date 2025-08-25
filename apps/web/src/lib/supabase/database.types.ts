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
          problem_category: string[] | null
          startup_phase: string[] | null
          subcategory: Database["public"]["Enums"]["subcategory"] | null
          super_model: boolean | null
          target_persona: string[] | null
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
          problem_category?: string[] | null
          startup_phase?: string[] | null
          subcategory?: Database["public"]["Enums"]["subcategory"] | null
          super_model?: boolean | null
          target_persona?: string[] | null
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
          problem_category?: string[] | null
          startup_phase?: string[] | null
          subcategory?: Database["public"]["Enums"]["subcategory"] | null
          super_model?: boolean | null
          target_persona?: string[] | null
          title?: string
          type?: Database["public"]["Enums"]["knowledge_content_type"]
          visual_metaphor?: string | null
          visual_metaphor_url?: string | null
        }
        Relationships: []
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
        Args:
          | {
              match_count?: number
              match_threshold?: number
              query_embedding: string
            }
          | {
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
      sync_user_data: {
        Args: { p_user_id?: string }
        Returns: {
          free_roadmaps_used: boolean
          has_testimonial: boolean
          roadmap_count: number
          testimonial_bonus_used: boolean
          user_id: string
        }[]
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
      ai_sentiment: "positive" | "negative" | "neutral"
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
      roadmap_status: "active" | "completed"
      roadmap_step_status: "locked" | "unlocked" | "completed"
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
      ai_sentiment: ["positive", "negative", "neutral"],
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
      roadmap_status: ["active", "completed"],
      roadmap_step_status: ["locked", "unlocked", "completed"],
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

