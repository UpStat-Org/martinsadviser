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
      accidents: {
      Row: {
        id: string
        org_id: string
        client_id: string
        truck_id: string | null
        driver_id: string | null
        user_id: string
        occurred_at: string
        location: string | null
        state: string | null
        fatalities: number
        injuries: number
        tow_required: boolean
        usdot_reportable: boolean | null
        severity: string
        fmcsa_report_number: string | null
        police_report_number: string | null
        narrative: string | null
        document_url: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        truck_id?: string | null
        driver_id?: string | null
        user_id: string
        occurred_at: string
        location?: string | null
        state?: string | null
        fatalities?: number
        injuries?: number
        tow_required?: boolean
        usdot_reportable?: boolean | null
        severity?: string
        fmcsa_report_number?: string | null
        police_report_number?: string | null
        narrative?: string | null
        document_url?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        truck_id?: string | null
        driver_id?: string | null
        user_id?: string
        occurred_at?: string
        location?: string | null
        state?: string | null
        fatalities?: number
        injuries?: number
        tow_required?: boolean
        usdot_reportable?: boolean | null
        severity?: string
        fmcsa_report_number?: string | null
        police_report_number?: string | null
        narrative?: string | null
        document_url?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "accidents_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "accidents_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "accidents_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "accidents_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      activity_log: {
      Row: {
        id: string
        user_id: string
        client_id: string | null
        entity_type: string
        entity_id: string | null
        action: string
        details: Json | null
        created_at: string
        org_id: string
      }
      Insert: {
        id?: string
        user_id: string
        client_id?: string | null
        entity_type: string
        entity_id?: string | null
        action: string
        details?: Json | null
        created_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        user_id?: string
        client_id?: string | null
        entity_type?: string
        entity_id?: string | null
        action?: string
        details?: Json | null
        created_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "activity_log_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "activity_log_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      ai_briefings: {
      Row: {
        id: string
        org_id: string
        user_id: string
        briefing_date: string
        signals_hash: string
        payload: Json
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id: string
        user_id: string
        briefing_date?: string
        signals_hash: string
        payload: Json
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        briefing_date?: string
        signals_hash?: string
        payload?: Json
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "ai_briefings_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "ai_briefings_user_id_fkey"
          columns: ["{", "u", "s", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      ai_chat_messages: {
      Row: {
        id: string
        client_id: string
        user_id: string | null
        role: string
        content: string
        created_at: string
        org_id: string
      }
      Insert: {
        id?: string
        client_id: string
        user_id?: string | null
        role?: string
        content?: string
        created_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        client_id?: string
        user_id?: string | null
        role?: string
        content?: string
        created_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "ai_chat_messages_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "ai_chat_messages_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      automation_log: {
      Row: {
        id: string
        rule_id: string
        permit_id: string
        created_at: string
        org_id: string
      }
      Insert: {
        id?: string
        rule_id: string
        permit_id: string
        created_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        rule_id?: string
        permit_id?: string
        created_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "automation_log_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "automation_log_permit_id_fkey"
          columns: ["{", "p", "e", "r", "m", "i", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "permits"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "automation_log_rule_id_fkey"
          columns: ["{", "r", "u", "l", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "automation_rules"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      automation_rules: {
      Row: {
        id: string
        user_id: string
        name: string
        days_before: number
        channel: string
        template_id: string | null
        subject: string | null
        body: string
        enabled: boolean
        created_at: string
        updated_at: string
        org_id: string
      }
      Insert: {
        id?: string
        user_id: string
        name: string
        days_before?: number
        channel?: string
        template_id?: string | null
        subject?: string | null
        body: string
        enabled?: boolean
        created_at?: string
        updated_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        user_id?: string
        name?: string
        days_before?: number
        channel?: string
        template_id?: string | null
        subject?: string | null
        body?: string
        enabled?: boolean
        created_at?: string
        updated_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "automation_rules_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "automation_rules_template_id_fkey"
          columns: ["{", "t", "e", "m", "p", "l", "a", "t", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "message_templates"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      br_compliance_items: {
      Row: {
        id: string
        org_id: string
        user_id: string
        scope: string
        driver_id: string | null
        truck_id: string | null
        client_id: string | null
        kind: string
        document_number: string | null
        issued_on: string | null
        expires_on: string | null
        document_url: string | null
        notes: string | null
        metadata: Json
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id?: string
        scope: string
        driver_id?: string | null
        truck_id?: string | null
        client_id?: string | null
        kind: string
        document_number?: string | null
        issued_on?: string | null
        expires_on?: string | null
        document_url?: string | null
        notes?: string | null
        metadata?: Json
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        scope?: string
        driver_id?: string | null
        truck_id?: string | null
        client_id?: string | null
        kind?: string
        document_number?: string | null
        issued_on?: string | null
        expires_on?: string | null
        document_url?: string | null
        notes?: string | null
        metadata?: Json
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "br_compliance_items_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "br_compliance_items_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "br_compliance_items_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "br_compliance_items_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      br_fines: {
      Row: {
        id: string
        org_id: string
        user_id: string
        client_id: string | null
        driver_id: string | null
        truck_id: string | null
        notice_number: string | null
        authority: string | null
        infraction_code: string | null
        description: string | null
        severity: string
        points: number
        amount: number
        occurred_at: string | null
        notified_on: string | null
        defense_due_on: string | null
        payment_due_on: string | null
        status: string
        document_url: string | null
        notes: string | null
        metadata: Json
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id?: string
        client_id?: string | null
        driver_id?: string | null
        truck_id?: string | null
        notice_number?: string | null
        authority?: string | null
        infraction_code?: string | null
        description?: string | null
        severity?: string
        points?: number
        amount?: number
        occurred_at?: string | null
        notified_on?: string | null
        defense_due_on?: string | null
        payment_due_on?: string | null
        status?: string
        document_url?: string | null
        notes?: string | null
        metadata?: Json
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        client_id?: string | null
        driver_id?: string | null
        truck_id?: string | null
        notice_number?: string | null
        authority?: string | null
        infraction_code?: string | null
        description?: string | null
        severity?: string
        points?: number
        amount?: number
        occurred_at?: string | null
        notified_on?: string | null
        defense_due_on?: string | null
        payment_due_on?: string | null
        status?: string
        document_url?: string | null
        notes?: string | null
        metadata?: Json
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "br_fines_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "br_fines_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "br_fines_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "br_fines_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      client_internal_notes: {
      Row: {
        id: string
        client_id: string
        user_id: string
        user_name: string
        body: string
        pinned: boolean
        created_at: string
        updated_at: string
        org_id: string
      }
      Insert: {
        id?: string
        client_id: string
        user_id: string
        user_name?: string
        body?: string
        pinned?: boolean
        created_at?: string
        updated_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        client_id?: string
        user_id?: string
        user_name?: string
        body?: string
        pinned?: boolean
        created_at?: string
        updated_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "client_internal_notes_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "client_internal_notes_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      client_portal_users: {
      Row: {
        id: string
        user_id: string
        client_id: string
        created_at: string
        org_id: string
        initial_password_encrypted: string | null
        access_token: string | null
        access_token_expires_at: string | null
      }
      Insert: {
        id?: string
        user_id: string
        client_id: string
        created_at?: string
        org_id?: string
        initial_password_encrypted?: string | null
        access_token?: string | null
        access_token_expires_at?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        client_id?: string
        created_at?: string
        org_id?: string
        initial_password_encrypted?: string | null
        access_token?: string | null
        access_token_expires_at?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "client_portal_users_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "client_portal_users_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "client_portal_users_user_id_fkey"
          columns: ["{", "u", "s", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      clients: {
      Row: {
        id: string
        user_id: string
        company_name: string
        phone: string | null
        email: string | null
        address: string | null
        ein: string | null
        dot: string | null
        mc: string | null
        status: string
        service_ifta: boolean
        service_ct: boolean
        service_ny: boolean
        service_kyu: boolean
        service_nm: boolean
        service_automatic: boolean
        notes: string | null
        created_at: string
        updated_at: string
        registration_responsible: string | null
        org_id: string
        country: string
        mcs_150_last_filed_at: string | null
        new_entrant_start_at: string | null
        psp_subscribed_at: string | null
        tags: string[]
        cnpj: string | null
        inscricao_estadual: string | null
      }
      Insert: {
        id?: string
        user_id: string
        company_name: string
        phone?: string | null
        email?: string | null
        address?: string | null
        ein?: string | null
        dot?: string | null
        mc?: string | null
        status?: string
        service_ifta?: boolean
        service_ct?: boolean
        service_ny?: boolean
        service_kyu?: boolean
        service_nm?: boolean
        service_automatic?: boolean
        notes?: string | null
        created_at?: string
        updated_at?: string
        registration_responsible?: string | null
        org_id?: string
        country?: string
        mcs_150_last_filed_at?: string | null
        new_entrant_start_at?: string | null
        psp_subscribed_at?: string | null
        tags?: string[]
        cnpj?: string | null
        inscricao_estadual?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        company_name?: string
        phone?: string | null
        email?: string | null
        address?: string | null
        ein?: string | null
        dot?: string | null
        mc?: string | null
        status?: string
        service_ifta?: boolean
        service_ct?: boolean
        service_ny?: boolean
        service_kyu?: boolean
        service_nm?: boolean
        service_automatic?: boolean
        notes?: string | null
        created_at?: string
        updated_at?: string
        registration_responsible?: string | null
        org_id?: string
        country?: string
        mcs_150_last_filed_at?: string | null
        new_entrant_start_at?: string | null
        psp_subscribed_at?: string | null
        tags?: string[]
        cnpj?: string | null
        inscricao_estadual?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "clients_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "clients_user_id_fkey"
          columns: ["{", "u", "s", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      comments: {
      Row: {
        id: string
        entity_type: string
        entity_id: string
        user_id: string
        user_name: string
        body: string
        created_at: string
        org_id: string
      }
      Insert: {
        id?: string
        entity_type: string
        entity_id: string
        user_id: string
        user_name: string
        body: string
        created_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        entity_type?: string
        entity_id?: string
        user_id?: string
        user_name?: string
        body?: string
        created_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "comments_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      compliance_automation_settings: {
      Row: {
        org_id: string
        enabled: boolean
        lead_days: number
        ifta_enabled: boolean
        kyu_enabled: boolean
        nm_enabled: boolean
        hvut_enabled: boolean
        ucr_enabled: boolean
        mcs150_enabled: boolean
        notify: boolean
        created_at: string
        updated_at: string
        driver_enabled: boolean
      }
      Insert: {
        org_id: string
        enabled?: boolean
        lead_days?: number
        ifta_enabled?: boolean
        kyu_enabled?: boolean
        nm_enabled?: boolean
        hvut_enabled?: boolean
        ucr_enabled?: boolean
        mcs150_enabled?: boolean
        notify?: boolean
        created_at?: string
        updated_at?: string
        driver_enabled?: boolean
      }
      Update: {
        org_id?: string
        enabled?: boolean
        lead_days?: number
        ifta_enabled?: boolean
        kyu_enabled?: boolean
        nm_enabled?: boolean
        hvut_enabled?: boolean
        ucr_enabled?: boolean
        mcs150_enabled?: boolean
        notify?: boolean
        created_at?: string
        updated_at?: string
        driver_enabled?: boolean
      }
      Relationships: [
        {
          foreignKeyName: "compliance_automation_settings_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      compliance_risk_scores: {
      Row: {
        id: string
        org_id: string
        client_id: string
        scored_date: string
        score: number
        band: string
        factors: Json
        computed_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        scored_date?: string
        score: number
        band: string
        factors?: Json
        computed_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        scored_date?: string
        score?: number
        band?: string
        factors?: Json
        computed_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "compliance_risk_scores_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "compliance_risk_scores_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      compliance_task_log: {
      Row: {
        id: string
        org_id: string
        client_id: string | null
        truck_id: string | null
        kind: string
        due_date: string
        task_id: string | null
        dedupe_key: string
        created_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id?: string | null
        truck_id?: string | null
        kind: string
        due_date: string
        task_id?: string | null
        dedupe_key: string
        created_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string | null
        truck_id?: string | null
        kind?: string
        due_date?: string
        task_id?: string | null
        dedupe_key?: string
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "compliance_task_log_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "compliance_task_log_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "compliance_task_log_task_id_fkey"
          columns: ["{", "t", "a", "s", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "tasks"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "compliance_task_log_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      csa_snapshots: {
      Row: {
        id: string
        org_id: string
        client_id: string
        user_id: string
        measurement_period: string
        unsafe_driving: number | null
        hours_of_service: number | null
        driver_fitness: number | null
        controlled_substances: number | null
        vehicle_maintenance: number | null
        hazmat_compliance: number | null
        crash_indicator: number | null
        notes: string | null
        created_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        user_id: string
        measurement_period: string
        unsafe_driving?: number | null
        hours_of_service?: number | null
        driver_fitness?: number | null
        controlled_substances?: number | null
        vehicle_maintenance?: number | null
        hazmat_compliance?: number | null
        crash_indicator?: number | null
        notes?: string | null
        created_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        user_id?: string
        measurement_period?: string
        unsafe_driving?: number | null
        hours_of_service?: number | null
        driver_fitness?: number | null
        controlled_substances?: number | null
        vehicle_maintenance?: number | null
        hazmat_compliance?: number | null
        crash_indicator?: number | null
        notes?: string | null
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "csa_snapshots_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "csa_snapshots_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      document_signatures: {
      Row: {
        id: string
        user_id: string
        client_id: string
        permit_id: string | null
        document_name: string
        signer_name: string
        signer_email: string | null
        signature_data: string
        signed_at: string
        ip_address: string | null
        created_at: string
        org_id: string
        service_order_id: string | null
        checklist_item_id: string | null
      }
      Insert: {
        id?: string
        user_id: string
        client_id: string
        permit_id?: string | null
        document_name: string
        signer_name: string
        signer_email?: string | null
        signature_data: string
        signed_at?: string
        ip_address?: string | null
        created_at?: string
        org_id?: string
        service_order_id?: string | null
        checklist_item_id?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        client_id?: string
        permit_id?: string | null
        document_name?: string
        signer_name?: string
        signer_email?: string | null
        signature_data?: string
        signed_at?: string
        ip_address?: string | null
        created_at?: string
        org_id?: string
        service_order_id?: string | null
        checklist_item_id?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "document_signatures_checklist_item_id_fkey"
          columns: ["{", "c", "h", "e", "c", "k", "l", "i", "s", "t", "_", "i", "t", "e", "m", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "service_order_checklist_items"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "document_signatures_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "document_signatures_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "document_signatures_permit_id_fkey"
          columns: ["{", "p", "e", "r", "m", "i", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "permits"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "document_signatures_service_order_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "o", "r", "d", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "service_orders"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      driver_documents: {
      Row: {
        id: string
        org_id: string
        driver_id: string
        user_id: string
        kind: string
        document_url: string | null
        issued_on: string | null
        expires_on: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        driver_id: string
        user_id: string
        kind: string
        document_url?: string | null
        issued_on?: string | null
        expires_on?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        driver_id?: string
        user_id?: string
        kind?: string
        document_url?: string | null
        issued_on?: string | null
        expires_on?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "driver_documents_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "driver_documents_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      drivers: {
      Row: {
        id: string
        org_id: string
        client_id: string
        user_id: string
        full_name: string
        date_of_birth: string | null
        ssn_last4: string | null
        phone: string | null
        email: string | null
        cdl_number: string | null
        cdl_state: string | null
        cdl_class: string | null
        cdl_endorsements: string | null
        cdl_issued_on: string | null
        cdl_expires_on: string | null
        medical_card_expires_on: string | null
        medical_examiner_name: string | null
        hire_date: string | null
        termination_date: string | null
        status: string
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        user_id: string
        full_name: string
        date_of_birth?: string | null
        ssn_last4?: string | null
        phone?: string | null
        email?: string | null
        cdl_number?: string | null
        cdl_state?: string | null
        cdl_class?: string | null
        cdl_endorsements?: string | null
        cdl_issued_on?: string | null
        cdl_expires_on?: string | null
        medical_card_expires_on?: string | null
        medical_examiner_name?: string | null
        hire_date?: string | null
        termination_date?: string | null
        status?: string
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        user_id?: string
        full_name?: string
        date_of_birth?: string | null
        ssn_last4?: string | null
        phone?: string | null
        email?: string | null
        cdl_number?: string | null
        cdl_state?: string | null
        cdl_class?: string | null
        cdl_endorsements?: string | null
        cdl_issued_on?: string | null
        cdl_expires_on?: string | null
        medical_card_expires_on?: string | null
        medical_examiner_name?: string | null
        hire_date?: string | null
        termination_date?: string | null
        status?: string
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "drivers_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "drivers_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      drug_test_events: {
      Row: {
        id: string
        org_id: string
        driver_id: string
        user_id: string
        test_type: string
        substance: string
        selection_for_quarter: string | null
        scheduled_for: string | null
        collected_at: string | null
        result: string | null
        mro_reviewed_at: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        driver_id: string
        user_id: string
        test_type: string
        substance?: string
        selection_for_quarter?: string | null
        scheduled_for?: string | null
        collected_at?: string | null
        result?: string | null
        mro_reviewed_at?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        driver_id?: string
        user_id?: string
        test_type?: string
        substance?: string
        selection_for_quarter?: string | null
        scheduled_for?: string | null
        collected_at?: string | null
        result?: string | null
        mro_reviewed_at?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "drug_test_events_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "drug_test_events_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      dunning_log: {
      Row: {
        id: string
        org_id: string
        invoice_id: string
        stage: number
        enqueued: boolean
        created_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        invoice_id: string
        stage: number
        enqueued?: boolean
        created_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        invoice_id?: string
        stage?: number
        enqueued?: boolean
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "dunning_log_invoice_id_fkey"
          columns: ["{", "i", "n", "v", "o", "i", "c", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "invoices"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "dunning_log_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      dunning_settings: {
      Row: {
        org_id: string
        enabled: boolean
        auto_send: boolean
        stage_days: number[]
        channels: string[]
        subject: string
        body: string
        created_at: string
        updated_at: string
      }
      Insert: {
        org_id: string
        enabled?: boolean
        auto_send?: boolean
        stage_days?: number[]
        channels?: string[]
        subject?: string
        body?: string
        created_at?: string
        updated_at?: string
      }
      Update: {
        org_id?: string
        enabled?: boolean
        auto_send?: boolean
        stage_days?: number[]
        channels?: string[]
        subject?: string
        body?: string
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "dunning_settings_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      eld_connections: {
      Row: {
        id: string
        org_id: string
        provider: string
        api_key: string | null
        status: string
        last_sync_at: string | null
        last_error: string | null
        created_by: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        provider: string
        api_key?: string | null
        status?: string
        last_sync_at?: string | null
        last_error?: string | null
        created_by?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        provider?: string
        api_key?: string | null
        status?: string
        last_sync_at?: string | null
        last_error?: string | null
        created_by?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "eld_connections_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      eld_driver_matches: {
      Row: {
        id: string
        org_id: string
        provider: string
        external_key: string
        external_email: string | null
        external_name: string | null
        driver_id: string | null
        status: string
        violations_pending: number
        last_seen_at: string
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        provider: string
        external_key: string
        external_email?: string | null
        external_name?: string | null
        driver_id?: string | null
        status?: string
        violations_pending?: number
        last_seen_at?: string
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        provider?: string
        external_key?: string
        external_email?: string | null
        external_name?: string | null
        driver_id?: string | null
        status?: string
        violations_pending?: number
        last_seen_at?: string
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "eld_driver_matches_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "eld_driver_matches_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      eld_sync_log: {
      Row: {
        id: string
        org_id: string
        provider: string
        started_at: string
        finished_at: string | null
        hos_imported: number
        status: string
        message: string | null
      }
      Insert: {
        id?: string
        org_id: string
        provider: string
        started_at?: string
        finished_at?: string | null
        hos_imported?: number
        status?: string
        message?: string | null
      }
      Update: {
        id?: string
        org_id?: string
        provider?: string
        started_at?: string
        finished_at?: string | null
        hos_imported?: number
        status?: string
        message?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "eld_sync_log_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      expenses: {
      Row: {
        id: string
        org_id: string
        user_id: string
        client_id: string | null
        invoice_id: string | null
        category: string
        amount: number
        description: string | null
        incurred_on: string
        billable: boolean
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id?: string
        client_id?: string | null
        invoice_id?: string | null
        category?: string
        amount?: number
        description?: string | null
        incurred_on?: string
        billable?: boolean
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        client_id?: string | null
        invoice_id?: string | null
        category?: string
        amount?: number
        description?: string | null
        incurred_on?: string
        billable?: boolean
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "expenses_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "expenses_invoice_id_fkey"
          columns: ["{", "i", "n", "v", "o", "i", "c", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "invoices"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "expenses_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      fmcsa_snapshots: {
      Row: {
        id: string
        org_id: string
        client_id: string
        dot: string
        safety_rating: string | null
        status_code: string | null
        total_drivers: number | null
        total_power_units: number | null
        carrier_operation: string | null
        raw: Json | null
        fetched_at: string
      }
      Insert: {
        id?: string
        org_id: string
        client_id: string
        dot: string
        safety_rating?: string | null
        status_code?: string | null
        total_drivers?: number | null
        total_power_units?: number | null
        carrier_operation?: string | null
        raw?: Json | null
        fetched_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        dot?: string
        safety_rating?: string | null
        status_code?: string | null
        total_drivers?: number | null
        total_power_units?: number | null
        carrier_operation?: string | null
        raw?: Json | null
        fetched_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "fmcsa_snapshots_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "fmcsa_snapshots_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      google_calendar_tokens: {
      Row: {
        id: string
        user_id: string
        access_token: string
        refresh_token: string
        expires_at: string
        calendar_id: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        user_id: string
        access_token: string
        refresh_token: string
        expires_at: string
        calendar_id?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        user_id?: string
        access_token?: string
        refresh_token?: string
        expires_at?: string
        calendar_id?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: []
      }
      hos_violations: {
      Row: {
        id: string
        org_id: string
        driver_id: string
        user_id: string
        occurred_at: string
        rule_violated: string
        severity: string
        source: string
        resolved_at: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        driver_id: string
        user_id: string
        occurred_at: string
        rule_violated: string
        severity?: string
        source?: string
        resolved_at?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        driver_id?: string
        user_id?: string
        occurred_at?: string
        rule_violated?: string
        severity?: string
        source?: string
        resolved_at?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "hos_violations_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "hos_violations_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      hvut_filings: {
      Row: {
        id: string
        org_id: string
        truck_id: string
        client_id: string
        user_id: string
        tax_year: number
        first_used_month: string | null
        taxable_gross_weight_lbs: number | null
        suspended: boolean
        tax_amount: number | null
        status: string
        filed_at: string | null
        irs_confirmation: string | null
        schedule_1_url: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        truck_id: string
        client_id: string
        user_id: string
        tax_year: number
        first_used_month?: string | null
        taxable_gross_weight_lbs?: number | null
        suspended?: boolean
        tax_amount?: number | null
        status?: string
        filed_at?: string | null
        irs_confirmation?: string | null
        schedule_1_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        truck_id?: string
        client_id?: string
        user_id?: string
        tax_year?: number
        first_used_month?: string | null
        taxable_gross_weight_lbs?: number | null
        suspended?: boolean
        tax_amount?: number | null
        status?: string
        filed_at?: string | null
        irs_confirmation?: string | null
        schedule_1_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "hvut_filings_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "hvut_filings_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "hvut_filings_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      ifta_filings: {
      Row: {
        id: string
        org_id: string
        client_id: string
        user_id: string
        quarter: string
        total_miles: number | null
        total_gallons: number | null
        fleet_mpg: number | null
        breakdown_by_jurisdiction: Json | null
        total_tax_due: number | null
        status: string
        filed_at: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        user_id: string
        quarter: string
        total_miles?: number | null
        total_gallons?: number | null
        fleet_mpg?: number | null
        breakdown_by_jurisdiction?: Json | null
        total_tax_due?: number | null
        status?: string
        filed_at?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        user_id?: string
        quarter?: string
        total_miles?: number | null
        total_gallons?: number | null
        fleet_mpg?: number | null
        breakdown_by_jurisdiction?: Json | null
        total_tax_due?: number | null
        status?: string
        filed_at?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "ifta_filings_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "ifta_filings_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      ifta_fuel_purchases: {
      Row: {
        id: string
        org_id: string
        client_id: string
        truck_id: string | null
        user_id: string
        purchase_date: string
        quarter: string
        jurisdiction: string
        gallons: number
        gross_price: number | null
        receipt_url: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        truck_id?: string | null
        user_id: string
        purchase_date: string
        quarter: string
        jurisdiction: string
        gallons: number
        gross_price?: number | null
        receipt_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        truck_id?: string | null
        user_id?: string
        purchase_date?: string
        quarter?: string
        jurisdiction?: string
        gallons?: number
        gross_price?: number | null
        receipt_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "ifta_fuel_purchases_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "ifta_fuel_purchases_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "ifta_fuel_purchases_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      ifta_tax_rates: {
      Row: {
        id: string
        org_id: string
        quarter: string
        jurisdiction: string
        rate_per_gallon: number
        created_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        quarter: string
        jurisdiction: string
        rate_per_gallon: number
        created_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        quarter?: string
        jurisdiction?: string
        rate_per_gallon?: number
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "ifta_tax_rates_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      ifta_trips: {
      Row: {
        id: string
        org_id: string
        client_id: string
        truck_id: string | null
        user_id: string
        trip_date: string
        quarter: string
        total_miles: number
        miles_by_jurisdiction: Json
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        truck_id?: string | null
        user_id: string
        trip_date: string
        quarter: string
        total_miles?: number
        miles_by_jurisdiction?: Json
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        truck_id?: string | null
        user_id?: string
        trip_date?: string
        quarter?: string
        total_miles?: number
        miles_by_jurisdiction?: Json
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "ifta_trips_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "ifta_trips_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "ifta_trips_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      insurance_certificates: {
      Row: {
        id: string
        org_id: string
        client_id: string
        user_id: string
        policy_type: string
        policy_number: string | null
        insurer_name: string | null
        coverage_amount: number | null
        effective_date: string | null
        expiration_date: string | null
        document_url: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        user_id: string
        policy_type: string
        policy_number?: string | null
        insurer_name?: string | null
        coverage_amount?: number | null
        effective_date?: string | null
        expiration_date?: string | null
        document_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        user_id?: string
        policy_type?: string
        policy_number?: string | null
        insurer_name?: string | null
        coverage_amount?: number | null
        effective_date?: string | null
        expiration_date?: string | null
        document_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "insurance_certificates_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "insurance_certificates_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      invoices: {
      Row: {
        id: string
        user_id: string
        client_id: string
        amount: number
        status: string
        due_date: string
        paid_date: string | null
        description: string | null
        created_at: string
        updated_at: string
        org_id: string
        stripe_checkout_session_id: string | null
        stripe_payment_intent_id: string | null
        paid_via: string | null
      }
      Insert: {
        id?: string
        user_id: string
        client_id: string
        amount?: number
        status?: string
        due_date: string
        paid_date?: string | null
        description?: string | null
        created_at?: string
        updated_at?: string
        org_id?: string
        stripe_checkout_session_id?: string | null
        stripe_payment_intent_id?: string | null
        paid_via?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        client_id?: string
        amount?: number
        status?: string
        due_date?: string
        paid_date?: string | null
        description?: string | null
        created_at?: string
        updated_at?: string
        org_id?: string
        stripe_checkout_session_id?: string | null
        stripe_payment_intent_id?: string | null
        paid_via?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "invoices_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "invoices_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      irp_jurisdiction_lines: {
      Row: {
        id: string
        org_id: string
        registration_id: string
        jurisdiction: string
        miles: number
        percentage: number | null
        fee: number | null
        created_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        registration_id: string
        jurisdiction: string
        miles?: number
        percentage?: number | null
        fee?: number | null
        created_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        registration_id?: string
        jurisdiction?: string
        miles?: number
        percentage?: number | null
        fee?: number | null
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "irp_jurisdiction_lines_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "irp_jurisdiction_lines_registration_id_fkey"
          columns: ["{", "r", "e", "g", "i", "s", "t", "r", "a", "t", "i", "o", "n", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "irp_registrations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      irp_registrations: {
      Row: {
        id: string
        org_id: string
        client_id: string
        user_id: string
        registration_year: number
        base_jurisdiction: string
        total_fleet_miles: number
        fleet_size: number
        status: string
        filed_at: string | null
        total_fee: number | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        user_id: string
        registration_year: number
        base_jurisdiction: string
        total_fleet_miles?: number
        fleet_size?: number
        status?: string
        filed_at?: string | null
        total_fee?: number | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        user_id?: string
        registration_year?: number
        base_jurisdiction?: string
        total_fleet_miles?: number
        fleet_size?: number
        status?: string
        filed_at?: string | null
        total_fee?: number | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "irp_registrations_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "irp_registrations_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      leads: {
      Row: {
        id: string
        org_id: string
        user_id: string
        company_name: string
        contact_name: string | null
        email: string | null
        phone: string | null
        dot: string | null
        mc: string | null
        stage: string
        source: string | null
        estimated_value: number | null
        notes: string | null
        assigned_to: string | null
        converted_client_id: string | null
        lost_reason: string | null
        position: number
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id?: string
        company_name: string
        contact_name?: string | null
        email?: string | null
        phone?: string | null
        dot?: string | null
        mc?: string | null
        stage?: string
        source?: string | null
        estimated_value?: number | null
        notes?: string | null
        assigned_to?: string | null
        converted_client_id?: string | null
        lost_reason?: string | null
        position?: number
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        company_name?: string
        contact_name?: string | null
        email?: string | null
        phone?: string | null
        dot?: string | null
        mc?: string | null
        stage?: string
        source?: string | null
        estimated_value?: number | null
        notes?: string | null
        assigned_to?: string | null
        converted_client_id?: string | null
        lost_reason?: string | null
        position?: number
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "leads_converted_client_id_fkey"
          columns: ["{", "c", "o", "n", "v", "e", "r", "t", "e", "d", "_", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "leads_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      load_documents: {
      Row: {
        id: string
        org_id: string
        load_id: string
        user_id: string | null
        kind: string
        document_url: string
        file_name: string | null
        notes: string | null
        created_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        load_id: string
        user_id?: string | null
        kind?: string
        document_url: string
        file_name?: string | null
        notes?: string | null
        created_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        load_id?: string
        user_id?: string | null
        kind?: string
        document_url?: string
        file_name?: string | null
        notes?: string | null
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "load_documents_load_id_fkey"
          columns: ["{", "l", "o", "a", "d", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "loads"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "load_documents_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "load_documents_user_id_fkey"
          columns: ["{", "u", "s", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      load_stops: {
      Row: {
        id: string
        org_id: string
        load_id: string
        position: number
        kind: string
        company_name: string | null
        address: string | null
        city: string | null
        region: string | null
        postal_code: string | null
        country: string | null
        window_start: string | null
        window_end: string | null
        arrived_at: string | null
        departed_at: string | null
        contact_name: string | null
        contact_phone: string | null
        reference: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        load_id: string
        position?: number
        kind?: string
        company_name?: string | null
        address?: string | null
        city?: string | null
        region?: string | null
        postal_code?: string | null
        country?: string | null
        window_start?: string | null
        window_end?: string | null
        arrived_at?: string | null
        departed_at?: string | null
        contact_name?: string | null
        contact_phone?: string | null
        reference?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        load_id?: string
        position?: number
        kind?: string
        company_name?: string | null
        address?: string | null
        city?: string | null
        region?: string | null
        postal_code?: string | null
        country?: string | null
        window_start?: string | null
        window_end?: string | null
        arrived_at?: string | null
        departed_at?: string | null
        contact_name?: string | null
        contact_phone?: string | null
        reference?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "load_stops_load_id_fkey"
          columns: ["{", "l", "o", "a", "d", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "loads"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "load_stops_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      loads: {
      Row: {
        id: string
        org_id: string
        user_id: string
        client_id: string
        truck_id: string | null
        driver_id: string | null
        invoice_id: string | null
        reference: string | null
        status: string
        origin_city: string | null
        origin_region: string | null
        destination_city: string | null
        destination_region: string | null
        pickup_at: string | null
        delivery_at: string | null
        rate: number
        distance: number | null
        distance_unit: string
        commodity: string | null
        weight: number | null
        weight_unit: string
        notes: string | null
        metadata: Json
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id?: string
        client_id: string
        truck_id?: string | null
        driver_id?: string | null
        invoice_id?: string | null
        reference?: string | null
        status?: string
        origin_city?: string | null
        origin_region?: string | null
        destination_city?: string | null
        destination_region?: string | null
        pickup_at?: string | null
        delivery_at?: string | null
        rate?: number
        distance?: number | null
        distance_unit?: string
        commodity?: string | null
        weight?: number | null
        weight_unit?: string
        notes?: string | null
        metadata?: Json
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        client_id?: string
        truck_id?: string | null
        driver_id?: string | null
        invoice_id?: string | null
        reference?: string | null
        status?: string
        origin_city?: string | null
        origin_region?: string | null
        destination_city?: string | null
        destination_region?: string | null
        pickup_at?: string | null
        delivery_at?: string | null
        rate?: number
        distance?: number | null
        distance_unit?: string
        commodity?: string | null
        weight?: number | null
        weight_unit?: string
        notes?: string | null
        metadata?: Json
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "loads_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "loads_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "loads_invoice_id_fkey"
          columns: ["{", "i", "n", "v", "o", "i", "c", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "invoices"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "loads_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "loads_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      maintenance_records: {
      Row: {
        id: string
        org_id: string
        truck_id: string
        user_id: string
        service_date: string
        service_type: string
        mileage: number | null
        vendor: string | null
        cost: number | null
        next_due_at: string | null
        document_url: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        truck_id: string
        user_id: string
        service_date: string
        service_type: string
        mileage?: number | null
        vendor?: string | null
        cost?: number | null
        next_due_at?: string | null
        document_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        truck_id?: string
        user_id?: string
        service_date?: string
        service_type?: string
        mileage?: number | null
        vendor?: string | null
        cost?: number | null
        next_due_at?: string | null
        document_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "maintenance_records_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "maintenance_records_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      message_templates: {
      Row: {
        id: string
        user_id: string
        name: string
        channel: string
        subject: string | null
        body: string
        created_at: string
        updated_at: string
        org_id: string
      }
      Insert: {
        id?: string
        user_id: string
        name: string
        channel?: string
        subject?: string | null
        body: string
        created_at?: string
        updated_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        user_id?: string
        name?: string
        channel?: string
        subject?: string | null
        body?: string
        created_at?: string
        updated_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "message_templates_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      notifications: {
      Row: {
        id: string
        user_id: string
        type: string
        title: string
        body: string | null
        entity_id: string | null
        read: boolean
        created_at: string
        org_id: string
      }
      Insert: {
        id?: string
        user_id: string
        type: string
        title: string
        body?: string | null
        entity_id?: string | null
        read?: boolean
        created_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        user_id?: string
        type?: string
        title?: string
        body?: string | null
        entity_id?: string | null
        read?: boolean
        created_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "notifications_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      organization_domains: {
      Row: {
        id: string
        organization_id: string
        domain: string
        verification_token: string
        status: string
        verified_at: string | null
        last_checked_at: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        organization_id: string
        domain: string
        verification_token?: string
        status?: string
        verified_at?: string | null
        last_checked_at?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        organization_id?: string
        domain?: string
        verification_token?: string
        status?: string
        verified_at?: string | null
        last_checked_at?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "organization_domains_organization_id_fkey"
          columns: ["{", "o", "r", "g", "a", "n", "i", "z", "a", "t", "i", "o", "n", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      organization_invitations: {
      Row: {
        id: string
        organization_id: string
        email: string
        role: Database["public"]["Enums"]["org_role"]
        token: string
        invited_by: string | null
        expires_at: string
        accepted_at: string | null
        created_at: string
      }
      Insert: {
        id?: string
        organization_id: string
        email: string
        role?: Database["public"]["Enums"]["org_role"]
        token?: string
        invited_by?: string | null
        expires_at?: string
        accepted_at?: string | null
        created_at?: string
      }
      Update: {
        id?: string
        organization_id?: string
        email?: string
        role?: Database["public"]["Enums"]["org_role"]
        token?: string
        invited_by?: string | null
        expires_at?: string
        accepted_at?: string | null
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "organization_invitations_invited_by_fkey"
          columns: ["{", "i", "n", "v", "i", "t", "e", "d", "_", "b", "y", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "organization_invitations_organization_id_fkey"
          columns: ["{", "o", "r", "g", "a", "n", "i", "z", "a", "t", "i", "o", "n", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      organization_members: {
      Row: {
        organization_id: string
        user_id: string
        role: Database["public"]["Enums"]["org_role"]
        approval_status: string
        joined_at: string
      }
      Insert: {
        organization_id: string
        user_id: string
        role?: Database["public"]["Enums"]["org_role"]
        approval_status?: string
        joined_at?: string
      }
      Update: {
        organization_id?: string
        user_id?: string
        role?: Database["public"]["Enums"]["org_role"]
        approval_status?: string
        joined_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "organization_members_organization_id_fkey"
          columns: ["{", "o", "r", "g", "a", "n", "i", "z", "a", "t", "i", "o", "n", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "organization_members_user_id_fkey"
          columns: ["{", "u", "s", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      organizations: {
      Row: {
        id: string
        slug: string
        name: string
        branding: Json
        feature_flags: Json
        subscription_status: string
        created_at: string
        updated_at: string
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        trial_ends_at: string | null
        is_master_org: boolean
        default_hourly_rate: number
        country: string
        currency: string
        locale: string
      }
      Insert: {
        id?: string
        slug: string
        name: string
        branding?: Json
        feature_flags?: Json
        subscription_status?: string
        created_at?: string
        updated_at?: string
        stripe_customer_id?: string | null
        stripe_subscription_id?: string | null
        trial_ends_at?: string | null
        is_master_org?: boolean
        default_hourly_rate?: number
        country?: string
        currency?: string
        locale?: string
      }
      Update: {
        id?: string
        slug?: string
        name?: string
        branding?: Json
        feature_flags?: Json
        subscription_status?: string
        created_at?: string
        updated_at?: string
        stripe_customer_id?: string | null
        stripe_subscription_id?: string | null
        trial_ends_at?: string | null
        is_master_org?: boolean
        default_hourly_rate?: number
        country?: string
        currency?: string
        locale?: string
      }
      Relationships: []
      }
      permit_documents: {
      Row: {
        id: string
        permit_id: string
        user_id: string | null
        document_url: string
        file_name: string | null
        version: number
        notes: string | null
        is_current: boolean
        created_at: string
        org_id: string
      }
      Insert: {
        id?: string
        permit_id: string
        user_id?: string | null
        document_url: string
        file_name?: string | null
        version?: number
        notes?: string | null
        is_current?: boolean
        created_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        permit_id?: string
        user_id?: string | null
        document_url?: string
        file_name?: string | null
        version?: number
        notes?: string | null
        is_current?: boolean
        created_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "permit_documents_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "permit_documents_permit_id_fkey"
          columns: ["{", "p", "e", "r", "m", "i", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "permits"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "permit_documents_user_id_fkey"
          columns: ["{", "u", "s", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      permit_history: {
      Row: {
        id: string
        permit_id: string
        changed_by: string
        change_type: string
        old_values: Json | null
        new_values: Json | null
        notes: string | null
        created_at: string
        org_id: string
      }
      Insert: {
        id?: string
        permit_id: string
        changed_by: string
        change_type: string
        old_values?: Json | null
        new_values?: Json | null
        notes?: string | null
        created_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        permit_id?: string
        changed_by?: string
        change_type?: string
        old_values?: Json | null
        new_values?: Json | null
        notes?: string | null
        created_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "permit_history_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "permit_history_permit_id_fkey"
          columns: ["{", "p", "e", "r", "m", "i", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "permits"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      permits: {
      Row: {
        id: string
        client_id: string
        truck_id: string | null
        user_id: string
        permit_type: string
        permit_number: string | null
        state: string | null
        expiration_date: string | null
        status: string
        document_url: string | null
        notes: string | null
        created_at: string
        updated_at: string
        assigned_to: string | null
        org_id: string
        metadata: Json
      }
      Insert: {
        id?: string
        client_id: string
        truck_id?: string | null
        user_id: string
        permit_type: string
        permit_number?: string | null
        state?: string | null
        expiration_date?: string | null
        status?: string
        document_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
        assigned_to?: string | null
        org_id?: string
        metadata?: Json
      }
      Update: {
        id?: string
        client_id?: string
        truck_id?: string | null
        user_id?: string
        permit_type?: string
        permit_number?: string | null
        state?: string | null
        expiration_date?: string | null
        status?: string
        document_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
        assigned_to?: string | null
        org_id?: string
        metadata?: Json
      }
      Relationships: [
        {
          foreignKeyName: "permits_assigned_to_fkey"
          columns: ["{", "a", "s", "s", "i", "g", "n", "e", "d", "_", "t", "o", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "permits_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "permits_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "permits_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      profiles: {
      Row: {
        id: string
        full_name: string | null
        email: string | null
        approval_status: string
        created_at: string
        updated_at: string
        active_org_id: string | null
      }
      Insert: {
        id: string
        full_name?: string | null
        email?: string | null
        approval_status?: string
        created_at?: string
        updated_at?: string
        active_org_id?: string | null
      }
      Update: {
        id?: string
        full_name?: string | null
        email?: string | null
        approval_status?: string
        created_at?: string
        updated_at?: string
        active_org_id?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "profiles_active_org_id_fkey"
          columns: ["{", "a", "c", "t", "i", "v", "e", "_", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "profiles_id_fkey"
          columns: ["{", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      quote_items: {
      Row: {
        id: string
        org_id: string
        quote_id: string
        service_id: string | null
        description: string
        quantity: number
        unit_price: number
        billing_type: string
        position: number
        created_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        quote_id: string
        service_id?: string | null
        description?: string
        quantity?: number
        unit_price?: number
        billing_type?: string
        position?: number
        created_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        quote_id?: string
        service_id?: string | null
        description?: string
        quantity?: number
        unit_price?: number
        billing_type?: string
        position?: number
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "quote_items_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "quote_items_quote_id_fkey"
          columns: ["{", "q", "u", "o", "t", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "quotes"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "quote_items_service_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "services"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      quotes: {
      Row: {
        id: string
        org_id: string
        user_id: string
        lead_id: string | null
        client_id: string | null
        quote_number: string | null
        title: string
        status: string
        valid_until: string | null
        notes: string | null
        discount: number
        subtotal: number
        total: number
        sent_at: string | null
        accepted_at: string | null
        converted_at: string | null
        created_at: string
        updated_at: string
        client_response_note: string | null
        client_responded_at: string | null
        client_responded_by: string | null
      }
      Insert: {
        id?: string
        org_id?: string
        user_id?: string
        lead_id?: string | null
        client_id?: string | null
        quote_number?: string | null
        title?: string
        status?: string
        valid_until?: string | null
        notes?: string | null
        discount?: number
        subtotal?: number
        total?: number
        sent_at?: string | null
        accepted_at?: string | null
        converted_at?: string | null
        created_at?: string
        updated_at?: string
        client_response_note?: string | null
        client_responded_at?: string | null
        client_responded_by?: string | null
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        lead_id?: string | null
        client_id?: string | null
        quote_number?: string | null
        title?: string
        status?: string
        valid_until?: string | null
        notes?: string | null
        discount?: number
        subtotal?: number
        total?: number
        sent_at?: string | null
        accepted_at?: string | null
        converted_at?: string | null
        created_at?: string
        updated_at?: string
        client_response_note?: string | null
        client_responded_at?: string | null
        client_responded_by?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "quotes_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "quotes_client_responded_by_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "r", "e", "s", "p", "o", "n", "d", "e", "d", "_", "b", "y", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "quotes_lead_id_fkey"
          columns: ["{", "l", "e", "a", "d", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "leads"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "quotes_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      recurring_plans: {
      Row: {
        id: string
        org_id: string
        user_id: string
        client_id: string
        service_id: string | null
        name: string
        amount: number
        frequency: string
        net_days: number
        next_run_on: string
        status: string
        description: string | null
        last_invoice_on: string | null
        invoices_generated: number
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id?: string
        client_id: string
        service_id?: string | null
        name: string
        amount?: number
        frequency?: string
        net_days?: number
        next_run_on?: string
        status?: string
        description?: string | null
        last_invoice_on?: string | null
        invoices_generated?: number
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        client_id?: string
        service_id?: string | null
        name?: string
        amount?: number
        frequency?: string
        net_days?: number
        next_run_on?: string
        status?: string
        description?: string | null
        last_invoice_on?: string | null
        invoices_generated?: number
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "recurring_plans_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "recurring_plans_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "recurring_plans_service_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "services"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      roadside_inspections: {
      Row: {
        id: string
        org_id: string
        client_id: string
        truck_id: string | null
        driver_id: string | null
        user_id: string
        inspection_date: string
        location: string | null
        state: string | null
        inspector_id: string | null
        inspection_level: number | null
        result: string
        csa_points: number
        violations: Json
        report_number: string | null
        document_url: string | null
        notes: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        client_id: string
        truck_id?: string | null
        driver_id?: string | null
        user_id: string
        inspection_date: string
        location?: string | null
        state?: string | null
        inspector_id?: string | null
        inspection_level?: number | null
        result: string
        csa_points?: number
        violations?: Json
        report_number?: string | null
        document_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        client_id?: string
        truck_id?: string | null
        driver_id?: string | null
        user_id?: string
        inspection_date?: string
        location?: string | null
        state?: string | null
        inspector_id?: string | null
        inspection_level?: number | null
        result?: string
        csa_points?: number
        violations?: Json
        report_number?: string | null
        document_url?: string | null
        notes?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "roadside_inspections_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "roadside_inspections_driver_id_fkey"
          columns: ["{", "d", "r", "i", "v", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "drivers"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "roadside_inspections_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "roadside_inspections_truck_id_fkey"
          columns: ["{", "t", "r", "u", "c", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "trucks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      saved_filters: {
      Row: {
        id: string
        user_id: string
        name: string
        page: string
        filters: Json
        created_at: string
        org_id: string
      }
      Insert: {
        id?: string
        user_id: string
        name: string
        page: string
        filters?: Json
        created_at?: string
        org_id?: string
      }
      Update: {
        id?: string
        user_id?: string
        name?: string
        page?: string
        filters?: Json
        created_at?: string
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "saved_filters_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      saved_views: {
      Row: {
        id: string
        org_id: string
        user_id: string
        scope: string
        name: string
        filters: Json
        shared: boolean
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id: string
        scope: string
        name: string
        filters?: Json
        shared?: boolean
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        scope?: string
        name?: string
        filters?: Json
        shared?: boolean
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "saved_views_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      scheduled_messages: {
      Row: {
        id: string
        user_id: string
        client_id: string
        template_id: string | null
        channel: string
        subject: string | null
        body: string
        scheduled_at: string
        status: string
        sent_at: string | null
        created_at: string
        last_error: string | null
        retry_count: number
        next_retry_at: string | null
        locked_at: string | null
        org_id: string
      }
      Insert: {
        id?: string
        user_id: string
        client_id: string
        template_id?: string | null
        channel?: string
        subject?: string | null
        body: string
        scheduled_at: string
        status?: string
        sent_at?: string | null
        created_at?: string
        last_error?: string | null
        retry_count?: number
        next_retry_at?: string | null
        locked_at?: string | null
        org_id?: string
      }
      Update: {
        id?: string
        user_id?: string
        client_id?: string
        template_id?: string | null
        channel?: string
        subject?: string | null
        body?: string
        scheduled_at?: string
        status?: string
        sent_at?: string | null
        created_at?: string
        last_error?: string | null
        retry_count?: number
        next_retry_at?: string | null
        locked_at?: string | null
        org_id?: string
      }
      Relationships: [
        {
          foreignKeyName: "scheduled_messages_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "scheduled_messages_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "scheduled_messages_template_id_fkey"
          columns: ["{", "t", "e", "m", "p", "l", "a", "t", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "message_templates"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      service_order_checklist_items: {
      Row: {
        id: string
        service_order_id: string
        org_id: string
        title: string
        description: string | null
        document_type: string | null
        required: boolean
        status: string
        document_path: string | null
        file_name: string | null
        rejection_reason: string | null
        due_date: string | null
        sort_order: number
        completed_by: string | null
        completed_at: string | null
        created_by: string
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        service_order_id: string
        org_id?: string
        title: string
        description?: string | null
        document_type?: string | null
        required?: boolean
        status?: string
        document_path?: string | null
        file_name?: string | null
        rejection_reason?: string | null
        due_date?: string | null
        sort_order?: number
        completed_by?: string | null
        completed_at?: string | null
        created_by?: string
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        service_order_id?: string
        org_id?: string
        title?: string
        description?: string | null
        document_type?: string | null
        required?: boolean
        status?: string
        document_path?: string | null
        file_name?: string | null
        rejection_reason?: string | null
        due_date?: string | null
        sort_order?: number
        completed_by?: string | null
        completed_at?: string | null
        created_by?: string
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "service_order_checklist_items_completed_by_fkey"
          columns: ["{", "c", "o", "m", "p", "l", "e", "t", "e", "d", "_", "b", "y", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_checklist_items_created_by_fkey"
          columns: ["{", "c", "r", "e", "a", "t", "e", "d", "_", "b", "y", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_checklist_items_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_checklist_items_service_order_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "o", "r", "d", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "service_orders"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      service_order_events: {
      Row: {
        id: string
        service_order_id: string
        org_id: string
        event_type: string
        from_value: string | null
        to_value: string | null
        note: string | null
        metadata: Json
        actor_id: string | null
        created_at: string
      }
      Insert: {
        id?: string
        service_order_id: string
        org_id: string
        event_type: string
        from_value?: string | null
        to_value?: string | null
        note?: string | null
        metadata?: Json
        actor_id?: string | null
        created_at?: string
      }
      Update: {
        id?: string
        service_order_id?: string
        org_id?: string
        event_type?: string
        from_value?: string | null
        to_value?: string | null
        note?: string | null
        metadata?: Json
        actor_id?: string | null
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "service_order_events_actor_id_fkey"
          columns: ["{", "a", "c", "t", "o", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_events_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_events_service_order_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "o", "r", "d", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "service_orders"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      service_order_permits: {
      Row: {
        service_order_id: string
        permit_id: string
        org_id: string
        created_at: string
      }
      Insert: {
        service_order_id: string
        permit_id: string
        org_id?: string
        created_at?: string
      }
      Update: {
        service_order_id?: string
        permit_id?: string
        org_id?: string
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "service_order_permits_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_permits_permit_id_fkey"
          columns: ["{", "p", "e", "r", "m", "i", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "permits"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_permits_service_order_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "o", "r", "d", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "service_orders"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      service_order_questions: {
      Row: {
        id: string
        service_order_id: string
        org_id: string
        question: string
        answer: string | null
        status: string
        due_date: string | null
        asked_by: string
        answered_by: string | null
        answered_at: string | null
        resolved_at: string | null
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        service_order_id: string
        org_id: string
        question: string
        answer?: string | null
        status?: string
        due_date?: string | null
        asked_by: string
        answered_by?: string | null
        answered_at?: string | null
        resolved_at?: string | null
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        service_order_id?: string
        org_id?: string
        question?: string
        answer?: string | null
        status?: string
        due_date?: string | null
        asked_by?: string
        answered_by?: string | null
        answered_at?: string | null
        resolved_at?: string | null
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "service_order_questions_answered_by_fkey"
          columns: ["{", "a", "n", "s", "w", "e", "r", "e", "d", "_", "b", "y", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_questions_asked_by_fkey"
          columns: ["{", "a", "s", "k", "e", "d", "_", "b", "y", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_questions_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_order_questions_service_order_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "o", "r", "d", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "service_orders"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      service_orders: {
      Row: {
        id: string
        order_number: number
        org_id: string
        client_id: string
        service_id: string | null
        title: string
        description: string | null
        status: string
        priority: string
        assigned_to: string | null
        due_date: string | null
        sla_hours: number | null
        quoted_amount: number
        external_cost: number
        currency: string
        started_at: string | null
        submitted_at: string | null
        approved_at: string | null
        completed_at: string | null
        created_by: string
        created_at: string
        updated_at: string
        renewal_of_id: string | null
      }
      Insert: {
        id?: string
        order_number?: number
        org_id?: string
        client_id: string
        service_id?: string | null
        title: string
        description?: string | null
        status?: string
        priority?: string
        assigned_to?: string | null
        due_date?: string | null
        sla_hours?: number | null
        quoted_amount?: number
        external_cost?: number
        currency?: string
        started_at?: string | null
        submitted_at?: string | null
        approved_at?: string | null
        completed_at?: string | null
        created_by?: string
        created_at?: string
        updated_at?: string
        renewal_of_id?: string | null
      }
      Update: {
        id?: string
        order_number?: number
        org_id?: string
        client_id?: string
        service_id?: string | null
        title?: string
        description?: string | null
        status?: string
        priority?: string
        assigned_to?: string | null
        due_date?: string | null
        sla_hours?: number | null
        quoted_amount?: number
        external_cost?: number
        currency?: string
        started_at?: string | null
        submitted_at?: string | null
        approved_at?: string | null
        completed_at?: string | null
        created_by?: string
        created_at?: string
        updated_at?: string
        renewal_of_id?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "service_orders_assigned_to_fkey"
          columns: ["{", "a", "s", "s", "i", "g", "n", "e", "d", "_", "t", "o", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_orders_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_orders_created_by_fkey"
          columns: ["{", "c", "r", "e", "a", "t", "e", "d", "_", "b", "y", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_orders_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_orders_renewal_of_id_fkey"
          columns: ["{", "r", "e", "n", "e", "w", "a", "l", "_", "o", "f", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "service_orders"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "service_orders_service_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "services"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      services: {
      Row: {
        id: string
        org_id: string
        user_id: string
        name: string
        description: string | null
        default_price: number
        billing_type: string
        active: boolean
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id?: string
        name: string
        description?: string | null
        default_price?: number
        billing_type?: string
        active?: boolean
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        name?: string
        description?: string | null
        default_price?: number
        billing_type?: string
        active?: boolean
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "services_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      task_templates: {
      Row: {
        id: string
        org_id: string
        user_id: string
        name: string
        description: string | null
        items: Json
        created_at: string
        updated_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        user_id: string
        name: string
        description?: string | null
        items?: Json
        created_at?: string
        updated_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        user_id?: string
        name?: string
        description?: string | null
        items?: Json
        created_at?: string
        updated_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "task_templates_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      task_time_entries: {
      Row: {
        id: string
        org_id: string
        task_id: string
        user_id: string
        client_id: string | null
        minutes: number
        note: string | null
        logged_at: string
        created_at: string
      }
      Insert: {
        id?: string
        org_id?: string
        task_id: string
        user_id: string
        client_id?: string | null
        minutes: number
        note?: string | null
        logged_at?: string
        created_at?: string
      }
      Update: {
        id?: string
        org_id?: string
        task_id?: string
        user_id?: string
        client_id?: string | null
        minutes?: number
        note?: string | null
        logged_at?: string
        created_at?: string
      }
      Relationships: [
        {
          foreignKeyName: "task_time_entries_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "task_time_entries_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "task_time_entries_task_id_fkey"
          columns: ["{", "t", "a", "s", "k", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "tasks"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      tasks: {
      Row: {
        id: string
        user_id: string
        client_id: string | null
        name: string
        notes: string | null
        status: string
        created_at: string
        updated_at: string
        task_type: string
        operator: string | null
        tags: string[] | null
        due_date: string | null
        priority: string | null
        assigned_to: string | null
        org_id: string
        service_order_id: string | null
      }
      Insert: {
        id?: string
        user_id: string
        client_id?: string | null
        name: string
        notes?: string | null
        status?: string
        created_at?: string
        updated_at?: string
        task_type?: string
        operator?: string | null
        tags?: string[] | null
        due_date?: string | null
        priority?: string | null
        assigned_to?: string | null
        org_id?: string
        service_order_id?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        client_id?: string | null
        name?: string
        notes?: string | null
        status?: string
        created_at?: string
        updated_at?: string
        task_type?: string
        operator?: string | null
        tags?: string[] | null
        due_date?: string | null
        priority?: string | null
        assigned_to?: string | null
        org_id?: string
        service_order_id?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "tasks_assigned_to_fkey"
          columns: ["{", "a", "s", "s", "i", "g", "n", "e", "d", "_", "t", "o", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "tasks_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "tasks_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "tasks_service_order_id_fkey"
          columns: ["{", "s", "e", "r", "v", "i", "c", "e", "_", "o", "r", "d", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "service_orders"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      trucks: {
      Row: {
        id: string
        client_id: string
        user_id: string
        plate: string
        vin: string | null
        year: number | null
        make: string | null
        model: string | null
        status: string
        notes: string | null
        created_at: string
        updated_at: string
        org_id: string
        taxable_gross_weight_lbs: number | null
      }
      Insert: {
        id?: string
        client_id: string
        user_id: string
        plate: string
        vin?: string | null
        year?: number | null
        make?: string | null
        model?: string | null
        status?: string
        notes?: string | null
        created_at?: string
        updated_at?: string
        org_id?: string
        taxable_gross_weight_lbs?: number | null
      }
      Update: {
        id?: string
        client_id?: string
        user_id?: string
        plate?: string
        vin?: string | null
        year?: number | null
        make?: string | null
        model?: string | null
        status?: string
        notes?: string | null
        created_at?: string
        updated_at?: string
        org_id?: string
        taxable_gross_weight_lbs?: number | null
      }
      Relationships: [
        {
          foreignKeyName: "trucks_client_id_fkey"
          columns: ["{", "c", "l", "i", "e", "n", "t", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "clients"
          referencedColumns: ["{", "i", "d", "}"]
        },
        {
          foreignKeyName: "trucks_org_id_fkey"
          columns: ["{", "o", "r", "g", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "organizations"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
      user_roles: {
      Row: {
        id: string
        user_id: string
        role: Database["public"]["Enums"]["app_role"]
      }
      Insert: {
        id?: string
        user_id: string
        role: Database["public"]["Enums"]["app_role"]
      }
      Update: {
        id?: string
        user_id?: string
        role?: Database["public"]["Enums"]["app_role"]
      }
      Relationships: [
        {
          foreignKeyName: "user_roles_user_id_fkey"
          columns: ["{", "u", "s", "e", "r", "_", "i", "d", "}"]
          isOneToOne: false
          referencedRelation: "users"
          referencedColumns: ["{", "i", "d", "}"]
        },
      ]
      }
    }
    Views: {
      latest_risk_scores: {
      Row: {
        id: string | null
        org_id: string | null
        client_id: string | null
        scored_date: string | null
        score: number | null
        band: string | null
        factors: Json | null
        computed_at: string | null
      }
      Insert: {
      }
      Update: {
      }
      Relationships: []
      }
    }
    Functions: {
      accept_invitation: { Args: { p_token: string }; Returns: string }
      can_admin_user: { Args: { _target: string }; Returns: boolean }
      can_org_write: { Args: { _org_id: string }; Returns: boolean }
      claim_pending_messages: {
        Args: { p_channel?: string; p_limit?: number }
        Returns: {
          id: string
          user_id: string
          client_id: string
          template_id: string | null
          channel: string
          subject: string | null
          body: string
          scheduled_at: string
          status: string
          sent_at: string | null
          created_at: string
          last_error: string | null
          retry_count: number
          next_retry_at: string | null
          locked_at: string | null
          org_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_pending_messages_for_org: {
        Args: { p_channel?: string; p_limit?: number; p_org_id: string }
        Returns: {
          id: string
          user_id: string
          client_id: string
          template_id: string | null
          channel: string
          subject: string | null
          body: string
          scheduled_at: string
          status: string
          sent_at: string | null
          created_at: string
          last_error: string | null
          retry_count: number
          next_retry_at: string | null
          locked_at: string | null
          org_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scheduled_messages"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      current_org_id: { Args: {  }; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      default_currency_for_country: { Args: { p_country: string }; Returns: string }
      default_locale_for_country: { Args: { p_country: string }; Returns: string }
      expire_trials: { Args: {  }; Returns: number }
      get_approval_status: { Args: { _user_id: string }; Returns: string }
      get_org_by_hostname: {
        Args: { p_hostname: string }
        Returns: {
          id: string
          slug: string
          name: string
          branding: Json
        }[]
      }
      get_org_by_slug: {
        Args: { p_slug: string }
        Returns: {
          id: string
          slug: string
          name: string
          branding: Json
        }[]
      }
      get_portal_client_id: { Args: { _user_id: string }; Returns: string }
      has_org_role: { Args: { _org_id: string; _role: Database["public"]["Enums"]["org_role"] }; Returns: boolean }
      has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }; Returns: boolean }
      invite_member: {
        Args: { p_email: string; p_org_id: string; p_role?: Database["public"]["Enums"]["org_role"] }
        Returns: Json
      }
      is_org_admin: { Args: { _org_id: string }; Returns: boolean }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_portal_client: { Args: { p_client_id: string }; Returns: boolean }
      is_portal_order: { Args: { p_order_id: string }; Returns: boolean }
      is_portal_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: {  }; Returns: boolean }
      list_org_members: {
        Args: { p_org_id: string }
        Returns: {
          user_id: string
          role: Database["public"]["Enums"]["org_role"]
          approval_status: string
          joined_at: string
          email: string
          full_name: string
        }[]
      }
      normalize_hostname: { Args: { p_hostname: string }; Returns: string }
      org_distance_unit: { Args: {  }; Returns: string }
      org_weight_unit: { Args: {  }; Returns: string }
      peek_invitation: { Args: { p_token: string }; Returns: Json }
      portal_answer_service_order_question: { Args: { p_answer: string; p_question_id: string }; Returns: undefined }
      portal_attach_checklist_document: { Args: { p_document_path: string; p_file_name: string; p_item_id: string }; Returns: undefined }
      portal_can_read_service_order_document: { Args: { p_path: string }; Returns: boolean }
      portal_can_upload_service_order_document: { Args: { p_path: string }; Returns: boolean }
      portal_create_service_order: {
        Args: { p_description?: string; p_permit_ids?: string[]; p_renewal_of_id?: string; p_service_id?: string; p_title: string }
        Returns: string
      }
      portal_get_service_order: { Args: { p_order_id: string }; Returns: Json }
      portal_list_invoices: { Args: {  }; Returns: Json }
      portal_list_quotes: { Args: {  }; Returns: Json }
      portal_list_service_orders: { Args: {  }; Returns: Json }
      portal_list_services: { Args: {  }; Returns: Json }
      portal_respond_quote: { Args: { p_decision: string; p_note?: string; p_quote_id: string }; Returns: undefined }
      portal_sign_service_order_document: {
        Args: { p_checklist_item_id: string; p_document_name: string; p_order_id: string; p_signature_data: string; p_signer_email: string; p_signer_name: string }
        Returns: string
      }
      prune_ai_briefings: { Args: {  }; Returns: undefined }
      public_create_org_with_owner: { Args: { p_country?: string; p_name: string; p_slug: string }; Returns: string }
      recover_stuck_sending: { Args: {  }; Returns: number }
      request_org_domain: {
        Args: { p_domain: string; p_org_id: string }
        Returns: {
          id: string
          organization_id: string
          domain: string
          verification_token: string
          status: string
          verified_at: string
          last_checked_at: string
          created_at: string
          updated_at: string
        }[]
      }
      revoke_invitation: { Args: { p_invitation_id: string }; Returns: undefined }
      super_admin_create_org: { Args: { p_country?: string; p_name: string; p_slug: string }; Returns: string }
      super_admin_list_orgs: {
        Args: {  }
        Returns: {
          id: string
          slug: string
          name: string
          subscription_status: string
          branding: Json
          feature_flags: Json
          created_at: string
          member_count: number
          client_count: number
          permit_count: number
          truck_count: number
        }[]
      }
      super_admin_org_details: { Args: { p_org_id: string }; Returns: Json }
      super_admin_set_owner: { Args: { p_email: string; p_org_id: string }; Returns: string }
      super_admin_update_org: { Args: { p_org_id: string; p_patch: Json }; Returns: undefined }
      update_org_branding: { Args: { p_branding: Json; p_org_id: string }; Returns: undefined }
      update_org_hourly_rate: { Args: { p_org_id: string; p_rate: number }; Returns: undefined }
      update_org_regional_settings: {
        Args: { p_country: string; p_currency: string; p_locale: string; p_org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "operator" | "viewer"
      org_role: "owner" | "admin" | "member" | "operator" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      org_role: ["owner", "admin", "member", "operator", "viewer"]
    },
  },
} as const
