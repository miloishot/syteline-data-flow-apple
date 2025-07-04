export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          permissions: Json | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permissions?: Json | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          permissions?: Json | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_configs: {
        Row: {
          base_url: string
          config_name: string
          created_at: string | null
          encrypted_config: string
          id: string
          is_default: boolean | null
          updated_at: string | null
          user_id: string | null
          username: string
        }
        Insert: {
          base_url: string
          config_name: string
          created_at?: string | null
          encrypted_config: string
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          username: string
        }
        Update: {
          base_url?: string
          config_name?: string
          created_at?: string | null
          encrypted_config?: string
          id?: string
          is_default?: boolean | null
          updated_at?: string | null
          user_id?: string | null
          username?: string
        }
        Relationships: []
      }
      execution_history: {
        Row: {
          error_message: string | null
          executed_at: string | null
          execution_time_ms: number | null
          file_path: string | null
          filters_applied: Json | null
          id: string
          job_name: string
          record_count: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          file_path?: string | null
          filters_applied?: Json | null
          id?: string
          job_name: string
          record_count?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          execution_time_ms?: number | null
          file_path?: string | null
          filters_applied?: Json | null
          id?: string
          job_name?: string
          record_count?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      export_data: {
        Row: {
          created_at: string | null
          expires_at: string | null
          export_data: Json
          file_size_bytes: number | null
          id: string
          is_shared: boolean | null
          job_name: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          export_data: Json
          file_size_bytes?: number | null
          id?: string
          is_shared?: boolean | null
          job_name: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          export_data?: Json
          file_size_bytes?: number | null
          id?: string
          is_shared?: boolean | null
          job_name?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      global_config: {
        Row: {
          config_key: string
          config_value: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          updated_at: string | null
        }
        Insert: {
          config_key: string
          config_value: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          config_key?: string
          config_value?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      jobs: {
        Row: {
          created_at: string | null
          filterable_fields: Json
          id: string
          ido_name: string
          is_shared: boolean | null
          is_template: boolean | null
          job_name: string
          output_format: string
          query_params: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          filterable_fields: Json
          id: string
          ido_name: string
          is_shared?: boolean | null
          is_template?: boolean | null
          job_name: string
          output_format: string
          query_params: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          filterable_fields?: Json
          id?: string
          ido_name?: string
          is_shared?: boolean | null
          is_template?: boolean | null
          job_name?: string
          output_format?: string
          query_params?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          company: string | null
          created_at: string | null
          department: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          department?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
