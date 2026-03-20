import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, BoxIcon, ShoppingCart, FileText, Search, Loader2, Store, MapPin, Ruler } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Stats {
  totalCajas: number;
  cajasAbiertas: number;
  cajasCerradas: number;
  totalZapatos: number;
  totalVentas: number;
  totalFacturas: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalCajas: 0, cajasAbiertas: 0, cajasCerradas: 0, totalZapatos: 0, totalVentas: 0, totalFacturas: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      const [cajas, zapatos, ventas, facturas] = await Promise.all([
        supabase.from('cajas').select('estado'),
        supabase.from('zapatos').select('cantidad'),
        supabase.from('ventas').select('id'),
        supabase.from('facturas_compra').select('id'),
      ]);

      const cajasData = cajas.data || [];
      const zapatosData = zapatos.data || [];
      setStats({
        totalCajas: cajasData.length,
        cajasAbiertas: cajasData.filter(c => c.estado === 'abierta').length,
        cajasCerradas: cajasData.filter(c => c.estado === 'cerrada').length,
        totalZapatos: zapatosData.reduce((sum, z) => sum + (z.cantidad || 0), 0),
        totalVentas: ventas.data?.length || 0,
        totalFacturas: facturas.data?.length || 0,
      });

      // Fetch low stock items (quantity 0 or 1)
      const { data: lowStock } = await supabase
        .from('zapatos')
        .select('*, locales(nombre)')
        .lte('cantidad', 1)
        .order('cantidad', { ascending: true })
        .limit(6);
      setLowStockProducts(lowStock || []);
    };
    fetchStats();
  }, []);

  const handleGlobalSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      // Search in zapatos - could return multiple sizes for same ID
      const { data: zapatosData } = await supabase
        .from('zapatos')
        .select('*, locales(nombre), bodegas(nombre)')
        .eq('identificador_interno', searchQuery);

      if (zapatosData && zapatosData.length > 0) {
        // Consolidate zapato results
        const consolidated = {
          type: 'zapato',
          identificador_interno: zapatosData[0].identificador_interno,
          modelo: zapatosData[0].modelo,
          foto_url: zapatosData[0].foto_url,
          locales: zapatosData[0].locales,
          bodegas: zapatosData[0].bodegas,
          total_stock: zapatosData.reduce((sum, z) => sum + (z.cantidad || 0), 0),
          tallas_info: zapatosData.map(z => ({ talla: z.talla, cantidad: z.cantidad }))
        };
        setSearchResult(consolidated);
      } else {
        // Search in cajas
        const { data: caja } = await supabase
          .from('cajas')
          .select('*, locales(nombre), bodegas(nombre)')
          .eq('identificador_interno', searchQuery)
          .maybeSingle();

        if (caja) {
          setSearchResult({ type: 'caja', ...caja });
        } else {
          setSearchResult({ error: 'No se encontró nada con esa referencia.' });
        }
      }
    } catch (err) {
      console.error(err);
    }
    setIsSearching(false);
  };

  const cards = [
    { title: 'Cajas Cerradas', value: stats.cajasCerradas, icon: BoxIcon, color: 'text-primary' },
    { title: 'Cajas Abiertas', value: stats.cajasAbiertas, icon: BoxIcon, color: 'text-warning' },
    { title: 'Zapatos en Stock', value: stats.totalZapatos, icon: Package, color: 'text-success' },
    { title: 'Ventas Realizadas', value: stats.totalVentas, icon: ShoppingCart, color: 'text-accent' },
    { title: 'Facturas Registradas', value: stats.totalFacturas, icon: FileText, color: 'text-muted-foreground' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Resumen general del inventario</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {cards.map(card => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className="animate-fade-in border-none bg-primary/5">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{card.title}</CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-heading">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-2 border-primary/20 overflow-hidden">
          <CardHeader className="bg-primary/5">
            <CardTitle className="text-xl">Buscador Inteligente</CardTitle>
            <p className="text-sm text-muted-foreground">Ingresa el código (ej: 0001 o C0004) para ver detalles del producto</p>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex gap-2 max-w-xl mx-auto">
              <div className="relative flex-1">
                <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Referencia..."
                  className="pl-10 h-12 text-lg font-mono font-bold tracking-widest"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGlobalSearch()}
                />
              </div>
              <Button size="lg" className="h-12 px-8" onClick={handleGlobalSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            {searchResult && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                {searchResult.error ? (
                  <div className="text-center p-8 bg-destructive/5 rounded-xl text-destructive border border-destructive/20 italic">
                    {searchResult.error}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 p-4 bg-muted/30 rounded-xl border border-border">
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center border border-border">
                      {searchResult.foto_url ? (
                        <img src={searchResult.foto_url} alt={searchResult.modelo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-20" />
                          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Sin Foto</p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="font-mono text-xs">{searchResult.identificador_interno}</Badge>
                          <Badge className="bg-primary text-primary-foreground uppercase text-[10px] px-1.5">{searchResult.type === 'caja' ? '📦 CAJA' : '👟 ZAPATO'}</Badge>
                        </div>
                        <h3 className="text-2xl font-bold font-heading">{searchResult.modelo}</h3>
                        {searchResult.referencia && <p className="text-muted-foreground">{searchResult.referencia}</p>}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {searchResult.type === 'zapato' ? (
                          <>
                            <div className="space-y-1 col-span-2">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Tallas Disponibles</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {searchResult.tallas_info.map((ti: any, idx: number) => (
                                  <Badge key={idx} variant={ti.cantidad > 0 ? "secondary" : "outline"} className="text-[10px] font-bold">
                                    T{ti.talla} ({ti.cantidad})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase font-bold">Stock Total</p>
                              <div className={`flex items-center gap-1.5 font-bold text-lg ${searchResult.total_stock <= 1 ? 'text-destructive' : 'text-success'}`}>
                                <Package className="h-3.5 w-3.5" />
                                {searchResult.total_stock}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Stock Actual</p>
                            <div className={`flex items-center gap-1.5 font-bold text-lg ${searchResult.cantidad <= 1 ? 'text-destructive' : 'text-success'}`}>
                              <Package className="h-3.5 w-3.5" />
                              {searchResult.cantidad ?? (searchResult.estado === 'cerrada' ? '1 Caja' : 'Abierta')}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1">
                          <p className="text-[10px] text-muted-foreground uppercase font-bold">Ubicación</p>
                          <div className="flex items-center gap-1.5 font-bold">
                            <Store className="h-3.5 w-3.5 text-accent" />
                            {searchResult.locales?.nombre || 'General'}
                          </div>
                        </div>
                        {searchResult.bodegas?.nombre && (
                          <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Bodega</p>
                            <div className="flex items-center gap-1.5 font-bold">
                              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                              {searchResult.bodegas?.nombre}
                            </div>
                          </div>
                        )}
                      </div>

                      {searchResult.type === 'zapato' && (
                        <div className="pt-4 border-t border-border mt-2">
                          <Button
                            onClick={() => navigate('/ventas', { state: { autoSelectId: searchResult.identificador_interno } })}
                            className="w-full bg-primary hover:bg-primary/90 font-bold"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            VENDER ESTE ZAPATO
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {lowStockProducts.length > 0 && (
          <Card className="border-destructive/20 shadow-lg">
            <CardHeader className="bg-destructive/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl text-destructive flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Alertas de Stock Bajo
                </CardTitle>
                <p className="text-sm text-muted-foreground">Productos con 0 o 1 unidad disponible</p>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStockProducts.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                    <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                      {p.foto_url ? (
                        <img src={p.foto_url} alt={p.modelo} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground opacity-20" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{p.modelo}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold">
                        <span>Talla {p.talla}</span>
                        <span>•</span>
                        <span>{p.locales?.nombre || 'General'}</span>
                      </div>
                    </div>
                    <Badge variant={p.cantidad === 0 ? "destructive" : "outline"} className="h-8 px-3 font-bold border-warning text-warning">
                      {p.cantidad === 0 ? 'SIN STOCK' : '1 UND'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
