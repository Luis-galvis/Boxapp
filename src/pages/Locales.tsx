import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Store, Warehouse, Loader2, Trash2, MapPin } from 'lucide-react';

export default function Locales() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [locales, setLocales] = useState<any[]>([]);
    const [bodegas, setBodegas] = useState<any[]>([]);
    const [localForm, setLocalForm] = useState({ nombre: '', direccion: '' });
    const [bodegaForm, setBodegaForm] = useState({ nombre: '', local_id: '' });

    const fetchData = async () => {
        const [l, b] = await Promise.all([
            supabase.from('locales').select('*').order('nombre'),
            supabase.from('bodegas').select('*, locales(nombre)').order('nombre'),
        ]);
        setLocales(l.data || []);
        setBodegas(b.data || []);
        if (l.data && l.data.length > 0) setBodegaForm(f => ({ ...f, local_id: l.data[0].id }));
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreateLocal = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('locales').insert(localForm);
            if (error) throw error;
            toast({ title: 'Local creado' });
            setLocalForm({ nombre: '', direccion: '' });
            fetchData();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
        setLoading(false);
    };

    const handleCreateBodega = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bodegaForm.local_id) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('bodegas').insert(bodegaForm);
            if (error) throw error;
            toast({ title: 'Bodega creada' });
            setBodegaForm(f => ({ ...f, nombre: '' }));
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
                    <h1 className="font-heading text-2xl font-bold">Gestión de Puntos y Bodegas</h1>
                    <p className="text-muted-foreground text-sm mt-1">Administra tus locales comerciales y bodegas de almacenamiento</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Locales Section */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Store className="h-4 w-4" />
                                    Nuevo Local / Tienda
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateLocal} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nombre del Local *</Label>
                                        <Input value={localForm.nombre} onChange={e => setLocalForm(f => ({ ...f, nombre: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Dirección</Label>
                                        <Input value={localForm.direccion} onChange={e => setLocalForm(f => ({ ...f, direccion: e.target.value }))} />
                                    </div>
                                    <Button type="submit" className="w-full" disabled={loading}>
                                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        Crear Local
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Tus Locales</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Dirección</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {locales.map(l => (
                                            <TableRow key={l.id}>
                                                <TableCell className="font-medium">{l.nombre}</TableCell>
                                                <TableCell className="text-sm">{l.direccion || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Bodegas Section */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Warehouse className="h-4 w-4" />
                                    Nueva Bodega
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateBodega} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nombre de Bodega *</Label>
                                        <Input value={bodegaForm.nombre} onChange={e => setBodegaForm(f => ({ ...f, nombre: e.target.value }))} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Asignar a Local</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={bodegaForm.local_id}
                                            onChange={e => setBodegaForm(f => ({ ...f, local_id: e.target.value }))}
                                        >
                                            {locales.map(l => (
                                                <option key={l.id} value={l.id}>{l.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
                                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                        Crear Bodega
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Tus Bodegas</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nombre</TableHead>
                                            <TableHead>Local</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bodegas.map(b => (
                                            <TableRow key={b.id}>
                                                <TableCell className="font-medium">{b.nombre}</TableCell>
                                                <TableCell className="text-sm">{b.locales?.nombre || '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
