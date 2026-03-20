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
      bodegas: {
        Row: {
          created_at: string
          id: string
          local_id: string | null
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          local_id?: string | null
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          local_id?: string | null
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "bodegas_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["id"]
          },
        ]
      }
      cajas: {
        Row: {
          created_at: string
          estado: string
          factura_id: string | null
          id: string
          modelo: string
          referencia: string | null
          identificador_interno: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          factura_id?: string | null
          id?: string
          modelo: string
          referencia?: string | null
          identificador_interno?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          factura_id?: string | null
          id?: string
          modelo?: string
          referencia?: string | null
          identificador_interno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cajas_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      compradores: {
        Row: {
          created_at: string
          direccion: string | null
          email: string | null
          id: string
          nombre: string
          numero_documento: string
          telefono: string | null
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre: string
          numero_documento: string
          telefono?: string | null
        }
        Update: {
          created_at?: string
          direccion?: string | null
          email?: string | null
          id?: string
          nombre?: string
          numero_documento?: string
          telefono?: string | null
        }
        Relationships: []
      }
      detalle_remisiones: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          modelo: string
          remision_id: string | null
          talla: string
          zapato_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          modelo: string
          remision_id?: string | null
          talla: string
          zapato_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          modelo?: string
          remision_id?: string | null
          talla?: string
          zapato_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detalle_remisiones_remision_id_fkey"
            columns: ["remision_id"]
            isOneToOne: false
            referencedRelation: "remisiones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_remisiones_zapato_id_fkey"
            columns: ["zapato_id"]
            isOneToOne: false
            referencedRelation: "zapatos"
            referencedColumns: ["id"]
          },
        ]
      }
      detalle_ventas: {
        Row: {
          cantidad: number
          created_at: string
          id: string
          modelo: string
          precio_unitario: number
          subtotal: number
          talla: string
          venta_id: string
          zapato_id: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          id?: string
          modelo: string
          precio_unitario: number
          subtotal: number
          talla: string
          venta_id: string
          zapato_id: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          id?: string
          modelo?: string
          precio_unitario?: number
          subtotal?: number
          talla?: string
          venta_id?: string
          zapato_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "detalle_ventas_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detalle_ventas_zapato_id_fkey"
            columns: ["zapato_id"]
            isOneToOne: false
            referencedRelation: "zapatos"
            referencedColumns: ["id"]
          },
        ]
      }
      facturas_compra: {
        Row: {
          bodega_destino: string | null
          cantidad: number
          created_at: string
          fecha: string
          id: string
          numero_factura: string
          precio_unitario: number
          proveedor_id: string | null
          proveedor_nombre: string | null
          registrado_por: string | null
          tipo_producto: string
          total: number
        }
        Insert: {
          bodega_destino?: string | null
          cantidad: number
          created_at?: string
          fecha?: string
          id?: string
          numero_factura: string
          precio_unitario: number
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          registrado_por?: string | null
          tipo_producto: string
          total: number
        }
        Update: {
          bodega_destino?: string | null
          cantidad?: number
          created_at?: string
          fecha?: string
          id?: string
          numero_factura?: string
          precio_unitario?: number
          proveedor_id?: string | null
          proveedor_nombre?: string | null
          registrado_por?: string | null
          tipo_producto?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "facturas_compra_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      locales: {
        Row: {
          created_at: string
          direccion: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          direccion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          direccion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          created_at: string
          descripcion: string | null
          id: string
          producto_id: string | null
          producto_tipo: string
          tipo: string
          usuario_id: string | null
        }
        Insert: {
          cantidad: number
          created_at?: string
          descripcion?: string | null
          id?: string
          producto_id?: string | null
          producto_tipo: string
          tipo: string
          usuario_id?: string | null
        }
        Update: {
          cantidad?: number
          created_at?: string
          descripcion?: string | null
          id?: string
          producto_id?: string | null
          producto_tipo?: string
          tipo?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      pedidos: {
        Row: {
          created_at: string
          estado: string
          id: string
          venta_id: string | null
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          venta_id?: string | null
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          venta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_venta_id_fkey"
            columns: ["venta_id"]
            isOneToOne: false
            referencedRelation: "ventas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      proveedores: {
        Row: {
          created_at: string
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      remisiones: {
        Row: {
          comprador_id: string | null
          comprador_nombre_manual: string | null
          created_at: string
          estado: string
          fecha: string
          id: string
          numero_remision: string
        }
        Insert: {
          comprador_id?: string | null
          comprador_nombre_manual?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          numero_remision: string
        }
        Update: {
          comprador_id?: string | null
          comprador_nombre_manual?: string | null
          created_at?: string
          estado?: string
          fecha?: string
          id?: string
          numero_remision?: string
        }
        Relationships: [
          {
            foreignKeyName: "remisiones_comprador_id_fkey"
            columns: ["comprador_id"]
            isOneToOne: false
            referencedRelation: "compradores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ventas: {
        Row: {
          created_at: string
          fecha: string
          id: string
          numero_venta: string
          total: number
          vendedor_id: string
          comprador_id: string | null
          comprador_numero_documento: string | null
          comprador_direccion: string | null
          comprador_nombre: string | null
          local_id: string | null
        }
        Insert: {
          created_at?: string
          fecha?: string
          id?: string
          numero_venta: string
          total?: number
          vendedor_id: string
          comprador_id?: string | null
          comprador_numero_documento?: string | null
          comprador_direccion?: string | null
          comprador_nombre?: string | null
          local_id?: string | null
        }
        Update: {
          created_at?: string
          fecha?: string
          id?: string
          numero_venta?: string
          total?: number
          vendedor_id?: string
          comprador_id?: string | null
          comprador_numero_documento?: string | null
          comprador_direccion?: string | null
          comprador_nombre?: string | null
          local_id?: string | null
        }
        Relationships: []
      }
      zapatos: {
        Row: {
          caja_id: string | null
          cantidad: number
          created_at: string
          factura_id: string | null
          id: string
          modelo: string
          talla: string
          identificador_interno: string | null
        }
        Insert: {
          caja_id?: string | null
          cantidad?: number
          created_at?: string
          factura_id?: string | null
          id?: string
          modelo: string
          talla: string
          identificador_interno?: string | null
        }
        Update: {
          caja_id?: string | null
          cantidad?: number
          created_at?: string
          factura_id?: string | null
          id?: string
          modelo?: string
          talla?: string
          identificador_interno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zapatos_caja_id_fkey"
            columns: ["caja_id"]
            isOneToOne: false
            referencedRelation: "cajas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zapatos_factura_id_fkey"
            columns: ["factura_id"]
            isOneToOne: false
            referencedRelation: "facturas_compra"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_sale_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "cajero" | "call_center" | "asistente_punto"
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
      app_role: ["admin", "user", "cajero", "call_center", "asistente_punto"],
    },
  },
} as const
