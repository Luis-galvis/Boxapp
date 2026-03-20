import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Briefcase, Loader2, Trash2 } from 'lucide-react';

export default function Proveedores() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [proveedores, setProveedores] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [nombre, setNombre] = useState('');

    const fetchData = async () => {
        const { data } = await supabase.from('proveedores').select('*').order('nombre');
        setProveedores(data || []);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('proveedores').insert({ nombre });
            if (error) throw error;
            toast({ title: 'Proveedor guardado' });
            setNombre('');
            fetchData();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
        setLoading(false);
    };

    const filtered = proveedores.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="font-heading text-2xl font-bold">Proveedores</h1>
                    <p className="text-muted-foreground text-sm mt-1">Administra tus proveedores de zapatería</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Nuevo Proveedor
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nombre del Proveedor *</Label>
                                    <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Importadora X" required />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Guardar Proveedor
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-lg">Tus Proveedores</CardTitle>
                            <div className="relative w-64">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Fecha Registro</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map(p => (
                                        <TableRow key={p.id}>
                                            <TableCell className="font-medium">{p.nombre}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                    {filtered.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                                No hay proveedores registrados.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
