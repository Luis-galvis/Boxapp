import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import AppLayout from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, FileText, Eye, Download, Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function FacturasVenta() {
    const [facturas, setFacturas] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFactura, setSelectedFactura] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const fetchFacturas = async () => {
        const { data } = await supabase
            .from('facturas_venta')
            .select('*, ventas(numero_venta, comprador_nombre, total, detalle_ventas(*))')
            .order('created_at', { ascending: false });
        setFacturas(data || []);
    };

    useEffect(() => { fetchFacturas(); }, []);

    const filteredFacturas = facturas.filter(f =>
        f.numero_factura.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.ventas?.numero_venta?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.ventas?.comprador_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="font-heading text-2xl font-bold">Facturas de Venta</h1>
                        <p className="text-muted-foreground text-sm mt-1">Historial de facturas generadas por ventas</p>
                    </div>
                    <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por factura, venta o cliente..."
                            className="pl-9 w-[300px]"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Lista de Facturas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nº Factura</TableHead>
                                    <TableHead>Nº Venta</TableHead>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Total</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFacturas.map(f => (
                                    <TableRow key={f.id}>
                                        <TableCell className="font-bold">{f.numero_factura}</TableCell>
                                        <TableCell>{f.ventas?.numero_venta}</TableCell>
                                        <TableCell>{f.ventas?.comprador_nombre}</TableCell>
                                        <TableCell>{new Date(f.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="font-bold text-primary">${(f.total || 0).toLocaleString()}</TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0"
                                                onClick={() => {
                                                    setSelectedFactura(f);
                                                    setIsDetailOpen(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredFacturas.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            No se encontraron facturas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Factura Detail Dialog */}
                <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                    <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                                <FileText className="h-5 w-5 text-primary" />
                                Factura {selectedFactura?.numero_factura}
                            </DialogTitle>
                        </DialogHeader>

                        {selectedFactura && (
                            <div className="space-y-6 pt-4 border-t">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Emisor</p>
                                        <p className="font-bold">Inventory Buddy</p>
                                        <p className="text-xs text-muted-foreground italic">Sistema de Gestión de Inventario</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Fecha de Emisión</p>
                                        <p className="font-bold flex items-center gap-1 justify-end">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(selectedFactura.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-muted/30 p-4 rounded-lg">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Cliente / Comprador</p>
                                        <p className="font-bold text-lg">{selectedFactura.cliente_nombre || selectedFactura.ventas?.comprador_nombre}</p>
                                        <p className="text-sm">Venta: {selectedFactura.ventas?.numero_venta}</p>
                                    </div>
                                    <div className="bg-muted/30 p-4 rounded-lg">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Información de Contacto</p>
                                        <p className="text-sm"><strong>Dirección:</strong> {selectedFactura.cliente_direccion || 'No registrada'}</p>
                                        <p className="text-sm"><strong>Teléfono:</strong> {selectedFactura.cliente_telefono || 'No registrado'}</p>
                                        {selectedFactura.cliente_email && <p className="text-sm"><strong>Email:</strong> {selectedFactura.cliente_email}</p>}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-3">Detalle de Productos</p>
                                    <div className="rounded-lg border">
                                        <Table>
                                            <TableHeader className="bg-muted">
                                                <TableRow>
                                                    <TableHead className="text-xs">Modelo</TableHead>
                                                    <TableHead className="text-xs text-center">Talla</TableHead>
                                                    <TableHead className="text-xs text-center">Cant.</TableHead>
                                                    <TableHead className="text-xs text-right">Subtotal</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {selectedFactura.ventas?.detalle_ventas?.map((det: any) => (
                                                    <TableRow key={det.id}>
                                                        <TableCell className="text-sm font-medium">{det.modelo}</TableCell>
                                                        <TableCell className="text-center font-bold">{det.talla}</TableCell>
                                                        <TableCell className="text-center">{det.cantidad}</TableCell>
                                                        <TableCell className="text-right font-bold">${(det.subtotal || 0).toLocaleString()}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t">
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground font-bold uppercase tracking-widest">Total Factura</p>
                                        <p className="text-3xl font-black text-primary">${(selectedFactura.total || 0).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-4 print:hidden">
                                    <Button className="flex-1 gap-2" onClick={() => window.print()}>
                                        <Download className="h-4 w-4" /> Descargar / Imprimir
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
