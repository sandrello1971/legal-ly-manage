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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          permissions: Json
          rate_limit_per_hour: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          permissions?: Json
          rate_limit_per_hour?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          permissions?: Json
          rate_limit_per_hour?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          identifier: string
          request_count: number
          updated_at: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          identifier: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          identifier?: string
          request_count?: number
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          method: string
          request_size_bytes: number | null
          response_size_bytes: number | null
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          method?: string
          request_size_bytes?: number | null
          response_size_bytes?: number | null
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      archive_audit_log: {
        Row: {
          action: string
          archive_id: string | null
          created_at: string
          details: Json | null
          document_id: string | null
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          archive_id?: string | null
          created_at?: string
          details?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          archive_id?: string | null
          created_at?: string
          details?: Json | null
          document_id?: string | null
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      archive_policies: {
        Row: {
          auto_seal_enabled: boolean
          created_at: string
          created_by: string
          description: string | null
          document_types: string[] | null
          id: string
          legal_requirement: string | null
          name: string
          retention_period_months: number
          updated_at: string
        }
        Insert: {
          auto_seal_enabled?: boolean
          created_at?: string
          created_by: string
          description?: string | null
          document_types?: string[] | null
          id?: string
          legal_requirement?: string | null
          name: string
          retention_period_months: number
          updated_at?: string
        }
        Update: {
          auto_seal_enabled?: boolean
          created_at?: string
          created_by?: string
          description?: string | null
          document_types?: string[] | null
          id?: string
          legal_requirement?: string | null
          name?: string
          retention_period_months?: number
          updated_at?: string
        }
        Relationships: []
      }
      backup_configurations: {
        Row: {
          backup_type: string
          compression_enabled: boolean
          created_at: string
          description: string | null
          encryption_enabled: boolean
          encryption_key_id: string | null
          exclude_tables: Json | null
          id: string
          include_tables: Json | null
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          retention_days: number
          schedule_cron: string
          storage_providers: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_type: string
          compression_enabled?: boolean
          created_at?: string
          description?: string | null
          encryption_enabled?: boolean
          encryption_key_id?: string | null
          exclude_tables?: Json | null
          id?: string
          include_tables?: Json | null
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          retention_days?: number
          schedule_cron: string
          storage_providers?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          backup_type?: string
          compression_enabled?: boolean
          created_at?: string
          description?: string | null
          encryption_enabled?: boolean
          encryption_key_id?: string | null
          exclude_tables?: Json | null
          id?: string
          include_tables?: Json | null
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          retention_days?: number
          schedule_cron?: string
          storage_providers?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_jobs: {
        Row: {
          backup_path: string | null
          checksum_sha256: string | null
          completed_at: string | null
          compressed_size_bytes: number | null
          configuration_id: string
          created_at: string
          encryption_metadata: Json | null
          error_message: string | null
          files_count: number | null
          id: string
          job_type: string
          progress_percentage: number | null
          recovery_tested_at: string | null
          started_at: string
          status: string
          storage_locations: Json | null
          total_size_bytes: number | null
        }
        Insert: {
          backup_path?: string | null
          checksum_sha256?: string | null
          completed_at?: string | null
          compressed_size_bytes?: number | null
          configuration_id: string
          created_at?: string
          encryption_metadata?: Json | null
          error_message?: string | null
          files_count?: number | null
          id?: string
          job_type: string
          progress_percentage?: number | null
          recovery_tested_at?: string | null
          started_at?: string
          status?: string
          storage_locations?: Json | null
          total_size_bytes?: number | null
        }
        Update: {
          backup_path?: string | null
          checksum_sha256?: string | null
          completed_at?: string | null
          compressed_size_bytes?: number | null
          configuration_id?: string
          created_at?: string
          encryption_metadata?: Json | null
          error_message?: string | null
          files_count?: number | null
          id?: string
          job_type?: string
          progress_percentage?: number | null
          recovery_tested_at?: string | null
          started_at?: string
          status?: string
          storage_locations?: Json | null
          total_size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "backup_jobs_configuration_id_fkey"
            columns: ["configuration_id"]
            isOneToOne: false
            referencedRelation: "backup_configurations"
            referencedColumns: ["id"]
          },
        ]
      }
      bandi: {
        Row: {
          application_deadline: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string
          decree_file_name: string | null
          decree_file_url: string | null
          description: string | null
          eligibility_criteria: string | null
          evaluation_criteria: string | null
          id: string
          organization: string | null
          parsed_data: Json | null
          project_end_date: string | null
          project_start_date: string | null
          required_documents: string[] | null
          search_vector: unknown | null
          status: Database["public"]["Enums"]["bando_status"] | null
          title: string
          total_amount: number | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          application_deadline?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by: string
          decree_file_name?: string | null
          decree_file_url?: string | null
          description?: string | null
          eligibility_criteria?: string | null
          evaluation_criteria?: string | null
          id?: string
          organization?: string | null
          parsed_data?: Json | null
          project_end_date?: string | null
          project_start_date?: string | null
          required_documents?: string[] | null
          search_vector?: unknown | null
          status?: Database["public"]["Enums"]["bando_status"] | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          application_deadline?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string
          decree_file_name?: string | null
          decree_file_url?: string | null
          description?: string | null
          eligibility_criteria?: string | null
          evaluation_criteria?: string | null
          id?: string
          organization?: string | null
          parsed_data?: Json | null
          project_end_date?: string | null
          project_start_date?: string | null
          required_documents?: string[] | null
          search_vector?: unknown | null
          status?: Database["public"]["Enums"]["bando_status"] | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      bank_statements: {
        Row: {
          account_name: string | null
          account_number: string | null
          bank_name: string | null
          closing_balance: number | null
          created_at: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          opening_balance: number | null
          parsed_data: Json | null
          processing_error: string | null
          statement_period_end: string | null
          statement_period_start: string | null
          status: string
          total_transactions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          closing_balance?: number | null
          created_at?: string
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          opening_balance?: number | null
          parsed_data?: Json | null
          processing_error?: string | null
          statement_period_end?: string | null
          statement_period_start?: string | null
          status?: string
          total_transactions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_number?: string | null
          bank_name?: string | null
          closing_balance?: number | null
          created_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          opening_balance?: number | null
          parsed_data?: Json | null
          processing_error?: string | null
          statement_period_end?: string | null
          statement_period_start?: string | null
          status?: string
          total_transactions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_statement_id: string
          category: string | null
          counterpart_account: string | null
          counterpart_name: string | null
          created_at: string
          currency: string
          description: string
          expense_id: string | null
          id: string
          is_reconciled: boolean | null
          project_id: string | null
          reconciliation_confidence: number | null
          reconciliation_notes: string | null
          reference_number: string | null
          tags: string[] | null
          transaction_date: string
          transaction_type: string
          updated_at: string
          value_date: string | null
        }
        Insert: {
          amount: number
          bank_statement_id: string
          category?: string | null
          counterpart_account?: string | null
          counterpart_name?: string | null
          created_at?: string
          currency?: string
          description: string
          expense_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          project_id?: string | null
          reconciliation_confidence?: number | null
          reconciliation_notes?: string | null
          reference_number?: string | null
          tags?: string[] | null
          transaction_date: string
          transaction_type: string
          updated_at?: string
          value_date?: string | null
        }
        Update: {
          amount?: number
          bank_statement_id?: string
          category?: string | null
          counterpart_account?: string | null
          counterpart_name?: string | null
          created_at?: string
          currency?: string
          description?: string
          expense_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          project_id?: string | null
          reconciliation_confidence?: number | null
          reconciliation_notes?: string | null
          reference_number?: string | null
          tags?: string[] | null
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_statement_id_fkey"
            columns: ["bank_statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "project_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_targets: {
        Row: {
          company_id: string
          created_at: string
          id: string
          target_margine: number | null
          target_ricavi: number | null
          target_utile_netto: number | null
          updated_at: string
          year: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          target_margine?: number | null
          target_ricavi?: number | null
          target_utile_netto?: number | null
          updated_at?: string
          year: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          target_margine?: number | null
          target_ricavi?: number | null
          target_utile_netto?: number | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_company_targets"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          messages: Json
          session_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          session_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          session_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          capitale_sociale: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capitale_sociale?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capitale_sociale?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      compliance_checklists: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          document_types: string[] | null
          id: string
          mandatory_fields: string[] | null
          name: string
          regulation_reference: string
          requirements: Json
          retention_max_months: number | null
          retention_min_months: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          document_types?: string[] | null
          id?: string
          mandatory_fields?: string[] | null
          name: string
          regulation_reference: string
          requirements: Json
          retention_max_months?: number | null
          retention_min_months?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          document_types?: string[] | null
          id?: string
          mandatory_fields?: string[] | null
          name?: string
          regulation_reference?: string
          requirements?: Json
          retention_max_months?: number | null
          retention_min_months?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_companies: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_partner: boolean
          name: string
          notes: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          tax_code: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_partner?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_code?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_partner?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          tax_code?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      crm_contacts: {
        Row: {
          company_id: string | null
          created_at: string
          department: string | null
          email: string | null
          first_name: string
          id: string
          is_active: boolean
          is_primary: boolean | null
          last_name: string
          mobile: string | null
          notes: string | null
          phone: string | null
          position: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          is_primary?: boolean | null
          last_name: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean | null
          last_name?: string
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_order_services: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string
          quantity: number
          service_id: string
          total_price: number | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          quantity?: number
          service_id: string
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          service_id?: string
          total_price?: number | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_order_services_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "crm_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_order_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "crm_services"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_orders: {
        Row: {
          actual_hours: number | null
          assigned_user_id: string | null
          company_id: string
          created_at: string
          description: string | null
          end_date: string | null
          estimated_hours: number | null
          id: string
          notes: string | null
          order_number: string
          parent_order_id: string | null
          priority: string | null
          progress_percentage: number | null
          start_date: string | null
          status: string
          title: string
          total_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_user_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          order_number: string
          parent_order_id?: string | null
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string | null
          status?: string
          title: string
          total_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_hours?: number | null
          assigned_user_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          order_number?: string
          parent_order_id?: string | null
          priority?: string | null
          progress_percentage?: number | null
          start_date?: string | null
          status?: string
          title?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_orders_parent_order_id_fkey"
            columns: ["parent_order_id"]
            isOneToOne: false
            referencedRelation: "crm_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_service_compositions: {
        Row: {
          child_service_id: string
          created_at: string
          id: string
          parent_service_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          child_service_id: string
          created_at?: string
          id?: string
          parent_service_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          child_service_id?: string
          created_at?: string
          id?: string
          parent_service_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_service_compositions_child_service_id_fkey"
            columns: ["child_service_id"]
            isOneToOne: false
            referencedRelation: "crm_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_service_compositions_parent_service_id_fkey"
            columns: ["parent_service_id"]
            isOneToOne: false
            referencedRelation: "crm_services"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_services: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          partner_id: string | null
          service_type: string
          unit_of_measure: string | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          partner_id?: string | null
          service_type: string
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          partner_id?: string | null
          service_type?: string
          unit_of_measure?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_services_partner"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_timestamps: {
        Row: {
          archive_id: string | null
          created_at: string
          created_by: string
          digital_signature: string | null
          document_hash: string
          document_id: string | null
          hash_algorithm: string
          id: string
          timestamp_authority: string | null
          timestamp_hash: string
          timestamp_token: string | null
          verification_data: Json | null
        }
        Insert: {
          archive_id?: string | null
          created_at?: string
          created_by: string
          digital_signature?: string | null
          document_hash: string
          document_id?: string | null
          hash_algorithm?: string
          id?: string
          timestamp_authority?: string | null
          timestamp_hash: string
          timestamp_token?: string | null
          verification_data?: Json | null
        }
        Update: {
          archive_id?: string | null
          created_at?: string
          created_by?: string
          digital_signature?: string | null
          document_hash?: string
          document_id?: string | null
          hash_algorithm?: string
          id?: string
          timestamp_authority?: string | null
          timestamp_hash?: string
          timestamp_token?: string | null
          verification_data?: Json | null
        }
        Relationships: []
      }
      document_archives: {
        Row: {
          archive_path: string
          archive_policy_id: string
          archived_by: string
          archived_hash: string
          compression_ratio: number | null
          created_at: string
          digital_signature: Json | null
          document_id: string
          file_size: number
          id: string
          original_hash: string
          retention_expires_at: string
          sealed_at: string | null
          timestamp_info: Json
          updated_at: string
        }
        Insert: {
          archive_path: string
          archive_policy_id: string
          archived_by: string
          archived_hash: string
          compression_ratio?: number | null
          created_at?: string
          digital_signature?: Json | null
          document_id: string
          file_size: number
          id?: string
          original_hash: string
          retention_expires_at: string
          sealed_at?: string | null
          timestamp_info: Json
          updated_at?: string
        }
        Update: {
          archive_path?: string
          archive_policy_id?: string
          archived_by?: string
          archived_hash?: string
          compression_ratio?: number | null
          created_at?: string
          digital_signature?: Json | null
          document_id?: string
          file_size?: number
          id?: string
          original_hash?: string
          retention_expires_at?: string
          sealed_at?: string | null
          timestamp_info?: Json
          updated_at?: string
        }
        Relationships: []
      }
      document_compliance: {
        Row: {
          checklist_id: string
          compliance_score: number | null
          compliance_status: string
          created_at: string
          document_id: string
          id: string
          next_review_date: string | null
          notes: string | null
          requirements_failed: Json
          requirements_met: Json
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          checklist_id: string
          compliance_score?: number | null
          compliance_status: string
          created_at?: string
          document_id: string
          id?: string
          next_review_date?: string | null
          notes?: string | null
          requirements_failed?: Json
          requirements_met?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          checklist_id?: string
          compliance_score?: number | null
          compliance_status?: string
          created_at?: string
          document_id?: string
          id?: string
          next_review_date?: string | null
          notes?: string | null
          requirements_failed?: Json
          requirements_met?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      document_tag_relations: {
        Row: {
          created_at: string | null
          document_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_tag_relations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_tag_relations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "document_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      document_tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          amount: number | null
          category_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          document_date: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          invoice_number: string | null
          mime_type: string
          notes: string | null
          search_vector: unknown | null
          status: Database["public"]["Enums"]["document_status"] | null
          supplier_id: string | null
          title: string
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          invoice_number?: string | null
          mime_type: string
          notes?: string | null
          search_vector?: unknown | null
          status?: Database["public"]["Enums"]["document_status"] | null
          supplier_id?: string | null
          title: string
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          amount?: number | null
          category_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          document_date?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          invoice_number?: string | null
          mime_type?: string
          notes?: string | null
          search_vector?: unknown | null
          status?: Database["public"]["Enums"]["document_status"] | null
          supplier_id?: string | null
          title?: string
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          eligible_expenses: string[] | null
          id: string
          is_active: boolean
          max_amount: number | null
          max_percentage: number | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          eligible_expenses?: string[] | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          max_percentage?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          eligible_expenses?: string[] | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          max_percentage?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_sync_logs: {
        Row: {
          created_at: string
          error_details: Json | null
          id: string
          integration_id: string
          records_failed: number | null
          records_processed: number | null
          status: string
          sync_duration_ms: number | null
          sync_type: string
        }
        Insert: {
          created_at?: string
          error_details?: Json | null
          id?: string
          integration_id: string
          records_failed?: number | null
          records_processed?: number | null
          status: string
          sync_duration_ms?: number | null
          sync_type: string
        }
        Update: {
          created_at?: string
          error_details?: Json | null
          id?: string
          integration_id?: string
          records_failed?: number | null
          records_processed?: number | null
          status?: string
          sync_duration_ms?: number | null
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_logs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          configuration: Json
          created_at: string
          credentials: Json | null
          error_message: string | null
          id: string
          is_active: boolean
          last_sync_at: string | null
          name: string
          provider: string
          sync_status: string | null
          type: string
          updated_at: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          configuration?: Json
          created_at?: string
          credentials?: Json | null
          error_message?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name: string
          provider: string
          sync_status?: string | null
          type: string
          updated_at?: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          configuration?: Json
          created_at?: string
          credentials?: Json | null
          error_message?: string | null
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          name?: string
          provider?: string
          sync_status?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      italian_cities: {
        Row: {
          city_name: string
          created_at: string
          id: string
          postal_code: string
          province_code: string
          province_name: string
          region: string
        }
        Insert: {
          city_name: string
          created_at?: string
          id?: string
          postal_code: string
          province_code: string
          province_name: string
          region: string
        }
        Update: {
          city_name?: string
          created_at?: string
          id?: string
          postal_code?: string
          province_code?: string
          province_name?: string
          region?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          content: string
          content_type: string
          created_at: string
          embeddings: string | null
          id: string
          source_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string
          embeddings?: string | null
          id?: string
          source_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string
          embeddings?: string | null
          id?: string
          source_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_business_data: {
        Row: {
          company_id: string
          compenso_imprenditore: number
          costi_diretti: number
          costi_totali: number
          created_at: string
          id: string
          margine: number | null
          month: number
          ricavi: number
          updated_at: string
          utile_netto: number | null
          year: number
        }
        Insert: {
          company_id: string
          compenso_imprenditore?: number
          costi_diretti?: number
          costi_totali?: number
          created_at?: string
          id?: string
          margine?: number | null
          month: number
          ricavi?: number
          updated_at?: string
          utile_netto?: number | null
          year: number
        }
        Update: {
          company_id?: string
          compenso_imprenditore?: number
          costi_diretti?: number
          costi_totali?: number
          created_at?: string
          id?: string
          margine?: number | null
          month?: number
          ricavi?: number
          updated_at?: string
          utile_netto?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_company"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_rate_limit: {
        Row: {
          attempts: number | null
          blocked_until: string | null
          created_at: string | null
          email: string
          first_attempt: string | null
          id: string
          ip_address: unknown
          last_attempt: string | null
        }
        Insert: {
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          email: string
          first_attempt?: string | null
          id?: string
          ip_address: unknown
          last_attempt?: string | null
        }
        Update: {
          attempts?: number | null
          blocked_until?: string | null
          created_at?: string | null
          email?: string
          first_attempt?: string | null
          id?: string
          ip_address?: unknown
          last_attempt?: string | null
        }
        Relationships: []
      }
      newsletter_subscriptions: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          subscribed_at: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          subscribed_at?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          subscribed_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          email_types: Database["public"]["Enums"]["notification_type"][] | null
          id: string
          push_enabled: boolean
          push_types: Database["public"]["Enums"]["notification_type"][] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          email_types?:
            | Database["public"]["Enums"]["notification_type"][]
            | null
          id?: string
          push_enabled?: boolean
          push_types?: Database["public"]["Enums"]["notification_type"][] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          email_types?:
            | Database["public"]["Enums"]["notification_type"][]
            | null
          id?: string
          push_enabled?: boolean
          push_types?: Database["public"]["Enums"]["notification_type"][] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          is_archived: boolean
          is_read: boolean
          message: string
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          message: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_archived?: boolean
          is_read?: boolean
          message?: string
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          description: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["opportunity_status"] | null
          title: string
          updated_at: string
          user_id: string
          win_probability: number
        }
        Insert: {
          amount?: number
          company_id: string
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"] | null
          title: string
          updated_at?: string
          user_id: string
          win_probability?: number
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          description?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"] | null
          title?: string
          updated_at?: string
          user_id?: string
          win_probability?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_services: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          opportunity_id: string
          quantity: number
          service_id: string
          total_price: number
          unit_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id: string
          quantity?: number
          service_id: string
          total_price?: number
          unit_price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string
          quantity?: number
          service_id?: string
          total_price?: number
          unit_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_services_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "crm_services"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_services: {
        Row: {
          created_at: string
          id: string
          partner_company_id: string
          service_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          partner_company_id: string
          service_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          partner_company_id?: string
          service_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_partner_services_partner"
            columns: ["partner_company_id"]
            isOneToOne: false
            referencedRelation: "crm_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_partner_services_service"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "crm_services"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_baselines: {
        Row: {
          baseline_value: number
          calculation_period: string
          created_at: string
          id: string
          last_calculated_at: string
          metric_name: string
          samples_count: number
          updated_at: string
          variance_threshold: number
        }
        Insert: {
          baseline_value: number
          calculation_period: string
          created_at?: string
          id?: string
          last_calculated_at?: string
          metric_name: string
          samples_count?: number
          updated_at?: string
          variance_threshold?: number
        }
        Update: {
          baseline_value?: number
          calculation_period?: string
          created_at?: string
          id?: string
          last_calculated_at?: string
          metric_name?: string
          samples_count?: number
          updated_at?: string
          variance_threshold?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          current_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_read: boolean | null
          message: string
          milestone_id: string | null
          project_id: string
          read_at: string | null
          read_by: string | null
          severity: string
          threshold_value: number | null
          title: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          current_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_read?: boolean | null
          message: string
          milestone_id?: string | null
          project_id: string
          read_at?: string | null
          read_by?: string | null
          severity?: string
          threshold_value?: number | null
          title: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          current_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_read?: boolean | null
          message?: string
          milestone_id?: string | null
          project_id?: string
          read_at?: string | null
          read_by?: string | null
          severity?: string
          threshold_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_alerts_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          amount: number
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          created_by: string
          description: string
          expense_date: string
          id: string
          is_approved: boolean | null
          milestone_id: string | null
          project_id: string
          receipt_number: string | null
          receipt_url: string | null
          supplier_name: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by: string
          description: string
          expense_date: string
          id?: string
          is_approved?: boolean | null
          milestone_id?: string | null
          project_id: string
          receipt_number?: string | null
          receipt_url?: string | null
          supplier_name?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string
          description?: string
          expense_date?: string
          id?: string
          is_approved?: boolean | null
          milestone_id?: string | null
          project_id?: string
          receipt_number?: string | null
          receipt_url?: string | null
          supplier_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          budget_amount: number | null
          completed_date: string | null
          completion_criteria: string | null
          created_at: string | null
          deliverables: string[] | null
          depends_on_milestone_id: string | null
          description: string | null
          due_date: string
          id: string
          is_completed: boolean | null
          priority: number | null
          project_id: string
          title: string
          type: Database["public"]["Enums"]["milestone_type"] | null
          updated_at: string | null
        }
        Insert: {
          budget_amount?: number | null
          completed_date?: string | null
          completion_criteria?: string | null
          created_at?: string | null
          deliverables?: string[] | null
          depends_on_milestone_id?: string | null
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          project_id: string
          title: string
          type?: Database["public"]["Enums"]["milestone_type"] | null
          updated_at?: string | null
        }
        Update: {
          budget_amount?: number | null
          completed_date?: string | null
          completion_criteria?: string | null
          created_at?: string | null
          deliverables?: string[] | null
          depends_on_milestone_id?: string | null
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean | null
          priority?: number | null
          project_id?: string
          title?: string
          type?: Database["public"]["Enums"]["milestone_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_depends_on_milestone_id_fkey"
            columns: ["depends_on_milestone_id"]
            isOneToOne: false
            referencedRelation: "project_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_end_date: string | null
          actual_start_date: string | null
          allocated_budget: number | null
          bando_id: string | null
          created_at: string | null
          created_by: string
          cup_code: string | null
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
          parsed_data: Json | null
          progress_percentage: number | null
          project_documents: string[] | null
          project_manager: string | null
          remaining_budget: number | null
          risk_assessment: string | null
          spent_budget: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          team_members: string[] | null
          title: string
          total_budget: number
          updated_at: string | null
        }
        Insert: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          allocated_budget?: number | null
          bando_id?: string | null
          created_at?: string | null
          created_by: string
          cup_code?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          parsed_data?: Json | null
          progress_percentage?: number | null
          project_documents?: string[] | null
          project_manager?: string | null
          remaining_budget?: number | null
          risk_assessment?: string | null
          spent_budget?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          team_members?: string[] | null
          title: string
          total_budget: number
          updated_at?: string | null
        }
        Update: {
          actual_end_date?: string | null
          actual_start_date?: string | null
          allocated_budget?: number | null
          bando_id?: string | null
          created_at?: string | null
          created_by?: string
          cup_code?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          parsed_data?: Json | null
          progress_percentage?: number | null
          project_documents?: string[] | null
          project_manager?: string | null
          remaining_budget?: number | null
          risk_assessment?: string | null
          spent_budget?: number | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          team_members?: string[] | null
          title?: string
          total_budget?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_bando_id_fkey"
            columns: ["bando_id"]
            isOneToOne: false
            referencedRelation: "bandi"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_audit: {
        Row: {
          change_reason: string | null
          changed_by: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_role: Database["public"]["Enums"]["app_role"]
          old_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_role: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_role?: Database["public"]["Enums"]["app_role"]
          old_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          postal_code: string | null
          updated_at: string | null
          user_id: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
          user_id: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string | null
          user_id?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          id: string
          is_resolved: boolean
          message: string
          metadata: Json | null
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source: string
          source_id: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message: string
          metadata?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          source: string
          source_id?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          is_resolved?: boolean
          message?: string
          metadata?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source?: string
          source_id?: string | null
          title?: string
        }
        Relationships: []
      }
      system_health_metrics: {
        Row: {
          collected_at: string
          created_at: string
          id: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          status: string
          threshold_critical: number | null
          threshold_warning: number | null
          unit: string | null
          value: number
        }
        Insert: {
          collected_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          status?: string
          threshold_critical?: number | null
          threshold_warning?: number | null
          unit?: string | null
          value: number
        }
        Update: {
          collected_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          status?: string
          threshold_critical?: number | null
          threshold_warning?: number | null
          unit?: string | null
          value?: number
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          details: Json | null
          duration_ms: number | null
          id: string
          ip_address: unknown | null
          level: string
          message: string
          request_id: string | null
          session_id: string | null
          source: string
          source_id: string | null
          trace_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          id?: string
          ip_address?: unknown | null
          level: string
          message: string
          request_id?: string | null
          session_id?: string | null
          source: string
          source_id?: string | null
          trace_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          duration_ms?: number | null
          id?: string
          ip_address?: unknown | null
          level?: string
          message?: string
          request_id?: string | null
          session_id?: string | null
          source?: string
          source_id?: string | null
          trace_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          preferences?: Json | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      webhook_events: {
        Row: {
          created_at: string
          delivered_at: string | null
          delivery_attempts: number
          event_data: Json
          event_type: string
          failed_at: string | null
          id: string
          last_attempt_at: string | null
          last_response_body: string | null
          last_response_status: number | null
          next_retry_at: string | null
          subscription_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          delivery_attempts?: number
          event_data?: Json
          event_type: string
          failed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_response_body?: string | null
          last_response_status?: number | null
          next_retry_at?: string | null
          subscription_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          delivery_attempts?: number
          event_data?: Json
          event_type?: string
          failed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          last_response_body?: string | null
          last_response_status?: number | null
          next_retry_at?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          created_at: string
          endpoint_url: string
          events: Json
          id: string
          is_active: boolean
          last_delivered_at: string | null
          max_retries: number
          name: string
          retry_delay_seconds: number
          secret_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          endpoint_url: string
          events?: Json
          id?: string
          is_active?: boolean
          last_delivered_at?: string | null
          max_retries?: number
          name: string
          retry_delay_seconds?: number
          secret_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          endpoint_url?: string
          events?: Json
          id?: string
          is_active?: boolean
          last_delivered_at?: string | null
          max_retries?: number
          name?: string
          retry_delay_seconds?: number
          secret_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_expired_notifications: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      assign_admin_role_to_user: {
        Args: { user_email: string }
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_avg_response_time: {
        Args: { time_window_minutes?: number }
        Returns: number
      }
      calculate_error_rate: {
        Args: { time_window_minutes?: number }
        Returns: number
      }
      calculate_retention_expiry: {
        Args: { archive_date?: string; retention_months: number }
        Returns: string
      }
      cleanup_old_chat_conversations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      generate_api_key_hash: {
        Args: { api_key: string }
        Returns: string
      }
      generate_document_hash: {
        Args: { algorithm?: string; file_content: string }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_newsletter_subscriptions_with_logging: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          created_at: string
          email: string
          id: string
          subscribed_at: string
          updated_at: string
        }[]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      is_valid_email: {
        Args: { email: string }
        Returns: boolean
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
        Returns: unknown
      }
      log_admin_access: {
        Args: { p_action: string; p_record_id?: string; p_table_name: string }
        Returns: undefined
      }
      match_knowledge_base: {
        Args: {
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          content_type: string
          distance: number
          id: string
          source_id: string
          title: string
        }[]
      }
      schedule_next_backup: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      set_session_context: {
        Args: { session_id_param: string }
        Returns: undefined
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
      update_user_role_secure: {
        Args: {
          p_change_reason?: string
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: undefined
      }
      validate_role_change: {
        Args: {
          p_change_reason?: string
          p_new_role: Database["public"]["Enums"]["app_role"]
          p_target_user_id: string
        }
        Returns: boolean
      }
      validate_session_access: {
        Args: { conversation_session_id: string }
        Returns: boolean
      }
      validate_webhook_signature: {
        Args: { payload: string; secret: string; signature: string }
        Returns: boolean
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
      app_role: "admin" | "user" | "moderator"
      bando_status: "draft" | "active" | "expired" | "completed"
      document_status: "pending" | "approved" | "rejected" | "archived"
      document_type: "invoice" | "contract" | "receipt" | "report" | "other"
      expense_category:
        | "personnel"
        | "equipment"
        | "materials"
        | "services"
        | "travel"
        | "other"
      milestone_type: "deliverable" | "payment" | "review" | "deadline"
      notification_priority: "low" | "medium" | "high" | "urgent"
      notification_type:
        | "expense_processed"
        | "expense_approved"
        | "expense_rejected"
        | "statement_processed"
        | "reconciliation_completed"
        | "project_deadline"
        | "budget_alert"
        | "system_alert"
        | "anomaly_detected"
      opportunity_status: "in_attesa" | "acquisita" | "persa"
      project_status:
        | "planning"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "cancelled"
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
      app_role: ["admin", "user", "moderator"],
      bando_status: ["draft", "active", "expired", "completed"],
      document_status: ["pending", "approved", "rejected", "archived"],
      document_type: ["invoice", "contract", "receipt", "report", "other"],
      expense_category: [
        "personnel",
        "equipment",
        "materials",
        "services",
        "travel",
        "other",
      ],
      milestone_type: ["deliverable", "payment", "review", "deadline"],
      notification_priority: ["low", "medium", "high", "urgent"],
      notification_type: [
        "expense_processed",
        "expense_approved",
        "expense_rejected",
        "statement_processed",
        "reconciliation_completed",
        "project_deadline",
        "budget_alert",
        "system_alert",
        "anomaly_detected",
      ],
      opportunity_status: ["in_attesa", "acquisita", "persa"],
      project_status: [
        "planning",
        "in_progress",
        "on_hold",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
