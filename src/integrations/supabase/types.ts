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
      abandoned_carts: {
        Row: {
          abandoned_at: string
          cart_value: number
          created_at: string
          customer_email: string
          id: string
          is_guest: boolean
          item_summary: string | null
          items_count: number
          reminder_sent: boolean
          user_id: string | null
        }
        Insert: {
          abandoned_at?: string
          cart_value?: number
          created_at?: string
          customer_email: string
          id?: string
          is_guest?: boolean
          item_summary?: string | null
          items_count?: number
          reminder_sent?: boolean
          user_id?: string | null
        }
        Update: {
          abandoned_at?: string
          cart_value?: number
          created_at?: string
          customer_email?: string
          id?: string
          is_guest?: boolean
          item_summary?: string | null
          items_count?: number
          reminder_sent?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          body_md: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          meta_description: string
          meta_title: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body_md: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description: string
          meta_title: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string
          meta_title?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_link_clicks: {
        Row: {
          click_id: string | null
          counted: boolean
          created_at: string
          id: number
          ip_ua_hash: string | null
          is_bot: boolean
          link_id: string
        }
        Insert: {
          click_id?: string | null
          counted?: boolean
          created_at?: string
          id?: number
          ip_ua_hash?: string | null
          is_bot?: boolean
          link_id: string
        }
        Update: {
          click_id?: string | null
          counted?: boolean
          created_at?: string
          id?: number
          ip_ua_hash?: string | null
          is_bot?: boolean
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "campaign_links"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_link_groups: {
        Row: {
          archived_at: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string
          sort_order: number
          source_platform: string | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name: string
          sort_order?: number
          source_platform?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string
          sort_order?: number
          source_platform?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_links: {
        Row: {
          archived_at: string | null
          code: string
          created_at: string
          destination_path: string
          group_id: string | null
          id: string
          label: string
          sort_order: number
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_source: string
        }
        Insert: {
          archived_at?: string | null
          code: string
          created_at?: string
          destination_path?: string
          group_id?: string | null
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_source: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          created_at?: string
          destination_path?: string
          group_id?: string | null
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "campaign_link_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          click_rate: number
          created_at: string
          id: string
          name: string
          open_rate: number
          recipients: number
          revenue: number
          sent_at: string | null
          updated_at: string
        }
        Insert: {
          click_rate?: number
          created_at?: string
          id?: string
          name: string
          open_rate?: number
          recipients?: number
          revenue?: number
          sent_at?: string | null
          updated_at?: string
        }
        Update: {
          click_rate?: number
          created_at?: string
          id?: string
          name?: string
          open_rate?: number
          recipients?: number
          revenue?: number
          sent_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cover_url: string | null
          created_at: string
          id: string
          product_id: string
          qty: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          id?: string
          product_id: string
          qty?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          id?: string
          product_id?: string
          qty?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_attempts: {
        Row: {
          completed_at: string | null
          created_at: string
          environment: string
          guest_email: string | null
          id: string
          idempotency_key: string
          status: string
          stripe_session_id: string | null
          subtotal_cents: number
          total_cents: number
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          environment: string
          guest_email?: string | null
          id?: string
          idempotency_key: string
          status?: string
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          environment?: string
          guest_email?: string | null
          id?: string
          idempotency_key?: string
          status?: string
          stripe_session_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          id: string
          last_purchase_at: string | null
          name: string | null
          notes: string | null
          orders_count: number
          primary_source: string | null
          status: Database["public"]["Enums"]["customer_status"]
          total_spent: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_purchase_at?: string | null
          name?: string | null
          notes?: string | null
          orders_count?: number
          primary_source?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_purchase_at?: string | null
          name?: string | null
          notes?: string | null
          orders_count?: number
          primary_source?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          total_spent?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      discount_code_products: {
        Row: {
          discount_code_id: string
          product_id: string
        }
        Insert: {
          discount_code_id: string
          product_id: string
        }
        Update: {
          discount_code_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_products_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applies_to: string
          categories: string[]
          code: string
          created_at: string
          expires_at: string | null
          id: string
          name: string | null
          scope: string
          status: Database["public"]["Enums"]["discount_status"]
          type: Database["public"]["Enums"]["discount_type"]
          updated_at: string
          usage_limit: number | null
          uses: number
          value: number
        }
        Insert: {
          applies_to?: string
          categories?: string[]
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string | null
          scope?: string
          status?: Database["public"]["Enums"]["discount_status"]
          type: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          usage_limit?: number | null
          uses?: number
          value: number
        }
        Update: {
          applies_to?: string
          categories?: string[]
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          name?: string | null
          scope?: string
          status?: Database["public"]["Enums"]["discount_status"]
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          usage_limit?: number | null
          uses?: number
          value?: number
        }
        Relationships: []
      }
      email_automation_config: {
        Row: {
          cron_secret: string
          id: boolean
          updated_at: string
        }
        Insert: {
          cron_secret?: string
          id?: boolean
          updated_at?: string
        }
        Update: {
          cron_secret?: string
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      email_automation_log: {
        Row: {
          attempts: number
          created_at: string
          customer_email: string
          dry_run: boolean
          error: string | null
          id: string
          resend_message_id: string | null
          sent_at: string | null
          sequence_type: Database["public"]["Enums"]["email_sequence_type"]
          skip_reason: string | null
          status: Database["public"]["Enums"]["email_send_status"]
          step: number
          trigger_ref: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          customer_email: string
          dry_run?: boolean
          error?: string | null
          id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          sequence_type: Database["public"]["Enums"]["email_sequence_type"]
          skip_reason?: string | null
          status: Database["public"]["Enums"]["email_send_status"]
          step: number
          trigger_ref: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          customer_email?: string
          dry_run?: boolean
          error?: string | null
          id?: string
          resend_message_id?: string | null
          sent_at?: string | null
          sequence_type?: Database["public"]["Enums"]["email_sequence_type"]
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["email_send_status"]
          step?: number
          trigger_ref?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          behavioral_emails_enabled: boolean
          created_at: string
          customer_email: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          behavioral_emails_enabled?: boolean
          created_at?: string
          customer_email: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          behavioral_emails_enabled?: boolean
          created_at?: string
          customer_email?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_sequence_settings: {
        Row: {
          enabled: boolean
          sequence_type: Database["public"]["Enums"]["email_sequence_type"]
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          sequence_type: Database["public"]["Enums"]["email_sequence_type"]
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          sequence_type?: Database["public"]["Enums"]["email_sequence_type"]
          updated_at?: string
        }
        Relationships: []
      }
      grant_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          failed_count: number
          granted_count: number
          id: string
          reason: string
          recipient_count: number
          skipped_count: number
          status: string
          summary: string
          type: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          granted_count?: number
          id?: string
          reason: string
          recipient_count?: number
          skipped_count?: number
          status?: string
          summary: string
          type: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          failed_count?: number
          granted_count?: number
          id?: string
          reason?: string
          recipient_count?: number
          skipped_count?: number
          status?: string
          summary?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_downloads: {
        Row: {
          downloaded_at: string
          id: string
          product_id: string
          user_id: string
          version: string | null
        }
        Insert: {
          downloaded_at?: string
          id?: string
          product_id: string
          user_id: string
          version?: string | null
        }
        Update: {
          downloaded_at?: string
          id?: string
          product_id?: string
          user_id?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_downloads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_claims: {
        Row: {
          claimed_at: string
          id: string
          matched_email: string
          order_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          matched_email: string
          order_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          matched_email?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_customer_identity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_revenue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_claims_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          cover_gradient: string | null
          cover_url: string | null
          created_at: string
          id: string
          name: string
          order_id: string
          price: number
          product_id: string | null
          product_slug: string | null
        }
        Insert: {
          cover_gradient?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          name: string
          order_id: string
          price: number
          product_id?: string | null
          product_slug?: string | null
        }
        Update: {
          cover_gradient?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          name?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_customer_identity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_revenue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          confirmation_email_sent_at: string | null
          created_at: string
          credit_applied_cents: number
          customer_id: string | null
          customer_name: string | null
          discount: number
          discount_code: string | null
          download_count: number
          guest_email: string | null
          id: string
          number: string
          pw_cid: string | null
          refund_note: string | null
          refund_reason: string | null
          refunded_amount_cents: number
          refunded_at: string | null
          refunded_by: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_id: string | null
          stripe_refund_id: string | null
          stripe_session_id: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          confirmation_email_sent_at?: string | null
          created_at?: string
          credit_applied_cents?: number
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          discount_code?: string | null
          download_count?: number
          guest_email?: string | null
          id?: string
          number: string
          pw_cid?: string | null
          refund_note?: string | null
          refund_reason?: string | null
          refunded_amount_cents?: number
          refunded_at?: string | null
          refunded_by?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          confirmation_email_sent_at?: string | null
          created_at?: string
          credit_applied_cents?: number
          customer_id?: string | null
          customer_name?: string | null
          discount?: number
          discount_code?: string | null
          download_count?: number
          guest_email?: string | null
          id?: string
          number?: string
          pw_cid?: string | null
          refund_note?: string | null
          refund_reason?: string | null
          refunded_amount_cents?: number
          refunded_at?: string | null
          refunded_by?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_id?: string | null
          stripe_refund_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_events"
            referencedColumns: ["id"]
          },
        ]
      }
      plugin_grants: {
        Row: {
          acknowledged_at: string | null
          batch_id: string | null
          created_at: string
          customer_id: string
          granted_at: string
          granted_by: string | null
          id: string
          product_id: string
          reason: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          batch_id?: string | null
          created_at?: string
          customer_id: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          product_id: string
          reason: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          batch_id?: string | null
          created_at?: string
          customer_id?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          product_id?: string
          reason?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plugin_grants_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "grant_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_grants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plugin_grants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_file_acknowledgements: {
        Row: {
          acknowledged_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          acknowledged_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          acknowledged_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_file_acknowledgements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_files: {
        Row: {
          created_at: string
          file_updated_at: string
          product_id: string
          updated_at: string
          zip_file_name: string | null
          zip_url: string | null
        }
        Insert: {
          created_at?: string
          file_updated_at?: string
          product_id: string
          updated_at?: string
          zip_file_name?: string | null
          zip_url?: string | null
        }
        Update: {
          created_at?: string
          file_updated_at?: string
          product_id?: string
          updated_at?: string
          zip_file_name?: string | null
          zip_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_files_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          compare_at_price: number | null
          cover_gradient: string | null
          cover_url: string | null
          created_at: string
          daws: string[]
          description: string | null
          file_size: string | null
          formats: string[]
          id: string
          is_bestseller: boolean
          is_featured: boolean
          is_free: boolean
          is_new: boolean
          library_type: string | null
          maker: string
          name: string
          platforms: string[]
          price: number
          published_at: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          sub_type: string | null
          supports_mac: boolean
          supports_windows: boolean
          tagline: string | null
          tags: string[]
          updated_at: string
          version: string | null
        }
        Insert: {
          category: string
          compare_at_price?: number | null
          cover_gradient?: string | null
          cover_url?: string | null
          created_at?: string
          daws?: string[]
          description?: string | null
          file_size?: string | null
          formats?: string[]
          id?: string
          is_bestseller?: boolean
          is_featured?: boolean
          is_free?: boolean
          is_new?: boolean
          library_type?: string | null
          maker: string
          name: string
          platforms?: string[]
          price?: number
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          sub_type?: string | null
          supports_mac?: boolean
          supports_windows?: boolean
          tagline?: string | null
          tags?: string[]
          updated_at?: string
          version?: string | null
        }
        Update: {
          category?: string
          compare_at_price?: number | null
          cover_gradient?: string | null
          cover_url?: string | null
          created_at?: string
          daws?: string[]
          description?: string | null
          file_size?: string | null
          formats?: string[]
          id?: string
          is_bestseller?: boolean
          is_featured?: boolean
          is_free?: boolean
          is_new?: boolean
          library_type?: string | null
          maker?: string
          name?: string
          platforms?: string[]
          price?: number
          published_at?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          sub_type?: string | null
          supports_mac?: boolean
          supports_windows?: boolean
          tagline?: string | null
          tags?: string[]
          updated_at?: string
          version?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          location: string | null
          marketing_prefs: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          location?: string | null
          marketing_prefs?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          marketing_prefs?: Json
          updated_at?: string
        }
        Relationships: []
      }
      sale_event_products: {
        Row: {
          product_id: string
          sale_event_id: string
        }
        Insert: {
          product_id: string
          sale_event_id: string
        }
        Update: {
          product_id?: string
          sale_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_event_products_sale_event_id_fkey"
            columns: ["sale_event_id"]
            isOneToOne: false
            referencedRelation: "sale_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_event_stats: {
        Row: {
          created_at: string
          revenue: number
          sale_event_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          revenue?: number
          sale_event_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          revenue?: number
          sale_event_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_event_stats_sale_event_id_fkey"
            columns: ["sale_event_id"]
            isOneToOne: true
            referencedRelation: "sale_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_events: {
        Row: {
          categories: string[]
          created_at: string
          discount_pct: number
          end_at: string
          headline: string | null
          id: string
          name: string
          scope: Database["public"]["Enums"]["sale_scope"]
          slug: string
          start_at: string
          status: Database["public"]["Enums"]["sale_event_status"]
          subheadline: string | null
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          categories?: string[]
          created_at?: string
          discount_pct?: number
          end_at: string
          headline?: string | null
          id?: string
          name: string
          scope?: Database["public"]["Enums"]["sale_scope"]
          slug: string
          start_at: string
          status?: Database["public"]["Enums"]["sale_event_status"]
          subheadline?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          categories?: string[]
          created_at?: string
          discount_pct?: number
          end_at?: string
          headline?: string | null
          id?: string
          name?: string
          scope?: Database["public"]["Enums"]["sale_scope"]
          slug?: string
          start_at?: string
          status?: Database["public"]["Enums"]["sale_event_status"]
          subheadline?: string | null
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_items: {
        Row: {
          id: string
          price_at_save: number | null
          product_id: string
          saved_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          price_at_save?: number | null
          product_id: string
          saved_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          price_at_save?: number | null
          product_id?: string
          saved_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_credit_ledger: {
        Row: {
          amount_cents: number
          batch_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          idempotency_key: string | null
          order_id: string | null
          reason: string | null
          type: Database["public"]["Enums"]["store_credit_type"]
        }
        Insert: {
          amount_cents: number
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          idempotency_key?: string | null
          order_id?: string | null
          reason?: string | null
          type: Database["public"]["Enums"]["store_credit_type"]
        }
        Update: {
          amount_cents?: number
          batch_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          idempotency_key?: string | null
          order_id?: string | null
          reason?: string | null
          type?: Database["public"]["Enums"]["store_credit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "store_credit_ledger_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "grant_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credit_ledger_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_customer_identity"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "store_credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_revenue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_credit_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      store_credit_reservations: {
        Row: {
          created_at: string
          customer_id: string
          id: string
          reserved_cents: number
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          id?: string
          reserved_cents: number
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          id?: string
          reserved_cents?: number
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_credit_reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_pageviews: {
        Row: {
          created_at: string
          id: number
          is_bot: boolean
          path: string
          referrer: string | null
          visitor_hash: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          is_bot?: boolean
          path: string
          referrer?: string | null
          visitor_hash?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          is_bot?: boolean
          path?: string
          referrer?: string | null
          visitor_hash?: string | null
        }
        Relationships: []
      }
      stripe_webhook_events: {
        Row: {
          created_at: string
          event_id: string
          event_type: string
          processed_at: string | null
          received_at: string
          session_id: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          event_type: string
          processed_at?: string | null
          received_at?: string
          session_id?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          event_type?: string
          processed_at?: string | null
          received_at?: string
          session_id?: string | null
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
      order_customer_identity: {
        Row: {
          created_at: string | null
          first_order_at: string | null
          is_first_order: boolean | null
          normalized_email: string | null
          order_id: string | null
          order_index: number | null
          refunded_amount_cents: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          total: number | null
        }
        Relationships: []
      }
      order_revenue: {
        Row: {
          counts_as_sale: boolean | null
          created_at: string | null
          customer_id: string | null
          customer_name: string | null
          discount_code: string | null
          guest_email: string | null
          id: string | null
          is_fully_refunded: boolean | null
          net_cents: number | null
          net_total: number | null
          number: string | null
          pw_cid: string | null
          refunded_amount_cents: number | null
          sale_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total: number | null
          total_cents: number | null
          user_id: string | null
          utm_campaign: string | null
          utm_source: string | null
        }
        Insert: {
          counts_as_sale?: never
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_code?: string | null
          guest_email?: string | null
          id?: string | null
          is_fully_refunded?: never
          net_cents?: never
          net_total?: never
          number?: string | null
          pw_cid?: string | null
          refunded_amount_cents?: number | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total?: number | null
          total_cents?: never
          user_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Update: {
          counts_as_sale?: never
          created_at?: string | null
          customer_id?: string | null
          customer_name?: string | null
          discount_code?: string | null
          guest_email?: string | null
          id?: string | null
          is_fully_refunded?: never
          net_cents?: never
          net_total?: never
          number?: string | null
          pw_cid?: string | null
          refunded_amount_cents?: number | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total?: number | null
          total_cents?: never
          user_id?: string | null
          utm_campaign?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sale_events"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      acknowledge_plugin_grants: {
        Args: { _product_ids: string[] }
        Returns: undefined
      }
      acknowledge_product_files: {
        Args: { _product_ids: string[] }
        Returns: undefined
      }
      admin_behavioral_email_stats: {
        Args: { _from: string; _to: string }
        Returns: Json
      }
      admin_campaign_link_stats: {
        Args: never
        Returns: {
          clicks: number
          link_id: string
          purchases: number
        }[]
      }
      admin_customer_list: {
        Args: {
          _filter?: string
          _limit?: number
          _offset?: number
          _q?: string
          _sort?: string
        }
        Returns: {
          completed_count: number
          customer_id: string
          email: string
          first_order_at: string
          has_account: boolean
          key: string
          last_order_at: string
          name: string
          orders_count: number
          total_count: number
          total_spent: number
          user_id: string
        }[]
      }
      admin_customer_stats: {
        Args: never
        Returns: {
          new_this_month: number
          total_customers: number
        }[]
      }
      admin_grant_store_credit: {
        Args: {
          _amount_cents: number
          _customer_id: string
          _reason: string
          _type?: Database["public"]["Enums"]["store_credit_type"]
        }
        Returns: number
      }
      admin_new_customers_this_month: { Args: never; Returns: number }
      claim_my_orders: { Args: never; Returns: number }
      consume_store_credit: {
        Args: {
          _customer_id: string
          _idempotency_key: string
          _max_cents: number
          _order_id: string
          _session_id?: string
        }
        Returns: number
      }
      get_bestseller_product_ids: {
        Args: { _limit?: number }
        Returns: {
          orders: number
          product_id: string
        }[]
      }
      get_my_product_file_updates: {
        Args: never
        Returns: {
          acknowledged_at: string
          file_updated_at: string
          product_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_order_number: { Args: never; Returns: string }
      record_order_refund: {
        Args: {
          _by?: string
          _note?: string
          _order_id: string
          _refunded_total_cents: number
          _stripe_refund_id?: string
        }
        Returns: {
          net_cents: number
          order_id: string
          refunded_amount_cents: number
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      release_credit_reservation: {
        Args: { _session_id: string }
        Returns: undefined
      }
      reset_campaign_group_clicks: {
        Args: { _group_id: string }
        Returns: number
      }
      reset_campaign_link_clicks: {
        Args: { _link_id: string }
        Returns: number
      }
      store_credit_balance: { Args: { _customer_id: string }; Returns: number }
      storefront_traffic_metrics: {
        Args: {
          _bucket_ends: string[]
          _bucket_starts: string[]
          _end_at: string
          _start_at: string
        }
        Returns: {
          pageviews: number
          session_buckets: number[]
          tracking_started_at: string
          unique_sessions: number
        }[]
      }
      storefront_visit_metrics: {
        Args: { _end_at: string; _start_at: string }
        Returns: {
          pageviews: number
          unique_sessions: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      customer_status: "active" | "refunded" | "banned"
      discount_status: "active" | "expired" | "disabled" | "archived"
      discount_type: "percent" | "flat"
      email_send_status: "sent" | "failed" | "skipped"
      email_sequence_type: "abandoned_cart" | "saved_items"
      order_status: "completed" | "refunded" | "partial" | "pending"
      product_status: "published" | "draft" | "archived"
      sale_event_status: "active" | "scheduled" | "ended" | "draft"
      sale_scope: "all" | "selected" | "categories"
      store_credit_type: "grant" | "spend" | "adjustment" | "reversal"
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
      app_role: ["admin", "customer"],
      customer_status: ["active", "refunded", "banned"],
      discount_status: ["active", "expired", "disabled", "archived"],
      discount_type: ["percent", "flat"],
      email_send_status: ["sent", "failed", "skipped"],
      email_sequence_type: ["abandoned_cart", "saved_items"],
      order_status: ["completed", "refunded", "partial", "pending"],
      product_status: ["published", "draft", "archived"],
      sale_event_status: ["active", "scheduled", "ended", "draft"],
      sale_scope: ["all", "selected", "categories"],
      store_credit_type: ["grant", "spend", "adjustment", "reversal"],
    },
  },
} as const
