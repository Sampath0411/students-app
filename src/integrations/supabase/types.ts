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
      announcements: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          id: string
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      assignment_grades: {
        Row: {
          assignment_id: string
          feedback: string | null
          graded_at: string
          graded_by: string | null
          id: string
          max_score: number | null
          score: number | null
          student_id: string
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          graded_at?: string
          graded_by?: string | null
          id?: string
          max_score?: number | null
          score?: number | null
          student_id: string
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          graded_at?: string
          graded_by?: string | null
          id?: string
          max_score?: number | null
          score?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          file_name: string | null
          file_url: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_url?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          marked_by: string | null
          period_label: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject: string | null
          timetable_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          period_label?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          subject?: string | null
          timetable_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          period_label?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          subject?: string | null
          timetable_id?: string | null
        }
        Relationships: []
      }
      attendance_audit: {
        Row: {
          action: string
          attendance_id: string | null
          changed_by: string | null
          created_at: string
          date: string
          id: string
          new_status: Database["public"]["Enums"]["attendance_status"]
          old_status: Database["public"]["Enums"]["attendance_status"] | null
          period_label: string | null
          student_id: string
          subject: string | null
          timetable_id: string | null
        }
        Insert: {
          action: string
          attendance_id?: string | null
          changed_by?: string | null
          created_at?: string
          date: string
          id?: string
          new_status: Database["public"]["Enums"]["attendance_status"]
          old_status?: Database["public"]["Enums"]["attendance_status"] | null
          period_label?: string | null
          student_id: string
          subject?: string | null
          timetable_id?: string | null
        }
        Update: {
          action?: string
          attendance_id?: string | null
          changed_by?: string | null
          created_at?: string
          date?: string
          id?: string
          new_status?: Database["public"]["Enums"]["attendance_status"]
          old_status?: Database["public"]["Enums"]["attendance_status"] | null
          period_label?: string | null
          student_id?: string
          subject?: string | null
          timetable_id?: string | null
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          bot_name: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_name?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_name?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      login_codes: {
        Row: {
          code: string
          generated_at: string
          id: string
          locked: boolean
          locked_at: string | null
          locked_reason: string | null
          user_id: string
        }
        Insert: {
          code: string
          generated_at?: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_reason?: string | null
          user_id: string
        }
        Update: {
          code?: string
          generated_at?: string
          id?: string
          locked?: boolean
          locked_at?: string | null
          locked_reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_seed: string | null
          avatar_style: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          department: string | null
          email: string
          full_name: string
          id: string
          id_card_name: string | null
          id_card_url: string | null
          last_profile_edit: string | null
          phone: string | null
          status: Database["public"]["Enums"]["profile_status"]
          student_id: string
          updated_at: string
        }
        Insert: {
          avatar_seed?: string | null
          avatar_style?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email: string
          full_name: string
          id: string
          id_card_name?: string | null
          id_card_url?: string | null
          last_profile_edit?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          student_id: string
          updated_at?: string
        }
        Update: {
          avatar_seed?: string | null
          avatar_style?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          id_card_name?: string | null
          id_card_url?: string | null
          last_profile_edit?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["profile_status"]
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      records: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          max_score: number | null
          remarks: string | null
          score: number | null
          student_id: string
          subject: string
          term: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_score?: number | null
          remarks?: string | null
          score?: number | null
          student_id: string
          subject: string
          term?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          max_score?: number | null
          remarks?: string | null
          score?: number | null
          student_id?: string
          subject?: string
          term?: string | null
        }
        Relationships: []
      }
      signup_logs: {
        Row: {
          created_at: string
          details: Json | null
          email: string | null
          id: string
          message: string | null
          stage: string
          student_id: string | null
          success: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          email?: string | null
          id?: string
          message?: string | null
          stage: string
          student_id?: string | null
          success?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          email?: string | null
          id?: string
          message?: string | null
          stage?: string
          student_id?: string | null
          success?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      timetable: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          start_time: string
          subject: string
          teacher: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          start_time: string
          subject: string
          teacher?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          start_time?: string
          subject?: string
          teacher?: string | null
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
      log_signup_event: {
        Args: {
          _details?: Json
          _email?: string
          _message?: string
          _stage: string
          _student_id?: string
          _success: boolean
          _user_id?: string
        }
        Returns: undefined
      }
      student_id_taken: { Args: { _sid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "student"
      attendance_status: "present" | "absent" | "late"
      profile_status: "pending" | "approved" | "rejected"
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
      app_role: ["admin", "student"],
      attendance_status: ["present", "absent", "late"],
      profile_status: ["pending", "approved", "rejected"],
    },
  },
} as const
