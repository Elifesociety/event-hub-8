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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_permissions: {
        Row: {
          admin_id: string
          can_create: boolean | null
          can_delete: boolean | null
          can_read: boolean | null
          can_update: boolean | null
          created_at: string | null
          id: string
          module: Database["public"]["Enums"]["app_module"]
        }
        Insert: {
          admin_id: string
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string | null
          id?: string
          module: Database["public"]["Enums"]["app_module"]
        }
        Update: {
          admin_id?: string
          can_create?: boolean | null
          can_delete?: boolean | null
          can_read?: boolean | null
          can_update?: boolean | null
          created_at?: string | null
          id?: string
          module?: Database["public"]["Enums"]["app_module"]
        }
        Relationships: [
          {
            foreignKeyName: "admin_permissions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          password_hash: string
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          password_hash: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          password_hash?: string
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      billing_transactions: {
        Row: {
          created_at: string | null
          customer_mobile: string | null
          customer_name: string | null
          id: string
          items: Json
          receipt_number: string
          remarks: string | null
          serial_number: number | null
          stall_id: string
          status: string
          subtotal: number
          total: number
        }
        Insert: {
          created_at?: string | null
          customer_mobile?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          receipt_number: string
          remarks?: string | null
          serial_number?: number | null
          stall_id: string
          status?: string
          subtotal: number
          total: number
        }
        Update: {
          created_at?: string | null
          customer_mobile?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          receipt_number?: string
          remarks?: string | null
          serial_number?: number | null
          stall_id?: string
          status?: string
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_transactions_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "stalls"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_registrations: {
        Row: {
          created_at: string
          id: string
          mobile: string
          name: string
          panchayath_id: string | null
          place: string
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mobile: string
          name: string
          panchayath_id?: string | null
          place: string
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mobile?: string
          name?: string
          panchayath_id?: string | null
          place?: string
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_registrations_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_registrations_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      food_coupon_bookings: {
        Row: {
          created_at: string
          food_option_id: string
          id: string
          mobile: string
          name: string
          panchayath_id: string
          quantity: number
          status: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          food_option_id: string
          id?: string
          mobile: string
          name: string
          panchayath_id: string
          quantity?: number
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          food_option_id?: string
          id?: string
          mobile?: string
          name?: string
          panchayath_id?: string
          quantity?: number
          status?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_coupon_bookings_food_option_id_fkey"
            columns: ["food_option_id"]
            isOneToOne: false
            referencedRelation: "food_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_coupon_bookings_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
        ]
      }
      food_options: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      panchayaths: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_paid: number
          created_at: string | null
          id: string
          margin_deducted: number | null
          narration: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          stall_id: string | null
          total_billed: number | null
        }
        Insert: {
          amount_paid: number
          created_at?: string | null
          id?: string
          margin_deducted?: number | null
          narration?: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          stall_id?: string | null
          total_billed?: number | null
        }
        Update: {
          amount_paid?: number
          created_at?: string | null
          id?: string
          margin_deducted?: number | null
          narration?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          stall_id?: string | null
          total_billed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "stalls"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          cost_price: number
          created_at: string | null
          event_margin: number | null
          id: string
          item_name: string
          product_number: string | null
          selling_price: number | null
          stall_id: string
          updated_at: string | null
        }
        Insert: {
          cost_price: number
          created_at?: string | null
          event_margin?: number | null
          id?: string
          item_name: string
          product_number?: string | null
          selling_price?: number | null
          stall_id: string
          updated_at?: string | null
        }
        Update: {
          cost_price?: number
          created_at?: string | null
          event_margin?: number | null
          id?: string
          item_name?: string
          product_number?: string | null
          selling_price?: number | null
          stall_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "stalls"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          created_at: string | null
          date: string
          description: string | null
          end_time: string
          id: string
          location_details: string | null
          name: string
          start_time: string
          updated_at: string | null
          venue: string
        }
        Insert: {
          created_at?: string | null
          date: string
          description?: string | null
          end_time: string
          id?: string
          location_details?: string | null
          name: string
          start_time: string
          updated_at?: string | null
          venue: string
        }
        Update: {
          created_at?: string | null
          date?: string
          description?: string | null
          end_time?: string
          id?: string
          location_details?: string | null
          name?: string
          start_time?: string
          updated_at?: string | null
          venue?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          id: string
          mobile: string | null
          name: string
          panchayath_id: string | null
          receipt_number: string | null
          registration_type: Database["public"]["Enums"]["registration_type"]
          ward_id: string | null
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string | null
          id?: string
          mobile?: string | null
          name: string
          panchayath_id?: string | null
          receipt_number?: string | null
          registration_type: Database["public"]["Enums"]["registration_type"]
          ward_id?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          id?: string
          mobile?: string | null
          name?: string
          panchayath_id?: string | null
          receipt_number?: string | null
          registration_type?: Database["public"]["Enums"]["registration_type"]
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          bill_id: string
          created_at: string
          id: string
          items: Json
          reason: string | null
          return_amount: number
          return_number: string
          stall_id: string
        }
        Insert: {
          bill_id: string
          created_at?: string
          id?: string
          items?: Json
          reason?: string | null
          return_amount?: number
          return_number: string
          stall_id: string
        }
        Update: {
          bill_id?: string
          created_at?: string
          id?: string
          items?: Json
          reason?: string | null
          return_amount?: number
          return_number?: string
          stall_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "billing_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_stall_id_fkey"
            columns: ["stall_id"]
            isOneToOne: false
            referencedRelation: "stalls"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_enquiries: {
        Row: {
          created_at: string
          id: string
          mobile: string
          name: string
          panchayath_id: string | null
          responses: Json
          status: string | null
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mobile: string
          name: string
          panchayath_id?: string | null
          responses?: Json
          status?: string | null
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mobile?: string
          name?: string
          panchayath_id?: string | null
          responses?: Json
          status?: string | null
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stall_enquiries_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_enquiries_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_enquiry_fields: {
        Row: {
          conditional_value: string | null
          created_at: string
          display_order: number | null
          field_label: string
          field_type: string
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options: Json | null
          show_conditional_on: string | null
          updated_at: string
        }
        Insert: {
          conditional_value?: string | null
          created_at?: string
          display_order?: number | null
          field_label: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          show_conditional_on?: string | null
          updated_at?: string
        }
        Update: {
          conditional_value?: string | null
          created_at?: string
          display_order?: number | null
          field_label?: string
          field_type?: string
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          show_conditional_on?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stall_enquiry_help_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          mobile: string | null
          name: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          mobile?: string | null
          name?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          mobile?: string | null
          name?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      stalls: {
        Row: {
          counter_name: string
          counter_number: string | null
          created_at: string | null
          email: string | null
          id: string
          is_verified: boolean | null
          mobile: string | null
          panchayath_id: string | null
          participant_name: string
          registration_fee: number | null
          updated_at: string | null
        }
        Insert: {
          counter_name: string
          counter_number?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          mobile?: string | null
          panchayath_id?: string | null
          participant_name: string
          registration_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          counter_name?: string
          counter_number?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean | null
          mobile?: string | null
          panchayath_id?: string | null
          participant_name?: string
          registration_fee?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stalls_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_content: {
        Row: {
          content_text: string | null
          content_type: string
          content_url: string | null
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      survey_shares: {
        Row: {
          id: string
          mobile: string
          name: string
          panchayath_id: string
          shared_at: string
          view_count: number | null
          ward_id: string
        }
        Insert: {
          id?: string
          mobile: string
          name: string
          panchayath_id: string
          shared_at?: string
          view_count?: number | null
          ward_id: string
        }
        Update: {
          id?: string
          mobile?: string
          name?: string
          panchayath_id?: string
          shared_at?: string
          view_count?: number | null
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_shares_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_shares_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          mobile: string | null
          name: string
          responsibilities: string | null
          role: Database["public"]["Enums"]["team_role"]
          shift_details: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          mobile?: string | null
          name: string
          responsibilities?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          shift_details?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          mobile?: string | null
          name?: string
          responsibilities?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          shift_details?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      wards: {
        Row: {
          created_at: string
          id: string
          panchayath_id: string
          updated_at: string
          ward_name: string | null
          ward_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          panchayath_id: string
          updated_at?: string
          ward_name?: string | null
          ward_number: string
        }
        Update: {
          created_at?: string
          id?: string
          panchayath_id?: string
          updated_at?: string
          ward_name?: string | null
          ward_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_panchayath_id_fkey"
            columns: ["panchayath_id"]
            isOneToOne: false
            referencedRelation: "panchayaths"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      admin_role: "super_admin" | "admin"
      app_module:
        | "billing"
        | "team"
        | "programs"
        | "accounts"
        | "food_court"
        | "photos"
        | "registrations"
        | "survey"
        | "stall_enquiry"
        | "food_coupon"
        | "customers"
      payment_type: "participant" | "other"
      registration_type:
        | "stall_counter"
        | "employment_booking"
        | "employment_registration"
      team_role: "administration" | "volunteer" | "stage_crew" | "stall_crew"
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
      admin_role: ["super_admin", "admin"],
      app_module: [
        "billing",
        "team",
        "programs",
        "accounts",
        "food_court",
        "photos",
        "registrations",
        "survey",
        "stall_enquiry",
        "food_coupon",
        "customers",
      ],
      payment_type: ["participant", "other"],
      registration_type: [
        "stall_counter",
        "employment_booking",
        "employment_registration",
      ],
      team_role: ["administration", "volunteer", "stage_crew", "stall_crew"],
    },
  },
} as const
