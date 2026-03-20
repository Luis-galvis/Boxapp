import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileDown, FileUp, Loader2, Search, ImageIcon, MapPin, Store, Edit, Upload, Trash2, Info, Download, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseInventoryExcel } from '@/lib/excel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { uploadPhoto } from '@/lib/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Caja {
  id: string;
  identificador_interno: string;
  modelo: string;
  referencia: string;
  estado: string;
  created_at: string;
  foto_url?: string;
  local_id?: string;
  costo_unitario?: number;
  locales?: { nombre: string };
}

interface Zapato {
  id: string;
  identificador_interno: string;
  modelo: string;
  talla: string;
  cantidad: number;
  created_at: string;
  foto_url?: string;
  precio_venta?: number;
  local_id?: string;
  locales?: { nombre: string };
}

interface Movimiento {
  id: string;
  tipo: string;
  producto_tipo: string;
  cantidad: number;
  descripcion: string;
  created_at: string;
  usuario_id: string;
  profiles?: { full_name: string, username: string };
}

export default function Inventario() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [zapatos, setZapatos] = useState<Zapato[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [bodegas, setBodegas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExcelModal, setShowExcelModal] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const fetchData = async () => {
    setLoading(true);
    const [c, z, m, l, b, p] = await Promise.all([
      supabase.from('cajas').select('*, locales(nombre)').order('identificador_interno', { ascending: false }),
      supabase.from('zapatos').select('*, locales(nombre)').order('identificador_interno', { ascending: false }),
      supabase.from('movimientos_inventario').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('locales').select('*'),
      supabase.from('bodegas').select('*'),
      supabase.from('profiles').select('user_id, full_name, username')
    ]);

    // Mappear perfiles en memoria porque no hay Foreign Key directa
    const perfilesData = (p as any)?.data || [];
    const movsData = (m as any).data || [];
    const movsConPerfiles = movsData.map((mov: any) => {
      const perfil = perfilesData.find((per: any) => per.user_id === mov.usuario_id);
      return { ...mov, profiles: perfil || null };
    });

    setCajas(c.data || []);
    setZapatos(z.data || []);
    setMovimientos(movsConPerfiles);
    setLocales(l.data || []);
    setBodegas(b.data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string, type: 'caja' | 'zapato', internalId?: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;

    setLoading(true);
    try {
      let deletedCount = 0;
      let desc = '';
      if (type === 'zapato' && internalId) {
        // Fetch current stock to record in movement
        const { data: currentZ } = await supabase.from('zapatos').select('modelo, cantidad').eq('identificador_interno', internalId);
        deletedCount = currentZ?.reduce((s, z) => s + z.cantidad, 0) || 0;
        desc = `Eliminación Zapato ID ${internalId} - ${currentZ?.[0]?.modelo || 'Zapato'} (${deletedCount} unidades)`;

        const { error } = await supabase.from('zapatos').delete().eq('identificador_interno', internalId);
        if (error) throw error;
      } else {
        const table = type === 'caja' ? 'cajas' : 'zapatos';
        const { data: item } = await supabase.from(table).select('*').eq('id', id).single();
        deletedCount = type === 'zapato' ? (item as any).cantidad : 1;
        desc = `Eliminación ${type} - ${item.modelo} ${type === 'zapato' ? '(T' + (item as any).talla + ')' : ''}`;

        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      }

      // Record movement
      const { error: movError } = await supabase.from('movimientos_inventario').insert({
        tipo: 'eliminacion',
        producto_tipo: type,
        cantidad: deletedCount,
        descripcion: desc,
        usuario_id: user?.id,
      });
      if (movError) {
        console.error("Error al registrar movimiento:", movError);
        throw new Error(`Eliminado, pero no se pudo guardar el historial: ${movError.message}`);
      }

      toast({ title: 'Eliminado', description: 'El registro se eliminó correctamente y se guardó en movimientos' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleEditClick = (item: any, type: 'caja' | 'zapato') => {
    setEditingItem({ ...item, type });
    setEditForm({ ...item });
    setIsEditModalOpen(true);
  };

  const handleEditSave = async () => {
    setLoading(true);
    try {
      const table = editingItem.type === 'caja' ? 'cajas' : 'zapatos';
      const { error } = await supabase.from(table).update({
        modelo: editForm.modelo,
        referencia: editForm.referencia, // only for cajas but harmless
        talla: editForm.talla, // only for zapatos
        cantidad: Number(editForm.cantidad),
        precio_venta: Number(editForm.precio_venta),
        costo_unitario: Number(editForm.costo_unitario),
        foto_url: editForm.foto_url,
        local_id: editForm.local_id,
        bodega_id: editForm.bodega_id,
      }).eq('id', editingItem.id);

      if (error) throw error;
      toast({ title: 'Actualizado', description: 'El registro se actualizó correctamente' });
      setIsEditModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const downloadTemplate = () => {
    const templateData = [
      { modelo: 'Nike Air Max 90', talla: '40', cantidad: 5, precio_venta: 250000, local_nombre: 'Local Centro' },
      { modelo: 'Adidas Stan Smith', talla: '42', cantidad: 3, precio_venta: 180000, local_nombre: 'Local Centro' },
      { modelo: 'Adidas Stan Smith', talla: '43', cantidad: 2, precio_venta: 180000, local_nombre: 'Local Norte' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws['!cols'] = [{ wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, 'plantilla_inventario.xlsx');
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'cajas' | 'zapatos') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await parseInventoryExcel(file);

      // Construir mapa de nombre de local → id para resolver
      const localMap: Record<string, string> = {};
      locales.forEach(l => { localMap[l.nombre.toLowerCase().trim()] = l.id; });

      if (tipo === 'cajas') {
        const insertData = data.map(item => ({
          modelo: item.modelo,
          identificador_interno: item.identificador_interno || null,
          estado: 'cerrada' as const,
          local_id: item.local_nombre ? (localMap[item.local_nombre.toLowerCase().trim()] || null) : null,
        }));
        const { error } = await supabase.from('cajas').insert(insertData);
        if (error) throw error;
      } else {
        // ZAPATOS LOGIC: Assign IDs correctly to avoid grouping all into one
        const uniqueModels = Array.from(new Set(data.map(d => d.modelo)));
        const { data: existingModels } = await supabase.from('zapatos')
          .select('modelo, identificador_interno')
          .in('modelo', uniqueModels);

        const modelToIdMap: Record<string, string> = {};
        if (existingModels) {
          existingModels.forEach(m => {
            if (m.identificador_interno) modelToIdMap[m.modelo] = m.identificador_interno;
          });
        }

        const insertData = [];
        for (const item of data) {
          let idInterno = item.identificador_interno;

          if (!idInterno) {
            if (modelToIdMap[item.modelo]) {
              idInterno = modelToIdMap[item.modelo];
            } else {
              // Gen fresh ID for a new model
              const { data: newId } = await supabase.rpc('get_next_product_id', { p_tipo: 'zapatos' });
              idInterno = newId;
              modelToIdMap[item.modelo] = idInterno;
            }
          }

          insertData.push({
            modelo: item.modelo,
            talla: item.talla || 'N/A',
            cantidad: item.cantidad,
            precio_venta: item.precio_venta ?? null,
            identificador_interno: idInterno,
            local_id: item.local_nombre ? (localMap[item.local_nombre.toLowerCase().trim()] || null) : null,
          });
        }

        const { error } = await supabase.from('zapatos').insert(insertData);
        if (error) throw error;
      }

      // Registrar movimiento de inventario
      const totalCantidad = data.reduce((sum, item) => sum + item.cantidad, 0);
      const { error: movError } = await supabase.from('movimientos_inventario').insert({
        tipo: 'entrada',
        producto_tipo: tipo === 'cajas' ? 'caja' : 'zapato',
        cantidad: totalCantidad,
        descripcion: `Importación Excel: ${data.length} registros (${totalCantidad} unidades)`,
        usuario_id: user?.id,
      });
      if (movError) {
        console.error("Error al registrar movimiento:", movError);
        throw new Error(`Importado, pero error en historial: ${movError.message}`);
      }

      toast({ title: 'Carga exitosa', description: `Se importaron ${data.length} ítems (${totalCantidad} unidades).` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error al importar', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const totalZapatos = zapatos.reduce((s, z) => s + z.cantidad, 0);

  // Group shoes by shared ID for display
  const groupedZapatos = zapatos.reduce((acc: Record<string, any>, curr) => {
    const id = curr.identificador_interno || '----';
    if (!acc[id]) {
      acc[id] = {
        ...curr,
        tallas_list: [{ id: curr.id, talla: curr.talla, cantidad: curr.cantidad }],
        total_stock: curr.cantidad,
      };
    } else {
      acc[id].tallas_list.push({ id: curr.id, talla: curr.talla, cantidad: curr.cantidad });
      acc[id].total_stock += curr.cantidad;
    }
    return acc;
  }, {});

  const zapatosToDisplay = Object.values(groupedZapatos).filter((z: any) =>
    z.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    z.identificador_interno?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Inventario</h1>
            <p className="text-muted-foreground text-sm mt-1">Vista completa del inventario actual</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar modelo o ID..."
                className="pl-9 w-[200px]"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <Input
              ref={excelInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { handleExcelUpload(e, 'zapatos'); e.target.value = ''; }}
            />
            <Button variant="outline" size="sm" disabled={loading} onClick={() => setShowExcelModal(true)}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
              Subir Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Cajas Cerradas</p>
              <p className="text-2xl font-bold font-heading">{cajas.filter(c => c.estado === 'cerrada').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="pt-4 text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Cajas Abiertas</p>
              <p className="text-2xl font-bold font-heading">{cajas.filter(c => c.estado === 'abierta').length}</p>
            </CardContent>
          </Card>
          <Card className="bg-success/5 border-success/20">
            <CardContent className="pt-4 text-center">
              <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Zapatos Total</p>
              <p className="text-2xl font-bold font-heading">{totalZapatos}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="cajas" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0 mb-4 overflow-x-auto">
            <TabsTrigger value="cajas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">🟫 Cajas</TabsTrigger>
            <TabsTrigger value="zapatos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">👟 Zapatos</TabsTrigger>
            <TabsTrigger value="movimientos" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3">📊 Movimientos</TabsTrigger>
          </TabsList>

          <TabsContent value="cajas">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Foto</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cajas.filter(c => c.modelo.toLowerCase().includes(searchTerm.toLowerCase()) || c.identificador_interno?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No hay cajas registradas</TableCell></TableRow>
                    ) : cajas.filter(c => c.modelo.toLowerCase().includes(searchTerm.toLowerCase()) || c.identificador_interno?.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden border">
                            {c.foto_url ? (
                              <img src={c.foto_url} className="h-full w-full object-cover" alt={c.modelo} />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">{c.identificador_interno || '----'}</TableCell>
                        <TableCell className="font-medium">
                          {c.modelo}
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{c.referencia || 'Sin ref.'}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Store className="h-3 w-3 text-muted-foreground" />
                            {c.locales?.nombre || 'General'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={c.estado === 'cerrada' ? 'default' : 'secondary'} className="text-[10px] uppercase">
                            {c.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(c, 'caja')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id, 'caja')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="zapatos">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Foto</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Tallas & Stock</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Precio Venta</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {zapatosToDisplay.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No hay zapatos registrados</TableCell></TableRow>
                    ) : zapatosToDisplay.map((z: any) => (
                      <TableRow key={z.identificador_interno}>
                        <TableCell>
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden border">
                            {z.foto_url ? (
                              <img src={z.foto_url} className="h-full w-full object-cover" alt={z.modelo} />
                            ) : (
                              <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold">{z.identificador_interno || '----'}</TableCell>
                        <TableCell className="font-medium text-xs max-w-[150px] truncate">{z.modelo}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {z.tallas_list.map((t: any, idx: number) => (
                              <Badge key={idx} variant={t.cantidad > 0 ? "secondary" : "outline"} className="text-[9px] px-1 py-0 h-4">
                                T{t.talla}: {t.cantidad}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={z.total_stock > 0 ? 'default' : 'destructive'} className="font-bold text-[10px]">
                            {z.total_stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-xs text-primary">
                          ${(z.precio_venta || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-[10px]">
                          {z.locales?.nombre || 'General'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditClick(z, 'zapato')}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(z.id, 'zapato', z.identificador_interno)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movimientos">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cant.</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No hay movimientos registrados</TableCell></TableRow>
                    ) : movimientos.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Badge
                            variant={
                              m.tipo === 'entrada' ? 'default' :
                                m.tipo === 'salida' ? 'secondary' :
                                  m.tipo === 'eliminacion' ? 'destructive' : 'outline'
                            }
                            className="text-[10px] uppercase"
                          >
                            {m.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-bold uppercase">{m.producto_tipo}</TableCell>
                        <TableCell className="font-bold">{m.cantidad}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.descripcion}</TableCell>
                        <TableCell className="text-xs font-semibold">
                          {m.profiles?.full_name || m.profiles?.username || 'Sistema'}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Excel Format Modal */}
        <Dialog open={showExcelModal} onOpenChange={setShowExcelModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Info className="h-5 w-5 text-primary" />
                Formato requerido del Excel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <p className="text-sm text-muted-foreground">
                El archivo debe tener las siguientes columnas en la <span className="font-bold text-foreground">primera hoja</span>:
              </p>

              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-4 py-2 text-left font-bold text-xs uppercase text-muted-foreground">Columna</th>
                      <th className="px-4 py-2 text-left font-bold text-xs uppercase text-muted-foreground">Requerida</th>
                      <th className="px-4 py-2 text-left font-bold text-xs uppercase text-muted-foreground">Ejemplo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">modelo</td>
                      <td className="px-4 py-2.5"><span className="text-xs bg-destructive/10 text-destructive font-bold px-2 py-0.5 rounded-full">Sí</span></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">Nike Air Max 90</td>
                    </tr>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">talla</td>
                      <td className="px-4 py-2.5"><span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full">No</span></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">40, 41, 42...</td>
                    </tr>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">cantidad</td>
                      <td className="px-4 py-2.5"><span className="text-xs bg-destructive/10 text-destructive font-bold px-2 py-0.5 rounded-full">Sí</span></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">5</td>
                    </tr>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">precio_venta</td>
                      <td className="px-4 py-2.5"><span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full">No</span></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">250000</td>
                    </tr>
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-primary">local_nombre</td>
                      <td className="px-4 py-2.5"><span className="text-xs bg-muted text-muted-foreground font-bold px-2 py-0.5 rounded-full">No</span></td>
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">Local Centro</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-3 flex gap-3">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Si un mismo modelo tiene <strong>varias tallas</strong>, agrega una fila por cada talla con la misma columna <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">modelo</code>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={downloadTemplate}>
                  <Download className="h-4 w-4" />
                  Descargar plantilla
                </Button>
                <Button className="flex-1 gap-2" onClick={() => { setShowExcelModal(false); excelInputRef.current?.click(); }}>
                  <CheckCircle2 className="h-4 w-4" />
                  Entendido, subir archivo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Editar {editingItem?.type === 'caja' ? 'Caja' : 'Zapato'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={editForm.modelo || ''} onChange={e => setEditForm({ ...editForm, modelo: e.target.value })} />
              </div>

              {editingItem?.type === 'caja' && (
                <div className="space-y-2">
                  <Label>Referencia</Label>
                  <Input value={editForm.referencia || ''} onChange={e => setEditForm({ ...editForm, referencia: e.target.value })} />
                </div>
              )}

              {editingItem?.type === 'zapato' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Talla</Label>
                    <Input value={editForm.talla || ''} onChange={e => setEditForm({ ...editForm, talla: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cantidad (Stock)</Label>
                    <Input type="number" value={editForm.cantidad || 0} onChange={e => setEditForm({ ...editForm, cantidad: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Precio de Venta</Label>
                  <Input type="number" value={editForm.precio_venta || 0} onChange={e => setEditForm({ ...editForm, precio_venta: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Costo Unitario</Label>
                  <Input type="number" value={editForm.costo_unitario || 0} onChange={e => setEditForm({ ...editForm, costo_unitario: e.target.value })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Foto</Label>
                <div className="flex items-center gap-4">
                  {editForm.foto_url && (
                    <div className="h-16 w-16 rounded border overflow-hidden shrink-0">
                      <img src={editForm.foto_url} alt="P" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="relative flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadPhoto(file);
                          if (url) setEditForm({ ...editForm, foto_url: url });
                        }
                      }}
                    />
                    <Upload className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Select value={editForm.local_id} onValueChange={v => setEditForm({ ...editForm, local_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Local..." /></SelectTrigger>
                    <SelectContent>
                      {locales.map(l => <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bodega</Label>
                  <Select value={editForm.bodega_id} onValueChange={v => setEditForm({ ...editForm, bodega_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Bodega..." /></SelectTrigger>
                    <SelectContent>
                      {bodegas.filter(b => b.local_id === editForm.local_id).map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleEditSave} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
