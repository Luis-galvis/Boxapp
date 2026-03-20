import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, FileStack, Loader2, Trash2, ShoppingBag } from 'lucide-react';

export default function Remisiones() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [remisiones, setRemisiones] = useState<any[]>([]);
    const [zapatos, setZapatos] = useState<any[]>([]);
    const [compradores, setCompradores] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [selectedComprador, setSelectedComprador] = useState<string>('manual');
    const [form, setForm] = useState({
        numero_remision: `R-${Date.now()}`,
        comprador_nombre_manual: '',
    });

    const fetchData = async () => {
        const [r, z, c] = await Promise.all([
            supabase.from('remisiones').select('*, compradores(nombre)').order('created_at', { ascending: false }),
            supabase.from('zapatos').select('*').gt('cantidad', 0).order('modelo'),
            supabase.from('compradores').select('*').order('nombre'),
        ]);
        setRemisiones(r.data || []);
        setZapatos(z.data || []);
        setCompradores(c.data || []);
    };

    useEffect(() => { fetchData(); }, []);

    const addItem = () => setItems(i => [...i, { zapato_id: '', modelo: '', talla: '', cantidad: 1, max_qty: 0 }]);
    const removeItem = (idx: number) => setItems(items => items.filter((_, i) => i !== idx));

    const selectZapato = (idx: number, zapatoId: string) => {
        const z = zapatos.find(z => z.id === zapatoId);
        if (!z) return;
        setItems(items => items.map((item, i) => i === idx ? { ...item, zapato_id: z.id, modelo: z.modelo, talla: z.talla, max_qty: z.cantidad } : item));
    };

    const updateItem = (idx: number, field: string, value: any) => {
        setItems(items => items.map((item, i) => i === idx ? { ...item, [field]: value } : item));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0 || items.some(i => !i.zapato_id)) {
            toast({ title: 'Agrega productos', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const { data: rem, error: remErr } = await supabase.from('remisiones').insert({
                numero_remision: form.numero_remision,
                comprador_id: selectedComprador === 'manual' ? null : selectedComprador,
                comprador_nombre_manual: selectedComprador === 'manual' ? form.comprador_nombre_manual : '',
                estado: 'pendiente',
            }).select().single();

            if (remErr) throw remErr;

            const detalles = items.map(i => ({
                remision_id: rem.id,
                zapato_id: i.zapato_id,
                modelo: i.modelo,
                talla: i.talla,
                cantidad: i.cantidad,
            }));

            const { error: detErr } = await supabase.from('detalle_remisiones').insert(detalles);
            if (detErr) throw detErr;

            toast({ title: 'Remisión creada' });
            setItems([]);
            setForm({ numero_remision: `R-${Date.now()}`, comprador_nombre_manual: '' });
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
                    <h1 className="font-heading text-2xl font-bold">Remisiones</h1>
                    <p className="text-muted-foreground text-sm mt-1">Salida de mercancía pendiente por facturar</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Nueva Remisión
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nº Remisión</Label>
                                        <Input value={form.numero_remision} onChange={e => setForm(f => ({ ...f, numero_remision: e.target.value }))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Comprador / Cliente</Label>
                                        <Select value={selectedComprador} onValueChange={setSelectedComprador}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manual">Manual / Otro</SelectItem>
                                                {compradores.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {selectedComprador === 'manual' && (
                                    <div className="space-y-2">
                                        <Label>Nombre Manual</Label>
                                        <Input value={form.comprador_nombre_manual} onChange={e => setForm(f => ({ ...f, comprador_nombre_manual: e.target.value }))} />
                                    </div>
                                )}

                                <div className="space-y-4 pt-2">
                                    <Label>Productos</Label>
                                    {items.map((item, i) => (
                                        <div key={i} className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <Select value={item.zapato_id} onValueChange={v => selectZapato(i, v)}>
                                                    <SelectTrigger><SelectValue placeholder="Zapato" /></SelectTrigger>
                                                    <SelectContent>
                                                        {zapatos.map(z => <SelectItem key={z.id} value={z.id}>{z.modelo} T{z.talla} (S: {z.cantidad})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="w-24">
                                                <Input type="number" value={item.cantidad} max={item.max_qty} onChange={e => updateItem(i, 'cantidad', Number(e.target.value))} />
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} className="text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full">
                                        <Plus className="h-4 w-4 mr-2" /> Agregar Producto
                                    </Button>
                                </div>

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Generar Remisión
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Remisiones Recientes</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nº</TableHead>
                                        <TableHead>Cliente</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {remisiones.map(r => (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-bold">{r.numero_remision}</TableCell>
                                            <TableCell>{r.compradores?.nombre || r.comprador_nombre_manual || '-'}</TableCell>
                                            <TableCell>
                                                <Badge variant={r.estado === 'pendiente' ? 'secondary' : 'default'}>{r.estado}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
