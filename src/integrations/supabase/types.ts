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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      Relationships: []
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
      can_admin_user: { Args: { _target: string }; Returns: string }
      can_org_write: { Args: { _org_id: string }; Returns: string }
      claim_pending_messages: {
        Args: { p_channel?: string; p_limit?: string }
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
        Args: { p_channel?: string; p_limit?: string; p_org_id: string }
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
      expire_trials: { Args: {  }; Returns: string }
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
      has_org_role: { Args: { _org_id: string; _role: Database["public"]["Enums"]["org_role"] }; Returns: string }
      has_role: { Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }; Returns: string }
      invite_member: {
        Args: { p_email: string; p_org_id: string; p_role?: Database["public"]["Enums"]["org_role"] }
        Returns: Json
      }
      is_org_admin: { Args: { _org_id: string }; Returns: string }
      is_org_member: { Args: { _org_id: string }; Returns: string }
      is_portal_client: { Args: { p_client_id: string }; Returns: string }
      is_portal_order: { Args: { p_order_id: string }; Returns: string }
      is_portal_user: { Args: { _user_id: string }; Returns: string }
      is_super_admin: { Args: {  }; Returns: string }
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
      portal_can_read_service_order_document: { Args: { p_path: string }; Returns: string }
      portal_can_upload_service_order_document: { Args: { p_path: string }; Returns: string }
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
      recover_stuck_sending: { Args: {  }; Returns: string }
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
          member_count: string
          client_count: string
          permit_count: string
          truck_count: string
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
