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
