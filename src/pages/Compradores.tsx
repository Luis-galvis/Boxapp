import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, UserPlus, Loader2, Trash2 } from 'lucide-react';

export default function Compradores() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [compradores, setCompradores] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({
        nombre: '',
        numero_documento: '',
        direccion: '',
        telefono: '',
        email: '',
    });

    const fetchData = async () => {
        const { data } = await supabase.from('compradores').select('*').order('created_at', { ascending: false });
        setCompradores(data || []);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.from('compradores').insert(form);
            if (error) throw error;
            toast({ title: 'Comprador guardado' });
            setForm({ nombre: '', numero_documento: '', direccion: '', telefono: '', email: '' });
            fetchData();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
        setLoading(false);
    };

    const filteredCompradores = compradores.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.numero_documento.includes(searchTerm)
    );

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="font-heading text-2xl font-bold">Compradores</h1>
                    <p className="text-muted-foreground text-sm mt-1">Gestiona los clientes frecuentes y sus datos</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Nuevo Comprador
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nombre *</Label>
                                    <Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Documento (CC/NIT) *</Label>
                                    <Input value={form.numero_documento} onChange={e => setForm(f => ({ ...f, numero_documento: e.target.value }))} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dirección</Label>
                                    <Input value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Guardar Comprador
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-lg">Lista de Compradores</CardTitle>
                            <div className="relative w-64">
                                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nombre o doc..."
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
                                        <TableHead>Documento</TableHead>
                                        <TableHead>Teléfono</TableHead>
                                        <TableHead>Dirección</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCompradores.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell className="font-medium">{c.nombre}</TableCell>
                                            <TableCell>{c.numero_documento}</TableCell>
                                            <TableCell>{c.telefono || '-'}</TableCell>
                                            <TableCell className="text-sm">{c.direccion || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredCompradores.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No se encontraron compradores.
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
