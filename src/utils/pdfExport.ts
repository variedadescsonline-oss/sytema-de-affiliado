import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Product, CompanyConfig } from '../types/erp';

/**
 * Genera un archivo PDF profesional con el listado completo de precios de los productos.
 * Muestra prominentemente el precio en Dólares ($ USD) y su conversión a Córdobas (C$)
 * con la tasa oficial establecida (47 Córdobas por Dólar).
 */
export function exportPriceListToPDF(
  products: Product[],
  config: CompanyConfig,
  categoryFilter?: string
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const exchangeRate = config.exchangeRate || 47;
  const filteredProducts = categoryFilter && categoryFilter !== 'TODAS'
    ? products.filter((p) => p.categoryName === categoryFilter || p.categoryId === categoryFilter)
    : products;

  const activeProducts = filteredProducts.filter((p) => p.active !== false);

  // Colores corporativos
  const primaryBlue: [number, number, number] = [26, 54, 110]; // #1a366e
  const emeraldGreen: [number, number, number] = [16, 120, 72];
  const darkSlate: [number, number, number] = [30, 41, 59];

  // Encabezado Principal
  doc.setFillColor(...primaryBlue);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(config.companyName || 'VARIEDADES CS', 14, 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('CATÁLOGO OFICIAL DE PRECIOS Y PRODUCTOS', 14, 20);

  const todayStr = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  doc.setFontSize(8);
  doc.text(`Fecha de emisión: ${todayStr}`, 196, 13, { align: 'right' });
  doc.text(`RUC / NIT: ${config.taxId || '901.482.319-4'}`, 196, 18, { align: 'right' });
  doc.text(config.phone || '+57 (601) 742-8910', 196, 23, { align: 'right' });

  // Cuadro informativo de Moneda y Tasa de Cambio
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 33, 182, 16, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 33, 182, 16, 2, 2, 'S');

  doc.setTextColor(...darkSlate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('INFORMACIÓN DE PRECIOS Y DIVISAS', 18, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    `Precios base expresados en Dólares ($ USD).  |  Tipo de cambio oficial fijado: 1 USD = ${exchangeRate.toFixed(2)} Córdobas (C$)`,
    18,
    45
  );

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldGreen);
  doc.text(`Total Productos: ${activeProducts.length}`, 190, 42, { align: 'right' });

  // Tabla con jsPDF AutoTable
  const tableData = activeProducts.map((p, idx) => {
    // Si el precio base del producto está en USD
    const priceUSD = p.price;
    const priceNIO = Number((p.price * exchangeRate).toFixed(2));

    return [
      idx + 1,
      p.barcode || '—',
      p.name,
      p.categoryName || 'Hogar',
      `$${priceUSD.toFixed(2)} USD`,
      `C$ ${priceNIO.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `${p.stock} ${p.unit || 'und'}`,
    ];
  });

  autoTable(doc, {
    startY: 53,
    head: [
      [
        '#',
        'Código de Barras',
        'Descripción del Producto',
        'Categoría',
        'Precio ($ USD)',
        'Precio (C$ NIO)',
        'Stock',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryBlue,
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkSlate,
      cellPadding: 2.2,
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 32, font: 'courier' },
      2: { cellWidth: 62, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
      5: { cellWidth: 28, halign: 'right', fontStyle: 'bold', textColor: [16, 120, 72] },
      6: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14, bottom: 20 },
    didDrawPage: (data) => {
      // Pie de página
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);

      doc.text(
        `VARIEDADES CS · ${config.address || 'Av. Comercial'} · Email: ${config.email || 'variedadescs.online@gmail.com'}`,
        14,
        290
      );
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        196,
        290,
        { align: 'right' }
      );
    },
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`Lista_Precios_VariedadesCS_USD_${fileDate}.pdf`);
}
