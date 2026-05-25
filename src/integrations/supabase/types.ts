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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accidents: {
        Row: {
          client_id: string
          created_at: string
          document_url: string | null
          driver_id: string | null
          fatalities: number
          fmcsa_report_number: string | null
          id: string
          injuries: number
          location: string | null
          narrative: string | null
          occurred_at: string
          org_id: string
          police_report_number: string | null
          severity: string
          state: string | null
          tow_required: boolean
          truck_id: string | null
          updated_at: string
          usdot_reportable: boolean | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_url?: string | null
          driver_id?: string | null
          fatalities?: number
          fmcsa_report_number?: string | null
          id?: string
          injuries?: number
          location?: string | null
          narrative?: string | null
          occurred_at: string
          org_id?: string
          police_report_number?: string | null
          severity?: string
          state?: string | null
          tow_required?: boolean
          truck_id?: string | null
          updated_at?: string
          usdot_reportable?: boolean | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_url?: string | null
          driver_id?: string | null
          fatalities?: number
          fmcsa_report_number?: string | null
          id?: string
          injuries?: number
          location?: string | null
          narrative?: string | null
          occurred_at?: string
          org_id?: string
          police_report_number?: string | null
          severity?: string
          state?: string | null
          tow_required?: boolean
          truck_id?: string | null
          updated_at?: string
          usdot_reportable?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accidents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accidents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accidents_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          client_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          action: string
          client_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          org_id?: string
          user_id: string
        }
        Update: {
          action?: string
          client_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_messages: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_log: {
        Row: {
          created_at: string
          id: string
          org_id: string
          permit_id: string
          rule_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id?: string
          permit_id: string
          rule_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          permit_id?: string
          rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_log_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          body: string
          channel: string
          created_at: string
          days_before: number
          enabled: boolean
          id: string
          name: string
          org_id: string
          subject: string | null
          template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          days_before?: number
          enabled?: boolean
          id?: string
          name: string
          org_id?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          days_before?: number
          enabled?: boolean
          id?: string
          name?: string
          org_id?: string
          subject?: string | null
          template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      client_internal_notes: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          org_id: string
          pinned: boolean
          updated_at: string
          user_id: string
          user_name: string
        }
        Insert: {
          body?: string
          client_id: string
          created_at?: string
          id?: string
          org_id?: string
          pinned?: boolean
          updated_at?: string
          user_id: string
          user_name?: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          org_id?: string
          pinned?: boolean
          updated_at?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_internal_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_internal_notes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_portal_users: {
        Row: {
          client_id: string
          created_at: string
          id: string
          org_id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          org_id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_portal_users_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_portal_users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          company_name: string
          country: string
          created_at: string
          dot: string | null
          ein: string | null
          email: string | null
          id: string
          mc: string | null
          mcs_150_last_filed_at: string | null
          new_entrant_start_at: string | null
          notes: string | null
          org_id: string
          phone: string | null
          psp_subscribed_at: string | null
          registration_responsible: string | null
          service_automatic: boolean
          service_ct: boolean
          service_ifta: boolean
          service_kyu: boolean
          service_nm: boolean
          service_ny: boolean
          status: string
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          company_name: string
          country?: string
          created_at?: string
          dot?: string | null
          ein?: string | null
          email?: string | null
          id?: string
          mc?: string | null
          mcs_150_last_filed_at?: string | null
          new_entrant_start_at?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          psp_subscribed_at?: string | null
          registration_responsible?: string | null
          service_automatic?: boolean
          service_ct?: boolean
          service_ifta?: boolean
          service_kyu?: boolean
          service_nm?: boolean
          service_ny?: boolean
          status?: string
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          company_name?: string
          country?: string
          created_at?: string
          dot?: string | null
          ein?: string | null
          email?: string | null
          id?: string
          mc?: string | null
          mcs_150_last_filed_at?: string | null
          new_entrant_start_at?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          psp_subscribed_at?: string | null
          registration_responsible?: string | null
          service_automatic?: boolean
          service_ct?: boolean
          service_ifta?: boolean
          service_kyu?: boolean
          service_nm?: boolean
          service_ny?: boolean
          status?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          org_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          org_id?: string
          user_id: string
          user_name: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          org_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_risk_scores: {
        Row: {
          band: string
          client_id: string
          computed_at: string
          factors: Json
          id: string
          org_id: string
          score: number
          scored_date: string
        }
        Insert: {
          band: string
          client_id: string
          computed_at?: string
          factors?: Json
          id?: string
          org_id?: string
          score: number
          scored_date?: string
        }
        Update: {
          band?: string
          client_id?: string
          computed_at?: string
          factors?: Json
          id?: string
          org_id?: string
          score?: number
          scored_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_risk_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_risk_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      csa_snapshots: {
        Row: {
          client_id: string
          controlled_substances: number | null
          crash_indicator: number | null
          created_at: string
          driver_fitness: number | null
          hazmat_compliance: number | null
          hours_of_service: number | null
          id: string
          measurement_period: string
          notes: string | null
          org_id: string
          unsafe_driving: number | null
          user_id: string
          vehicle_maintenance: number | null
        }
        Insert: {
          client_id: string
          controlled_substances?: number | null
          crash_indicator?: number | null
          created_at?: string
          driver_fitness?: number | null
          hazmat_compliance?: number | null
          hours_of_service?: number | null
          id?: string
          measurement_period: string
          notes?: string | null
          org_id?: string
          unsafe_driving?: number | null
          user_id: string
          vehicle_maintenance?: number | null
        }
        Update: {
          client_id?: string
          controlled_substances?: number | null
          crash_indicator?: number | null
          created_at?: string
          driver_fitness?: number | null
          hazmat_compliance?: number | null
          hours_of_service?: number | null
          id?: string
          measurement_period?: string
          notes?: string | null
          org_id?: string
          unsafe_driving?: number | null
          user_id?: string
          vehicle_maintenance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "csa_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csa_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          client_id: string
          created_at: string
          document_name: string
          id: string
          ip_address: string | null
          org_id: string
          permit_id: string | null
          signature_data: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          document_name: string
          id?: string
          ip_address?: string | null
          org_id?: string
          permit_id?: string | null
          signature_data: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          document_name?: string
          id?: string
          ip_address?: string | null
          org_id?: string
          permit_id?: string | null
          signature_data?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_signatures_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          created_at: string
          document_url: string | null
          driver_id: string
          expires_on: string | null
          id: string
          issued_on: string | null
          kind: string
          notes: string | null
          org_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_url?: string | null
          driver_id: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          kind: string
          notes?: string | null
          org_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_url?: string | null
          driver_id?: string
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          kind?: string
          notes?: string | null
          org_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          cdl_class: string | null
          cdl_endorsements: string | null
          cdl_expires_on: string | null
          cdl_issued_on: string | null
          cdl_number: string | null
          cdl_state: string | null
          client_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          medical_card_expires_on: string | null
          medical_examiner_name: string | null
          notes: string | null
          org_id: string
          phone: string | null
          ssn_last4: string | null
          status: string
          termination_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cdl_class?: string | null
          cdl_endorsements?: string | null
          cdl_expires_on?: string | null
          cdl_issued_on?: string | null
          cdl_number?: string | null
          cdl_state?: string | null
          client_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          medical_card_expires_on?: string | null
          medical_examiner_name?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          ssn_last4?: string | null
          status?: string
          termination_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cdl_class?: string | null
          cdl_endorsements?: string | null
          cdl_expires_on?: string | null
          cdl_issued_on?: string | null
          cdl_number?: string | null
          cdl_state?: string | null
          client_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          medical_card_expires_on?: string | null
          medical_examiner_name?: string | null
          notes?: string | null
          org_id?: string
          phone?: string | null
          ssn_last4?: string | null
          status?: string
          termination_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      drug_test_events: {
        Row: {
          collected_at: string | null
          created_at: string
          driver_id: string
          id: string
          mro_reviewed_at: string | null
          notes: string | null
          org_id: string
          result: string | null
          scheduled_for: string | null
          selection_for_quarter: string | null
          substance: string
          test_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collected_at?: string | null
          created_at?: string
          driver_id: string
          id?: string
          mro_reviewed_at?: string | null
          notes?: string | null
          org_id?: string
          result?: string | null
          scheduled_for?: string | null
          selection_for_quarter?: string | null
          substance?: string
          test_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collected_at?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          mro_reviewed_at?: string | null
          notes?: string | null
          org_id?: string
          result?: string | null
          scheduled_for?: string | null
          selection_for_quarter?: string | null
          substance?: string
          test_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_test_events_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_test_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      eld_connections: {
        Row: {
          api_key: string | null
          created_at: string
          created_by: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          org_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          org_id?: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          org_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eld_connections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      eld_sync_log: {
        Row: {
          finished_at: string | null
          hos_imported: number
          id: string
          message: string | null
          org_id: string
          provider: string
          started_at: string
          status: string
        }
        Insert: {
          finished_at?: string | null
          hos_imported?: number
          id?: string
          message?: string | null
          org_id: string
          provider: string
          started_at?: string
          status?: string
        }
        Update: {
          finished_at?: string | null
          hos_imported?: number
          id?: string
          message?: string | null
          org_id?: string
          provider?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "eld_sync_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fmcsa_snapshots: {
        Row: {
          carrier_operation: string | null
          client_id: string
          dot: string
          fetched_at: string
          id: string
          org_id: string
          raw: Json | null
          safety_rating: string | null
          status_code: string | null
          total_drivers: number | null
          total_power_units: number | null
        }
        Insert: {
          carrier_operation?: string | null
          client_id: string
          dot: string
          fetched_at?: string
          id?: string
          org_id: string
          raw?: Json | null
          safety_rating?: string | null
          status_code?: string | null
          total_drivers?: number | null
          total_power_units?: number | null
        }
        Update: {
          carrier_operation?: string | null
          client_id?: string
          dot?: string
          fetched_at?: string
          id?: string
          org_id?: string
          raw?: Json | null
          safety_rating?: string | null
          status_code?: string | null
          total_drivers?: number | null
          total_power_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fmcsa_snapshots_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fmcsa_snapshots_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      hos_violations: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          notes: string | null
          occurred_at: string
          org_id: string
          resolved_at: string | null
          rule_violated: string
          severity: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          notes?: string | null
          occurred_at: string
          org_id?: string
          resolved_at?: string | null
          rule_violated: string
          severity?: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          notes?: string | null
          occurred_at?: string
          org_id?: string
          resolved_at?: string | null
          rule_violated?: string
          severity?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hos_violations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hos_violations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hvut_filings: {
        Row: {
          client_id: string
          created_at: string
          filed_at: string | null
          first_used_month: string | null
          id: string
          irs_confirmation: string | null
          notes: string | null
          org_id: string
          schedule_1_url: string | null
          status: string
          suspended: boolean
          tax_amount: number | null
          tax_year: number
          taxable_gross_weight_lbs: number | null
          truck_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          filed_at?: string | null
          first_used_month?: string | null
          id?: string
          irs_confirmation?: string | null
          notes?: string | null
          org_id?: string
          schedule_1_url?: string | null
          status?: string
          suspended?: boolean
          tax_amount?: number | null
          tax_year: number
          taxable_gross_weight_lbs?: number | null
          truck_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          filed_at?: string | null
          first_used_month?: string | null
          id?: string
          irs_confirmation?: string | null
          notes?: string | null
          org_id?: string
          schedule_1_url?: string | null
          status?: string
          suspended?: boolean
          tax_amount?: number | null
          tax_year?: number
          taxable_gross_weight_lbs?: number | null
          truck_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hvut_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hvut_filings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hvut_filings_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      ifta_filings: {
        Row: {
          breakdown_by_jurisdiction: Json | null
          client_id: string
          created_at: string
          filed_at: string | null
          fleet_mpg: number | null
          id: string
          notes: string | null
          org_id: string
          quarter: string
          status: string
          total_gallons: number | null
          total_miles: number | null
          total_tax_due: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          breakdown_by_jurisdiction?: Json | null
          client_id: string
          created_at?: string
          filed_at?: string | null
          fleet_mpg?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          quarter: string
          status?: string
          total_gallons?: number | null
          total_miles?: number | null
          total_tax_due?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          breakdown_by_jurisdiction?: Json | null
          client_id?: string
          created_at?: string
          filed_at?: string | null
          fleet_mpg?: number | null
          id?: string
          notes?: string | null
          org_id?: string
          quarter?: string
          status?: string
          total_gallons?: number | null
          total_miles?: number | null
          total_tax_due?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifta_filings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifta_filings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ifta_fuel_purchases: {
        Row: {
          client_id: string
          created_at: string
          gallons: number
          gross_price: number | null
          id: string
          jurisdiction: string
          notes: string | null
          org_id: string
          purchase_date: string
          quarter: string
          receipt_url: string | null
          truck_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          gallons: number
          gross_price?: number | null
          id?: string
          jurisdiction: string
          notes?: string | null
          org_id?: string
          purchase_date: string
          quarter: string
          receipt_url?: string | null
          truck_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          gallons?: number
          gross_price?: number | null
          id?: string
          jurisdiction?: string
          notes?: string | null
          org_id?: string
          purchase_date?: string
          quarter?: string
          receipt_url?: string | null
          truck_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifta_fuel_purchases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifta_fuel_purchases_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifta_fuel_purchases_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      ifta_tax_rates: {
        Row: {
          created_at: string
          id: string
          jurisdiction: string
          org_id: string
          quarter: string
          rate_per_gallon: number
        }
        Insert: {
          created_at?: string
          id?: string
          jurisdiction: string
          org_id?: string
          quarter: string
          rate_per_gallon: number
        }
        Update: {
          created_at?: string
          id?: string
          jurisdiction?: string
          org_id?: string
          quarter?: string
          rate_per_gallon?: number
        }
        Relationships: [
          {
            foreignKeyName: "ifta_tax_rates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ifta_trips: {
        Row: {
          client_id: string
          created_at: string
          id: string
          miles_by_jurisdiction: Json
          notes: string | null
          org_id: string
          quarter: string
          total_miles: number
          trip_date: string
          truck_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          miles_by_jurisdiction?: Json
          notes?: string | null
          org_id?: string
          quarter: string
          total_miles?: number
          trip_date: string
          truck_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          miles_by_jurisdiction?: Json
          notes?: string | null
          org_id?: string
          quarter?: string
          total_miles?: number
          trip_date?: string
          truck_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ifta_trips_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifta_trips_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ifta_trips_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_certificates: {
        Row: {
          client_id: string
          coverage_amount: number | null
          created_at: string
          document_url: string | null
          effective_date: string | null
          expiration_date: string | null
          id: string
          insurer_name: string | null
          notes: string | null
          org_id: string
          policy_number: string | null
          policy_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          coverage_amount?: number | null
          created_at?: string
          document_url?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          insurer_name?: string | null
          notes?: string | null
          org_id?: string
          policy_number?: string | null
          policy_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          coverage_amount?: number | null
          created_at?: string
          document_url?: string | null
          effective_date?: string | null
          expiration_date?: string | null
          id?: string
          insurer_name?: string | null
          notes?: string | null
          org_id?: string
          policy_number?: string | null
          policy_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_certificates_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_certificates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          org_id: string
          paid_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          org_id?: string
          paid_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          org_id?: string
          paid_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      irp_jurisdiction_lines: {
        Row: {
          created_at: string
          fee: number | null
          id: string
          jurisdiction: string
          miles: number
          org_id: string
          percentage: number | null
          registration_id: string
        }
        Insert: {
          created_at?: string
          fee?: number | null
          id?: string
          jurisdiction: string
          miles?: number
          org_id?: string
          percentage?: number | null
          registration_id: string
        }
        Update: {
          created_at?: string
          fee?: number | null
          id?: string
          jurisdiction?: string
          miles?: number
          org_id?: string
          percentage?: number | null
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "irp_jurisdiction_lines_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irp_jurisdiction_lines_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "irp_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      irp_registrations: {
        Row: {
          base_jurisdiction: string
          client_id: string
          created_at: string
          filed_at: string | null
          fleet_size: number
          id: string
          notes: string | null
          org_id: string
          registration_year: number
          status: string
          total_fee: number | null
          total_fleet_miles: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_jurisdiction: string
          client_id: string
          created_at?: string
          filed_at?: string | null
          fleet_size?: number
          id?: string
          notes?: string | null
          org_id?: string
          registration_year: number
          status?: string
          total_fee?: number | null
          total_fleet_miles?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_jurisdiction?: string
          client_id?: string
          created_at?: string
          filed_at?: string | null
          fleet_size?: number
          id?: string
          notes?: string | null
          org_id?: string
          registration_year?: number
          status?: string
          total_fee?: number | null
          total_fleet_miles?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "irp_registrations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "irp_registrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          cost: number | null
          created_at: string
          document_url: string | null
          id: string
          mileage: number | null
          next_due_at: string | null
          notes: string | null
          org_id: string
          service_date: string
          service_type: string
          truck_id: string
          updated_at: string
          user_id: string
          vendor: string | null
        }
        Insert: {
          cost?: number | null
          created_at?: string
          document_url?: string | null
          id?: string
          mileage?: number | null
          next_due_at?: string | null
          notes?: string | null
          org_id?: string
          service_date: string
          service_type: string
          truck_id: string
          updated_at?: string
          user_id: string
          vendor?: string | null
        }
        Update: {
          cost?: number | null
          created_at?: string
          document_url?: string | null
          id?: string
          mileage?: number | null
          next_due_at?: string | null
          notes?: string | null
          org_id?: string
          service_date?: string
          service_type?: string
          truck_id?: string
          updated_at?: string
          user_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          name: string
          org_id: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          name: string
          org_id?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          name?: string
          org_id?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          id: string
          org_id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          org_id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          org_id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          approval_status: string
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          approval_status?: string
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          approval_status?: string
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          branding: Json
          created_at: string
          default_hourly_rate: number
          feature_flags: Json
          id: string
          is_master_org: boolean
          name: string
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          default_hourly_rate?: number
          feature_flags?: Json
          id?: string
          is_master_org?: boolean
          name: string
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          default_hourly_rate?: number
          feature_flags?: Json
          id?: string
          is_master_org?: boolean
          name?: string
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permit_documents: {
        Row: {
          created_at: string
          document_url: string
          file_name: string | null
          id: string
          is_current: boolean
          notes: string | null
          org_id: string
          permit_id: string
          user_id: string | null
          version: number
        }
        Insert: {
          created_at?: string
          document_url: string
          file_name?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          org_id?: string
          permit_id: string
          user_id?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          document_url?: string
          file_name?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          org_id?: string
          permit_id?: string
          user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "permit_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_documents_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permit_history: {
        Row: {
          change_type: string
          changed_by: string
          created_at: string
          id: string
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          org_id: string
          permit_id: string
        }
        Insert: {
          change_type: string
          changed_by: string
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          org_id?: string
          permit_id: string
        }
        Update: {
          change_type?: string
          changed_by?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          org_id?: string
          permit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permit_history_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permit_history_permit_id_fkey"
            columns: ["permit_id"]
            isOneToOne: false
            referencedRelation: "permits"
            referencedColumns: ["id"]
          },
        ]
      }
      permits: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          document_url: string | null
          expiration_date: string | null
          id: string
          metadata: Json
          notes: string | null
          org_id: string
          permit_number: string | null
          permit_type: string
          state: string | null
          status: string
          truck_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          org_id?: string
          permit_number?: string | null
          permit_type: string
          state?: string | null
          status?: string
          truck_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          document_url?: string | null
          expiration_date?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          org_id?: string
          permit_number?: string | null
          permit_type?: string
          state?: string | null
          status?: string
          truck_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permits_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_org_id: string | null
          approval_status: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          active_org_id?: string | null
          approval_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          active_org_id?: string | null
          approval_status?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_org_id_fkey"
            columns: ["active_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roadside_inspections: {
        Row: {
          client_id: string
          created_at: string
          csa_points: number
          document_url: string | null
          driver_id: string | null
          id: string
          inspection_date: string
          inspection_level: number | null
          inspector_id: string | null
          location: string | null
          notes: string | null
          org_id: string
          report_number: string | null
          result: string
          state: string | null
          truck_id: string | null
          updated_at: string
          user_id: string
          violations: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          csa_points?: number
          document_url?: string | null
          driver_id?: string | null
          id?: string
          inspection_date: string
          inspection_level?: number | null
          inspector_id?: string | null
          location?: string | null
          notes?: string | null
          org_id?: string
          report_number?: string | null
          result: string
          state?: string | null
          truck_id?: string | null
          updated_at?: string
          user_id: string
          violations?: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          csa_points?: number
          document_url?: string | null
          driver_id?: string | null
          id?: string
          inspection_date?: string
          inspection_level?: number | null
          inspector_id?: string | null
          location?: string | null
          notes?: string | null
          org_id?: string
          report_number?: string | null
          result?: string
          state?: string | null
          truck_id?: string | null
          updated_at?: string
          user_id?: string
          violations?: Json
        }
        Relationships: [
          {
            foreignKeyName: "roadside_inspections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_inspections_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_inspections_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roadside_inspections_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_filters: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          org_id: string
          page: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          org_id?: string
          page: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          org_id?: string
          page?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_filters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          org_id: string
          scope: string
          shared: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          org_id?: string
          scope: string
          shared?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          org_id?: string
          scope?: string
          shared?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_views_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          body: string
          channel: string
          client_id: string
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          next_retry_at: string | null
          org_id: string
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          client_id: string
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          next_retry_at?: string | null
          org_id?: string
          retry_count?: number
          scheduled_at: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          client_id?: string
          created_at?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          next_retry_at?: string | null
          org_id?: string
          retry_count?: number
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          name: string
          org_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          org_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          org_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      task_time_entries: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          logged_at: string
          minutes: number
          note: string | null
          org_id: string
          task_id: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          minutes: number
          note?: string | null
          org_id?: string
          task_id: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          logged_at?: string
          minutes?: number
          note?: string | null
          org_id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_time_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_entries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_time_entries_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          created_at: string
          due_date: string | null
          id: string
          name: string
          notes: string | null
          operator: string | null
          org_id: string
          priority: string | null
          status: string
          tags: string[] | null
          task_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          notes?: string | null
          operator?: string | null
          org_id?: string
          priority?: string | null
          status?: string
          tags?: string[] | null
          task_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          notes?: string | null
          operator?: string | null
          org_id?: string
          priority?: string | null
          status?: string
          tags?: string[] | null
          task_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          client_id: string
          created_at: string
          id: string
          make: string | null
          model: string | null
          notes: string | null
          org_id: string
          plate: string
          status: string
          taxable_gross_weight_lbs: number | null
          updated_at: string
          user_id: string
          vin: string | null
          year: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          org_id?: string
          plate: string
          status?: string
          taxable_gross_weight_lbs?: number | null
          updated_at?: string
          user_id: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          make?: string | null
          model?: string | null
          notes?: string | null
          org_id?: string
          plate?: string
          status?: string
          taxable_gross_weight_lbs?: number | null
          updated_at?: string
          user_id?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trucks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_risk_scores: {
        Row: {
          band: string | null
          client_id: string | null
          computed_at: string | null
          factors: Json | null
          id: string | null
          org_id: string | null
          score: number | null
          scored_date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_risk_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_risk_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      can_admin_user: { Args: { _target: string }; Returns: boolean }
      claim_pending_messages: {
        Args: { p_channel?: string; p_limit?: number }
        Returns: {
          body: string
          channel: string
          client_id: string
          created_at: string
          id: string
          last_error: string | null
          locked_at: string | null
          next_retry_at: string | null
          org_id: string
          retry_count: number
          scheduled_at: string
          sent_at: string | null
          status: string
          subject: string | null
          template_id: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_org_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      expire_trials: { Args: never; Returns: number }
      get_approval_status: { Args: { _user_id: string }; Returns: string }
      get_org_by_slug: {
        Args: { p_slug: string }
        Returns: {
          branding: Json
          id: string
          name: string
          slug: string
        }[]
      }
      get_org_by_hostname: {
        Args: { p_hostname: string }
        Returns: {
          branding: Json
          id: string
          name: string
          slug: string
        }[]
      }
      request_org_domain: {
        Args: { p_org_id: string; p_domain: string }
        Returns: {
          created_at: string
          domain: string
          id: string
          last_checked_at: string | null
          organization_id: string
          status: string
          updated_at: string
          verification_token: string
          verified_at: string | null
        }[]
      }
      get_portal_client_id: { Args: { _user_id: string }; Returns: string }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      invite_member: {
        Args: {
          p_email: string
          p_org_id: string
          p_role?: Database["public"]["Enums"]["org_role"]
        }
        Returns: Json
      }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_portal_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      list_org_members: {
        Args: { p_org_id: string }
        Returns: {
          approval_status: string
          email: string
          full_name: string
          joined_at: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }[]
      }
      peek_invitation: { Args: { p_token: string }; Returns: Json }
      public_create_org_with_owner: {
        Args: { p_country?: string; p_name: string; p_slug: string }
        Returns: string
      }
      recover_stuck_sending: { Args: never; Returns: number }
      revoke_invitation: {
        Args: { p_invitation_id: string }
        Returns: undefined
      }
      super_admin_create_org: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      super_admin_list_orgs: {
        Args: never
        Returns: {
          branding: Json
          client_count: number
          created_at: string
          feature_flags: Json
          id: string
          member_count: number
          name: string
          permit_count: number
          slug: string
          subscription_status: string
          truck_count: number
        }[]
      }
      super_admin_org_details: { Args: { p_org_id: string }; Returns: Json }
      super_admin_set_owner: {
        Args: { p_email: string; p_org_id: string }
        Returns: string
      }
      super_admin_update_org: {
        Args: { p_org_id: string; p_patch: Json }
        Returns: undefined
      }
      update_org_branding: {
        Args: { p_branding: Json; p_org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "operator" | "viewer"
      org_role: "owner" | "admin" | "member"
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
      app_role: ["admin", "user", "operator", "viewer"],
      org_role: ["owner", "admin", "member"],
    },
  },
} as const
