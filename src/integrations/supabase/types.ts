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
      editorial_topics: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          daily_run_hour: number
          description: string | null
          frequency_hours: number
          id: string
          keywords: string[]
          last_generated_at: string | null
          max_posts_per_day: number
          name: string
          publish_mode: Database["public"]["Enums"]["publish_mode"]
          schedule_mode: Database["public"]["Enums"]["schedule_mode"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          daily_run_hour?: number
          description?: string | null
          frequency_hours?: number
          id?: string
          keywords?: string[]
          last_generated_at?: string | null
          max_posts_per_day?: number
          name: string
          publish_mode?: Database["public"]["Enums"]["publish_mode"]
          schedule_mode?: Database["public"]["Enums"]["schedule_mode"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          daily_run_hour?: number
          description?: string | null
          frequency_hours?: number
          id?: string
          keywords?: string[]
          last_generated_at?: string | null
          max_posts_per_day?: number
          name?: string
          publish_mode?: Database["public"]["Enums"]["publish_mode"]
          schedule_mode?: Database["public"]["Enums"]["schedule_mode"]
          updated_at?: string
        }
        Relationships: []
      }
      generation_runs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          metadata: Json
          post_id: string | null
          run_type: string
          started_at: string
          status: string
          topic_id: string | null
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          post_id?: string | null
          run_type: string
          started_at?: string
          status: string
          topic_id?: string | null
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          metadata?: Json
          post_id?: string | null
          run_type?: string
          started_at?: string
          status?: string
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generation_runs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_runs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "editorial_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      post_revisions: {
        Row: {
          content: string
          cover_image_url: string | null
          created_at: string
          edited_by: string | null
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          post_id: string
          title: string
        }
        Insert: {
          content: string
          cover_image_url?: string | null
          created_at?: string
          edited_by?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          post_id: string
          title: string
        }
        Update: {
          content?: string
          cover_image_url?: string | null
          created_at?: string
          edited_by?: string | null
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          post_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          created_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          ai_generated: boolean
          author_id: string | null
          content: string
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          scheduled_at: string | null
          slug: string
          sources: Json
          status: Database["public"]["Enums"]["post_status"]
          title: string
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          ai_generated?: boolean
          author_id?: string | null
          content: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug: string
          sources?: Json
          status?: Database["public"]["Enums"]["post_status"]
          title: string
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_generated?: boolean
          author_id?: string | null
          content?: string
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          slug?: string
          sources?: Json
          status?: Database["public"]["Enums"]["post_status"]
          title?: string
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "editorial_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string
          github_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          is_approved: boolean
          job_title: string | null
          linkedin_url: string | null
          onboarding: Json
          show_on_blog: boolean
          status: string
          twitter_url: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name: string
          github_url?: string | null
          id: string
          instagram_url?: string | null
          is_active?: boolean
          is_approved?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          onboarding?: Json
          show_on_blog?: boolean
          status?: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string
          github_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          is_approved?: boolean
          job_title?: string | null
          linkedin_url?: string | null
          onboarding?: Json
          show_on_blog?: boolean
          status?: string
          twitter_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      project_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      research_sessions: {
        Row: {
          angles: Json
          citations: Json
          created_at: string
          created_by: string | null
          id: string
          mode: string
          research: string | null
          topic_description: string | null
          topic_id: string | null
          topic_keywords: string[]
          topic_name: string
          updated_at: string
          used_angle: Json | null
          used_for_post_id: string | null
        }
        Insert: {
          angles?: Json
          citations?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          research?: string | null
          topic_description?: string | null
          topic_id?: string | null
          topic_keywords?: string[]
          topic_name: string
          updated_at?: string
          used_angle?: Json | null
          used_for_post_id?: string | null
        }
        Update: {
          angles?: Json
          citations?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          mode?: string
          research?: string | null
          topic_description?: string | null
          topic_id?: string | null
          topic_keywords?: string[]
          topic_name?: string
          updated_at?: string
          used_angle?: Json | null
          used_for_post_id?: string | null
        }
        Relationships: []
      }
      rss_feeds: {
        Row: {
          active: boolean
          created_at: string
          id: string
          last_fetched_at: string | null
          name: string
          topic_id: string | null
          updated_at: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          last_fetched_at?: string | null
          name: string
          topic_id?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          last_fetched_at?: string | null
          name?: string
          topic_id?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "rss_feeds_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "editorial_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      rss_items: {
        Row: {
          created_at: string
          description: string | null
          feed_id: string
          guid: string
          id: string
          link: string
          published_at: string | null
          title: string
          used_in_post_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          feed_id: string
          guid: string
          id?: string
          link: string
          published_at?: string | null
          title: string
          used_in_post_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          feed_id?: string
          guid?: string
          id?: string
          link?: string
          published_at?: string | null
          title?: string
          used_in_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rss_items_feed_id_fkey"
            columns: ["feed_id"]
            isOneToOne: false
            referencedRelation: "rss_feeds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rss_items_used_in_post_fk"
            columns: ["used_in_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "editor" | "user"
      post_status: "draft" | "scheduled" | "published" | "archived"
      publish_mode: "auto" | "review"
      schedule_mode: "interval" | "daily_window" | "per_new_item"
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
      app_role: ["admin", "editor", "user"],
      post_status: ["draft", "scheduled", "published", "archived"],
      publish_mode: ["auto", "review"],
      schedule_mode: ["interval", "daily_window", "per_new_item"],
    },
  },
} as const
