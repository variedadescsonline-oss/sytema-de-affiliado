import * as XLSX from 'xlsx';
import { Product, Sale, Client, Supplier } from '../types/erp';

/**
 * Utilidades profesionales de Importación y Exportación en formato Microsoft Excel (.xlsx)
 * Compatible con Excel, Google Sheets, LibreOffice y Calc.
 */

export interface ExcelImportResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  totalRows: number;
}

/**
 * Exporta el catálogo completo de productos a un archivo Excel (.xlsx)
 * Incluye precios en Córdobas (C$) y su conversión en Dólares ($) según la tasa de cambio.
 */
export function exportProductsToExcel(products: Product[], exchangeRate = 47): void {
  const data = products.map((p) => {
    // Si la moneda base del producto es USD:
    const priceUSD = p.price;
    const priceNIO = Number((p.price * exchangeRate).toFixed(2));
    const costUSD = p.cost;
    const costNIO = Number((p.cost * exchangeRate).toFixed(2));

    return {
      'Código de Barras': p.barcode,
      'SKU / Referencia': p.sku,
      'Nombre del Producto': p.name,
      'Categoría': p.categoryName || 'Hogar y Decoración',
      'Precio Venta ($ USD)': priceUSD,
      'Precio Venta (C$)': priceNIO,
      'Costo ($ USD)': costUSD,
      'Costo (C$)': costNIO,
      'Stock Actual': p.stock,
      'Stock Mínimo': p.minStock,
      'Unidad de Medida': p.unit,
      'Ubicación': p.location,
      'Estado': p.active ? 'Activo' : 'Inactivo',
      'Tasa Usada (C$ x $1)': exchangeRate,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Ajuste de ancho de columnas
  worksheet['!cols'] = [
    { wch: 18 }, // Código de Barras
    { wch: 15 }, // SKU
    { wch: 38 }, // Nombre
    { wch: 22 }, // Categoría
    { wch: 24 }, // Proveedor
    { wch: 14 }, // Costo C$
    { wch: 14 }, // Costo USD
    { wch: 16 }, // Precio C$
    { wch: 16 }, // Precio USD
    { wch: 12 }, // Stock
    { wch: 12 }, // MinStock
    { wch: 12 }, // Unidad
    { wch: 16 }, // Ubicación
    { wch: 10 }, // Estado
    { wch: 18 }, // Tasa
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Productos_VariedadesCS_${today}.xlsx`);
}

/**
 * Genera y descarga una plantilla vacía de Excel para que el usuario llene sus productos.
 */
export function downloadProductsExcelTemplate(exchangeRate = 37): void {
  const sampleData = [
    {
      'Código de Barras': '770123456789',
      'SKU / Referencia': 'REF-001',
      'Nombre del Producto': 'Ejemplo: Camiseta Polo Algodón',
      'Categoría': 'Ropa y Textiles',
      'Proveedor': 'Distribuidora Central',
      'Costo en Cordobas (C$)': 185,
      'Costo en Dolares ($ USD)': 5.00,
      'Precio en Cordobas (C$)': 370,
      'Precio en Dolares ($ USD)': 10.00,
      'Stock Inicial': 25,
      'Stock Minimo': 5,
      'Unidad': 'Unidad',
      'Ubicacion': 'Estante A-1',
    },
    {
      'Código de Barras': '770987654321',
      'SKU / Referencia': 'REF-002',
      'Nombre del Producto': 'Ejemplo: Cargador Carga Rápida 20W',
      'Categoría': 'Tecnología y Accesorios',
      'Proveedor': 'Mayorista Tecno',
      'Costo en Cordobas (C$)': 111,
      'Costo en Dolares ($ USD)': 3.00,
      'Precio en Cordobas (C$)': 222,
      'Precio en Dolares ($ USD)': 6.00,
      'Stock Inicial': 40,
      'Stock Minimo': 8,
      'Unidad': 'Unidad',
      'Ubicacion': 'Vitrina 2',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 15 },
    { wch: 36 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Productos');

  // Hoja adicional con instrucciones
  const instructions = [
    {
      'Instrucción': 'Complete los datos de sus productos en la hoja "Plantilla_Productos".',
    },
    {
      'Instrucción': `Tasa de cambio del sistema: 1 USD = ${exchangeRate} Córdobas. Puede colocar el precio en Córdobas o en Dólares, el sistema calculará ambos.`,
    },
    {
      'Instrucción': 'Los campos "Nombre del Producto" y "Precio" son obligatorios.',
    },
    {
      'Instrucción': 'Guarde el archivo y súbalo en el botón "Importar Excel" del módulo de Productos.',
    },
  ];
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

  XLSX.writeFile(workbook, `Plantilla_Importar_Productos_VariedadesCS.xlsx`);
}

/**
 * Lee un archivo Excel (.xlsx, .xls) o CSV y extrae los productos
 */
export async function readProductsFromExcel(
  file: File,
  exchangeRate = 37
): Promise<ExcelImportResult<Partial<Product>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Error al leer el archivo Excel.'));

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          throw new Error('No se pudo leer el contenido del archivo.');
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('El archivo Excel no tiene hojas de cálculo.');
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
        });

        if (!rawJson || rawJson.length === 0) {
          return resolve({
            success: false,
            data: [],
            errors: ['La hoja de cálculo está vacía o sin filas de datos.'],
            totalRows: 0,
          });
        }

        const results: Partial<Product>[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const rowNumber = idx + 2; // +2 por encabezado y 1-based index

          // Helper para buscar columnas por posibles nombres
          const findVal = (keys: string[]): unknown => {
            for (const key of Object.keys(row)) {
              const normalized = key.toLowerCase().trim();
              if (keys.some((k) => normalized.includes(k))) {
                return row[key];
              }
            }
            return undefined;
          };

          const rawBarcode = String(findVal(['barcode', 'barras', 'código', 'codigo']) || '').trim();
          const rawSku = String(findVal(['sku', 'referencia', 'ref']) || '').trim();
          const rawName = String(findVal(['nombre', 'descrip', 'producto', 'name']) || '').trim();
          const rawCat = String(findVal(['categor', 'cat']) || 'General').trim();
          const rawSup = String(findVal(['proveed', 'suppl']) || 'General').trim();
          const rawUnit = String(findVal(['unidad', 'unit', 'medida']) || 'Unidad').trim();
          const rawLoc = String(findVal(['ubic', 'estante', 'location']) || 'Bodega').trim();

          // Manejo de precios bidireccionales en Excel (si puso en C$ o en USD)
          const rawPriceNIO = parseFloat(String(findVal(['precio en cordoba', 'precio (c$)', 'precio venta (c$)']) || ''));
          const rawPriceUSD = parseFloat(String(findVal(['precio en dolar', 'precio ($ usd)', 'precio usd', 'precio ($)']) || ''));
          const rawGenericPrice = parseFloat(String(findVal(['precio', 'price', 'venta']) || ''));

          let finalPriceNIO = 0;
          if (!isNaN(rawPriceNIO) && rawPriceNIO > 0) {
            finalPriceNIO = rawPriceNIO;
          } else if (!isNaN(rawPriceUSD) && rawPriceUSD > 0) {
            finalPriceNIO = Number((rawPriceUSD * exchangeRate).toFixed(2));
          } else if (!isNaN(rawGenericPrice) && rawGenericPrice > 0) {
            finalPriceNIO = rawGenericPrice;
          }

          // Manejo de costo bidireccional
          const rawCostNIO = parseFloat(String(findVal(['costo en cordoba', 'costo (c$)', 'costo unit. (c$)']) || ''));
          const rawCostUSD = parseFloat(String(findVal(['costo en dolar', 'costo ($ usd)', 'costo usd', 'costo ($)']) || ''));
          const rawGenericCost = parseFloat(String(findVal(['costo', 'cost']) || ''));

          let finalCostNIO = 0;
          if (!isNaN(rawCostNIO) && rawCostNIO >= 0) {
            finalCostNIO = rawCostNIO;
          } else if (!isNaN(rawCostUSD) && rawCostUSD >= 0) {
            finalCostNIO = Number((rawCostUSD * exchangeRate).toFixed(2));
          } else if (!isNaN(rawGenericCost) && rawGenericCost >= 0) {
            finalCostNIO = rawGenericCost;
          }

          const rawStock = parseInt(String(findVal(['stock', 'existenc', 'cantidad']) || '0'), 10);
          const rawMinStock = parseInt(String(findVal(['mínimo', 'minimo', 'minstock', 'alerta']) || '5'), 10);

          if (!rawName) {
            errors.push(`Fila ${rowNumber}: Falta el nombre del producto.`);
            return;
          }

          const barcode = rawBarcode || `770${Date.now().toString().slice(-6)}${idx}`;
          const sku = rawSku || `SKU-${Date.now().toString().slice(-4)}-${idx + 1}`;

          results.push({
            barcode,
            sku,
            name: rawName,
            categoryName: rawCat || 'General',
            supplierName: rawSup || 'General',
            price: finalPriceNIO > 0 ? finalPriceNIO : 100,
            cost: finalCostNIO >= 0 ? finalCostNIO : 50,
            stock: isNaN(rawStock) ? 0 : Math.max(0, rawStock),
            minStock: isNaN(rawMinStock) ? 5 : Math.max(1, rawMinStock),
            unit: rawUnit,
            location: rawLoc,
            active: true,
          });
        });

        resolve({
          success: results.length > 0,
          data: results,
          errors,
          totalRows: rawJson.length,
        });
      } catch (err) {
        reject(new Error(err instanceof Error ? err.message : 'Error al procesar el archivo Excel.'));
      }
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta historial de ventas a Excel (.xlsx)
 */
export function exportSalesToExcel(sales: Sale[], exchangeRate = 37): void {
  const data = sales.map((s) => ({
    'Factura / Ticket': s.invoiceNumber,
    'Fecha': s.date,
    'Hora': s.time,
    'Cajero / Vendedor': s.sellerName,
    'Cliente': s.clientName,
    'Doc. Cliente': s.clientDocument,
    'Artículos (Cant.)': s.items.reduce((acc, i) => acc + i.quantity, 0),
    'Método de Pago': s.paymentMethod,
    'Subtotal (C$)': s.subtotal,
    'Descuento (C$)': s.discountTotal,
    'Total Venta (C$)': s.total,
    'Total Venta ($ USD)': Number((s.total / exchangeRate).toFixed(2)),
    'Ganancia Estimada (C$)': s.profit,
    'Ganancia ($ USD)': Number((s.profit / exchangeRate).toFixed(2)),
    'Estado': s.status,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
    { wch: 22 },
    { wch: 26 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 },
    { wch: 20 },
    { wch: 16 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ventas');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Ventas_VariedadesCS_${today}.xlsx`);
}

/**
 * Helper interno para descarga directa de archivos CSV en el navegador
 */
function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
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
 * Exporta historial de ventas a formato CSV
 */
export function exportSalesToCSV(sales: Sale[], exchangeRate = 37): void {
  const headers = [
    'Factura / Ticket',
    'Fecha',
    'Hora',
    'Cajero / Vendedor',
    'Cliente',
    'Doc. Cliente',
    'Método de Pago',
    'Subtotal (C$)',
    'Descuento (C$)',
    'Total Venta (C$)',
    'Total Venta ($ USD)',
    'Ganancia Estimada (C$)',
    'Ganancia ($ USD)',
    'Estado',
  ];

  const escapeCSV = (value: unknown): string => {
    if (value === undefined || value === null) return '""';
    const str = String(value).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = sales.map((s) => [
    escapeCSV(s.invoiceNumber),
    escapeCSV(s.date),
    escapeCSV(s.time),
    escapeCSV(s.sellerName),
    escapeCSV(s.clientName),
    escapeCSV(s.clientDocument),
    escapeCSV(s.paymentMethod),
    s.subtotal,
    s.discountTotal,
    s.total,
    Number((s.total / exchangeRate).toFixed(2)),
    s.profit,
    Number((s.profit / exchangeRate).toFixed(2)),
    escapeCSV(s.status),
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const today = new Date().toISOString().slice(0, 10);
  downloadCsvFile(csvContent, `Ventas_VariedadesCS_${today}.csv`);
}

/**
 * Descarga plantilla en formato Excel (.xlsx) para importación de ventas
 */
export function downloadSalesExcelTemplate(exchangeRate?: number | unknown): void {
  const rate = typeof exchangeRate === 'number' ? exchangeRate : 37;
  const sampleData = [
    {
      'Factura / Ticket': 'FAC-000101',
      'Fecha (AAAA-MM-DD)': new Date().toISOString().slice(0, 10),
      'Hora (HH:MM)': '10:30',
      'Cliente': 'Consumidor Final',
      'Doc. Cliente': '000-000000-0000U',
      'Vendedor': 'Cajero Principal',
      'Método de Pago': 'Efectivo',
      'Total Venta (C$)': 370,
      'Total Venta ($ USD)': 10.0,
      'Ganancia Estimada (C$)': 111,
      'Estado': 'Completada',
    },
    {
      'Factura / Ticket': 'FAC-000102',
      'Fecha (AAAA-MM-DD)': new Date().toISOString().slice(0, 10),
      'Hora (HH:MM)': '11:15',
      'Cliente': 'Comercial Los Ángeles',
      'Doc. Cliente': 'J0310000123456',
      'Vendedor': 'Cajero Principal',
      'Método de Pago': 'Tarjeta',
      'Total Venta (C$)': 740,
      'Total Venta ($ USD)': 20.0,
      'Ganancia Estimada (C$)': 222,
      'Estado': 'Completada',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 28 },
    { wch: 20 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Ventas');

  const instructions = [
    { 'Instrucción': 'Complete los comprobantes contables de ventas en la hoja "Plantilla_Ventas".' },
    { 'Instrucción': `Tasa de cambio configurada: 1 USD = ${rate} C$. Puede ingresar el total en Córdobas o en Dólares.` },
    { 'Instrucción': 'Los campos "Factura / Ticket", "Fecha" y "Total Venta" son obligatorios.' },
    { 'Instrucción': 'Valores admitidos para Método de Pago: Efectivo, Tarjeta, Transferencia, Crédito.' },
  ];
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

  XLSX.writeFile(workbook, 'Plantilla_Importar_Ventas_VariedadesCS.xlsx');
}

/**
 * Descarga plantilla en formato CSV para importación de ventas
 */
export function downloadSalesCSVTemplate(): void {
  const headers = [
    'Factura',
    'Fecha',
    'Hora',
    'Cliente',
    'DocCliente',
    'Vendedor',
    'MetodoPago',
    'TotalCordobas',
    'TotalDolares',
    'Ganancia',
    'Estado',
  ];
  const sampleRow = [
    'FAC-000101',
    new Date().toISOString().slice(0, 10),
    '10:30',
    'Consumidor Final',
    '000-000000-0000U',
    'Cajero Principal',
    'Efectivo',
    '370.00',
    '10.00',
    '111.00',
    'Completada',
  ];
  const csv = '\uFEFF' + [headers.join(';'), sampleRow.join(';')].join('\r\n');
  downloadCsvFile(csv, 'Plantilla_Importar_Ventas_VariedadesCS.csv');
}

/**
 * Lee un archivo Excel (.xlsx, .xls) o CSV y extrae registros de ventas
 */
export async function readSalesFromExcel(
  file: File,
  exchangeRate = 37
): Promise<ExcelImportResult<Partial<Sale>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de ventas.'));
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          throw new Error('No se pudo leer el contenido del archivo.');
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('El archivo no contiene hojas de cálculo.');
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
        });

        if (!rawJson || rawJson.length === 0) {
          return resolve({
            success: false,
            data: [],
            errors: ['El archivo está vacío o no contiene filas con datos.'],
            totalRows: 0,
          });
        }

        const results: Partial<Sale>[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const rowNumber = idx + 2;

          const findVal = (keys: string[]): unknown => {
            for (const key of Object.keys(row)) {
              const normalized = key.toLowerCase().trim();
              if (keys.some((k) => normalized.includes(k))) {
                return row[key];
              }
            }
            return undefined;
          };

          const rawInvoice = String(
            findVal(['factura', 'ticket', 'comprobante', 'invoice', 'n°', 'no']) || ''
          ).trim();
          const rawDate = String(findVal(['fecha', 'date']) || '').trim();
          const rawTime = String(findVal(['hora', 'time']) || '12:00').trim();
          const rawClient = String(
            findVal(['cliente', 'client', 'nombre cliente', 'customer']) || 'Consumidor Final'
          ).trim();
          const rawClientDoc = String(
            findVal(['doc', 'cédula', 'cedula', 'nit', 'ruc', 'identificación']) || '000-000000-0000U'
          ).trim();
          const rawSeller = String(
            findVal(['vendedor', 'cajero', 'seller', 'usuario']) || 'Cajero'
          ).trim();
          const rawMethod = String(
            findVal(['método', 'metodo', 'pago', 'forma de pago', 'payment']) || 'Efectivo'
          ).trim();
          const rawStatus = String(
            findVal(['estado', 'status']) || 'Completada'
          ).trim();

          // Totales en Córdobas o Dólares
          const rawTotalNIO = parseFloat(
            String(findVal(['total en cordoba', 'total (c$)', 'total c$', 'totalcordobas', 'monto c$']) || '')
          );
          const rawTotalUSD = parseFloat(
            String(findVal(['total en dolar', 'total ($ usd)', 'total usd', 'total ($)', 'totaldolares']) || '')
          );
          const rawGenericTotal = parseFloat(
            String(findVal(['total', 'monto', 'importe', 'neto']) || '')
          );

          let finalTotal = 0;
          if (!isNaN(rawTotalNIO) && rawTotalNIO > 0) {
            finalTotal = rawTotalNIO;
          } else if (!isNaN(rawTotalUSD) && rawTotalUSD > 0) {
            finalTotal = Number((rawTotalUSD * exchangeRate).toFixed(2));
          } else if (!isNaN(rawGenericTotal) && rawGenericTotal > 0) {
            finalTotal = rawGenericTotal;
          }

          if (finalTotal <= 0) {
            errors.push(`Fila ${rowNumber}: Monto total no válido o menor a cero.`);
            return;
          }

          const rawProfit = parseFloat(
            String(findVal(['ganancia', 'utilidad', 'profit', 'margen']) || '')
          );
          const finalProfit = !isNaN(rawProfit)
            ? rawProfit
            : Number((finalTotal * 0.25).toFixed(2));

          const invoiceNumber = rawInvoice || `IMP-${Date.now().toString().slice(-6)}-${idx + 1}`;
          const date = rawDate || new Date().toISOString().slice(0, 10);

          let paymentMethod: Sale['paymentMethod'] = 'Efectivo';
          const lowerMethod = rawMethod.toLowerCase();
          if (lowerMethod.includes('tarjet')) paymentMethod = 'Tarjeta';
          else if (lowerMethod.includes('transf')) paymentMethod = 'Transferencia';
          else if (lowerMethod.includes('créd') || lowerMethod.includes('cred')) paymentMethod = 'Crédito';

          results.push({
            id: `sale-imp-${Date.now()}-${idx + 1}`,
            invoiceNumber,
            date,
            time: rawTime,
            sellerId: 'usr-import',
            sellerName: rawSeller,
            clientId: 'cli-import',
            clientName: rawClient,
            clientDocument: rawClientDoc,
            items: [],
            subtotal: finalTotal,
            discountTotal: 0,
            taxTotal: 0,
            total: finalTotal,
            profit: finalProfit,
            paymentMethod,
            amountReceived: finalTotal,
            change: 0,
            status: rawStatus.toLowerCase().includes('anulad') ? 'Anulada' : 'Completada',
          });
        });

        resolve({
          success: results.length > 0,
          data: results,
          errors,
          totalRows: rawJson.length,
        });
      } catch (err) {
        reject(
          new Error(
            err instanceof Error ? err.message : 'Error al procesar el archivo Excel / CSV de ventas.'
          )
        );
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta el directorio de clientes a CSV
 */
export function exportClientsToCSV(clients: Client[]): void {
  const headers = [
    'Identificación / NIT',
    'Nombre Completo / Razón Social',
    'Teléfono',
    'Correo Electrónico',
    'Dirección',
    'Límite de Crédito (C$)',
    'Saldo Pendiente (C$)',
    'Estado',
  ];

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

  const csvContent =
    '\uFEFF' +
    [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

  const today = new Date().toISOString().slice(0, 10);
  downloadCsvFile(csvContent, `Clientes_VariedadesCS_${today}.csv`);
}

/**
 * Descarga plantilla en Excel (.xlsx) para importación de clientes
 */
export function downloadClientsExcelTemplate(): void {
  const sampleData = [
    {
      'Identificación / NIT': '001-120590-0001A',
      'Nombre Completo / Razón Social': 'María Fernanda Gómez',
      'Teléfono': '+505 8888-1234',
      'Correo Electrónico': 'maria.gomez@email.com',
      'Dirección': 'De la Rotonda El Güegüense 2c abajo',
      'Límite de Crédito (C$)': 5000,
      'Saldo Pendiente (C$)': 0,
    },
    {
      'Identificación / NIT': 'J0310000987654',
      'Nombre Completo / Razón Social': 'Distribuidora San Jerónimo S.A.',
      'Teléfono': '+505 2222-5678',
      'Correo Electrónico': 'ventas@sanjeronimo.com',
      'Dirección': 'Carretera Norte Km 4.5',
      'Límite de Crédito (C$)': 15000,
      'Saldo Pendiente (C$)': 2500,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 34 },
    { wch: 18 },
    { wch: 26 },
    { wch: 36 },
    { wch: 22 },
    { wch: 22 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla_Clientes');

  const instructions = [
    { 'Instrucción': 'Complete los datos de sus clientes en la hoja "Plantilla_Clientes".' },
    { 'Instrucción': 'Los campos "Identificación / NIT" y "Nombre Completo / Razón Social" son obligatorios.' },
    { 'Instrucción': 'Guarde el archivo y súbalo en el botón "Importar Clientes" del directorio.' },
  ];
  const instructionsSheet = XLSX.utils.json_to_sheet(instructions);
  instructionsSheet['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

  XLSX.writeFile(workbook, 'Plantilla_Importar_Clientes_VariedadesCS.xlsx');
}

/**
 * Descarga plantilla en CSV para importación de clientes
 */
export function downloadClientsCSVTemplate(): void {
  const headers = [
    'Identificacion',
    'NombreCompleto',
    'Telefono',
    'Correo',
    'Direccion',
    'LimiteCredito',
    'SaldoPendiente',
  ];
  const sampleRow = [
    '001-120590-0001A',
    'María Fernanda Gómez',
    '+505 8888-1234',
    'maria.gomez@email.com',
    'De la Rotonda El Güegüense 2c abajo',
    '5000',
    '0',
  ];
  const csv = '\uFEFF' + [headers.join(';'), sampleRow.join(';')].join('\r\n');
  downloadCsvFile(csv, 'Plantilla_Importar_Clientes_VariedadesCS.csv');
}

/**
 * Lee un archivo Excel (.xlsx, .xls) o CSV y extrae registros de clientes
 */
export async function readClientsFromExcel(
  file: File
): Promise<ExcelImportResult<Omit<Client, 'id'>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de clientes.'));
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          throw new Error('No se pudo leer el contenido del archivo.');
        }

        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          throw new Error('El archivo no contiene hojas de cálculo.');
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawJson: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
        });

        if (!rawJson || rawJson.length === 0) {
          return resolve({
            success: false,
            data: [],
            errors: ['El archivo está vacío o no contiene filas con datos.'],
            totalRows: 0,
          });
        }

        const results: Omit<Client, 'id'>[] = [];
        const errors: string[] = [];

        rawJson.forEach((row, idx) => {
          const rowNumber = idx + 2;

          const findVal = (keys: string[]): unknown => {
            for (const key of Object.keys(row)) {
              const normalized = key.toLowerCase().trim();
              if (keys.some((k) => normalized.includes(k))) {
                return row[key];
              }
            }
            return undefined;
          };

          const rawDoc = String(
            findVal(['identificacion', 'identificación', 'nit', 'cédula', 'cedula', 'documento', 'doc', 'ruc']) || ''
          ).trim();
          const rawName = String(
            findVal(['nombre', 'razón social', 'razon social', 'cliente', 'name']) || ''
          ).trim();
          const rawPhone = String(
            findVal(['teléfono', 'telefono', 'celular', 'phone', 'movil']) || '-'
          ).trim();
          const rawEmail = String(
            findVal(['correo', 'email', 'mail']) || '-'
          ).trim();
          const rawAddress = String(
            findVal(['dirección', 'direccion', 'address', 'domicilio']) || '-'
          ).trim();

          const rawCreditLimit = parseFloat(
            String(findVal(['límite', 'limite', 'cupo', 'creditlimit', 'credito']) || '0')
          );
          const rawBalance = parseFloat(
            String(findVal(['saldo', 'balance', 'deuda', 'pendiente']) || '0')
          );
          const rawActive = String(findVal(['estado', 'activo', 'active']) || 'Activo').toLowerCase();

          if (!rawDoc || !rawName) {
            errors.push(`Fila ${rowNumber}: Debe especificar al menos Identificación y Nombre.`);
            return;
          }

          results.push({
            document: rawDoc,
            name: rawName,
            phone: rawPhone || '-',
            email: rawEmail || '-',
            address: rawAddress || '-',
            creditLimit: !isNaN(rawCreditLimit) ? Math.max(0, rawCreditLimit) : 0,
            currentBalance: !isNaN(rawBalance) ? Math.max(0, rawBalance) : 0,
            active: !rawActive.includes('inact'),
          });
        });

        resolve({
          success: results.length > 0,
          data: results,
          errors,
          totalRows: rawJson.length,
        });
      } catch (err) {
        reject(
          new Error(
            err instanceof Error ? err.message : 'Error al procesar el archivo Excel / CSV de clientes.'
          )
        );
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta el directorio de clientes a Excel (.xlsx)
 */
export function exportClientsToExcel(clients: Client[]): void {
  const data = clients.map((c) => ({
    'Identificación / NIT': c.document,
    'Nombre Completo / Razón Social': c.name,
    'Teléfono': c.phone,
    'Correo Electrónico': c.email,
    'Dirección': c.address,
    'Límite de Crédito (C$)': c.creditLimit,
    'Saldo Pendiente (C$)': c.currentBalance,
    'Estado': c.active ? 'Activo' : 'Inactivo',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 18 },
    { wch: 30 },
    { wch: 16 },
    { wch: 26 },
    { wch: 28 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clientes');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Clientes_VariedadesCS_${today}.xlsx`);
}

/**
 * Exporta el directorio de proveedores a Excel (.xlsx)
 */
export function exportSuppliersToExcel(suppliers: Supplier[]): void {
  const data = suppliers.map((s) => ({
    'RUC / NIT': s.taxId,
    'Razón Social': s.name,
    'Contacto Principal': s.contactPerson,
    'Teléfono': s.phone,
    'Correo Electrónico': s.email,
    'Dirección': s.address,
    'Especialidad': s.categorySpecialty,
    'Condición de Pago': s.paymentTerms,
    'Estado': s.active ? 'Activo' : 'Inactivo',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 16 },
    { wch: 30 },
    { wch: 22 },
    { wch: 16 },
    { wch: 26 },
    { wch: 28 },
    { wch: 22 },
    { wch: 18 },
    { wch: 12 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Proveedores');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Proveedores_VariedadesCS_${today}.xlsx`);
}
