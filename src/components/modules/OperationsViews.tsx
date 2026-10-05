import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Eye,
  Ban,
  Plus,
  Trash2,
  RotateCcw,
  FileSpreadsheet,
  Download,
  FileUp,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  Sale,
  Purchase,
  PurchaseItem,
  Product,
  Supplier,
  ReturnRecord,
  CompanyConfig,
  ModuleId,
} from '../../types/erp';
import {
  PageHeader,
  SummaryStrip,
  FilterToolbar,
  PaginationBar,
  Modal,
  ConfirmModal,
  formatCurrency,
} from '../ui/EnterpriseComponents';
import { ActionDotsMenu } from '../ui/ActionDotsMenu';
import {
  exportSalesToExcel,
  exportSalesToCSV,
  downloadSalesExcelTemplate,
  downloadSalesCSVTemplate,
  readSalesFromExcel,
} from '../../utils/excel';

/* ============================================================================
   1. MÓDULO: VENTAS (HISTORIAL Y FACTURACIÓN)
   ============================================================================ */
interface VentasViewProps {
  sales: Sale[];
  config: CompanyConfig;
  onNavigate: (mod: ModuleId) => void;
  onViewReceipt: (sale: Sale) => void;
  onCancelSale: (saleId: string, reason: string) => void;
  onDeleteSale?: (saleId: string) => void;
  onPurgeGhostSales?: () => void;
  onClearAllSales?: () => void;
  onBatchImportSales?: (sales: Partial<Sale>[]) => void;
}

export const VentasView: React.FC<VentasViewProps> = ({
  sales,
  config,
  onNavigate,
  onViewReceipt,
  onCancelSale,
  onDeleteSale,
  onPurgeGhostSales,
  onClearAllSales,
  onBatchImportSales,
}) => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const [saleToCancel, setSaleToCancel] = useState<Sale | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  // Estados para Importación Masiva Excel / CSV de Ventas
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewSales, setImportPreviewSales] = useState<Partial<Sale>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const exchangeRate = config.exchangeRate || 37;

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setIsProcessingFile(true);
    setImportErrors([]);
    setImportSuccessMsg('');

    try {
      const result = await readSalesFromExcel(file, exchangeRate);
      if (result.errors && result.errors.length > 0) {
        setImportErrors(result.errors);
      }

      if (result.success && result.data.length > 0) {
        setImportPreviewSales(result.data);
        setImportSuccessMsg(
          `Se validaron exitosamente ${result.data.length} comprobantes de venta listos para importar.`
        );
      } else {
        setImportPreviewSales([]);
        if (!result.errors || result.errors.length === 0) {
          setImportErrors(['No se encontraron comprobantes de venta válidos en el archivo.']);
        }
      }
    } catch (err) {
      setImportErrors([
        err instanceof Error ? err.message : 'Error al procesar el archivo Excel / CSV.',
      ]);
      setImportPreviewSales([]);
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleConfirmBatchImport = () => {
    if (importPreviewSales.length === 0) return;

    if (onBatchImportSales) {
      onBatchImportSales(importPreviewSales);
    }

    setIsImportModalOpen(false);
    setImportPreviewSales([]);
    setImportFileName('');
    setImportErrors([]);
    setImportSuccessMsg('');
  };

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.clientName.toLowerCase().includes(q) ||
        s.clientDocument.toLowerCase().includes(q) ||
        s.sellerName.toLowerCase().includes(q);
      const matchMethod =
        methodFilter === 'ALL' || s.paymentMethod === methodFilter;
      const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
      return matchQ && matchMethod && matchStatus;
    });
  }, [sales, search, methodFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const validSales = sales.filter((s) => s.status === 'Completada');
  const totalFacturado = validSales.reduce((acc, s) => acc + s.total, 0);
  const totalUtilidad = validSales.reduce((acc, s) => acc + s.profit, 0);
  const anuladasCount = sales.filter((s) => s.status === 'Anulada').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Historial General de Ventas"
        description="Registro cronológico de facturas emitidas, consulta de comprobantes y anulación controlada."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportSalesToExcel(sales, exchangeRate)}
              title="Descargar libro contable de ventas en formato Microsoft Excel (.xlsx) con desglose de artículos y conversión de divisas"
              className="px-3 py-1.5 text-xs font-semibold rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => exportSalesToCSV(sales, exchangeRate)}
              title="Descargar historial de ventas en formato CSV para sistemas contables"
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar (CSV)</span>
            </button>

            {onBatchImportSales && (
              <button
                type="button"
                onClick={() => {
                  setImportFileName('');
                  setImportPreviewSales([]);
                  setImportErrors([]);
                  setImportSuccessMsg('');
                  setIsImportModalOpen(true);
                }}
                title="Cargar comprobantes contables históricos desde archivo Excel (.xlsx, .xls) o CSV con validación"
                className="px-3 py-1.5 text-xs font-semibold rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              >
                <FileUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Importar Ventas</span>
              </button>
            )}

            {sales.length > 0 && onPurgeGhostSales && (
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(true)}
                title="Eliminar ventas de prueba o comprobantes fantasma del sistema"
                className="px-3 py-1.5 text-xs font-semibold rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Eliminar Ventas Fantasma</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('pos')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Nueva Venta en POS
            </button>
          </div>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Facturas Válidas',
            value: validSales.length,
            subtext: `${sales.length} emitidas en total`,
          },
          {
            label: 'Monto Total Facturado',
            value: formatCurrency(totalFacturado, config.currencySymbol),
            subtext: 'Ventas netas acumuladas',
            tone: 'primary',
          },
          {
            label: 'Ganancia Bruta Generada',
            value: formatCurrency(totalUtilidad, config.currencySymbol),
            subtext: 'Margen comercial neto',
            tone: 'success',
          },
          {
            label: 'Facturas Anuladas',
            value: anuladasCount,
            subtext: 'Con reversión de inventario',
            tone: anuladasCount > 0 ? 'danger' : 'default',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar por número de factura, nombre de cliente, NIT/cédula o vendedor..."
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        filters={[
          {
            label: 'Método de Pago',
            value: methodFilter,
            onChange: (v) => {
              setMethodFilter(v);
              setPage(1);
            },
            options: [
              { value: 'ALL', label: 'Todos los métodos' },
              { value: 'Efectivo', label: 'Efectivo' },
              { value: 'Tarjeta', label: 'Tarjeta' },
              { value: 'Transferencia', label: 'Transferencia' },
              { value: 'Crédito', label: 'Crédito' },
            ],
          },
          {
            label: 'Estado',
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              setPage(1);
            },
            options: [
              { value: 'ALL', label: 'Todos' },
              { value: 'Completada', label: 'Completadas' },
              { value: 'Anulada', label: 'Anuladas' },
            ],
          },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Factura</th>
                <th className="py-2.5 px-3 font-semibold">Fecha / Hora</th>
                <th className="py-2.5 px-3 font-semibold">Cliente</th>
                <th className="py-2.5 px-3 font-semibold">Vendedor</th>
                <th className="py-2.5 px-3 font-semibold">Método Pago</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ganancia</th>
                <th className="py-2.5 px-3 font-semibold">Estado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {sale.invoiceNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {sale.date} · {sale.time}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">
                      {sale.clientName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      Doc: {sale.clientDocument}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                    {sale.sellerName}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {sale.paymentMethod}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(sale.total, config.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                    {formatCurrency(sale.profit, config.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={
                        sale.status === 'Anulada'
                          ? 'text-red-700 font-semibold'
                          : 'text-emerald-700 font-semibold'
                      }
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {/* En pantallas medianas y grandes, botones directos */}
                      <div className="hidden sm:inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewReceipt(sale)}
                          className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Factura POS
                        </button>
                        {sale.status === 'Completada' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSaleToCancel(sale);
                              setCancelReason('');
                            }}
                            className="px-2.5 py-1 text-xs border border-amber-200 rounded bg-white text-amber-700 hover:bg-amber-50 flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Anular
                          </button>
                        )}
                        {onDeleteSale && (
                          <button
                            type="button"
                            onClick={() => setSaleToDelete(sale)}
                            className="px-2 py-1 text-xs border border-red-200 rounded bg-white text-red-700 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                            title="Eliminar comprobante permanentemente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Botón de 3 Puntos para móviles y acceso rápido */}
                      <ActionDotsMenu
                        title={`Opciones factura ${sale.invoiceNumber}`}
                        items={[
                          {
                            label: 'Ver Factura POS / Imprimir',
                            icon: <Eye className="w-3.5 h-3.5 text-blue-600" />,
                            onClick: () => onViewReceipt(sale),
                            tone: 'primary',
                          },
                          ...(sale.status === 'Completada'
                            ? [
                                {
                                  label: 'Anular Factura',
                                  icon: <Ban className="w-3.5 h-3.5 text-amber-600" />,
                                  onClick: () => {
                                    setSaleToCancel(sale);
                                    setCancelReason('');
                                  },
                                  tone: 'warning' as const,
                                },
                              ]
                            : []),
                          ...(onDeleteSale
                            ? [
                                {
                                  label: 'Eliminar Factura',
                                  icon: <Trash2 className="w-3.5 h-3.5 text-red-600" />,
                                  onClick: () => setSaleToDelete(sale),
                                  tone: 'danger' as const,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No se encontraron ventas para los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          currentPage={page}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Modal Confirmar Eliminación Individual de Venta */}
      <ConfirmModal
        isOpen={!!saleToDelete}
        title={`Eliminar Factura ${saleToDelete?.invoiceNumber}`}
        message={`¿Está seguro de eliminar permanentemente el comprobante ${saleToDelete?.invoiceNumber}? Esta acción es definitiva.`}
        confirmLabel="Eliminar Definitivamente"
        variant="danger"
        onConfirm={() => {
          if (saleToDelete && onDeleteSale) {
            onDeleteSale(saleToDelete.id);
            setSaleToDelete(null);
          }
        }}
        onCancel={() => setSaleToDelete(null)}
      />

      {/* Modal Confirmar Purga de Ventas Fantasma */}
      <ConfirmModal
        isOpen={isPurgeModalOpen}
        title="Eliminar Todas las Ventas Fantasma / de Prueba"
        message="Se eliminarán del sistema todos los comprobantes de venta ficticios o de prueba creados inicialmente. Las ventas reales y el inventario no se verán afectados negativamente. ¿Desea proceder?"
        confirmLabel="Eliminar Ventas Fantasma"
        variant="danger"
        onConfirm={() => {
          if (onPurgeGhostSales) {
            onPurgeGhostSales();
          }
          setIsPurgeModalOpen(false);
        }}
        onCancel={() => setIsPurgeModalOpen(false)}
      />

      {/* Modal Confirmar Anulación de Venta */}
      <ConfirmModal
        isOpen={!!saleToCancel}
        title={`Anular Factura ${saleToCancel?.invoiceNumber}`}
        message={`Se anulará la venta por ${formatCurrency(
          saleToCancel?.total || 0,
          config.currencySymbol
        )} y las unidades vendidas regresarán automáticamente al stock de inventario.`}
        confirmLabel="Anular Factura"
        variant="danger"
        requireReason={false}
        reasonLabel="Motivo de anulación (opcional):"
        reasonValue={cancelReason}
        onReasonChange={setCancelReason}
        onConfirm={() => {
          if (saleToCancel) {
            const finalReason = cancelReason.trim() || 'Anulación solicitada por el usuario';
            onCancelSale(saleToCancel.id, finalReason);
            setSaleToCancel(null);
            setCancelReason('');
          }
        }}
        onCancel={() => {
          setSaleToCancel(null);
          setCancelReason('');
        }}
      />

      {/* Modal Importación Masiva de Ventas desde Excel / CSV */}
      <Modal
        isOpen={isImportModalOpen}
        title="Importar Comprobantes de Ventas (Excel / CSV)"
        onClose={() => {
          setIsImportModalOpen(false);
          setImportPreviewSales([]);
          setImportFileName('');
          setImportErrors([]);
          setImportSuccessMsg('');
        }}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <FileSpreadsheet className="w-4 h-4 text-blue-700" />
              <span>Instrucciones para Importación Contable de Ventas</span>
            </div>
            <p className="text-slate-600">
              Puede incorporar ventas históricas desde archivos <strong>.xlsx</strong> o <strong>.csv</strong>. Los campos obligatorios son <strong>Factura / N° Ticket</strong>, <strong>Fecha</strong> y <strong>Total Venta</strong>. El sistema recalcula automáticamente las conversiones en Córdobas y Dólares a la tasa configurada (1 USD = {exchangeRate} C$).
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => downloadSalesExcelTemplate(exchangeRate)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Plantilla Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={downloadSalesCSVTemplate}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar Plantilla CSV (.csv)
              </button>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
            <input
              type="file"
              id="sales-file-input"
              accept=".xlsx, .xls, .csv"
              onChange={handleImportFileChange}
              className="hidden"
            />
            <label
              htmlFor="sales-file-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-2"
            >
              <FileUp className="w-8 h-8 text-blue-600" />
              <span className="text-sm font-semibold text-slate-800">
                Haga clic para seleccionar archivo Excel o CSV de ventas
              </span>
              <span className="text-slate-500 text-[11px]">
                {importFileName ? `Archivo seleccionado: ${importFileName}` : 'Formatos admitidos: .xlsx, .xls, .csv'}
              </span>
            </label>
          </div>

          {isProcessingFile && (
            <div className="p-3 bg-slate-100 text-slate-700 rounded text-center font-medium animate-pulse">
              Procesando y validando líneas de venta...
            </div>
          )}

          {importSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{importSuccessMsg}</span>
            </div>
          )}

          {importErrors.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-300 rounded text-red-800 space-y-1 max-h-36 overflow-y-auto">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Observaciones / Validaciones ({importErrors.length}):</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {importErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {importPreviewSales.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800">
                  Vista previa de ventas a incorporar ({importPreviewSales.length}):
                </h4>
                <span className="text-slate-500 text-[11px]">
                  Mostrando las primeras {Math.min(5, importPreviewSales.length)}
                </span>
              </div>
              <div className="border border-slate-200 rounded overflow-x-auto max-h-48">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="py-1.5 px-2 font-semibold">Factura</th>
                      <th className="py-1.5 px-2 font-semibold">Fecha</th>
                      <th className="py-1.5 px-2 font-semibold">Cliente</th>
                      <th className="py-1.5 px-2 font-semibold">Pago</th>
                      <th className="py-1.5 px-2 font-semibold text-right">Total (C$)</th>
                      <th className="py-1.5 px-2 font-semibold text-right">Total ($ USD)</th>
                      <th className="py-1.5 px-2 font-semibold text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {importPreviewSales.slice(0, 5).map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2 font-mono font-medium text-blue-700">{s.invoiceNumber}</td>
                        <td className="py-1.5 px-2">{s.date}</td>
                        <td className="py-1.5 px-2">{s.clientName}</td>
                        <td className="py-1.5 px-2">{s.paymentMethod}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-semibold">
                          {formatCurrency(s.total || 0, config.currencySymbol)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-700">
                          ${((s.total || 0) / exchangeRate).toFixed(2)}
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              s.status === 'Completada' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsImportModalOpen(false);
                setImportPreviewSales([]);
                setImportFileName('');
                setImportErrors([]);
                setImportSuccessMsg('');
              }}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={importPreviewSales.length === 0}
              onClick={handleConfirmBatchImport}
              className={`px-4 py-1.5 text-xs font-semibold rounded text-white flex items-center gap-1.5 ${
                importPreviewSales.length > 0
                  ? 'bg-blue-700 hover:bg-blue-800 cursor-pointer shadow-sm'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar e Importar {importPreviewSales.length} Ventas</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ============================================================================
   2. MÓDULO: COMPRAS (INGRESO DE MERCANCÍA A PROVEEDORES)
   ============================================================================ */
interface ComprasViewProps {
  purchases: Purchase[];
  products: Product[];
  suppliers: Supplier[];
  config: CompanyConfig;
  onRegisterPurchase: (data: {
    supplierId: string;
    supplierInvoice: string;
    paymentMethod: 'Efectivo' | 'Transferencia' | 'Crédito Proveedor';
    items: PurchaseItem[];
    notes: string;
  }) => void;
  onDeletePurchase?: (purchaseId: string) => void;
}

export const ComprasView: React.FC<ComprasViewProps> = ({
  purchases,
  products,
  suppliers,
  config,
  onRegisterPurchase,
  onDeletePurchase,
}) => {
  const [search, setSearch] = useState('');
  const [supFilter, setSupFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<Purchase | null>(null);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);

  // Form states for new purchase
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [supplierInvoice, setSupplierInvoice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'Efectivo' | 'Transferencia' | 'Crédito Proveedor'
  >('Transferencia');
  const [notes, setNotes] = useState('');
  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id || '');
  const [itemQty, setItemQty] = useState('10');
  const [itemCost, setItemCost] = useState(
    String(products[0]?.cost || '1.00')
  );
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [formError, setFormError] = useState('');

  const handleAddLine = () => {
    setFormError('');
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;
    const qty = parseInt(itemQty, 10);
    const cost = parseFloat(itemCost);
    if (!Number.isFinite(qty) || qty <= 0) {
      setFormError('Ingrese una cantidad mayor a 0.');
      return;
    }
    if (!Number.isFinite(cost) || cost <= 0) {
      setFormError('Ingrese un costo unitario válido.');
      return;
    }

    setPurchaseItems((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === prod.id
            ? {
                ...i,
                quantity: i.quantity + qty,
                unitCost: cost,
                subtotal: (i.quantity + qty) * cost,
              }
            : i
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          sku: prod.sku,
          name: prod.name,
          quantity: qty,
          unitCost: cost,
          subtotal: qty * cost,
        },
      ];
    });
  };

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierInvoice.trim()) {
      setFormError('Ingrese el número de factura o remisión del proveedor.');
      return;
    }
    if (purchaseItems.length === 0) {
      setFormError('Debe incluir al menos un producto en la orden de compra.');
      return;
    }

    onRegisterPurchase({
      supplierId,
      supplierInvoice: supplierInvoice.trim().toUpperCase(),
      paymentMethod,
      items: purchaseItems,
      notes: notes.trim() || 'Ingreso normal de almacén.',
    });

    setIsModalOpen(false);
    setSupplierInvoice('');
    setPurchaseItems([]);
    setNotes('');
    setFormError('');
  };

  const filtered = purchases.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      p.referenceNumber.toLowerCase().includes(q) ||
      p.supplierInvoice.toLowerCase().includes(q) ||
      p.supplierName.toLowerCase().includes(q);
    const matchSup = supFilter === 'ALL' || p.supplierId === supFilter;
    return matchQ && matchSup;
  });

  const totalComprasMonto = purchases.reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Compras y Abastecimiento"
        description="Registro de facturas de proveedores con incremento automático de existencias en almacén."
        actions={
          <button
            type="button"
            onClick={() => {
              setSupplierId(suppliers[0]?.id || '');
              setSelectedProdId(products[0]?.id || '');
              setItemCost(String(products[0]?.cost || '1.00'));
              setPurchaseItems([]);
              setFormError('');
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar Compra
          </button>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Órdenes Registradas',
            value: purchases.length,
            subtext: 'Recepciones de mercancía',
          },
          {
            label: 'Inversión Acumulada',
            value: formatCurrency(totalComprasMonto, config.currencySymbol),
            subtext: 'Total compras a proveedores',
            tone: 'primary',
          },
          {
            label: 'Proveedores Activos',
            value: suppliers.length,
            subtext: 'Habilitados para abastecimiento',
          },
          {
            label: 'Unidades Ingresadas',
            value: purchases.reduce(
              (acc, p) =>
                acc + p.items.reduce((sum, item) => sum + item.quantity, 0),
              0
            ),
            subtext: 'Total mercancía recibida',
            tone: 'success',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar por número de orden, factura de proveedor o razón social..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: 'Proveedor',
            value: supFilter,
            onChange: setSupFilter,
            options: [
              { value: 'ALL', label: 'Todos los proveedores' },
              ...suppliers.map((s) => ({ value: s.id, label: s.name })),
            ],
          },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Orden Interna</th>
                <th className="py-2.5 px-3 font-semibold">Fact. Proveedor</th>
                <th className="py-2.5 px-3 font-semibold">Fecha</th>
                <th className="py-2.5 px-3 font-semibold">Proveedor</th>
                <th className="py-2.5 px-3 font-semibold">Pago</th>
                <th className="py-2.5 px-3 font-semibold text-right">Ítems</th>
                <th className="py-2.5 px-3 font-semibold text-right">Total Compra</th>
                <th className="py-2.5 px-3 font-semibold">Estado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((pur) => (
                <tr key={pur.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {pur.referenceNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                    {pur.supplierInvoice}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {pur.date} · {pur.time}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {pur.supplierName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                    {pur.paymentMethod}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                    {pur.items.reduce((s, i) => s + i.quantity, 0)} und.
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(pur.total, config.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="text-emerald-700 font-semibold">
                      {pur.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingPurchase(pur)}
                        className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver Detalle
                      </button>
                      {onDeletePurchase && (
                        <button
                          type="button"
                          onClick={() => setPurchaseToDelete(pur)}
                          className="px-2 py-1 text-xs border border-red-200 rounded bg-white text-red-700 hover:bg-red-50 inline-flex items-center gap-1"
                          title="Eliminar orden de compra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Nueva Compra */}
      <Modal
        isOpen={isModalOpen}
        title="Registrar Ingreso de Compra a Proveedor"
        subtitle="Las cantidades ingresadas se sumarán inmediatamente al stock de cada producto."
        onClose={() => setIsModalOpen(false)}
        maxWidth="xl"
      >
        <form onSubmit={handleCreatePurchase} className="space-y-4 text-xs">
          {formError && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Proveedor *
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° Factura / Remisión Proveedor *
              </label>
              <input
                type="text"
                required
                value={supplierInvoice}
                onChange={(e) => setSupplierInvoice(e.target.value)}
                placeholder="Ej. FE-90412"
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Forma de Pago *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as
                      | 'Efectivo'
                      | 'Transferencia'
                      | 'Crédito Proveedor'
                  )
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Efectivo">Efectivo (Caja Principal)</option>
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Crédito Proveedor">Crédito Proveedor</option>
              </select>
            </div>
          </div>

          {/* Agregar línea de producto a la compra */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
            <span className="font-bold text-slate-700 uppercase block">
              Agregar Productos a la Orden
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
              <div className="sm:col-span-6">
                <label className="block text-[11px] text-slate-600 mb-1">
                  Producto
                </label>
                <select
                  value={selectedProdId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    setSelectedProdId(pid);
                    const found = products.find((p) => p.id === pid);
                    if (found) setItemCost(String(found.cost));
                  }}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-600 mb-1">
                  Cantidad
                </label>
                <input
                  type="number"
                  min={1}
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-600 mb-1">
                  Costo Unit. ({config.currencySymbol})
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={itemCost}
                  onChange={(e) => setItemCost(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="w-full py-1.5 px-3 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-900 text-white"
                >
                  + Añadir Línea
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de ítems agregados */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <tr>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3">Producto</th>
                  <th className="py-2 px-3 text-right">Cantidad</th>
                  <th className="py-2 px-3 text-right">Costo Unit.</th>
                  <th className="py-2 px-3 text-right">Subtotal</th>
                  <th className="py-2 px-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {purchaseItems.map((item) => (
                  <tr key={item.productId}>
                    <td className="py-2 px-3">{item.sku}</td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-2 px-3 text-right">{item.quantity}</td>
                    <td className="py-2 px-3 text-right">
                      {formatCurrency(item.unitCost, config.currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      {formatCurrency(item.subtotal, config.currencySymbol)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setPurchaseItems((prev) =>
                            prev.filter((i) => i.productId !== item.productId)
                          )
                        }
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {purchaseItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-6 text-center font-sans text-slate-400"
                    >
                      Aún no se han añadido productos a esta compra.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-2">
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones de recepción..."
              className="w-1/2 px-3 py-1.5 text-xs border border-slate-300 rounded"
            />
            <div className="text-sm font-bold font-mono">
              TOTAL COMPRA:{' '}
              {formatCurrency(
                purchaseItems.reduce((s, i) => s + i.subtotal, 0),
                config.currencySymbol
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 text-white"
            >
              Guardar y Actualizar Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Detalle de Compra */}
      <Modal
        isOpen={!!viewingPurchase}
        title={`Detalle de Compra — ${viewingPurchase?.referenceNumber}`}
        subtitle={`Factura Proveedor: ${viewingPurchase?.supplierInvoice} · ${viewingPurchase?.supplierName}`}
        onClose={() => setViewingPurchase(null)}
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {onDeletePurchase && viewingPurchase ? (
              <button
                type="button"
                onClick={() => {
                  const p = viewingPurchase;
                  setViewingPurchase(null);
                  setPurchaseToDelete(p);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar Compra
              </button>
            ) : <div />}
            <button
              type="button"
              onClick={() => setViewingPurchase(null)}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white hover:bg-slate-900 cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        }
      >
        {viewingPurchase && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded">
              <div>
                <span className="text-slate-500 block">Proveedor:</span>
                <strong className="text-slate-900">
                  {viewingPurchase.supplierName}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha y Hora:</span>
                <strong className="font-mono text-slate-900">
                  {viewingPurchase.date} {viewingPurchase.time}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Método de Pago:</span>
                <strong className="text-slate-900">
                  {viewingPurchase.paymentMethod}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 block">Responsable:</span>
                <strong className="text-slate-900">
                  {viewingPurchase.buyerName}
                </strong>
              </div>
            </div>
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <tr>
                  <th className="py-2 px-2.5">Producto</th>
                  <th className="py-2 px-2.5 text-right">Cant.</th>
                  <th className="py-2 px-2.5 text-right">Costo</th>
                  <th className="py-2 px-2.5 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {viewingPurchase.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2.5 font-sans">{it.name}</td>
                    <td className="py-2 px-2.5 text-right">{it.quantity}</td>
                    <td className="py-2 px-2.5 text-right">
                      {formatCurrency(it.unitCost, config.currencySymbol)}
                    </td>
                    <td className="py-2 px-2.5 text-right font-semibold">
                      {formatCurrency(it.subtotal, config.currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-right font-mono font-bold text-sm pt-2">
              Total Orden:{' '}
              {formatCurrency(viewingPurchase.total, config.currencySymbol)}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirmar Eliminación de Compra */}
      <ConfirmModal
        isOpen={!!purchaseToDelete}
        title={`Eliminar Compra ${purchaseToDelete?.referenceNumber || ''}`}
        message={`¿Confirma la eliminación permanente de la compra a "${purchaseToDelete?.supplierName}" por ${formatCurrency(
          purchaseToDelete?.total || 0,
          config.currencySymbol
        )}? Las cantidades de mercancía recibidas se descontarán del stock actual.`}
        confirmLabel="Eliminar Compra"
        variant="danger"
        onConfirm={() => {
          if (purchaseToDelete && onDeletePurchase) {
            onDeletePurchase(purchaseToDelete.id);
            setPurchaseToDelete(null);
          }
        }}
        onCancel={() => setPurchaseToDelete(null)}
      />
    </div>
  );
};

/* ============================================================================
   3. MÓDULO: DEVOLUCIONES
   ============================================================================ */
interface DevolucionesViewProps {
  returns: ReturnRecord[];
  sales: Sale[];
  products: Product[];
  config: CompanyConfig;
  onRegisterReturn: (data: {
    saleInvoice: string;
    clientName: string;
    productId: string;
    quantity: number;
    refundAmount: number;
    reason: string;
    restockInventory: boolean;
  }) => void;
}

export const DevolucionesView: React.FC<DevolucionesViewProps> = ({
  returns,
  sales,
  products,
  config,
  onRegisterReturn,
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [saleInvoice, setSaleInvoice] = useState(
    sales[0]?.invoiceNumber || 'FAC-CS-001041'
  );
  const [clientName, setClientName] = useState(
    sales[0]?.clientName || 'Consumidor Final (Mostrador)'
  );
  const [productId, setProductId] = useState(products[0]?.id || '');
  const [quantity, setQuantity] = useState('1');
  const [refundAmount, setRefundAmount] = useState(
    String(products[0]?.price || '3.20')
  );
  const [reason, setReason] = useState('');
  const [restockInventory, setRestockInventory] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity, 10);
    const refund = parseFloat(refundAmount);
    if (!saleInvoice.trim() || !reason.trim()) {
      setError('El número de factura y el motivo de devolución son obligatorios.');
      return;
    }
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('La cantidad devuelta debe ser mayor a 0.');
      return;
    }

    onRegisterReturn({
      saleInvoice: saleInvoice.trim().toUpperCase(),
      clientName: clientName.trim() || 'Consumidor Final',
      productId,
      quantity: qty,
      refundAmount: Number.isFinite(refund) ? refund : 0,
      reason: reason.trim(),
      restockInventory,
    });

    setIsModalOpen(false);
    setReason('');
    setError('');
  };

  const filtered = returns.filter((r) => {
    const q = search.trim().toLowerCase();
    return (
      !q ||
      r.returnNumber.toLowerCase().includes(q) ||
      r.saleInvoice.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.clientName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Control de Devoluciones y Garantías"
        description="Gestión de cambios de mercancía, reembolsos a clientes y reintegro controlado al inventario."
        actions={
          <button
            type="button"
            onClick={() => {
              setError('');
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Registrar Devolución
          </button>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Total Devoluciones',
            value: returns.length,
            subtext: 'Casos procesados en sistema',
          },
          {
            label: 'Unidades Reintegradas',
            value: returns
              .filter((r) => r.restockInventory)
              .reduce((s, r) => s + r.quantity, 0),
            subtext: 'Devueltas a stock apto para venta',
            tone: 'success',
          },
          {
            label: 'Monto Reembolsado',
            value: formatCurrency(
              returns.reduce((s, r) => s + r.refundAmount, 0),
              config.currencySymbol
            ),
            subtext: 'Notas crédito / efectivo devuelto',
            tone: 'warning',
          },
          {
            label: 'Tasa de Devolución',
            value: `${
              sales.length > 0
                ? ((returns.length / sales.length) * 100).toFixed(1)
                : '0.0'
            }%`,
            subtext: 'Respecto al total de ventas',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar devolución por código, factura origen, cliente o producto..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">N° Devolución</th>
                <th className="py-2.5 px-3 font-semibold">Fecha</th>
                <th className="py-2.5 px-3 font-semibold">Factura Origen</th>
                <th className="py-2.5 px-3 font-semibold">Cliente</th>
                <th className="py-2.5 px-3 font-semibold">Producto</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cant.</th>
                <th className="py-2.5 px-3 font-semibold text-right">Reembolso</th>
                <th className="py-2.5 px-3 font-semibold">Reingreso Stock</th>
                <th className="py-2.5 px-3 font-semibold">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                    {ret.returnNumber}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {ret.date} · {ret.time}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-blue-700 whitespace-nowrap">
                    {ret.saleInvoice}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">{ret.clientName}</td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900">
                    {ret.productName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold">
                    {ret.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-700 whitespace-nowrap">
                    {formatCurrency(ret.refundAmount, config.currencySymbol)}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={
                        ret.restockInventory
                          ? 'text-emerald-700 font-semibold'
                          : 'text-slate-500'
                      }
                    >
                      {ret.restockInventory ? 'Sí (+Stock)' : 'No (Avería)'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 max-w-xs">
                    {ret.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Devolución */}
      <Modal
        isOpen={isModalOpen}
        title="Registrar Devolución de Producto"
        subtitle="Vincula una factura emitida y gestiona el reingreso de existencias."
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                N° Factura de Venta *
              </label>
              <input
                type="text"
                required
                value={saleInvoice}
                onChange={(e) => setSaleInvoice(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cliente
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Producto Devuelto *
            </label>
            <select
              value={productId}
              onChange={(e) => {
                const pid = e.target.value;
                setProductId(pid);
                const found = products.find((p) => p.id === pid);
                if (found) setRefundAmount(String(found.price));
              }}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cantidad *
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  const found = products.find((p) => p.id === productId);
                  const q = parseInt(e.target.value, 10) || 1;
                  if (found) setRefundAmount((found.price * q).toFixed(2));
                }}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Monto a Reembolsar ({config.currencySymbol}) *
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center gap-2">
            <input
              id="restock-check"
              type="checkbox"
              checked={restockInventory}
              onChange={(e) => setRestockInventory(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="restock-check" className="font-medium text-slate-800">
              Reintegrar unidades al stock disponible (producto en buen estado)
            </label>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motivo de la Devolución *
            </label>
            <textarea
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Detalle el motivo del cambio o garantía..."
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 text-white"
            >
              Procesar Devolución
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
