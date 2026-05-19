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
            referencedRelation: "us_cities_scored"
            referencedColumns: ["id"]
          },
        ]
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
      prospect_batches: {
        Row: {
          approved_count: number
          batch_name: string
          campaign_id: string | null
          city: string | null
          created_at: string
          id: string
          record_count: number
          segment: string | null
          source: string | null
          state: string | null
          status: string
        }
        Insert: {
          approved_count?: number
          batch_name: string
          campaign_id?: string | null
          city?: string | null
          created_at?: string
          id?: string
          record_count?: number
          segment?: string | null
          source?: string | null
          state?: string | null
          status?: string
        }
        Update: {
          approved_count?: number
          batch_name?: string
          campaign_id?: string | null
          city?: string | null
          created_at?: string
          id?: string
          record_count?: number
          segment?: string | null
          source?: string | null
          state?: string | null
          status?: string
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
            referencedRelation: "prospect_batches"
            referencedColumns: ["id"]
          },
        ]
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
          reply_intent: string | null
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
          reply_intent?: string | null
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
          reply_intent?: string | null
          reply_message?: string | null
          reply_message_id?: string | null
        }
        Relationships: []
      }
      teacher_prospects: {
        Row: {
          apify_run_id: string | null
          city: string
          created_at: string
          district: string | null
          donorschoose_id: string | null
          email: string | null
          enrichment_source: string | null
          experience_years: number | null
          fit_score: number | null
          grade: string | null
          id: string
          last_enriched_at: string | null
          linkedin_url: string | null
          name: string | null
          raw: Json | null
          school: string | null
          school_nces_id: string | null
          segment: string | null
          state: string
          status: string
          subject: string | null
          teacher_type: string | null
          updated_at: string
          us_cities_scored_id: string | null
        }
        Insert: {
          apify_run_id?: string | null
          city: string
          created_at?: string
          district?: string | null
          donorschoose_id?: string | null
          email?: string | null
          enrichment_source?: string | null
          experience_years?: number | null
          fit_score?: number | null
          grade?: string | null
          id?: string
          last_enriched_at?: string | null
          linkedin_url?: string | null
          name?: string | null
          raw?: Json | null
          school?: string | null
          school_nces_id?: string | null
          segment?: string | null
          state: string
          status?: string
          subject?: string | null
          teacher_type?: string | null
          updated_at?: string
          us_cities_scored_id?: string | null
        }
        Update: {
          apify_run_id?: string | null
          city?: string
          created_at?: string
          district?: string | null
          donorschoose_id?: string | null
          email?: string | null
          enrichment_source?: string | null
          experience_years?: number | null
          fit_score?: number | null
          grade?: string | null
          id?: string
          last_enriched_at?: string | null
          linkedin_url?: string | null
          name?: string | null
          raw?: Json | null
          school?: string | null
          school_nces_id?: string | null
          segment?: string | null
          state?: string
          status?: string
          subject?: string | null
          teacher_type?: string | null
          updated_at?: string
          us_cities_scored_id?: string | null
        }
        Relationships: [
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
          avg_camp_price_per_hour: number | null
          bea_last_updated: string | null
          bls_last_updated: string | null
          camp_waitlist_signals: Json | null
          census_last_updated: string | null
          charter_elementary_count: number | null
          children_5_12: number | null
          city_name: string
          college_degree_pct: number | null
          composite_score_default: number | null
          cost_of_living_index: number | null
          created_at: string
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
          nces_last_updated: string | null
          population: number | null
          population_density: number | null
          private_elementary_count: number | null
          public_elementary_count: number | null
          public_elementary_enrollment: number | null
          public_school_count: number | null
          public_school_enrollment: number | null
          refresh_count: number
          regional_median_income: number | null
          school_hosted_camp_count: number | null
          score_competitive: number | null
          score_demand: number | null
          score_ease_of_operation: number | null
          score_franchise_supply: number | null
          score_parent_mindset: number | null
          score_pricing_power: number | null
          scored_at: string | null
          seed_run_id: string | null
          state_abbr: string
          state_name: string
          stem_job_concentration: number | null
          summer_camp_count: number | null
          updated_at: string
        }
        Insert: {
          apify_last_updated?: string | null
          avg_camp_price_per_hour?: number | null
          bea_last_updated?: string | null
          bls_last_updated?: string | null
          camp_waitlist_signals?: Json | null
          census_last_updated?: string | null
          charter_elementary_count?: number | null
          children_5_12?: number | null
          city_name: string
          college_degree_pct?: number | null
          composite_score_default?: number | null
          cost_of_living_index?: number | null
          created_at?: string
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
          nces_last_updated?: string | null
          population?: number | null
          population_density?: number | null
          private_elementary_count?: number | null
          public_elementary_count?: number | null
          public_elementary_enrollment?: number | null
          public_school_count?: number | null
          public_school_enrollment?: number | null
          refresh_count?: number
          regional_median_income?: number | null
          school_hosted_camp_count?: number | null
          score_competitive?: number | null
          score_demand?: number | null
          score_ease_of_operation?: number | null
          score_franchise_supply?: number | null
          score_parent_mindset?: number | null
          score_pricing_power?: number | null
          scored_at?: string | null
          seed_run_id?: string | null
          state_abbr: string
          state_name: string
          stem_job_concentration?: number | null
          summer_camp_count?: number | null
          updated_at?: string
        }
        Update: {
          apify_last_updated?: string | null
          avg_camp_price_per_hour?: number | null
          bea_last_updated?: string | null
          bls_last_updated?: string | null
          camp_waitlist_signals?: Json | null
          census_last_updated?: string | null
          charter_elementary_count?: number | null
          children_5_12?: number | null
          city_name?: string
          college_degree_pct?: number | null
          composite_score_default?: number | null
          cost_of_living_index?: number | null
          created_at?: string
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
          nces_last_updated?: string | null
          population?: number | null
          population_density?: number | null
          private_elementary_count?: number | null
          public_elementary_count?: number | null
          public_elementary_enrollment?: number | null
          public_school_count?: number | null
          public_school_enrollment?: number | null
          refresh_count?: number
          regional_median_income?: number | null
          school_hosted_camp_count?: number | null
          score_competitive?: number | null
          score_demand?: number | null
          score_ease_of_operation?: number | null
          score_franchise_supply?: number | null
          score_parent_mindset?: number | null
          score_pricing_power?: number | null
          scored_at?: string | null
          seed_run_id?: string | null
          state_abbr?: string
          state_name?: string
          stem_job_concentration?: number | null
          summer_camp_count?: number | null
          updated_at?: string
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
