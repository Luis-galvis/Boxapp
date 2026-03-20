import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Ruler, Loader2, Trash2 } from 'lucide-react';

export default function Tallas() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [tallas, setTallas] = useState<any[]>([]);
    const [valor, setValor] = useState('');

    const fetchData = async () => {
        const { data } = await supabase.from('tallas').select('*').order('valor');
        setTallas(data || []);
    };

    useEffect(() => { fetchData(); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valor.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('tallas').insert({ valor });
            if (error) throw error;
            toast({ title: 'Talla guardada' });
            setValor('');
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
                    <h1 className="font-heading text-2xl font-bold">Gestión de Tallas</h1>
                    <p className="text-muted-foreground text-sm mt-1">Configura las tallas disponibles en el sistema</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Ruler className="h-4 w-4" />
                                Nueva Talla
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Valor de la Talla *</Label>
                                    <Input value={valor} onChange={e => setValor(e.target.value)} placeholder="Ej: 38, S, L..." required />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                    Guardar Talla
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Tallas Disponibles</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Talla</TableHead>
                                        <TableHead>Fecha</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tallas.map(t => (
                                        <TableRow key={t.id}>
                                            <TableCell className="font-bold">{t.valor}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))}
                                    {tallas.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                                No hay tallas configuradas.
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
