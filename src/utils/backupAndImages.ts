import {
  CompanyConfig,
  Category,
  Product,
  Client,
  Supplier,
  Sale,
  Purchase,
  CreditAccount,
  CashMovement,
  CashSession,
  InventoryMovement,
  ReturnRecord,
  SystemUser,
} from '../types/erp';

export interface FullBackupData {
  version: string;
  exportedAt: string;
  app: string;
  config: CompanyConfig;
  categories: Category[];
  products: Product[];
  clients: Client[];
  suppliers: Supplier[];
  sales: Sale[];
  purchases: Purchase[];
  credits: CreditAccount[];
  cashMovements: CashMovement[];
  cashSessions: CashSession[];
  inventoryMovements: InventoryMovement[];
  returns: ReturnRecord[];
  users: SystemUser[];
}

/**
 * Optimiza y comprime una imagen seleccionada desde el dispositivo
 * para guardarla como Data URL de tamaño reducido (ideal para almacenamiento rápido).
 */
export async function compressAndReadImage(
  file: File,
  maxDimension = 480,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen.'));
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (!result) return reject(new Error('No se pudo procesar la imagen.'));

      const img = new Image();
      img.onerror = () => resolve(result);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(result);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const compressed = canvas.toDataURL(mime, quality);
          resolve(compressed);
        } catch {
          resolve(result);
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Descarga automática de un archivo en el navegador
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Exporta Copia de Seguridad completa en formato JSON
 */
export function exportFullBackupJSON(backupData: FullBackupData) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 5).replace(':', '-');
  const filename = `CopiaSeguridad_VARIEDADES_CS_${dateStr}_${timeStr}.json`;
  const jsonContent = JSON.stringify(backupData, null, 2);
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Exporta catálogo de productos a CSV compatible con Microsoft Excel
 */
export function exportProductsToCSV(products: Product[]) {
  const headers = [
    'Código de Barras',
    'SKU',
    'Nombre del Producto',
    'Categoría',
    'Proveedor',
    'Costo Unitario',
    'Precio de Venta',
    'Stock Actual',
    'Stock Mínimo',
    'Unidad',
    'Ubicación',
    'URL Imagen',
    'Estado',
  ];

  const escapeCSV = (value: unknown): string => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = products.map((p) => [
    escapeCSV(p.barcode),
    escapeCSV(p.sku),
    escapeCSV(p.name),
    escapeCSV(p.categoryName),
    escapeCSV(p.supplierName),
    p.cost,
    p.price,
    p.stock,
    p.minStock,
    escapeCSV(p.unit),
    escapeCSV(p.location),
    escapeCSV(p.imageUrl || ''),
    p.active ? 'Activo' : 'Inactivo',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `Catalogo_Productos_${dateStr}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Exporta clientes a CSV
 */
export function exportClientsToCSV(clients: Client[]) {
  const headers = ['Documento', 'Nombre Completo', 'Teléfono', 'Correo', 'Dirección', 'Límite Crédito', 'Saldo Deuda', 'Estado'];
  const escapeCSV = (value: unknown): string => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };
  const rows = clients.map((c) => [
    escapeCSV(c.document),
    escapeCSV(c.name),
    escapeCSV(c.phone),
    escapeCSV(c.email),
    escapeCSV(c.address),
    c.creditLimit,
    c.currentBalance,
    c.active ? 'Activo' : 'Inactivo',
  ]);
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  downloadFile(csvContent, `Directorio_Clientes_${dateStr}.csv`, 'text/csv;charset=utf-8;');
}

/**
 * Procesa archivo de importación de productos (JSON o CSV)
 */
export function parseProductsFile(fileContent: string, isJson: boolean): Partial<Product>[] {
  if (isJson) {
    const parsed = JSON.parse(fileContent);
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.products && Array.isArray(parsed.products)) {
      return parsed.products;
    }
    throw new Error('El archivo JSON no contiene una lista de productos válida.');
  }

  const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error('El archivo CSV está vacío o sin registros.');

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(delimiter).map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

  const results: Partial<Product>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawCols = lines[i].split(delimiter);
    if (rawCols.length < 3) continue;

    const cols = rawCols.map((c) => c.replace(/^"|"$/g, '').trim());

    const barcodeIdx = headers.findIndex((h) => h.includes('código') || h.includes('codigo') || h.includes('barras') || h.includes('barcode'));
    const skuIdx = headers.findIndex((h) => h.includes('sku') || h.includes('referencia') || h.includes('ref'));
    const nameIdx = headers.findIndex((h) => h.includes('nombre') || h.includes('producto') || h.includes('descripción') || h.includes('name'));
    const priceIdx = headers.findIndex((h) => h.includes('precio') || h.includes('venta') || h.includes('price'));
    const costIdx = headers.findIndex((h) => h.includes('costo') || h.includes('cost'));
    const stockIdx = headers.findIndex((h) => h.includes('stock') || h.includes('cantidad') || h.includes('existencia'));
    const categoryIdx = headers.findIndex((h) => h.includes('categoría') || h.includes('categoria'));
    const imageIdx = headers.findIndex((h) => h.includes('imagen') || h.includes('foto') || h.includes('image') || h.includes('url'));

    const barcode = barcodeIdx >= 0 ? cols[barcodeIdx] : `GEN-${Date.now()}-${i}`;
    const sku = skuIdx >= 0 ? cols[skuIdx] : `SKU-${Date.now()}-${i}`;
    const name = nameIdx >= 0 ? cols[nameIdx] : cols[1] || `Producto ${i}`;
    const price = priceIdx >= 0 ? parseFloat(cols[priceIdx]) : 1000;
    const cost = costIdx >= 0 ? parseFloat(cols[costIdx]) : 500;
    const stock = stockIdx >= 0 ? parseInt(cols[stockIdx], 10) : 10;
    const categoryName = categoryIdx >= 0 ? cols[categoryIdx] : 'General';
    const imageUrl = imageIdx >= 0 ? cols[imageIdx] : '';

    if (name) {
      results.push({
        barcode: barcode || `BC-${Date.now()}-${i}`,
        sku: sku || `SKU-${Date.now()}-${i}`,
        name,
        price: isNaN(price) ? 1000 : price,
        cost: isNaN(cost) ? 500 : cost,
        stock: isNaN(stock) ? 0 : stock,
        minStock: 5,
        unit: 'Unidad',
        categoryName,
        imageUrl: imageUrl || undefined,
        active: true,
      });
    }
  }

  return results;
}
