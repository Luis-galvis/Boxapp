import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Camera, ImageIcon, Upload, Package } from 'lucide-react';
import { uploadPhoto } from '@/lib/storage';

interface Caja {
  id: string;
  modelo: string;
  referencia: string;
  identificador_interno: string;
}

interface ZapatoEntry {
  modelo: string;
  tallas_seleccionadas: string[];
  tallas_cantidades: Record<string, number>;
  precio_venta: number;
  foto_url: string;
}

export default function AbrirCaja() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedCaja, setSelectedCaja] = useState<string>('');
  const [cajasCerradas, setCajasCerradas] = useState<Caja[]>([]);
  const [tallas, setTallas] = useState<any[]>([]);
  const [zapatos, setZapatos] = useState<ZapatoEntry[]>([
    { modelo: '', tallas_seleccionadas: [], tallas_cantidades: {}, precio_venta: 0, foto_url: '' }
  ]);

  useEffect(() => {
    Promise.all([
      supabase.from('cajas').select('id, modelo, referencia, identificador_interno').eq('estado', 'cerrada'),
      supabase.from('tallas').select('valor').order('valor')
    ]).then(([{ data: c }, { data: t }]) => {
      setCajasCerradas(c || []);
      setTallas(t || []);
    });
  }, []);

  const addZapato = () => setZapatos(z => [...z, { modelo: '', tallas_seleccionadas: [], tallas_cantidades: {}, precio_venta: 0, foto_url: '' }]);
  const removeZapato = (i: number) => setZapatos(z => z.filter((_, idx) => idx !== i));
  const updateZapato = (i: number, field: keyof ZapatoEntry, value: any) =>
    setZapatos(z => z.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const updateTallaCantidad = (i: number, talla: string, cant: number) => {
    setZapatos(z => z.map((item, idx) => idx === i ? {
      ...item,
      tallas_cantidades: { ...item.tallas_cantidades, [talla]: cant }
    } : item));
  };

  const toggleTalla = (i: number, valor: string) => {
    setZapatos(z => z.map((item, idx) => {
      if (idx !== i) return item;
      const exists = item.tallas_seleccionadas.includes(valor);
      const newTallas = exists
        ? item.tallas_seleccionadas.filter(v => v !== valor)
        : [...item.tallas_seleccionadas, valor];

      return { ...item, tallas_seleccionadas: newTallas };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaja) {
      toast({ title: 'Selecciona una caja', variant: 'destructive' });
      return;
    }

    if (zapatos.some(z => !z.modelo || z.tallas_seleccionadas.length === 0)) {
      toast({ title: 'Completa todos los zapatos', description: 'Cada entrada debe tener modelo y al menos una talla seleccionada con cantidad', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: boxData } = await supabase.from('cajas').select('local_id, bodega_id, identificador_interno').eq('id', selectedCaja).single();
      await supabase.from('cajas').update({ estado: 'abierta' }).eq('id', selectedCaja);

      const zapatosInsert: any[] = [];
      let totalQtyAdded = 0;

      for (const z of zapatos) {
        const { data: nextId } = await supabase.rpc('get_next_product_id', { p_tipo: 'zapatos' });

        z.tallas_seleccionadas.forEach((t) => {
          const finalQty = z.tallas_cantidades[t] || 0;
          if (finalQty > 0) {
            totalQtyAdded += finalQty;
            zapatosInsert.push({
              modelo: z.modelo,
              talla: t,
              cantidad: finalQty,
              precio_venta: Number(z.precio_venta),
              foto_url: z.foto_url,
              caja_id: selectedCaja,
              identificador_interno: nextId,
              local_id: boxData?.local_id,
              bodega_id: boxData?.bodega_id,
            });
          }
        });
      }

      if (zapatosInsert.length > 0) {
        await supabase.from('zapatos').insert(zapatosInsert);
        await supabase.from('movimientos_inventario').insert({
          tipo: 'apertura_caja',
          producto_tipo: 'zapato',
          cantidad: totalQtyAdded,
          descripcion: `Apertura Caja ${boxData?.identificador_interno} - ${totalQtyAdded} zapatos registrados`,
          usuario_id: user?.id,
        });
      }

      toast({ title: 'Caja abierta', description: `Se registraron ${totalQtyAdded} zapatos` });
      setSelectedCaja('');
      setZapatos([{ modelo: '', tallas_seleccionadas: [], tallas_cantidades: {}, precio_venta: 0, foto_url: '' }]);
      const { data } = await supabase.from('cajas').select('id, modelo, referencia, identificador_interno').eq('estado', 'cerrada');
      setCajasCerradas(data || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-heading text-2xl font-bold">Abrir Caja</h1>
          <p className="text-muted-foreground text-sm mt-1">Abre una caja cerrada y registra los zapatos que contiene con sus tallas y cantidades exactas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Caja</CardTitle>
          </CardHeader>
          <CardContent>
            {cajasCerradas.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No hay cajas cerradas disponibles</p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Caja a abrir *</Label>
                  <Select value={selectedCaja} onValueChange={setSelectedCaja}>
                    <SelectTrigger><SelectValue placeholder="Selecciona una caja" /></SelectTrigger>
                    <SelectContent>
                      {cajasCerradas.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.identificador_interno} - {c.modelo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-bold">Zapatos en la caja</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addZapato}>
                      <Plus className="h-4 w-4 mr-2" /> Agregar Zapato
                    </Button>
                  </div>

                  {zapatos.map((z, i) => (
                    <Card key={i} className="bg-muted/30 border-dashed relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeZapato(i)}
                        disabled={zapatos.length === 1}
                        className="absolute right-2 top-2 text-destructive h-8 w-8 z-10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Modelo / Referencia *</Label>
                            <Input
                              value={z.modelo}
                              onChange={e => updateZapato(i, 'modelo', e.target.value)}
                              placeholder="Ej: Nike Air Force 1"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Precio Venta Sugerido</Label>
                            <Input
                              type="number"
                              value={z.precio_venta}
                              onChange={e => updateZapato(i, 'precio_venta', Number(e.target.value))}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold uppercase text-muted-foreground">Tallas Disponibles *</Label>
                          <div className="flex flex-wrap gap-1 p-3 border rounded-lg bg-background">
                            {tallas.map(t => (
                              <Badge
                                key={t.valor}
                                variant={z.tallas_seleccionadas.includes(t.valor.toString()) ? "default" : "outline"}
                                className="cursor-pointer text-xs px-2 py-1"
                                onClick={() => toggleTalla(i, t.valor.toString())}
                              >
                                {t.valor}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {z.tallas_seleccionadas.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                            {z.tallas_seleccionadas.map(t => (
                              <div key={t} className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-muted-foreground text-center block">T{t}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={z.tallas_cantidades[t] || 0}
                                  onChange={e => updateTallaCantidad(i, t, Number(e.target.value))}
                                  className="h-8 text-xs text-center font-bold"
                                />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Foto del Zapato</Label>
                          <div className="flex items-center gap-2">
                            {z.foto_url && (
                              <div className="h-9 w-9 rounded border overflow-hidden shrink-0">
                                <img src={z.foto_url} alt="Z" className="h-full w-full object-cover" />
                              </div>
                            )}
                            <div className="relative flex-1">
                              <Input
                                type="file"
                                accept="image/*"
                                className="h-9 text-[10px] pr-8"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const url = await uploadPhoto(file);
                                    if (url) updateZapato(i, 'foto_url', url);
                                  }
                                }}
                              />
                              <Upload className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Package className="h-5 w-5 mr-2" />}
                  Confirmar Apertura y Registro
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
