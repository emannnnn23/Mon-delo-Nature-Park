
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "announcements": {
                  Row: {
                    "body": string | null,"created_at": string,"ends_at": string | null,"id": string,"is_published": boolean,"link_href": string | null,"link_label": string | null,"starts_at": string,"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_published"?: boolean,"link_href"?: string | null,"link_label"?: string | null,"starts_at"?: string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"ends_at"?: string | null,"id"?: string,"is_published"?: boolean,"link_href"?: string | null,"link_label"?: string | null,"starts_at"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"attraction_images": {
                  Row: {
                    "attraction_id": string,"caption": string | null,"created_at": string,"id": string,"media_id": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attraction_id": string,"caption"?: string | null,"created_at"?: string,"id"?: string,"media_id": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "attraction_id"?: string,"caption"?: string | null,"created_at"?: string,"id"?: string,"media_id"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attraction_images_attraction_id_fkey"
      columns: ["attraction_id"]
isOneToOne: false
      referencedRelation: "attractions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attraction_images_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"attractions": {
                  Row: {
                    "cover_media_id": string | null,"created_at": string,"description": string | null,"icon": string | null,"id": string,"is_featured": boolean,"is_published": boolean,"is_sample": boolean,"kind": string,"name": string,"slug": string,"sort_order": number,"summary": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cover_media_id"?: string | null,"created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: string,"is_featured"?: boolean,"is_published"?: boolean,"is_sample"?: boolean,"kind": string,"name": string,"slug": string,"sort_order"?: number,"summary": string,"updated_at"?: string
                  }
                  Update: {
                    "cover_media_id"?: string | null,"created_at"?: string,"description"?: string | null,"icon"?: string | null,"id"?: string,"is_featured"?: boolean,"is_published"?: boolean,"is_sample"?: boolean,"kind"?: string,"name"?: string,"slug"?: string,"sort_order"?: number,"summary"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attractions_cover_media_id_fkey"
      columns: ["cover_media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"contact_messages": {
                  Row: {
                    "created_at": string,"email": string,"full_name": string,"id": string,"message": string,"phone": string | null,"status": string,"subject": string,"submitted_at": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email": string,"full_name": string,"id"?: string,"message": string,"phone"?: string | null,"status"?: string,"subject": string,"submitted_at"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string,"message"?: string,"phone"?: string | null,"status"?: string,"subject"?: string,"submitted_at"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"faqs": {
                  Row: {
                    "answer": string,"created_at": string,"id": string,"is_published": boolean,"question": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"question": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"question"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"gallery_categories": {
                  Row: {
                    "created_at": string,"id": string,"is_published": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_published"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_published"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"gallery_images": {
                  Row: {
                    "caption": string | null,"category_id": string | null,"created_at": string,"id": string,"is_featured": boolean,"is_published": boolean,"is_sample": boolean,"media_id": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"category_id"?: string | null,"created_at"?: string,"id"?: string,"is_featured"?: boolean,"is_published"?: boolean,"is_sample"?: boolean,"media_id": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "caption"?: string | null,"category_id"?: string | null,"created_at"?: string,"id"?: string,"is_featured"?: boolean,"is_published"?: boolean,"is_sample"?: boolean,"media_id"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "gallery_images_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "gallery_categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "gallery_images_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"media": {
                  Row: {
                    "alt_text": string,"created_at": string,"focal_x": number,"focal_y": number,"height": number,"id": string,"original_filename": string | null,"storage_base_path": string,"updated_at": string,"variants": NonNullable<Json>,"width": number
                  }
                  ComputedFields: never
                  Insert: {
                    "alt_text": string,"created_at"?: string,"focal_x"?: number,"focal_y"?: number,"height": number,"id"?: string,"original_filename"?: string | null,"storage_base_path": string,"updated_at"?: string,"variants": NonNullable<Json>,"width": number
                  }
                  Update: {
                    "alt_text"?: string,"created_at"?: string,"focal_x"?: number,"focal_y"?: number,"height"?: number,"id"?: string,"original_filename"?: string | null,"storage_base_path"?: string,"updated_at"?: string,"variants"?: NonNullable<Json>,"width"?: number
                  }
                  Relationships: [
                    
                  ]
                },"page_sections": {
                  Row: {
                    "body": string | null,"created_at": string,"cta_href": string | null,"cta_label": string | null,"eyebrow": string | null,"heading": string | null,"id": string,"is_published": boolean,"is_sample": boolean,"key": string,"media_id": string | null,"page": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"cta_href"?: string | null,"cta_label"?: string | null,"eyebrow"?: string | null,"heading"?: string | null,"id"?: string,"is_published"?: boolean,"is_sample"?: boolean,"key": string,"media_id"?: string | null,"page": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"cta_href"?: string | null,"cta_label"?: string | null,"eyebrow"?: string | null,"heading"?: string | null,"id"?: string,"is_published"?: boolean,"is_sample"?: boolean,"key"?: string,"media_id"?: string | null,"page"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "page_sections_media_id_fkey"
      columns: ["media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"role": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"role": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"role"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"site_settings": {
                  Row: {
                    "address_line": string,"created_at": string,"default_og_media_id": string | null,"email": string | null,"facebook_url": string | null,"google_rating": number | null,"google_review_count": number | null,"id": string,"instagram_url": string | null,"latitude": number | null,"longitude": number | null,"maps_embed_url": string | null,"maps_listing_url": string | null,"opening_hours": string | null,"park_name": string,"phone": string | null,"plus_code": string | null,"short_description": string | null,"singleton": boolean,"tagline": string | null,"tiktok_url": string | null,"updated_at": string,"youtube_url": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address_line": string,"created_at"?: string,"default_og_media_id"?: string | null,"email"?: string | null,"facebook_url"?: string | null,"google_rating"?: number | null,"google_review_count"?: number | null,"id"?: string,"instagram_url"?: string | null,"latitude"?: number | null,"longitude"?: number | null,"maps_embed_url"?: string | null,"maps_listing_url"?: string | null,"opening_hours"?: string | null,"park_name": string,"phone"?: string | null,"plus_code"?: string | null,"short_description"?: string | null,"singleton"?: boolean,"tagline"?: string | null,"tiktok_url"?: string | null,"updated_at"?: string,"youtube_url"?: string | null
                  }
                  Update: {
                    "address_line"?: string,"created_at"?: string,"default_og_media_id"?: string | null,"email"?: string | null,"facebook_url"?: string | null,"google_rating"?: number | null,"google_review_count"?: number | null,"id"?: string,"instagram_url"?: string | null,"latitude"?: number | null,"longitude"?: number | null,"maps_embed_url"?: string | null,"maps_listing_url"?: string | null,"opening_hours"?: string | null,"park_name"?: string,"phone"?: string | null,"plus_code"?: string | null,"short_description"?: string | null,"singleton"?: boolean,"tagline"?: string | null,"tiktok_url"?: string | null,"updated_at"?: string,"youtube_url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "site_settings_default_og_media_id_fkey"
      columns: ["default_og_media_id"]
isOneToOne: false
      referencedRelation: "media"
      referencedColumns: ["id"]
    }
                  ]
                },"testimonials": {
                  Row: {
                    "author_name": string,"created_at": string,"id": string,"is_published": boolean,"quote": string,"rating": number | null,"review_date": string | null,"sort_order": number,"source": string,"source_url": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_name": string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"quote": string,"rating"?: number | null,"review_date"?: string | null,"sort_order"?: number,"source": string,"source_url"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "author_name"?: string,"created_at"?: string,"id"?: string,"is_published"?: boolean,"quote"?: string,"rating"?: number | null,"review_date"?: string | null,"sort_order"?: number,"source"?: string,"source_url"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "recent_content_updates": {
                  Row: {
                    "id": string | null,"source": string | null,"title": string | null,"updated_at": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"submit_contact_message":
{ Args: { "p_elapsed_ms": number,"p_email": string,"p_full_name": string,"p_honeypot": string,"p_message": string,"p_phone": string,"p_subject": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
