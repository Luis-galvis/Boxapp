import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { uploadPhoto } from '@/lib/storage';
import { Loader2, Plus, Camera, FileText, ImageIcon, Store, MapPin, Ruler, Upload } from 'lucide-react';

interface OcrProducto {
  descripcion: string;
  tipo: 'cajas' | 'zapatos';
  modelo: string;
  talla: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
}

interface Caja {
  id: string;
  modelo: string;
  referencia: string;
  identificador_interno: string;
}

interface OcrResult {
  numero_factura: string;
  fecha: string;
  proveedor_nombre: string;
  productos: OcrProducto[];
}

export default function Facturas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [bodegas, setBodegas] = useState<any[]>([]);

  const [form, setForm] = useState({
    numero_factura: '',
    fecha: new Date().toISOString().split('T')[0],
    proveedor_id: '',
    tipo_producto: 'zapatos' as 'cajas' | 'zapatos',
    cantidad: '', // Total for cajas, or auto-sum for shoes
    precio_unitario: '',
    precio_venta: '',
    modelo: '',
    tallas_seleccionadas: [] as string[],
    tallas_cantidades: {} as Record<string, number>,
    foto_url: '',
    local_id: '',
    bodega_id: '',
  });
  const [isInvoiceEditable, setIsInvoiceEditable] = useState(false);
  const [tallasDisponibles, setTallasDisponibles] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: p }, { data: l }, { data: b }, { data: t }, { data: nextNum, error: rpcError }] = await Promise.all([
          supabase.from('proveedores').select('id, nombre'),
          supabase.from('locales').select('id, nombre'),
          supabase.from('bodegas').select('id, nombre, local_id'),
          supabase.from('tallas').select('valor').order('valor'),
          supabase.rpc('generate_purchase_invoice_number'),
        ]);

        if (rpcError) {
          console.error('Error generating invoice number:', rpcError);
          setIsInvoiceEditable(true);
        }

        setProveedores(p || []);
        setLocales(l || []);
        setBodegas(b || []);
        setTallasDisponibles(t || []);
        if (nextNum) setForm(f => ({ ...f, numero_factura: nextNum }));
        if (l && l.length > 0) setForm(f => ({ ...f, local_id: l[0].id }));
      } catch (err) {
        console.error('Data fetching error:', err);
      }
    };
    fetchData();
  }, []);

  const totalQtyShoes = Object.values(form.tallas_cantidades).reduce((acc, curr) => acc + (curr || 0), 0);
  const effectiveQty = form.tipo_producto === 'zapatos' ? totalQtyShoes : Number(form.cantidad);
  const total = effectiveQty * (Number(form.precio_unitario) || 0);

  const updateTallaCantidad = (talla: string, cant: number) => {
    setForm(f => ({
      ...f,
      tallas_cantidades: { ...f.tallas_cantidades, [talla]: cant }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.numero_factura) {
      toast({ title: 'Falta Factura', description: 'Por favor ingresa un número de factura', variant: 'destructive' });
      return;
    }

    if (form.tipo_producto === 'zapatos') {
      if (totalQtyShoes <= 0) {
        toast({ title: 'Falta Cantidad', description: 'Por favor ingresa cantidades para las tallas seleccionadas', variant: 'destructive' });
        return;
      }
      if (!form.modelo) {
        toast({ title: 'Falta Modelo', description: 'Por favor ingresa el modelo del zapato', variant: 'destructive' });
        return;
      }
    } else {
      if (!form.cantidad || Number(form.cantidad) <= 0) {
        toast({ title: 'Falta Cantidad', description: 'Por favor ingresa una cantidad válida', variant: 'destructive' });
        return;
      }
    }

    if (!form.precio_unitario || Number(form.precio_unitario) < 0) {
      toast({ title: 'Falta Costo', description: 'Por favor ingresa un costo unitario', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const selectedProv = proveedores.find(p => p.id === form.proveedor_id);

      const { data: factura, error: factError } = await supabase.from('facturas_compra').insert({
        numero_factura: form.numero_factura,
        fecha: form.fecha,
        proveedor_nombre: selectedProv?.nombre || 'Manual',
        proveedor_id: form.proveedor_id || null,
        tipo_producto: form.tipo_producto,
        cantidad: effectiveQty,
        precio_unitario: Number(form.precio_unitario),
        total,
        registrado_por: user?.id,
      }).select().single();

      if (factError) throw factError;

      if (form.tipo_producto === 'cajas') {
        const cajas = Array.from({ length: Number(form.cantidad) }, () => ({
          modelo: 'Caja ' + form.numero_factura,
          referencia: form.numero_factura,
          estado: 'cerrada' as const,
          factura_id: factura.id,
          costo_unitario: Number(form.precio_unitario),
          local_id: form.local_id || null,
          bodega_id: form.bodega_id || null,
        }));
        await supabase.from('cajas').insert(cajas);
      } else {
        const insertData: any[] = [];
        const { data: nextId } = await supabase.rpc('get_next_product_id', { p_tipo: 'zapatos' });

        form.tallas_seleccionadas.forEach((t) => {
          const finalQty = form.tallas_cantidades[t] || 0;
          if (finalQty > 0) {
            insertData.push({
              modelo: form.modelo || 'Sin modelo',
              talla: t,
              cantidad: finalQty,
              factura_id: factura.id,
              foto_url: form.foto_url,
              identificador_interno: nextId,
              precio_venta: Number(form.precio_venta) || 0,
              costo_unitario: Number(form.precio_unitario),
              local_id: form.local_id || null,
              bodega_id: form.bodega_id || null,
            });
          }
        });

        if (insertData.length > 0) {
          await supabase.from('zapatos').insert(insertData);
        }
      }

      await supabase.from('movimientos_inventario').insert({
        tipo: 'entrada',
        producto_tipo: form.tipo_producto === 'cajas' ? 'caja' : 'zapato',
        cantidad: effectiveQty,
        descripcion: `Factura #${form.numero_factura} - ${form.tipo_producto}`,
        usuario_id: user?.id,
      });

      toast({ title: 'Factura registrada', description: `Se registraron ${effectiveQty} ${form.tipo_producto}` });

      const { data: nextNum } = await supabase.rpc('generate_purchase_invoice_number');
      setForm(f => ({
        ...f,
        numero_factura: nextNum || '',
        cantidad: '',
        precio_unitario: '',
        precio_venta: '',
        modelo: '',
        tallas_seleccionadas: [],
        tallas_cantidades: {},
        foto_url: ''
      }));
      setIsInvoiceEditable(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrResult(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('ocr-factura', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setOcrResult(data);
      toast({ title: 'Datos extraídos', description: 'Revisa los datos antes de confirmar' });
    } catch (err: any) {
      toast({ title: 'Error en OCR', description: err.message, variant: 'destructive' });
    }
    setOcrLoading(false);
  };

  const handleOcrConfirm = async () => {
    if (!ocrResult) return;
    setLoading(true);
    try {
      for (const prod of ocrResult.productos) {
        const { data: factura, error: factError } = await supabase.from('facturas_compra').insert({
          numero_factura: ocrResult.numero_factura,
          fecha: ocrResult.fecha || new Date().toISOString().split('T')[0],
          proveedor_nombre: ocrResult.proveedor_nombre,
          tipo_producto: prod.tipo,
          cantidad: prod.cantidad,
          precio_unitario: prod.precio_unitario,
          total: prod.total || prod.cantidad * prod.precio_unitario,
          registrado_por: user?.id,
        }).select().single();

        if (factError) throw factError;

        if (prod.tipo === 'cajas') {
          const cajas = Array.from({ length: prod.cantidad }, () => ({
            modelo: prod.modelo || prod.descripcion,
            referencia: ocrResult.numero_factura,
            estado: 'cerrada' as const,
            factura_id: factura.id,
          }));
          await supabase.from('cajas').insert(cajas);
        } else {
          await supabase.from('zapatos').insert({
            modelo: prod.modelo || prod.descripcion,
            talla: prod.talla || 'N/A',
            cantidad: prod.cantidad,
            factura_id: factura.id,
          });
        }

        await supabase.from('movimientos_inventario').insert({
          tipo: 'entrada',
          producto_tipo: prod.tipo === 'cajas' ? 'caja' : 'zapato',
          cantidad: prod.cantidad,
          descripcion: `Factura OCR #${ocrResult.numero_factura} - ${prod.descripcion}`,
          usuario_id: user?.id,
        });
      }

      toast({ title: 'Factura OCR registrada', description: `Se procesaron ${ocrResult.productos.length} productos` });
      setOcrResult(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  const filteredBodegas = bodegas.filter(b => b.local_id === form.local_id);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="font-heading text-2xl font-bold">Registro de Inventario</h1>
          <p className="text-muted-foreground text-sm mt-1">Registra la llegada de mercancía con detalles de costo, venta y fotos</p>
        </div>

        <Tabs defaultValue="manual">
          <TabsList className="w-full bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="manual" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-background">
              <FileText className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="ocr" className="flex-1 gap-2 rounded-lg data-[state=active]:bg-background">
              <Camera className="h-4 w-4" />
              Foto / OCR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-6">
            <Card className="border-primary/10 shadow-lg">
              <CardHeader className="bg-primary/5 rounded-t-xl border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" />
                  Nuevo Registro de Factura
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Número de Factura *</Label>
                      <div className="relative">
                        <Input
                          value={form.numero_factura}
                          onChange={e => setForm(f => ({ ...f, numero_factura: e.target.value }))}
                          readOnly={!isInvoiceEditable}
                          onClick={() => setIsInvoiceEditable(true)}
                          className={!isInvoiceEditable ? "bg-muted cursor-pointer" : "bg-background border-primary"}
                          required
                        />
                        {!isInvoiceEditable && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground italic">Click p/ editar</span>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Fecha Compra</Label>
                      <Input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Proveedor</Label>
                      <Select value={form.proveedor_id} onValueChange={v => setForm(f => ({ ...f, proveedor_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {proveedores.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-border">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Tipo de Producto *</Label>
                      <Select value={form.tipo_producto} onValueChange={(v: 'cajas' | 'zapatos') => setForm(f => ({ ...f, tipo_producto: v }))}>
                        <SelectTrigger className="font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cajas">🟫 Cajas</SelectItem>
                          <SelectItem value="zapatos">👟 Zapatos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {form.tipo_producto === 'zapatos' && (
                      <>
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Modelo *</Label>
                          <Input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ej: Converse All Star Chuck 70" required />
                        </div>

                        <div className="space-y-4 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Tallas y Cantidades *</Label>
                          <div className="flex flex-wrap gap-2 p-3 border rounded-xl bg-background/50">
                            {tallasDisponibles.map(t => (
                              <Badge
                                key={t.valor}
                                variant={form.tallas_seleccionadas.includes(t.valor.toString()) ? "default" : "outline"}
                                className="cursor-pointer transition-all hover:scale-110 px-3 py-1"
                                onClick={() => {
                                  const val = t.valor.toString();
                                  setForm(f => ({
                                    ...f,
                                    tallas_seleccionadas: f.tallas_seleccionadas.includes(val)
                                      ? f.tallas_seleccionadas.filter(v => v !== val)
                                      : [...f.tallas_seleccionadas, val]
                                  }))
                                }}
                              >
                                {t.valor}
                              </Badge>
                            ))}
                          </div>

                          {form.tallas_seleccionadas.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                              {form.tallas_seleccionadas.map(t => (
                                <div key={t} className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase text-muted-foreground text-center block">T{t}</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={form.tallas_cantidades[t] || 0}
                                    onChange={e => updateTallaCantidad(t, Number(e.target.value))}
                                    className="h-9 text-sm text-center font-bold bg-background border-primary/20"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Cantidad Total</Label>
                          <Input type="number" readOnly className="bg-muted font-black text-lg" value={totalQtyShoes} />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Costo Unitario *</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                            <Input type="number" min="0" step="0.01" className="pl-7" value={form.precio_unitario} onChange={e => setForm(f => ({ ...f, precio_unitario: e.target.value }))} required />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Precio Venta Sugerido</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-success font-bold">$</span>
                            <Input type="number" min="0" step="0.01" className="pl-7 font-bold text-success" value={form.precio_venta} onChange={e => setForm(f => ({ ...f, precio_venta: e.target.value }))} />
                          </div>
                        </div>

                        <div className="space-y-2 md:col-span-3">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Foto del Zapato</Label>
                          <div className="flex items-center gap-4">
                            {form.foto_url && (
                              <div className="h-16 w-16 rounded-xl border-2 border-primary/20 overflow-hidden shrink-0 shadow-sm">
                                <img src={form.foto_url} alt="Vista previa" className="h-full w-full object-cover" />
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
                                    if (url) setForm(f => ({ ...f, foto_url: url }));
                                  }
                                }}
                                className="cursor-pointer h-12 pt-3"
                              />
                              <Upload className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {form.tipo_producto === 'cajas' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Cantidad de Cajas *</Label>
                          <Input type="number" min="1" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Costo Unitario (Caja) *</Label>
                          <Input type="number" min="0" step="0.01" value={form.precio_unitario} onChange={e => setForm(f => ({ ...f, precio_unitario: e.target.value }))} required />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">INFO</Label>
                          <div className="h-10 flex items-center bg-muted/30 px-3 rounded text-[10px] text-muted-foreground italic leading-tight">
                            Se generarán IDs automáticos (ej: C0004) para cada caja.
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-border">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Local / Punto de Llegada</Label>
                      <div className="relative">
                        <Store className="h-4 w-4 absolute left-3 top-10 text-muted-foreground z-10" />
                        <Select value={form.local_id} onValueChange={v => setForm(f => ({ ...f, local_id: v, bodega_id: '' }))}>
                          <SelectTrigger className="pl-9"><SelectValue placeholder="Seleccionar local" /></SelectTrigger>
                          <SelectContent>
                            {locales.map(l => (
                              <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Bodega Específica</Label>
                      <div className="relative">
                        <MapPin className="h-4 w-4 absolute left-3 top-10 text-muted-foreground z-10" />
                        <Select value={form.bodega_id} onValueChange={v => setForm(f => ({ ...f, bodega_id: v }))} disabled={!form.local_id}>
                          <SelectTrigger className="pl-9"><SelectValue placeholder="Seleccionar bodega" /></SelectTrigger>
                          <SelectContent>
                            {filteredBodegas.map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.nombre}</SelectItem>
                            ))}
                            {filteredBodegas.length === 0 && <SelectItem value="none" disabled>No hay bodegas en este local</SelectItem>}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 flex justify-between items-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Costo Total Factura</p>
                      <p className="text-3xl font-heading font-black text-primary">${total.toLocaleString()}</p>
                    </div>
                    <Button type="submit" size="lg" className="h-14 px-10 text-lg font-bold" disabled={loading}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                      REGISTRAR INGRESO
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ocr">
            {/* Same OCR implementation but with better styling */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Escanear Factura con Foto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-xl p-12 text-center space-y-6 bg-muted/20">
                  <div className="bg-background h-20 w-20 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <Camera className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Extrae datos automáticamente</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">Sube una foto de la factura del proveedor y el sistema detectará el número, fecha y productos.</p>
                  </div>
                  <label className="cursor-pointer inline-block">
                    <Input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <Button type="button" size="lg" className="h-14 px-8" asChild disabled={ocrLoading}>
                      <span>
                        {ocrLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Camera className="h-5 w-5 mr-3" />}
                        {ocrLoading ? 'PROCESANDO...' : 'TOMAR FOTO / SELECCIONAR'}
                      </span>
                    </Button>
                  </label>
                </div>

                {ocrResult && (
                  <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="bg-primary/5 border-primary/10">
                        <CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Datos de Factura</CardTitle></CardHeader>
                        <CardContent className="space-y-1">
                          <p className="font-bold">Factura: <span className="text-primary">{ocrResult.numero_factura}</span></p>
                          <p className="text-sm">Fecha: {ocrResult.fecha}</p>
                          <p className="text-sm">Proveedor: {ocrResult.proveedor_nombre}</p>
                        </CardContent>
                      </Card>
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" onClick={() => setOcrResult(null)}>Descartar</Button>
                        <Button onClick={handleOcrConfirm} disabled={loading}>
                          {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Confirmar Todo
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-heading font-bold flex items-center gap-2">
                        <Plus className="h-4 w-4" /> Productos Detectados ({ocrResult.productos.length})
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {ocrResult.productos.map((p, i) => (
                          <div key={i} className="bg-background border border-border rounded-xl p-4 shadow-sm hover:border-primary/30 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold">{p.descripcion || p.modelo}</h4>
                              <Badge variant="outline" className="text-[10px] uppercase font-bold">{p.tipo}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground">
                              <span>Cant: <span className="text-foreground">{p.cantidad}</span></span>
                              <span>P/U: <span className="text-foreground">${p.precio_unitario}</span></span>
                              <span>Total: <span className="text-foreground">${p.total}</span></span>
                            </div>
                            {p.talla && <div className="mt-2 text-xs bg-muted inline-block px-2 py-0.5 rounded font-bold">Talla {p.talla}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
