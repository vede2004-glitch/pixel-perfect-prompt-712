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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      broadcasts: {
        Row: {
          audio_script: string | null
          created_at: string | null
          id: string
          mode: string | null
          profile_id: string | null
          script: string | null
          settings: Json | null
          status: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          audio_script?: string | null
          created_at?: string | null
          id?: string
          mode?: string | null
          profile_id?: string | null
          script?: string | null
          settings?: Json | null
          status?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          audio_script?: string | null
          created_at?: string | null
          id?: string
          mode?: string | null
          profile_id?: string | null
          script?: string | null
          settings?: Json | null
          status?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "radio_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_items: {
        Row: {
          category: string | null
          city: string | null
          content: string | null
          created_at: string | null
          group_id: string | null
          id: string
          is_b2b_only: boolean | null
          link: string
          published_at: string | null
          source: string
          summary: string | null
          title: string
        }
        Insert: {
          category?: string | null
          city?: string | null
          content?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_b2b_only?: boolean | null
          link: string
          published_at?: string | null
          source: string
          summary?: string | null
          title: string
        }
        Update: {
          category?: string | null
          city?: string | null
          content?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          is_b2b_only?: boolean | null
          link?: string
          published_at?: string | null
          source?: string
          summary?: string | null
          title?: string
        }
        Relationships: []
      }
      radio_profile_sources: {
        Row: {
          created_at: string
          is_enabled: boolean
          profile_id: string
          source_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_enabled?: boolean
          profile_id: string
          source_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_enabled?: boolean
          profile_id?: string
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_profile_sources_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "radio_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_profile_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "rss_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_profiles: {
        Row: {
          city: string
          colorful_count: number
          created_at: string | null
          frequency: string | null
          id: string
          intro_text: string | null
          local_count: number | null
          name: string
          national_count: number | null
          prompt_instructions: string | null
          sport_count: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          city: string
          colorful_count?: number
          created_at?: string | null
          frequency?: string | null
          id?: string
          intro_text?: string | null
          local_count?: number | null
          name: string
          national_count?: number | null
          prompt_instructions?: string | null
          sport_count?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string
          colorful_count?: number
          created_at?: string | null
          frequency?: string | null
          id?: string
          intro_text?: string | null
          local_count?: number | null
          name?: string
          national_count?: number | null
          prompt_instructions?: string | null
          sport_count?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      rss_sources: {
        Row: {
          category: string
          city: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_global: boolean
          name: string
          url: string
          user_id: string | null
        }
        Insert: {
          category?: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean
          name: string
          url: string
          user_id?: string | null
        }
        Update: {
          category?: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean
          name?: string
          url?: string
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
    Enums: {},
  },
} as const
