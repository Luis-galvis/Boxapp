import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Truck, Loader2, CheckCircle2, XCircle, Clock, Eye, User, MapPin, Receipt, Package, FileText, Users2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Pedidos() {
    const { toast } = useToast();
    const [pedidos, setPedidos] = useState<any[]>([]);
    const [selectedPedido, setSelectedPedido] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchPedidos = async () => {
        const { data } = await supabase
            .from('pedidos')
            .select(`
                *, 
                ventas(
                    id,
                    numero_venta, 
                    total, 
                    comprador_nombre, 
                    comprador_numero_documento, 
                    comprador_direccion,
                    created_at,
                    detalle_ventas(*),
                    facturas_venta(numero_factura)
                )
            `)
            .order('created_at', { ascending: false });
        setPedidos(data || []);
    };

    useEffect(() => { fetchPedidos(); }, []);

    const updateStatus = async (id: string, nuevoEstado: string) => {
        try {
            const { error } = await supabase.from('pedidos').update({ estado: nuevoEstado }).eq('id', id);
            if (error) throw error;
            toast({ title: 'Estado actualizado' });
            fetchPedidos();
        } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pendiente': return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pendiente</Badge>;
            case 'despachado': return <Badge variant="default" className="bg-green-600 text-white gap-1"><CheckCircle2 className="h-3 w-3" /> Despachado</Badge>;
            case 'cancelado': return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Cancelado</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="font-heading text-2xl font-bold">Control de Pedidos</h1>
                    <p className="text-muted-foreground text-sm mt-1">Monitorea y actualiza el despacho de mercancía vendida</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Lista de Despacho
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nº Venta</TableHead>
                                    <TableHead>Comprador</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Acción</TableHead>
                                    <TableHead>Detalles</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {pedidos.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell className="font-bold">{p.ventas?.numero_venta}</TableCell>
                                        <TableCell>{p.ventas?.comprador_nombre || '-'}</TableCell>
                                        <TableCell>${(p.ventas?.total || 0).toLocaleString()}</TableCell>
                                        <TableCell>{getStatusBadge(p.estado)}</TableCell>
                                        <TableCell>
                                            <Select
                                                value={p.estado}
                                                onValueChange={(v) => updateStatus(p.id, v)}
                                            >
                                                <SelectTrigger className="w-32 h-8 text-xs font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pendiente">Pendiente</SelectItem>
                                                    <SelectItem value="despachado">Despachado</SelectItem>
                                                    <SelectItem value="cancelado">Cancelado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                    setSelectedPedido(p);
                                                    setIsDetailOpen(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {pedidos.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No hay pedidos registrados aún.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Pedido Detail Dialog */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <Receipt className="h-5 w-5 text-primary" />
                                Detalle de Pedido {selectedPedido?.ventas?.numero_venta}
                            </DialogTitle>
                        </DialogHeader>

                        {selectedPedido && (
                            <div className="space-y-6 pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Card className="bg-muted/30">
                                        <CardContent className="pt-4 space-y-2">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1">
                                                <User className="h-3 w-3" /> Datos del Cliente
                                            </p>
                                            <p className="font-bold text-lg">{selectedPedido.ventas?.comprador_nombre}</p>
                                            <div className="grid grid-cols-1 gap-1 text-sm">
                                                <p className="text-muted-foreground flex items-center gap-2">
                                                    <FileText className="h-3.5 w-3.5" /> CC/NIT: {selectedPedido.ventas?.comprador_numero_documento}
                                                </p>
                                                <p className="text-muted-foreground flex items-center gap-2">
                                                    <Truck className="h-3.5 w-3.5" /> {selectedPedido.ventas?.comprador_direccion || 'Sin dirección'}
                                                </p>
                                                <p className="font-medium flex items-center gap-2 text-primary">
                                                    <Users2 className="h-3.5 w-3.5" /> {selectedPedido.ventas?.compradores?.telefono || 'Sin teléfono'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="bg-primary/5 border-primary/20">
                                        <CardContent className="pt-4 space-y-2 text-right">
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1 flex items-center gap-1 justify-end">
                                                <Receipt className="h-3 w-3" /> Información de Pago
                                            </p>
                                            <p className="text-3xl font-black text-primary">${(selectedPedido.ventas?.total || 0).toLocaleString()}</p>
                                            <div className="pt-2">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Nº Factura de Venta</p>
                                                <p className="font-mono font-bold text-sm">
                                                    {selectedPedido.ventas?.facturas_venta?.[0]?.numero_factura || 'Pendiente de generar'}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3 flex items-center gap-1">
                                        <Package className="h-3 w-3" /> Productos Comprados
                                    </p>
                                    <div className="rounded-lg border border-border overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted">
                                                <TableRow>
                                                    <TableHead className="text-xs uppercase font-bold">Modelo</TableHead>
                                                    <TableHead className="text-xs uppercase font-bold text-center">Talla</TableHead>
                                                    <TableHead className="text-xs uppercase font-bold text-center">Cant.</TableHead>
                                                    <TableHead className="text-xs uppercase font-bold text-right">Precio</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedPedido.ventas?.detalle_ventas?.map((det: any) => (
                                                    <TableRow key={det.id}>
                                                        <TableCell className="font-medium text-sm">{det.modelo}</TableCell>
                                                        <TableCell className="text-center font-bold">{det.talla}</TableCell>
                                                        <TableCell className="text-center">{det.cantidad}</TableCell>
                                                        <TableCell className="text-right font-bold">${(det.precio_unitario || 0).toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button className="flex-1" onClick={() => window.print()}>
                                        Imprimir Factura
                                    </Button>
                                    <Button variant="outline" className="flex-1" onClick={() => setIsDetailOpen(false)}>
                                        Cerrar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
