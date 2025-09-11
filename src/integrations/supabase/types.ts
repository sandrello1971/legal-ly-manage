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
          description: string | null
          end_date: string | null
          id: string
          notes: string | null
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
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
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
          description?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
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
          vat_number?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_admin_role_to_user: {
        Args: { user_email: string }
        Returns: undefined
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      cleanup_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
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
