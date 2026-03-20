import * as XLSX from 'xlsx';

export interface ExcelInventoryRow {
    modelo: string;
    talla?: string;
    cantidad: number;
    precio_venta?: number;
    local_nombre?: string;
    identificador_interno?: string;
    [key: string]: any;
}

export const parseInventoryExcel = async (file: File): Promise<ExcelInventoryRow[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet) as ExcelInventoryRow[];

                const validatedData = json.map(row => ({
                    modelo: row.modelo || row.Modelo || '',
                    talla: row.talla || row.Talla || row.talla_numero || '',
                    cantidad: Number(row.cantidad || row.Cantidad || 0),
                    precio_venta: row.precio_venta !== undefined ? Number(row.precio_venta) :
                        row['Precio Venta'] !== undefined ? Number(row['Precio Venta']) : undefined,
                    local_nombre: row.local_nombre || row.local || row.Local || row['Nombre Local'] || undefined,
                    identificador_interno: row.identificador_interno || row.ID || row.Identificador || undefined,
                })).filter(row => row.modelo && row.cantidad > 0);

                resolve(validatedData);
            } catch (error) {
                reject(new Error('Error al procesar el archivo Excel. Asegúrate de que tenga el formato correcto.'));
            }
        };

        reader.onerror = () => reject(new Error('Error al leer el archivo.'));
        reader.readAsBinaryString(file);
    });
};
