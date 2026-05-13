export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      candidate_checklist_items: {
        Row: {
          candidate_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          label: string
          stage: Database["public"]["Enums"]["candidate_stage"]
        }
        Insert: {
          candidate_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          label: string
          stage: Database["public"]["Enums"]["candidate_stage"]
        }
        Update: {
          candidate_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          label?: string
          stage?: Database["public"]["Enums"]["candidate_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "candidate_checklist_items_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_profiles: {
        Row: {
          additional_notes: string | null
          background: string | null
          candidate_id: string
          created_at: string
          liquid_capital: number | null
          location_preferences: string | null
          motivation: string | null
          net_worth: number | null
          partner_involved: boolean
          timeline: string | null
          updated_at: string
        }
        Insert: {
          additional_notes?: string | null
          background?: string | null
          candidate_id: string
          created_at?: string
          liquid_capital?: number | null
          location_preferences?: string | null
          motivation?: string | null
          net_worth?: number | null
          partner_involved?: boolean
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          additional_notes?: string | null
          background?: string | null
          candidate_id?: string
          created_at?: string
          liquid_capital?: number | null
          location_preferences?: string | null
          motivation?: string | null
          net_worth?: number | null
          partner_involved?: boolean
          timeline?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_profiles_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_qualification: {
        Row: {
          candidate_id: string
          composite_score: number
          culture_fit: number
          financial_readiness: number
          leadership: number
          market_fit: number
          teaching_experience: number
          updated_at: string
        }
        Insert: {
          candidate_id: string
          composite_score?: number
          culture_fit?: number
          financial_readiness?: number
          leadership?: number
          market_fit?: number
          teaching_experience?: number
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          composite_score?: number
          culture_fit?: number
          financial_readiness?: number
          leadership?: number
          market_fit?: number
          teaching_experience?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_qualification_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_stage_history: {
        Row: {
          candidate_id: string
          changed_at: string
          changed_by: string | null
          from_stage: Database["public"]["Enums"]["candidate_stage"] | null
          id: string
          notes: string | null
          to_stage: Database["public"]["Enums"]["candidate_stage"]
        }
        Insert: {
          candidate_id: string
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database["public"]["Enums"]["candidate_stage"] | null
          id?: string
          notes?: string | null
          to_stage: Database["public"]["Enums"]["candidate_stage"]
        }
        Update: {
          candidate_id?: string
          changed_at?: string
          changed_by?: string | null
          from_stage?: Database["public"]["Enums"]["candidate_stage"] | null
          id?: string
          notes?: string | null
          to_stage?: Database["public"]["Enums"]["candidate_stage"]
        }
        Relationships: [
          {
            foreignKeyName: "candidate_stage_history_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_votes: {
        Row: {
          candidate_id: string
          comment: string | null
          created_at: string
          id: string
          updated_at: string
          vote: Database["public"]["Enums"]["candidate_vote_value"]
          voter: string
        }
        Insert: {
          candidate_id: string
          comment?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          vote: Database["public"]["Enums"]["candidate_vote_value"]
          voter: string
        }
        Update: {
          candidate_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          vote?: Database["public"]["Enums"]["candidate_vote_value"]
          voter?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_votes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          assigned_to: string | null
          city: string
          created_at: string
          current_stage: Database["public"]["Enums"]["candidate_stage"]
          email: string
          first_name: string
          fit_score: number
          fit_tag: string
          id: string
          last_name: string
          phone: string | null
          prospect_id: string | null
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          city?: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["candidate_stage"]
          email: string
          first_name: string
          fit_score?: number
          fit_tag?: string
          id?: string
          last_name: string
          phone?: string | null
          prospect_id?: string | null
          state?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          city?: string
          created_at?: string
          current_stage?: Database["public"]["Enums"]["candidate_stage"]
          email?: string
          first_name?: string
          fit_score?: number
          fit_tag?: string
          id?: string
          last_name?: string
          phone?: string | null
          prospect_id?: string | null
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          children_pct: number | null
          city: string
          competitor_count: number
          composite_score: number
          county: string | null
          created_at: string
          elementary_schools: number | null
          id: string
          is_non_registration: boolean
          last_scraped_at: string | null
          latitude: number | null
          longitude: number | null
          market_type: string
          median_income: number | null
          metro_area: string | null
          notes: string | null
          population: number | null
          state: string
          tier: string
          updated_at: string
        }
        Insert: {
          children_pct?: number | null
          city: string
          competitor_count?: number
          composite_score?: number
          county?: string | null
          created_at?: string
          elementary_schools?: number | null
          id?: string
          is_non_registration?: boolean
          last_scraped_at?: string | null
          latitude?: number | null
          longitude?: number | null
          market_type?: string
          median_income?: number | null
          metro_area?: string | null
          notes?: string | null
          population?: number | null
          state: string
          tier?: string
          updated_at?: string
        }
        Update: {
          children_pct?: number | null
          city?: string
          competitor_count?: number
          composite_score?: number
          county?: string | null
          created_at?: string
          elementary_schools?: number | null
          id?: string
          is_non_registration?: boolean
          last_scraped_at?: string | null
          latitude?: number | null
          longitude?: number | null
          market_type?: string
          median_income?: number | null
          metro_area?: string | null
          notes?: string | null
          population?: number | null
          state?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      city_category_scores: {
        Row: {
          category: string
          city_id: string
          id: string
          score: number
          updated_at: string
        }
        Insert: {
          category: string
          city_id: string
          id?: string
          score: number
          updated_at?: string
        }
        Update: {
          category?: string
          city_id?: string
          id?: string
          score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_category_scores_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      city_competitors: {
        Row: {
          capacity: number | null
          city_id: string
          created_at: string
          id: string
          name: string
          pricing: string | null
          raw_data: Json | null
          scraped_at: string | null
          source: string | null
          source_url: string | null
          type: string | null
        }
        Insert: {
          capacity?: number | null
          city_id: string
          created_at?: string
          id?: string
          name: string
          pricing?: string | null
          raw_data?: Json | null
          scraped_at?: string | null
          source?: string | null
          source_url?: string | null
          type?: string | null
        }
        Update: {
          capacity?: number | null
          city_id?: string
          created_at?: string
          id?: string
          name?: string
          pricing?: string | null
          raw_data?: Json | null
          scraped_at?: string | null
          source?: string | null
          source_url?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "city_competitors_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      city_fetch_jobs: {
        Row: {
          city: string
          city_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          request_payload: Json | null
          response_summary: Json | null
          source: string
          started_at: string | null
          state: string
          status: string
        }
        Insert: {
          city: string
          city_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_summary?: Json | null
          source: string
          started_at?: string | null
          state: string
          status?: string
        }
        Update: {
          city?: string
          city_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_summary?: Json | null
          source?: string
          started_at?: string | null
          state?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_fetch_jobs_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      city_market_signals: {
        Row: {
          city_id: string
          confidence: number | null
          delta: string | null
          delta_type: string | null
          id: string
          label: string
          raw_data: Json | null
          signal_key: string
          source: string | null
          source_url: string | null
          updated_at: string
          value: string
        }
        Insert: {
          city_id: string
          confidence?: number | null
          delta?: string | null
          delta_type?: string | null
          id?: string
          label: string
          raw_data?: Json | null
          signal_key: string
          source?: string | null
          source_url?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          city_id?: string
          confidence?: number | null
          delta?: string | null
          delta_type?: string | null
          id?: string
          label?: string
          raw_data?: Json | null
          signal_key?: string
          source?: string | null
          source_url?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "city_market_signals_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_records: {
        Row: {
          candidate_id: string | null
          city: string
          created_at: string
          current_step_index: number
          franchisee_name: string
          id: string
          state: string
          status: string
          total_steps: number
          updated_at: string
        }
        Insert: {
          candidate_id?: string | null
          city?: string
          created_at?: string
          current_step_index?: number
          franchisee_name: string
          id?: string
          state?: string
          status?: string
          total_steps?: number
          updated_at?: string
        }
        Update: {
          candidate_id?: string | null
          city?: string
          created_at?: string
          current_step_index?: number
          franchisee_name?: string
          id?: string
          state?: string
          status?: string
          total_steps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_records_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          onboarding_id: string
          step_index: number
          title: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          onboarding_id: string
          step_index: number
          title: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          onboarding_id?: string
          step_index?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_steps_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "onboarding_records"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      us_cities_geo: {
        Row: {
          city: string
          city_ascii: string
          county_name: string | null
          density: number | null
          id: number
          lat: number
          lng: number
          population: number | null
          state_id: string
          state_name: string
        }
        Insert: {
          city: string
          city_ascii: string
          county_name?: string | null
          density?: number | null
          id?: number
          lat: number
          lng: number
          population?: number | null
          state_id: string
          state_name: string
        }
        Update: {
          city?: string
          city_ascii?: string
          county_name?: string | null
          density?: number | null
          id?: number
          lat?: number
          lng?: number
          population?: number | null
          state_id?: string
          state_name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_confirmation_checklist: {
        Args: { _candidate_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager"
      candidate_stage:
        | "new_lead"
        | "initial_qualification"
        | "business_overview"
        | "fdd_review"
        | "immersion"
        | "confirmation"
        | "signing"
        | "disqualified"
      candidate_vote_value: "approve" | "needs_info" | "reject"
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
  public: {
    Enums: {
      app_role: ["admin", "manager"],
      candidate_stage: [
        "new_lead",
        "initial_qualification",
        "business_overview",
        "fdd_review",
        "immersion",
        "confirmation",
        "signing",
        "disqualified",
      ],
      candidate_vote_value: ["approve", "needs_info", "reject"],
    },
  },
} as const
