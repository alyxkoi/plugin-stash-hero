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
      discount_codes: {
        Row: {
          applies_to: string
          code: string
          created_at: string
          expires_at: string | null
          id: string
          status: Database["public"]["Enums"]["discount_status"]
          type: Database["public"]["Enums"]["discount_type"]
          updated_at: string
          usage_limit: number | null
          uses: number
          value: number
        }
        Insert: {
          applies_to?: string
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["discount_status"]
          type: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          usage_limit?: number | null
          uses?: number
          value: number
        }
        Update: {
          applies_to?: string
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["discount_status"]
          type?: Database["public"]["Enums"]["discount_type"]
          updated_at?: string
          usage_limit?: number | null
          uses?: number
          value?: number
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
          created_at: string
          customer_id: string | null
          discount: number
          discount_code: string | null
          download_count: number
          guest_email: string | null
          id: string
          number: string
          refund_reason: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_id: string | null
          stripe_session_id: string | null
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
          utm_source: string | null
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          discount_code?: string | null
          download_count?: number
          guest_email?: string | null
          id?: string
          number: string
          refund_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
          utm_source?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          discount?: number
          discount_code?: string | null
          download_count?: number
          guest_email?: string | null
          id?: string
          number?: string
          refund_reason?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
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
        ]
      }
      product_files: {
        Row: {
          created_at: string
          product_id: string
          updated_at: string
          zip_file_name: string | null
          zip_url: string | null
        }
        Insert: {
          created_at?: string
          product_id: string
          updated_at?: string
          zip_file_name?: string | null
          zip_url?: string | null
        }
        Update: {
          created_at?: string
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
          maker: string
          name: string
          price: number
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          sub_type: string | null
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
          maker: string
          name: string
          price?: number
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          sub_type?: string | null
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
          maker?: string
          name?: string
          price?: number
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          sub_type?: string | null
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
          id: string
          location: string | null
          marketing_prefs: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          location?: string | null
          marketing_prefs?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
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
          user_id: string
        }
        Insert: {
          id?: string
          price_at_save?: number | null
          product_id: string
          saved_at?: string
          user_id: string
        }
        Update: {
          id?: string
          price_at_save?: number | null
          product_id?: string
          saved_at?: string
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
      next_order_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "customer"
      customer_status: "active" | "refunded" | "banned"
      discount_status: "active" | "expired" | "disabled"
      discount_type: "percent" | "flat"
      order_status: "completed" | "refunded" | "partial" | "pending"
      product_status: "published" | "draft" | "archived"
      sale_event_status: "active" | "scheduled" | "ended" | "draft"
      sale_scope: "all" | "selected" | "categories"
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
      app_role: ["admin", "customer"],
      customer_status: ["active", "refunded", "banned"],
      discount_status: ["active", "expired", "disabled"],
      discount_type: ["percent", "flat"],
      order_status: ["completed", "refunded", "partial", "pending"],
      product_status: ["published", "draft", "archived"],
      sale_event_status: ["active", "scheduled", "ended", "draft"],
      sale_scope: ["all", "selected", "categories"],
    },
  },
} as const
