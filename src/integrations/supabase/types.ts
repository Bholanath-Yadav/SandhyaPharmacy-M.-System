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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          credit_limit: number | null
          current_balance: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          credit_limit?: number | null
          current_balance?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          receipt_url: string | null
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_url?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          receipt_url?: string | null
        }
        Relationships: []
      }
      ledger: {
        Row: {
          balance: number | null
          created_at: string
          credit: number | null
          debit: number | null
          description: string
          id: string
          reference_id: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          balance?: number | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description: string
          id?: string
          reference_id?: string | null
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          balance?: number | null
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string
          id?: string
          reference_id?: string | null
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: []
      }
      medicine_batches: {
        Row: {
          batch_number: string
          created_at: string
          expiry_date: string
          id: string
          medicine_id: string
          min_stock_level: number | null
          mrp: number | null
          purchase_price: number
          quantity: number
          selling_price: number
          updated_at: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          expiry_date: string
          id?: string
          medicine_id: string
          min_stock_level?: number | null
          mrp?: number | null
          purchase_price: number
          quantity?: number
          selling_price: number
          updated_at?: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          expiry_date?: string
          id?: string
          medicine_id?: string
          min_stock_level?: number | null
          mrp?: number | null
          purchase_price?: number
          quantity?: number
          selling_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_batches_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          barcode: string | null
          category: Database["public"]["Enums"]["medicine_category"]
          created_at: string
          description: string | null
          generic_name: string | null
          id: string
          is_active: boolean | null
          manufacturer: string | null
          name: string
          rack_no: string | null
          requires_prescription: boolean | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: Database["public"]["Enums"]["medicine_category"]
          created_at?: string
          description?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          name: string
          rack_no?: string | null
          requires_prescription?: boolean | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: Database["public"]["Enums"]["medicine_category"]
          created_at?: string
          description?: string | null
          generic_name?: string | null
          id?: string
          is_active?: boolean | null
          manufacturer?: string | null
          name?: string
          rack_no?: string | null
          requires_prescription?: boolean | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_type: string
          reference_id: string
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_type: string
          reference_id: string
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_type?: string
          reference_id?: string
          reference_number?: string | null
        }
        Relationships: []
      }
      pharmacy_profile: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          logo_url: string | null
          name: string
          pan_number: string | null
          phone: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          banned_by: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_banned: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_banned?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          banned_by?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_banned?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          batch_id: string | null
          created_at: string
          id: string
          medicine_id: string
          purchase_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          medicine_id: string
          purchase_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          medicine_id?: string
          purchase_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "medicine_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          created_by: string | null
          due_amount: number | null
          id: string
          invoice_date: string | null
          notes: string | null
          paid_amount: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          purchase_number: string
          subtotal: number
          supplier_id: string | null
          total_amount: number
          vat_amount: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_amount?: number | null
          id?: string
          invoice_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          purchase_number: string
          subtotal?: number
          supplier_id?: string | null
          total_amount?: number
          vat_amount?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_amount?: number | null
          id?: string
          invoice_date?: string | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          purchase_number?: string
          subtotal?: number
          supplier_id?: string | null
          total_amount?: number
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          batch_id: string
          created_at: string
          discount_percent: number | null
          id: string
          invoice_id: string
          medicine_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          discount_percent?: number | null
          id?: string
          invoice_id: string
          medicine_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          discount_percent?: number | null
          id?: string
          invoice_id?: string
          medicine_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "medicine_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number | null
          doctor_name: string | null
          due_amount: number | null
          id: string
          invoice_number: string
          is_vat_inclusive: boolean | null
          notes: string | null
          paid_amount: number | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          prescription_image_url: string | null
          prescription_reference: string | null
          subtotal: number
          total_amount: number
          vat_amount: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          doctor_name?: string | null
          due_amount?: number | null
          id?: string
          invoice_number: string
          is_vat_inclusive?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          prescription_image_url?: string | null
          prescription_reference?: string | null
          subtotal?: number
          total_amount?: number
          vat_amount?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          doctor_name?: string | null
          due_amount?: number | null
          id?: string
          invoice_number?: string
          is_vat_inclusive?: boolean | null
          notes?: string | null
          paid_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          prescription_image_url?: string | null
          prescription_reference?: string | null
          subtotal?: number
          total_amount?: number
          vat_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          current_balance: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          pan_number: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          pan_number?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          current_balance?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          pan_number?: string | null
          phone?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_invoice_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_main_admin: { Args: { _user_id: string }; Returns: boolean }
      upsert_medicine_batch: {
        Args: {
          p_batch_number: string
          p_expiry_date: string
          p_medicine_id: string
          p_min_stock_level?: number
          p_mrp?: number
          p_purchase_price: number
          p_quantity: number
          p_selling_price: number
        }
        Returns: {
          id: string
          new_quantity: number
          was_updated: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "main_admin"
      medicine_category:
        | "tablet"
        | "capsule"
        | "syrup"
        | "injection"
        | "cream"
        | "drops"
        | "powder"
        | "inhaler"
        | "other"
      payment_method: "cash" | "card" | "esewa" | "khalti" | "bank"
      transaction_type:
        | "sale"
        | "purchase"
        | "payment_received"
        | "payment_made"
        | "expense"
        | "refund"
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
      app_role: ["admin", "staff", "main_admin"],
      medicine_category: [
        "tablet",
        "capsule",
        "syrup",
        "injection",
        "cream",
        "drops",
        "powder",
        "inhaler",
        "other",
      ],
      payment_method: ["cash", "card", "esewa", "khalti", "bank"],
      transaction_type: [
        "sale",
        "purchase",
        "payment_received",
        "payment_made",
        "expense",
        "refund",
      ],
    },
  },
} as const
