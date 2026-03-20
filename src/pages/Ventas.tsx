import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ShoppingCart, UserPlus, Search, Store, Hash, Ruler } from 'lucide-react';

interface Zapato {
  id: string;
  modelo: string;
  talla: string;
  cantidad: number;
  identificador_interno: string;
  precio_venta: number;
  foto_url: string;
}

interface SaleItem {
  zapato_id: string;
  modelo: string;
  talla: string;
  cantidad: number;
  precio_unitario: number;
  max_qty: number;
  identificador_interno: string;
  available_sizes: string[];
}

export default function Ventas() {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const [zapatos, setZapatos] = useState<Zapato[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [compradores, setCompradores] = useState<any[]>([]);
  const [locales, setLocales] = useState<any[]>([]);
  const [selectedComprador, setSelectedComprador] = useState<string>('manual');
  const [searchDoc, setSearchDoc] = useState('');
  const [customerData, setCustomerData] = useState({
    id: '',
    nombre: '',
    numero_documento: '',
    direccion: '',
    telefono: '',
  });
  const [selectedLocal, setSelectedLocal] = useState<string>('');

  const fetchData = async () => {
    const { data: zData } = await supabase.from('zapatos').select('*').gt('cantidad', 0).order('modelo');
    setZapatos(zData || []);

    const { data: cData } = await supabase.from('compradores').select('*');
    setCompradores(cData || []);

    const { data: lData } = await supabase.from('locales').select('*');
    setLocales(lData || []);
    if (lData && lData.length > 0) setSelectedLocal(lData[0].id);
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (zapatos.length > 0 && location.state?.autoSelectId && items.length === 0) {
      const id = location.state.autoSelectId;
      const relevantZapatos = zapatos.filter(z => z.identificador_interno === id);

      if (relevantZapatos.length > 0) {
        const z = relevantZapatos[0];
        const sizes = relevantZapatos.map(rz => rz.talla);

        setItems([{
          zapato_id: relevantZapatos.length === 1 ? z.id : '',
          modelo: z.modelo,
          talla: relevantZapatos.length === 1 ? z.talla : '',
          cantidad: 1,
          precio_unitario: z.precio_venta || 0,
          max_qty: relevantZapatos.length === 1 ? z.cantidad : 0,
          identificador_interno: id,
          available_sizes: sizes,
        }]);

        // Clear state to avoid re-triggering
        window.history.replaceState({}, document.title);
      }
    }
  }, [zapatos, location.state]);

  const addItem = () => setItems(i => [...i, {
    zapato_id: '',
    modelo: '',
    talla: '',
    cantidad: 1,
    precio_unitario: 0,
    max_qty: 0,
    identificador_interno: '',
    available_sizes: []
  }]);

  const removeItem = (i: number) => setItems(items => items.filter((_, idx) => idx !== i));

  const handleSearchById = async (idx: number, id: string) => {
    if (id.length < 4) return;

    // Find model by ID
    const relevantZapatos = zapatos.filter(z => z.identificador_interno === id);
    if (relevantZapatos.length > 0) {
      const z = relevantZapatos[0];
      const sizes = relevantZapatos.map(rz => rz.talla);

      setItems(items => items.map((item, i) => i === idx ? {
        ...item,
        modelo: z.modelo,
        precio_unitario: z.precio_venta || 0,
        identificador_interno: id,
        available_sizes: sizes,
        zapato_id: relevantZapatos.length === 1 ? z.id : '', // Auto-select if only one size
        talla: relevantZapatos.length === 1 ? z.talla : '',
        max_qty: relevantZapatos.length === 1 ? z.cantidad : 0
      } : item));
    }
  };

  const selectZapatoSize = (idx: number, talla: string) => {
    const item = items[idx];
    const z = zapatos.find(z => z.modelo === item.modelo && z.talla === talla);
    if (!z) return;

    setItems(items => items.map((it, i) => i === idx ? {
      ...it,
      zapato_id: z.id,
      talla: z.talla,
      max_qty: z.cantidad,
      cantidad: 1
    } : it));
  };

  const updateItem = (idx: number, field: 'cantidad' | 'precio_unitario', value: number) => {
    setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const total = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const handleSearchCustomer = () => {
    const found = compradores.find(c => c.numero_documento === searchDoc);
    if (found) {
      setSelectedComprador(found.id);
      setCustomerData({
        id: found.id,
        nombre: found.nombre,
        numero_documento: found.numero_documento,
        direccion: found.direccion || '',
        telefono: found.telefono || '',
      });
      toast({ title: 'Comprador encontrado' });
    } else {
      toast({ title: 'No encontrado', description: 'Puedes registrarlo manualmente' });
      setSelectedComprador('manual');
      setCustomerData(prev => ({ ...prev, numero_documento: searchDoc }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || items.some(i => !i.zapato_id || i.cantidad < 1 || i.precio_unitario <= 0)) {
      toast({ title: 'Completa todos los productos y tallas', variant: 'destructive' });
      return;
    }
    if (items.some(i => i.cantidad > i.max_qty)) {
      toast({ title: 'Cantidad excede el stock disponible', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Generate sale number
      const { data: numData } = await supabase.rpc('generate_sale_number');
      const numero_venta = numData || `V-${Date.now()}`;

      // Customer handling
      let finalCompradorId = selectedComprador === 'manual' ? null : selectedComprador;
      if (selectedComprador === 'manual' && customerData.nombre && customerData.numero_documento) {
        // Create new customer
        const { data: newCust, error: custErr } = await supabase.from('compradores').insert({
          nombre: customerData.nombre,
          numero_documento: customerData.numero_documento,
          direccion: customerData.direccion,
          telefono: customerData.telefono,
        }).select().single();
        if (custErr) throw custErr;
        finalCompradorId = newCust.id;
      }

      // Create sale
      const { data: venta, error: ventaErr } = await supabase.from('ventas').insert({
        numero_venta,
        total,
        vendedor_id: user?.id,
        comprador_id: finalCompradorId,
        comprador_nombre: customerData.nombre,
        comprador_numero_documento: customerData.numero_documento,
        comprador_direccion: customerData.direccion,
        local_id: selectedLocal || null,
      }).select().single();
      if (ventaErr) throw ventaErr;

      // Create sale details
      const detalles = items.map(i => ({
        venta_id: venta.id,
        zapato_id: i.zapato_id,
        modelo: i.modelo,
        talla: i.talla,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.cantidad * i.precio_unitario,
      }));
      await supabase.from('detalle_ventas').insert(detalles);

      // Update stock
      for (const item of items) {
        const z = zapatos.find(z => z.id === item.zapato_id);
        if (z) {
          await supabase.from('zapatos').update({ cantidad: z.cantidad - item.cantidad }).eq('id', item.zapato_id);
        }
        // Record movement
        await supabase.from('movimientos_inventario').insert({
          tipo: 'salida',
          producto_tipo: 'zapato',
          producto_id: item.zapato_id,
          cantidad: item.cantidad,
          descripcion: `Venta ${numero_venta} - ${item.modelo} T${item.talla}`,
          usuario_id: user?.id,
        });
      }

      toast({
        title: 'Venta exitosa',
        description: `Se ha generado la Factura de Venta para ${numero_venta}`
      });
      setItems([]);
      setCustomerData({ id: '', nombre: '', numero_documento: '', direccion: '', telefono: '' });
      setSearchDoc('');
      setSelectedComprador('manual');
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Nueva Venta</h1>
          <p className="text-muted-foreground text-sm mt-1">Busca por referencia o selecciona manualmente</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Productos en el Carrito
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form id="sale-form" onSubmit={handleSubmit} className="space-y-4">
                  {items.map((item, i) => (
                    <div key={i} className="border border-border rounded-lg p-4 space-y-4 animate-fade-in bg-muted/20">
                      <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_120px_120px_40px] gap-4 items-end">
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">REF. ID</Label>
                          <div className="relative">
                            <Hash className="h-3.5 w-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              placeholder="0001"
                              className="pl-7 font-mono font-bold"
                              value={item.identificador_interno}
                              onChange={e => {
                                const val = e.target.value;
                                setItems(items => items.map((it, idx) => idx === i ? { ...it, identificador_interno: val } : it));
                                handleSearchById(i, val);
                              }}
                              maxLength={4}
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Modelo / Nombre</Label>
                          <Input value={item.modelo} readOnly className="bg-muted text-sm font-semibold" placeholder="Busca por ID..." />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Talla</Label>
                          <Select value={item.talla} onValueChange={v => selectZapatoSize(i, v)} disabled={!item.modelo}>
                            <SelectTrigger className="font-bold">
                              <SelectValue placeholder="Talla" />
                            </SelectTrigger>
                            <SelectContent>
                              {item.available_sizes.map(s => (
                                <SelectItem key={s} value={s}>Talla {s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Cant. (Stock: {item.max_qty})</Label>
                          <Input type="number" min={1} max={item.max_qty} value={item.cantidad} onChange={e => updateItem(i, 'cantidad', Number(e.target.value))} />
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-destructive h-10 w-10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex-1 max-w-[150px]">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Precio Unitario</Label>
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">$</span>
                            <Input
                              className="pl-5 font-bold text-primary"
                              type="number"
                              min={0}
                              step="0.01"
                              value={item.precio_unitario}
                              onChange={e => updateItem(i, 'precio_unitario', Number(e.target.value))}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Subtotal</p>
                          <p className="font-heading font-bold text-lg">${(item.cantidad * item.precio_unitario).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addItem} className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5">
                    <Plus className="h-4 w-4 mr-2" /> Agregar Producto a la Venta
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-primary/20">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Datos del Comprador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs font-bold text-muted-foreground">Buscar por Documento</Label>
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="C.C / NIT"
                        className="pl-9"
                        value={searchDoc}
                        onChange={e => setSearchDoc(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearchCustomer()}
                      />
                    </div>
                  </div>
                  <Button type="button" variant="secondary" className="mt-6" onClick={handleSearchCustomer}>
                    Buscar
                  </Button>
                </div>

                <div className="space-y-3 pt-4 border-t border-border">
                  <div>
                    <Label className="text-xs font-bold">Nombre Completo *</Label>
                    <Input
                      value={customerData.nombre}
                      onChange={e => setCustomerData(c => ({ ...c, nombre: e.target.value }))}
                      placeholder="Nombre del cliente"
                      required={selectedComprador === 'manual'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold">Documento *</Label>
                      <Input
                        value={customerData.numero_documento}
                        onChange={e => setCustomerData(c => ({ ...c, numero_documento: e.target.value }))}
                        placeholder="C.C / NIT"
                        required={selectedComprador === 'manual'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-bold">Teléfono</Label>
                      <Input
                        value={customerData.telefono}
                        onChange={e => setCustomerData(c => ({ ...c, telefono: e.target.value }))}
                        placeholder="Celular / Tel"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold">Dirección</Label>
                    <Input
                      value={customerData.direccion}
                      onChange={e => setCustomerData(c => ({ ...c, direccion: e.target.value }))}
                      placeholder="Dirección de entrega"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20 shadow-lg shadow-primary/10">
              <CardHeader className="pb-3 border-b border-primary/10">
                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                  <Store className="h-4 w-4" />
                  Punto de Venta & Total
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div>
                  <Label className="text-xs font-bold">Local / Tienda Origen</Label>
                  <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder="Seleccionar local" /></SelectTrigger>
                    <SelectContent>
                      {locales.map(l => (
                        <SelectItem key={l.id} value={l.id}>{l.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-background p-4 rounded-xl border border-primary/20 shadow-inner">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Total a Pagar</p>
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground font-bold">$</span>
                    <span className="text-4xl font-heading font-black text-primary drop-shadow-sm">{total.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground font-bold">COP</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  form="sale-form"
                  className="w-full h-14 text-xl font-black bg-primary hover:bg-primary/90 transition-all duration-300 shadow-lg shadow-primary/20 group"
                  disabled={loading || items.length === 0}
                >
                  {loading ? (
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  ) : (
                    <ShoppingCart className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform" />
                  )}
                  REFORMULAR VENTA
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
