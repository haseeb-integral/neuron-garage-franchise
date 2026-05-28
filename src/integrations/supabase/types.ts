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
      ai_action_log: {
        Row: {
          action_type: string
          created_at: string
          error: string | null
          id: string
          payload: Json
          route: string
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          route: string
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          error?: string | null
          id?: string
          payload?: Json
          route?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_query_history: {
        Row: {
          created_at: string
          id: string
          parent_id: string | null
          query: string
          response: Json
          thread_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id?: string | null
          query: string
          response: Json
          thread_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string | null
          query?: string
          response?: Json
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_query_history_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "ai_query_history"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_thread_messages: {
        Row: {
          content: Json
          created_at: string
          id: string
          role: string
          thread_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          role: string
          thread_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_thread_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          route_at_start: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          route_at_start?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          route_at_start?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ask_city_conversations: {
        Row: {
          city_id: string
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_cache: {
        Row: {
          id: string
          last_synced: string
          name: string | null
          raw_data: Json | null
          status: string | null
        }
        Insert: {
          id: string
          last_synced?: string
          name?: string | null
          raw_data?: Json | null
          status?: string | null
        }
        Update: {
          id?: string
          last_synced?: string
          name?: string | null
          raw_data?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      candidate_checklist_items: {
        Row: {
          candidate_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          is_completed: boolean
          kind: string
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
          kind?: string
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
          kind?: string
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
          background_check_completed_at: string | null
          city: string
          created_at: string
          credit_check_completed_at: string | null
          current_stage: Database["public"]["Enums"]["candidate_stage"]
          email: string
          first_name: string
          fit_score: number
          fit_tag: string
          id: string
          last_name: string
          mailing_city: string | null
          mailing_state: string | null
          mailing_street: string | null
          mailing_zip: string | null
          other_email: string | null
          other_opportunities: string | null
          partner_email: string | null
          partner_involved: boolean
          partner_name: string | null
          partner_phone: string | null
          phone: string | null
          prospect_id: string | null
          source: string | null
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          background_check_completed_at?: string | null
          city?: string
          created_at?: string
          credit_check_completed_at?: string | null
          current_stage?: Database["public"]["Enums"]["candidate_stage"]
          email: string
          first_name: string
          fit_score?: number
          fit_tag?: string
          id?: string
          last_name: string
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_street?: string | null
          mailing_zip?: string | null
          other_email?: string | null
          other_opportunities?: string | null
          partner_email?: string | null
          partner_involved?: boolean
          partner_name?: string | null
          partner_phone?: string | null
          phone?: string | null
          prospect_id?: string | null
          source?: string | null
          state?: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          background_check_completed_at?: string | null
          city?: string
          created_at?: string
          credit_check_completed_at?: string | null
          current_stage?: Database["public"]["Enums"]["candidate_stage"]
          email?: string
          first_name?: string
          fit_score?: number
          fit_tag?: string
          id?: string
          last_name?: string
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_street?: string | null
          mailing_zip?: string | null
          other_email?: string | null
          other_opportunities?: string | null
          partner_email?: string | null
          partner_involved?: boolean
          partner_name?: string | null
          partner_phone?: string | null
          phone?: string | null
          prospect_id?: string | null
          source?: string | null
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      city_briefs: {
        Row: {
          brief: Json
          city_id: string
          city_name: string
          composite_score: number
          metro_area: string | null
          pillar_demand: number | null
          pillar_opp: number | null
          pillar_tam: number | null
          state_abbr: string
          state_name: string
          tier: string
          updated_at: string
        }
        Insert: {
          brief?: Json
          city_id: string
          city_name: string
          composite_score: number
          metro_area?: string | null
          pillar_demand?: number | null
          pillar_opp?: number | null
          pillar_tam?: number | null
          state_abbr: string
          state_name: string
          tier: string
          updated_at?: string
        }
        Update: {
          brief?: Json
          city_id?: string
          city_name?: string
          composite_score?: number
          metro_area?: string | null
          pillar_demand?: number | null
          pillar_opp?: number | null
          pillar_tam?: number | null
          state_abbr?: string
          state_name?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      city_data_gaps: {
        Row: {
          checked_at: string
          city_id: string
          field_name: string
          id: string
          reason: string
        }
        Insert: {
          checked_at?: string
          city_id: string
          field_name: string
          id?: string
          reason: string
        }
        Update: {
          checked_at?: string
          city_id?: string
          field_name?: string
          id?: string
          reason?: string
        }
        Relationships: []
      }
      city_narratives: {
        Row: {
          city_id: string
          created_at: string
          executive_summary: string
          id: string
          input_payload: Json
          model_id: string
          prompt_version: string
          report_demand: string
          report_next_move: string
          report_snapshot: string
          report_supply: string
          updated_at: string
          weights_hash: string
        }
        Insert: {
          city_id: string
          created_at?: string
          executive_summary: string
          id?: string
          input_payload?: Json
          model_id?: string
          prompt_version?: string
          report_demand: string
          report_next_move: string
          report_snapshot: string
          report_supply: string
          updated_at?: string
          weights_hash?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          executive_summary?: string
          id?: string
          input_payload?: Json
          model_id?: string
          prompt_version?: string
          report_demand?: string
          report_next_move?: string
          report_snapshot?: string
          report_supply?: string
          updated_at?: string
          weights_hash?: string
        }
        Relationships: []
      }
      city_seed_runs: {
        Row: {
          cities_failed: number
          cities_processed: number
          completed_at: string | null
          error_summary: Json | null
          id: string
          notes: string | null
          phase: string
          started_at: string
        }
        Insert: {
          cities_failed?: number
          cities_processed?: number
          completed_at?: string | null
          error_summary?: Json | null
          id?: string
          notes?: string | null
          phase: string
          started_at?: string
        }
        Update: {
          cities_failed?: number
          cities_processed?: number
          completed_at?: string | null
          error_summary?: Json | null
          id?: string
          notes?: string | null
          phase?: string
          started_at?: string
        }
        Relationships: []
      }
      custom_criteria: {
        Row: {
          category: string
          created_at: string
          data_source: string | null
          id: string
          name: string
          notes: string | null
          weight: number
        }
        Insert: {
          category: string
          created_at?: string
          data_source?: string | null
          id?: string
          name: string
          notes?: string | null
          weight?: number
        }
        Update: {
          category?: string
          created_at?: string
          data_source?: string | null
          id?: string
          name?: string
          notes?: string | null
          weight?: number
        }
        Relationships: []
      }
      db_health_history: {
        Row: {
          domain: string
          error: string | null
          id: string
          metric: string
          status: string
          ts: string
          value: Json | null
        }
        Insert: {
          domain: string
          error?: string | null
          id?: string
          metric: string
          status: string
          ts?: string
          value?: Json | null
        }
        Update: {
          domain?: string
          error?: string | null
          id?: string
          metric?: string
          status?: string
          ts?: string
          value?: Json | null
        }
        Relationships: []
      }
      db_health_incidents: {
        Row: {
          closed_at: string | null
          domain: string
          id: string
          last_status: string
          metric: string
          notes: string | null
          opened_at: string
        }
        Insert: {
          closed_at?: string | null
          domain: string
          id?: string
          last_status: string
          metric: string
          notes?: string | null
          opened_at?: string
        }
        Update: {
          closed_at?: string | null
          domain?: string
          id?: string
          last_status?: string
          metric?: string
          notes?: string | null
          opened_at?: string
        }
        Relationships: []
      }
      db_health_rules: {
        Row: {
          created_at: string
          description: string
          expected_zero: boolean
          name: string
          severity: string
          sql: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          expected_zero?: boolean
          name: string
          severity?: string
          sql: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          expected_zero?: boolean
          name?: string
          severity?: string
          sql?: string
          updated_at?: string
        }
        Relationships: []
      }
      db_health_subscriptions: {
        Row: {
          channel: string
          created_at: string
          domain: string | null
          id: string
          rule_name: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          domain?: string | null
          id?: string
          rule_name?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          domain?: string | null
          id?: string
          rule_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enrichment_jobs: {
        Row: {
          auto_push: boolean
          city: string | null
          completed_at: string | null
          created_at: string
          error_summary: Json | null
          failed_count: number
          filter_payload: Json | null
          id: string
          notes: string | null
          provider: string
          requested_by: string | null
          requested_count: number
          smartlead_campaign_id: string | null
          started_at: string | null
          state: string | null
          status: string
          succeeded_count: number
          total_cost_cents: number
          updated_at: string
        }
        Insert: {
          auto_push?: boolean
          city?: string | null
          completed_at?: string | null
          created_at?: string
          error_summary?: Json | null
          failed_count?: number
          filter_payload?: Json | null
          id?: string
          notes?: string | null
          provider?: string
          requested_by?: string | null
          requested_count?: number
          smartlead_campaign_id?: string | null
          started_at?: string | null
          state?: string | null
          status?: string
          succeeded_count?: number
          total_cost_cents?: number
          updated_at?: string
        }
        Update: {
          auto_push?: boolean
          city?: string | null
          completed_at?: string | null
          created_at?: string
          error_summary?: Json | null
          failed_count?: number
          filter_payload?: Json | null
          id?: string
          notes?: string | null
          provider?: string
          requested_by?: string | null
          requested_count?: number
          smartlead_campaign_id?: string | null
          started_at?: string | null
          state?: string | null
          status?: string
          succeeded_count?: number
          total_cost_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      imports: {
        Row: {
          batch_label: string | null
          completed_at: string | null
          errored_count: number
          file_checksum: string | null
          id: string
          inserted_count: number
          notes: string | null
          skipped_count: number
          source: string
          started_at: string
          triage_doc_path: string | null
          updated_count: number
        }
        Insert: {
          batch_label?: string | null
          completed_at?: string | null
          errored_count?: number
          file_checksum?: string | null
          id?: string
          inserted_count?: number
          notes?: string | null
          skipped_count?: number
          source: string
          started_at?: string
          triage_doc_path?: string | null
          updated_count?: number
        }
        Update: {
          batch_label?: string | null
          completed_at?: string | null
          errored_count?: number
          file_checksum?: string | null
          id?: string
          inserted_count?: number
          notes?: string | null
          skipped_count?: number
          source?: string
          started_at?: string
          triage_doc_path?: string | null
          updated_count?: number
        }
        Relationships: []
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
      outreach_queue: {
        Row: {
          added_at: string
          added_by: string | null
          campaign_id: string | null
          id: string
          last_error: string | null
          notes: string | null
          pushed_at: string | null
          smartlead_lead_id: string | null
          snoozed_until: string | null
          state: string
          teacher_prospect_id: string
          updated_at: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          campaign_id?: string | null
          id?: string
          last_error?: string | null
          notes?: string | null
          pushed_at?: string | null
          smartlead_lead_id?: string | null
          snoozed_until?: string | null
          state?: string
          teacher_prospect_id: string
          updated_at?: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          campaign_id?: string | null
          id?: string
          last_error?: string | null
          notes?: string | null
          pushed_at?: string | null
          smartlead_lead_id?: string | null
          snoozed_until?: string | null
          state?: string
          teacher_prospect_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_queue_teacher_prospect_id_fkey"
            columns: ["teacher_prospect_id"]
            isOneToOne: false
            referencedRelation: "teacher_prospects"
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
      prospects_staging: {
        Row: {
          batch_id: string
          city: string | null
          company: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          qa_status: string
          rejection_reason: string | null
          segment: string | null
          source: string | null
          state: string | null
        }
        Insert: {
          batch_id: string
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          qa_status?: string
          rejection_reason?: string | null
          segment?: string | null
          source?: string | null
          state?: string | null
        }
        Update: {
          batch_id?: string
          city?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          qa_status?: string
          rejection_reason?: string | null
          segment?: string | null
          source?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_staging_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "teacher_import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      public_school_aliases: {
        Row: {
          city_name: string
          created_at: string
          district_name: string | null
          id: string
          nces_id: string | null
          notes: string | null
          school_name: string
          source: string
          state_abbr: string
          updated_at: string
        }
        Insert: {
          city_name: string
          created_at?: string
          district_name?: string | null
          id?: string
          nces_id?: string | null
          notes?: string | null
          school_name: string
          source?: string
          state_abbr: string
          updated_at?: string
        }
        Update: {
          city_name?: string
          created_at?: string
          district_name?: string | null
          id?: string
          nces_id?: string | null
          notes?: string | null
          school_name?: string
          source?: string
          state_abbr?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_schools: {
        Row: {
          city_name: string | null
          created_at: string
          district_name: string | null
          district_nces_id: string | null
          enrollment: number | null
          highest_grade_offered: string | null
          is_charter: boolean | null
          is_elementary_serving: boolean | null
          is_magnet: boolean | null
          latitude: number | null
          longitude: number | null
          lowest_grade_offered: string | null
          nces_id: string
          nces_last_updated: string | null
          nces_year: number | null
          phone: string | null
          raw: Json | null
          school_level: string | null
          school_name: string
          school_status: string | null
          school_type: string | null
          state_abbr: string | null
          street_address: string | null
          teachers_fte: number | null
          updated_at: string
          us_cities_scored_id: string | null
          zip: string | null
        }
        Insert: {
          city_name?: string | null
          created_at?: string
          district_name?: string | null
          district_nces_id?: string | null
          enrollment?: number | null
          highest_grade_offered?: string | null
          is_charter?: boolean | null
          is_elementary_serving?: boolean | null
          is_magnet?: boolean | null
          latitude?: number | null
          longitude?: number | null
          lowest_grade_offered?: string | null
          nces_id: string
          nces_last_updated?: string | null
          nces_year?: number | null
          phone?: string | null
          raw?: Json | null
          school_level?: string | null
          school_name: string
          school_status?: string | null
          school_type?: string | null
          state_abbr?: string | null
          street_address?: string | null
          teachers_fte?: number | null
          updated_at?: string
          us_cities_scored_id?: string | null
          zip?: string | null
        }
        Update: {
          city_name?: string | null
          created_at?: string
          district_name?: string | null
          district_nces_id?: string | null
          enrollment?: number | null
          highest_grade_offered?: string | null
          is_charter?: boolean | null
          is_elementary_serving?: boolean | null
          is_magnet?: boolean | null
          latitude?: number | null
          longitude?: number | null
          lowest_grade_offered?: string | null
          nces_id?: string
          nces_last_updated?: string | null
          nces_year?: number | null
          phone?: string | null
          raw?: Json | null
          school_level?: string | null
          school_name?: string
          school_status?: string | null
          school_type?: string | null
          state_abbr?: string | null
          street_address?: string | null
          teachers_fte?: number | null
          updated_at?: string
          us_cities_scored_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_schools_us_cities_scored_id_fkey"
            columns: ["us_cities_scored_id"]
            isOneToOne: false
            referencedRelation: "us_cities_scored"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          id: string
          master_weights: Json
          name: string
          sub_weights: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          master_weights: Json
          name: string
          sub_weights?: Json
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          master_weights?: Json
          name?: string
          sub_weights?: Json
          user_id?: string
        }
        Relationships: []
      }
      scoring_config: {
        Row: {
          created_at: string
          id: string
          master_weights: Json
          preset_name: string
          singleton: boolean | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          master_weights: Json
          preset_name?: string
          singleton?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          master_weights?: Json
          preset_name?: string
          singleton?: boolean | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      smartlead_events: {
        Row: {
          campaign_id: string | null
          event_type: string
          id: string
          lead_email: string | null
          lead_id: string | null
          payload: Json | null
          received_at: string
          referral_contact: string | null
          reply_intent: string | null
          reply_intent_confidence: number | null
          reply_intent_overridden_at: string | null
          reply_intent_overridden_by: string | null
          reply_intent_reason: string | null
          reply_message: string | null
          reply_message_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          event_type: string
          id?: string
          lead_email?: string | null
          lead_id?: string | null
          payload?: Json | null
          received_at?: string
          referral_contact?: string | null
          reply_intent?: string | null
          reply_intent_confidence?: number | null
          reply_intent_overridden_at?: string | null
          reply_intent_overridden_by?: string | null
          reply_intent_reason?: string | null
          reply_message?: string | null
          reply_message_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          event_type?: string
          id?: string
          lead_email?: string | null
          lead_id?: string | null
          payload?: Json | null
          received_at?: string
          referral_contact?: string | null
          reply_intent?: string | null
          reply_intent_confidence?: number | null
          reply_intent_overridden_at?: string | null
          reply_intent_overridden_by?: string | null
          reply_intent_reason?: string | null
          reply_message?: string | null
          reply_message_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      teacher_import_batches: {
        Row: {
          approved_count: number
          batch_name: string
          campaign_id: string | null
          city: string | null
          column_mapping: Json | null
          created_at: string
          dedupe_stats: Json | null
          destination: string
          id: string
          record_count: number
          segment: string | null
          source: string | null
          state: string | null
          status: string
          unmapped_columns: string[] | null
        }
        Insert: {
          approved_count?: number
          batch_name: string
          campaign_id?: string | null
          city?: string | null
          column_mapping?: Json | null
          created_at?: string
          dedupe_stats?: Json | null
          destination?: string
          id?: string
          record_count?: number
          segment?: string | null
          source?: string | null
          state?: string | null
          status?: string
          unmapped_columns?: string[] | null
        }
        Update: {
          approved_count?: number
          batch_name?: string
          campaign_id?: string | null
          city?: string | null
          column_mapping?: Json | null
          created_at?: string
          dedupe_stats?: Json | null
          destination?: string
          id?: string
          record_count?: number
          segment?: string | null
          source?: string | null
          state?: string | null
          status?: string
          unmapped_columns?: string[] | null
        }
        Relationships: []
      }
      teacher_prospects: {
        Row: {
          apify_run_id: string | null
          city: string
          created_at: string
          dedupe_key: string | null
          district: string | null
          donorschoose_id: string | null
          email: string | null
          enrichment_cost_cents: number | null
          enrichment_provider: string | null
          enrichment_source: string | null
          experience_years: number | null
          first_name: string | null
          fit_score: number | null
          grade: string | null
          id: string
          import_batch_id: string | null
          last_enriched_at: string | null
          last_name: string | null
          last_pushed_at: string | null
          linkedin_url: string | null
          mailing_city: string | null
          mailing_state: string | null
          mailing_street: string | null
          mailing_zip: string | null
          name: string | null
          needs_email_enrichment: boolean
          notes: string | null
          other_email: string | null
          raw: Json | null
          school: string | null
          school_nces_id: string | null
          segment: string | null
          state: string
          status: string
          subject: string | null
          tags: string[]
          teacher_type: string | null
          updated_at: string
          us_cities_scored_id: string | null
          verification_status: string | null
        }
        Insert: {
          apify_run_id?: string | null
          city: string
          created_at?: string
          dedupe_key?: string | null
          district?: string | null
          donorschoose_id?: string | null
          email?: string | null
          enrichment_cost_cents?: number | null
          enrichment_provider?: string | null
          enrichment_source?: string | null
          experience_years?: number | null
          first_name?: string | null
          fit_score?: number | null
          grade?: string | null
          id?: string
          import_batch_id?: string | null
          last_enriched_at?: string | null
          last_name?: string | null
          last_pushed_at?: string | null
          linkedin_url?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_street?: string | null
          mailing_zip?: string | null
          name?: string | null
          needs_email_enrichment?: boolean
          notes?: string | null
          other_email?: string | null
          raw?: Json | null
          school?: string | null
          school_nces_id?: string | null
          segment?: string | null
          state: string
          status?: string
          subject?: string | null
          tags?: string[]
          teacher_type?: string | null
          updated_at?: string
          us_cities_scored_id?: string | null
          verification_status?: string | null
        }
        Update: {
          apify_run_id?: string | null
          city?: string
          created_at?: string
          dedupe_key?: string | null
          district?: string | null
          donorschoose_id?: string | null
          email?: string | null
          enrichment_cost_cents?: number | null
          enrichment_provider?: string | null
          enrichment_source?: string | null
          experience_years?: number | null
          first_name?: string | null
          fit_score?: number | null
          grade?: string | null
          id?: string
          import_batch_id?: string | null
          last_enriched_at?: string | null
          last_name?: string | null
          last_pushed_at?: string | null
          linkedin_url?: string | null
          mailing_city?: string | null
          mailing_state?: string | null
          mailing_street?: string | null
          mailing_zip?: string | null
          name?: string | null
          needs_email_enrichment?: boolean
          notes?: string | null
          other_email?: string | null
          raw?: Json | null
          school?: string | null
          school_nces_id?: string | null
          segment?: string | null
          state?: string
          status?: string
          subject?: string | null
          tags?: string[]
          teacher_type?: string | null
          updated_at?: string
          us_cities_scored_id?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_prospects_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "teacher_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_prospects_school_nces_id_fkey"
            columns: ["school_nces_id"]
            isOneToOne: false
            referencedRelation: "public_schools"
            referencedColumns: ["nces_id"]
          },
          {
            foreignKeyName: "teacher_prospects_us_cities_scored_id_fkey"
            columns: ["us_cities_scored_id"]
            isOneToOne: false
            referencedRelation: "us_cities_scored"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_saved_lists: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
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
      us_cities_scored: {
        Row: {
          apify_last_updated: string | null
          avg_elementary_teacher_salary_usd: number | null
          avg_peak_summer_temperature: number | null
          bea_last_updated: string | null
          bls_last_updated: string | null
          census_last_updated: string | null
          census_population_2020: number | null
          charter_elementary_count: number | null
          children_5_12: number | null
          city_name: string
          col_salary_index: number | null
          college_degree_pct: number | null
          composite_score_default: number | null
          cost_of_living_index: number | null
          county_name: string | null
          created_at: string
          csi_brand_detail: Json | null
          csi_confidence: number | null
          csi_demand_adjusted_market: number | null
          csi_last_updated: string | null
          csi_local_provider_estimate: number | null
          csi_national_brand_count_weighted: number | null
          csi_saturation_category: string | null
          csi_score: number | null
          days_above_90f: number | null
          dual_working_families_pct: number | null
          firecrawl_last_updated: string | null
          fred_last_updated: string | null
          greatschools_last_updated: string | null
          id: string
          is_registration_state: boolean
          labor_force_participation: number | null
          latitude: number | null
          longitude: number | null
          median_household_income: number | null
          metro_area: string | null
          metro_counties: string[] | null
          nces_last_updated: string | null
          notes: string | null
          place_type: string | null
          population: number | null
          population_density: number | null
          private_charter_share_pct: number | null
          private_elementary_count: number | null
          public_elementary_count: number | null
          public_elementary_enrollment: number | null
          public_elementary_teacher_count: number | null
          public_school_count: number | null
          public_school_enrollment: number | null
          refresh_count: number
          regional_median_income: number | null
          school_district_count: number | null
          score_csi: number | null
          score_demand: number | null
          score_tam_teachers: number | null
          scored_at: string | null
          seed_run_id: string | null
          state_abbr: string
          state_name: string
          stem_job_concentration: number | null
          summer_precip_days: number | null
          summer_weather_index: number | null
          updated_at: string
          weather_last_updated: string | null
        }
        Insert: {
          apify_last_updated?: string | null
          avg_elementary_teacher_salary_usd?: number | null
          avg_peak_summer_temperature?: number | null
          bea_last_updated?: string | null
          bls_last_updated?: string | null
          census_last_updated?: string | null
          census_population_2020?: number | null
          charter_elementary_count?: number | null
          children_5_12?: number | null
          city_name: string
          col_salary_index?: number | null
          college_degree_pct?: number | null
          composite_score_default?: number | null
          cost_of_living_index?: number | null
          county_name?: string | null
          created_at?: string
          csi_brand_detail?: Json | null
          csi_confidence?: number | null
          csi_demand_adjusted_market?: number | null
          csi_last_updated?: string | null
          csi_local_provider_estimate?: number | null
          csi_national_brand_count_weighted?: number | null
          csi_saturation_category?: string | null
          csi_score?: number | null
          days_above_90f?: number | null
          dual_working_families_pct?: number | null
          firecrawl_last_updated?: string | null
          fred_last_updated?: string | null
          greatschools_last_updated?: string | null
          id?: string
          is_registration_state?: boolean
          labor_force_participation?: number | null
          latitude?: number | null
          longitude?: number | null
          median_household_income?: number | null
          metro_area?: string | null
          metro_counties?: string[] | null
          nces_last_updated?: string | null
          notes?: string | null
          place_type?: string | null
          population?: number | null
          population_density?: number | null
          private_charter_share_pct?: number | null
          private_elementary_count?: number | null
          public_elementary_count?: number | null
          public_elementary_enrollment?: number | null
          public_elementary_teacher_count?: number | null
          public_school_count?: number | null
          public_school_enrollment?: number | null
          refresh_count?: number
          regional_median_income?: number | null
          school_district_count?: number | null
          score_csi?: number | null
          score_demand?: number | null
          score_tam_teachers?: number | null
          scored_at?: string | null
          seed_run_id?: string | null
          state_abbr: string
          state_name: string
          stem_job_concentration?: number | null
          summer_precip_days?: number | null
          summer_weather_index?: number | null
          updated_at?: string
          weather_last_updated?: string | null
        }
        Update: {
          apify_last_updated?: string | null
          avg_elementary_teacher_salary_usd?: number | null
          avg_peak_summer_temperature?: number | null
          bea_last_updated?: string | null
          bls_last_updated?: string | null
          census_last_updated?: string | null
          census_population_2020?: number | null
          charter_elementary_count?: number | null
          children_5_12?: number | null
          city_name?: string
          col_salary_index?: number | null
          college_degree_pct?: number | null
          composite_score_default?: number | null
          cost_of_living_index?: number | null
          county_name?: string | null
          created_at?: string
          csi_brand_detail?: Json | null
          csi_confidence?: number | null
          csi_demand_adjusted_market?: number | null
          csi_last_updated?: string | null
          csi_local_provider_estimate?: number | null
          csi_national_brand_count_weighted?: number | null
          csi_saturation_category?: string | null
          csi_score?: number | null
          days_above_90f?: number | null
          dual_working_families_pct?: number | null
          firecrawl_last_updated?: string | null
          fred_last_updated?: string | null
          greatschools_last_updated?: string | null
          id?: string
          is_registration_state?: boolean
          labor_force_participation?: number | null
          latitude?: number | null
          longitude?: number | null
          median_household_income?: number | null
          metro_area?: string | null
          metro_counties?: string[] | null
          nces_last_updated?: string | null
          notes?: string | null
          place_type?: string | null
          population?: number | null
          population_density?: number | null
          private_charter_share_pct?: number | null
          private_elementary_count?: number | null
          public_elementary_count?: number | null
          public_elementary_enrollment?: number | null
          public_elementary_teacher_count?: number | null
          public_school_count?: number | null
          public_school_enrollment?: number | null
          refresh_count?: number
          regional_median_income?: number | null
          school_district_count?: number | null
          score_csi?: number | null
          score_demand?: number | null
          score_tam_teachers?: number | null
          scored_at?: string | null
          seed_run_id?: string | null
          state_abbr?: string
          state_name?: string
          stem_job_concentration?: number | null
          summer_precip_days?: number | null
          summer_weather_index?: number | null
          updated_at?: string
          weather_last_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "us_cities_scored_seed_run_id_fkey"
            columns: ["seed_run_id"]
            isOneToOne: false
            referencedRelation: "city_seed_runs"
            referencedColumns: ["id"]
          },
        ]
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
      watchlist_items: {
        Row: {
          city_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          city_id: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      db_health_history_for: {
        Args: { _days?: number; _domain: string }
        Returns: {
          domain: string
          error: string | null
          id: string
          metric: string
          status: string
          ts: string
          value: Json | null
        }[]
        SetofOptions: {
          from: "*"
          to: "db_health_history"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      db_health_outliers: {
        Args: { _column: string; _n?: number }
        Returns: Json
      }
      db_health_random_city: { Args: never; Returns: Json }
      db_health_run_rule: { Args: { _name: string }; Returns: Json }
      db_health_snapshot: { Args: never; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      match_teachers_to_schools: {
        Args: {
          p_city: string
          p_dry_run?: boolean
          p_state: string
          p_threshold?: number
        }
        Returns: {
          action: string
          best_match_name: string
          best_match_nces_id: string
          similarity: number
          source: string
          teacher_id: string
          teacher_school: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      seed_confirmation_checklist: {
        Args: { _candidate_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      teacher_prospects_cities: {
        Args: never
        Returns: {
          city: string
        }[]
      }
      teacher_prospects_stats: {
        Args: {
          p_cities?: string[]
          p_city?: string
          p_search?: string
          p_source_filter?: string
        }
        Returns: Json
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
