import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Lock,
  Unlock,
  Download,
  Upload,
  Printer,
  Edit3,
  Trash2,
  Save,
  RotateCcw,
  UserCheck,
  Cloud,
  FileUp,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Archive,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import {
  CashSession,
  CashMovement,
  Sale,
  Purchase,
  Product,
  Category,
  Client,
  Supplier,
  CreditAccount,
  SystemUser,
  AuditEntry,
  CompanyConfig,
} from '../../types/erp';
import {
  FullBackupData,
  exportFullBackupJSON,
  exportProductsToCSV,
  exportClientsToCSV,
} from '../../utils/backupAndImages';
import {
  PageHeader,
  SummaryStrip,
  FilterToolbar,
  Modal,
  ConfirmModal,
  formatCurrency,
} from '../ui/EnterpriseComponents';

/* ============================================================================
   1. MÓDULO: CAJA (CONTROL DE EFECTIVO Y ARQUEO)
   ============================================================================ */
interface CajaViewProps {
  session: CashSession;
  movements: CashMovement[];
  config: CompanyConfig;
  onAddCashMovement: (data: {
    type: 'Ingreso' | 'Egreso';
    category: 'Gasto Operativo' | 'Ajuste Caja';
    paymentMethod: string;
    description: string;
    amount: number;
  }) => void;
  onCloseOrOpenCash: (countedCash?: number, notes?: string) => void;
}

export const CajaView: React.FC<CajaViewProps> = ({
  session,
  movements,
  config,
  onAddCashMovement,
  onCloseOrOpenCash,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isMovModalOpen, setIsMovModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);

  const [movType, setMovType] = useState<'Ingreso' | 'Egreso'>('Egreso');
  const [movCategory, setMovCategory] = useState<
    'Gasto Operativo' | 'Ajuste Caja'
  >('Gasto Operativo');
  const [movMethod, setMovMethod] = useState('Efectivo');
  const [movDesc, setMovDesc] = useState('');
  const [movAmount, setMovAmount] = useState('');
  const [movError, setMovError] = useState('');

  const [countedCashInput, setCountedCashInput] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const totalIngresos = movements
    .filter((m) => m.type === 'Ingreso')
    .reduce((s, m) => s + m.amount, 0);
  const totalEgresos = movements
    .filter((m) => m.type === 'Egreso')
    .reduce((s, m) => s + m.amount, 0);
  const efectivoEnCaja = movements
    .filter((m) => m.paymentMethod === 'Efectivo')
    .reduce((s, m) => (m.type === 'Ingreso' ? s + m.amount : s - m.amount), 0);

  const handleMovSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(movAmount);
    if (!movDesc.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMovError('Ingrese una descripción clara y un monto mayor a 0.');
      return;
    }
    onAddCashMovement({
      type: movType,
      category: movCategory,
      paymentMethod: movMethod,
      description: movDesc.trim(),
      amount: amt,
    });
    setIsMovModalOpen(false);
    setMovDesc('');
    setMovAmount('');
    setMovError('');
  };

  const handleArqueoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(countedCashInput);
    onCloseOrOpenCash(
      Number.isFinite(counted) ? counted : efectivoEnCaja,
      closeNotes.trim()
    );
    setIsCloseModalOpen(false);
  };

  const filtered = movements.filter((m) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      m.description.toLowerCase().includes(q) ||
      m.reference.toLowerCase().includes(q) ||
      m.category.toLowerCase().includes(q);
    const matchT = typeFilter === 'ALL' || m.type === typeFilter;
    return matchQ && matchT;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Control de Caja y Arqueo de Turno"
        description={`Estado de Caja: ${session.status.toUpperCase()} · Responsable: ${
          session.cashierName
        } · Apertura: ${session.openedAt}`}
        actions={
          <>
            <button
              type="button"
              disabled={session.status === 'Cerrada'}
              onClick={() => {
                setMovError('');
                setIsMovModalOpen(true);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white disabled:opacity-40 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Ingreso / Gasto
            </button>
            {session.status === 'Abierta' ? (
              <button
                type="button"
                onClick={() => {
                  setCountedCashInput(efectivoEnCaja.toFixed(2));
                  setCloseNotes('');
                  setIsCloseModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-900 text-white flex items-center gap-1.5 whitespace-nowrap"
              >
                <Lock className="w-3.5 h-3.5" />
                Realizar Corte de Caja
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onCloseOrOpenCash()}
                className="px-3.5 py-1.5 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white flex items-center gap-1.5 whitespace-nowrap"
              >
                <Unlock className="w-3.5 h-3.5" />
                Reabrir Turno de Caja
              </button>
            )}
          </>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Base Inicial Apertura',
            value: formatCurrency(session.openingBalance, config.currencySymbol),
            subtext: `Turno ${session.id}`,
          },
          {
            label: 'Total Ingresos Turno',
            value: formatCurrency(totalIngresos, config.currencySymbol),
            subtext: 'Incluye base, ventas y abonos',
            tone: 'success',
          },
          {
            label: 'Total Egresos / Gastos',
            value: formatCurrency(totalEgresos, config.currencySymbol),
            subtext: 'Pagos a proveedores y gastos',
            tone: 'danger',
          },
          {
            label: 'Efectivo Físico Esperado',
            value: formatCurrency(efectivoEnCaja, config.currencySymbol),
            subtext: 'Billetes y monedas en gaveta',
            tone: 'primary',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar movimiento de caja por concepto, referencia o categoría..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: 'Tipo de Flujo',
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: 'ALL', label: 'Todos los movimientos' },
              { value: 'Ingreso', label: 'Solo Ingresos (+)' },
              { value: 'Egreso', label: 'Solo Egresos (-)' },
            ],
          },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Fecha / Hora</th>
                <th className="py-2.5 px-3 font-semibold">Referencia</th>
                <th className="py-2.5 px-3 font-semibold">Categoría</th>
                <th className="py-2.5 px-3 font-semibold">Concepto / Descripción</th>
                <th className="py-2.5 px-3 font-semibold">Medio de Pago</th>
                <th className="py-2.5 px-3 font-semibold">Responsable</th>
                <th className="py-2.5 px-3 font-semibold text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {mov.date} · {mov.time}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {mov.reference}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {mov.category}
                  </td>
                  <td className="py-2.5 px-3 text-slate-800">
                    {mov.description}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                    {mov.paymentMethod}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                    {mov.user}
                  </td>
                  <td
                    className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                      mov.type === 'Ingreso'
                        ? 'text-emerald-700'
                        : 'text-red-700'
                    }`}
                  >
                    {mov.type === 'Ingreso' ? '+' : '-'}
                    {formatCurrency(mov.amount, config.currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Registrar Ingreso / Gasto */}
      <Modal
        isOpen={isMovModalOpen}
        title="Registrar Movimiento Manual de Caja"
        onClose={() => setIsMovModalOpen(false)}
        maxWidth="sm"
      >
        <form onSubmit={handleMovSubmit} className="space-y-3 text-xs">
          {movError && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
              {movError}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Movimiento *
              </label>
              <select
                value={movType}
                onChange={(e) =>
                  setMovType(e.target.value as 'Ingreso' | 'Egreso')
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Egreso">Egreso / Salida (-)</option>
                <option value="Ingreso">Ingreso / Entrada (+)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Clasificación *
              </label>
              <select
                value={movCategory}
                onChange={(e) =>
                  setMovCategory(
                    e.target.value as 'Gasto Operativo' | 'Ajuste Caja'
                  )
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Gasto Operativo">Gasto Operativo</option>
                <option value="Ajuste Caja">Ajuste / Base de Caja</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Medio de Pago
              </label>
              <select
                value={movMethod}
                onChange={(e) => setMovMethod(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Monto ({config.currencySymbol}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={movAmount}
                onChange={(e) => setMovAmount(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Concepto / Descripción *
            </label>
            <input
              type="text"
              required
              value={movDesc}
              onChange={(e) => setMovDesc(e.target.value)}
              placeholder="Ej. Pago servicio de mensajería local"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsMovModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 text-white"
            >
              Guardar Movimiento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Arqueo y Cierre de Caja */}
      <Modal
        isOpen={isCloseModalOpen}
        title="Corte y Arqueo de Caja"
        subtitle="Verifique el efectivo físico en gaveta antes de cerrar el turno."
        onClose={() => setIsCloseModalOpen(false)}
        maxWidth="sm"
      >
        <form onSubmit={handleArqueoSubmit} className="space-y-3.5 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1 font-mono">
            <div className="flex justify-between">
              <span className="font-sans text-slate-600">Efectivo Esperado:</span>
              <strong className="text-slate-900">
                {formatCurrency(efectivoEnCaja, config.currencySymbol)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="font-sans text-slate-600">Diferencia:</span>
              <strong
                className={
                  (parseFloat(countedCashInput) || 0) - efectivoEnCaja < 0
                    ? 'text-red-700'
                    : 'text-emerald-700'
                }
              >
                {formatCurrency(
                  (parseFloat(countedCashInput) || 0) - efectivoEnCaja,
                  config.currencySymbol
                )}
              </strong>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Efectivo Físico Contado ({config.currencySymbol}) *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={countedCashInput}
              onChange={(e) => setCountedCashInput(e.target.value)}
              className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observaciones de Cierre
            </label>
            <textarea
              rows={2}
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              placeholder="Novedades del turno..."
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-900 text-white"
            >
              Confirmar Cierre de Turno
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* ============================================================================
   2. MÓDULO: REPORTES
   ============================================================================ */
interface ReportesViewProps {
  sales: Sale[];
  purchases: Purchase[];
  products: Product[];
  categories: Category[];
  credits: CreditAccount[];
  config: CompanyConfig;
}

export const ReportesView: React.FC<ReportesViewProps> = ({
  sales,
  purchases,
  products,
  categories,
  credits,
  config,
}) => {
  const [reportTab, setReportTab] = useState<'VENTAS' | 'INVENTARIO' | 'CARTERA'>(
    'VENTAS'
  );
  const [search, setSearch] = useState('');

  const validSales = useMemo(
    () => sales.filter((s) => s.status === 'Completada'),
    [sales]
  );

  const totalRevenue = validSales.reduce((s, x) => s + x.total, 0);
  const totalProfit = validSales.reduce((s, x) => s + x.profit, 0);
  const totalPurchases = purchases.reduce((s, x) => s + x.total, 0);
  const avgMargin =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const handleExportCSV = () => {
    let csv = '';
    if (reportTab === 'VENTAS') {
      csv = 'Factura,Fecha,Hora,Cliente,MetodoPago,Total,Ganancia,Estado\n';
      sales.forEach((s) => {
        csv += `${s.invoiceNumber},${s.date},${s.time},"${s.clientName}",${s.paymentMethod},${s.total.toFixed(2)},${s.profit.toFixed(2)},${s.status}\n`;
      });
    } else if (reportTab === 'INVENTARIO') {
      csv = 'SKU,CodigoBarras,Producto,Categoria,Costo,Precio,Stock,ValorCosto\n';
      products.forEach((p) => {
        csv += `${p.sku},${p.barcode},"${p.name}","${p.categoryName}",${p.cost.toFixed(2)},${p.price.toFixed(2)},${p.stock},${(p.cost * p.stock).toFixed(2)}\n`;
      });
    } else {
      csv = 'Factura,Cliente,Emision,Vencimiento,Total,Abonado,Saldo,Estado\n';
      credits.forEach((c) => {
        csv += `${c.invoiceNumber},"${c.clientName}",${c.issueDate},${c.dueDate},${c.totalAmount.toFixed(2)},${c.paidAmount.toFixed(2)},${c.balance.toFixed(2)},${c.status}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Reporte_${reportTab}_VARIEDADES_CS.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reportes Gerenciales y Estados Financieros"
        description="Análisis consolidado de rentabilidad, rotación de inventario, medios de pago y cartera."
        actions={
          <>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
          </>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Ventas Netas Acumuladas',
            value: formatCurrency(totalRevenue, config.currencySymbol),
            subtext: `${validSales.length} facturas efectivas`,
            tone: 'primary',
          },
          {
            label: 'Utilidad Bruta Real',
            value: formatCurrency(totalProfit, config.currencySymbol),
            subtext: `Margen promedio: ${avgMargin}%`,
            tone: 'success',
          },
          {
            label: 'Compras de Mercancía',
            value: formatCurrency(totalPurchases, config.currencySymbol),
            subtext: `${purchases.length} órdenes recibidas`,
          },
          {
            label: 'Patrimonio en Inventario',
            value: formatCurrency(
              products.reduce((s, p) => s + p.stock * p.cost, 0),
              config.currencySymbol
            ),
            subtext: 'Valorizado a costo neto',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Filtrar registros del reporte actual..."
        searchValue={search}
        onSearchChange={setSearch}
        rightSlot={
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded border border-slate-200">
            {(
              [
                { id: 'VENTAS', label: '1. Ventas y Utilidades' },
                { id: 'INVENTARIO', label: '2. Valorización de Inventario' },
                { id: 'CARTERA', label: '3. Estado de Cartera' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setReportTab(tab.id)}
                className={`px-3 py-1 text-xs font-semibold rounded whitespace-nowrap ${
                  reportTab === tab.id
                    ? 'bg-white text-slate-900 border border-slate-300'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {reportTab === 'VENTAS' && (
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase">
            Desglose de Ventas e Indicadores de Rentabilidad por Factura
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                  <th className="py-2.5 px-3">Factura</th>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Método Pago</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Descuento</th>
                  <th className="py-2.5 px-3 text-right">Total Neto</th>
                  <th className="py-2.5 px-3 text-right">Ganancia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {validSales
                  .filter(
                    (s) =>
                      !search ||
                      s.invoiceNumber
                        .toLowerCase()
                        .includes(search.toLowerCase()) ||
                      s.clientName.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {s.invoiceNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{s.date}</td>
                      <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                        {s.clientName}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-slate-700">
                        {s.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {formatCurrency(s.subtotal, config.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-amber-700">
                        -{formatCurrency(s.discountTotal, config.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        {formatCurrency(s.total, config.currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                        {formatCurrency(s.profit, config.currencySymbol)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportTab === 'INVENTARIO' && (
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase">
            Reporte de Valorización Financiera por Categoría y Producto
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3 text-right">Existencia</th>
                  <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                  <th className="py-2.5 px-3 text-right">Costo Total</th>
                  <th className="py-2.5 px-3 text-right">Valor Venta Total</th>
                  <th className="py-2.5 px-3 text-right">Utilidad Potencial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {products
                  .filter(
                    (p) =>
                      !search ||
                      p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.sku.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((p) => {
                    const costTot = p.stock * p.cost;
                    const saleTot = p.stock * p.price;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {p.sku}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                          {p.name}
                        </td>
                        <td className="py-2.5 px-3 font-sans text-slate-600">
                          {p.categoryName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">
                          {p.stock}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatCurrency(p.cost, config.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {formatCurrency(costTot, config.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(saleTot, config.currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {formatCurrency(
                            saleTot - costTot,
                            config.currencySymbol
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportTab === 'CARTERA' && (
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 uppercase">
            Estado Consolidado de Cuentas por Cobrar
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                  <th className="py-2.5 px-3">Factura</th>
                  <th className="py-2.5 px-3">Cliente</th>
                  <th className="py-2.5 px-3">Vencimiento</th>
                  <th className="py-2.5 px-3 text-right">Monto Inicial</th>
                  <th className="py-2.5 px-3 text-right">Recaudado</th>
                  <th className="py-2.5 px-3 text-right">Saldo por Cobrar</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {credits.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {c.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900">
                      {c.clientName}
                    </td>
                    <td className="py-2.5 px-3">{c.dueDate}</td>
                    <td className="py-2.5 px-3 text-right">
                      {formatCurrency(c.totalAmount, config.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700">
                      {formatCurrency(c.paidAmount, config.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      {formatCurrency(c.balance, config.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-semibold">
                      {c.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================================
   3. MÓDULO: USUARIOS
   ============================================================================ */
interface UsuariosViewProps {
  users: SystemUser[];
  currentUserId: string;
  onSwitchActiveUser: (userId: string) => void;
  onSaveUser: (user: Omit<SystemUser, 'id' | 'lastLogin'>, existingId?: string) => void;
  onDeleteUser: (id: string) => void;
}

export const UsuariosView: React.FC<UsuariosViewProps> = ({
  users,
  currentUserId,
  onSwitchActiveUser,
  onSaveUser,
  onDeleteUser,
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<SystemUser['role']>('Cajero');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [branch, setBranch] = useState('Sede Principal - Centro');
  const [active, setActive] = useState(true);
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState('');

  const currentUser = users.find((u) => u.id === currentUserId);
  const isMasterAdmin =
    currentUser?.role === 'Administrador' &&
    (currentUser?.email === 'variedadescs@gmail.com' ||
     currentUser?.email === 'syncconnect.online@gmail.com' ||
     currentUser?.username === 'admin' ||
     users.length <= 1);

  if (!isMasterAdmin) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Gestión de Usuarios del Sistema"
          description="Seguridad y control de confidencialidad empresarial"
        />
        <div className="p-8 bg-white border border-slate-200 rounded-xl shadow-xs text-center max-w-lg mx-auto my-12 space-y-3">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-blue-700" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Acceso Privado y Confidencial</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Por estrictas políticas de privacidad de <strong>Sync Connect</strong>, la lista de cuentas y usuarios registrados del sistema está protegida y es únicamente accesible por la cuenta de Administrador Principal.
          </p>
        </div>
      </div>
    );
  }

  const openNew = () => {
    setEditingUser(null);
    setUsername('');
    setFullName('');
    setRole('Cajero');
    setEmail('');
    setPhone('');
    setBranch('Sede Principal - Centro');
    setActive(true);
    setPin('1234');
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditingUser(u);
    setUsername(u.username);
    setFullName(u.fullName);
    setRole(u.role);
    setEmail(u.email);
    setPhone(u.phone);
    setBranch(u.branch);
    setActive(u.active);
    setPin(u.pin || '1234');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) {
      setError('El nombre de usuario y el nombre completo son obligatorios.');
      return;
    }
    onSaveUser(
      {
        username: username.trim().toLowerCase(),
        fullName: fullName.trim(),
        role,
        email: email.trim() || '-',
        phone: phone.trim() || '-',
        branch: branch.trim() || 'Sede Principal',
        active,
        pin: pin.trim() || '1234',
      },
      editingUser?.id
    );
    setIsModalOpen(false);
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Usuarios y Control de Accesos"
        description="Administración de cuentas de personal, roles operativos y asignación de sucursal."
        actions={
          <button
            type="button"
            onClick={openNew}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Usuario
          </button>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Total Usuarios',
            value: users.length,
            subtext: 'Cuentas registradas',
          },
          {
            label: 'Usuarios Activos',
            value: users.filter((u) => u.active).length,
            subtext: 'Con acceso habilitado',
            tone: 'success',
          },
          {
            label: 'Administradores',
            value: users.filter((u) => u.role === 'Administrador').length,
            subtext: 'Control total del sistema',
            tone: 'primary',
          },
          {
            label: 'Operadores POS / Almacén',
            value: users.filter((u) => u.role !== 'Administrador').length,
            subtext: 'Cajeros, supervisores y bodega',
          },
        ]}
      />

      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold block text-blue-950">
            Control de Usuarios y Cuentas del Sistema:
          </strong>
          <span>
            Cada usuario registrado como administrador tiene control total de su inventario, ventas, compras y configuración de seguridad.
          </span>
        </div>
      </div>

      <FilterToolbar
        searchPlaceholder="Buscar usuario por nombre, login o perfil..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Usuario</th>
                <th className="py-2.5 px-3 font-semibold">Nombre Completo</th>
                <th className="py-2.5 px-3 font-semibold">Rol Asignado</th>
                <th className="py-2.5 px-3 font-semibold">Sucursal</th>
                <th className="py-2.5 px-3 font-semibold">Último Acceso</th>
                <th className="py-2.5 px-3 font-semibold">Estado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((u) => {
                const isCurrent = u.id === currentUserId;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {u.username}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">
                        {u.fullName}{' '}
                        {isCurrent && (
                          <span className="text-blue-700 font-normal">
                            (Sesión actual)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {u.email} · {u.phone}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                      {u.role}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{u.branch}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {u.lastLogin}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={
                          u.active
                            ? 'text-emerald-700 font-semibold'
                            : 'text-slate-400'
                        }
                      >
                        {u.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {!isCurrent && u.active && (
                          <button
                            type="button"
                            onClick={() => onSwitchActiveUser(u.id)}
                            className="px-2.5 py-1 text-xs border border-blue-200 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1"
                            title="Usar este operador para las transacciones"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Activar turno
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingUser(u)}
                          className="px-2 py-1 text-xs border border-red-200 rounded bg-white text-red-700 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                          title={`Eliminar ${u.role === 'Cajero' ? 'Vendedor / Cajero' : 'Usuario'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario del Sistema'}
        onClose={() => setIsModalOpen(false)}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Usuario (Login) *
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Rol en el Sistema *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as SystemUser['role'])}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Administrador">Administrador</option>
                <option value="Supervisor">Supervisor</option>
                <option value="Cajero">Cajero</option>
                <option value="Almacén">Almacén</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Sucursal / Punto
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado
              </label>
              <select
                value={active ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setActive(e.target.value === 'ACTIVE')}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                Clave / PIN de Seguridad *
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Defecto: 1234</span>
            </div>
            <input
              type="text"
              required
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN de 4 dígitos o contraseña"
              className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded focus:border-blue-700"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Este PIN o contraseña será requerido para iniciar sesión en la terminal POS y módulos del sistema.
            </p>
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
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingUser}
        title={`Eliminar ${deletingUser?.role === 'Cajero' ? 'Vendedor / Cajero' : 'Usuario'}`}
        message={`¿Confirma la eliminación permanente de la cuenta "${deletingUser?.fullName}" (@${deletingUser?.username} · ${deletingUser?.role})?${
          deletingUser?.id === currentUserId
            ? ' ADVERTENCIA: Esta es su sesión actual. Al eliminarla, se cerrará la sesión del sistema.'
            : ''
        }`}
        confirmLabel="Eliminar Cuenta"
        variant="danger"
        onConfirm={() => {
          if (deletingUser) {
            onDeleteUser(deletingUser.id);
            setDeletingUser(null);
          }
        }}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
};

/* ============================================================================
   4. MÓDULO: AUDITORÍA
   ============================================================================ */
interface AuditoriaViewProps {
  logs: AuditEntry[];
}

export const AuditoriaView: React.FC<AuditoriaViewProps> = ({ logs }) => {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const filtered = logs.filter((l) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      l.action.toLowerCase().includes(q) ||
      l.detail.toLowerCase().includes(q) ||
      l.user.toLowerCase().includes(q) ||
      l.module.toLowerCase().includes(q);
    const matchSev =
      severityFilter === 'ALL' || l.severity === severityFilter;
    return matchQ && matchSev;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Bitácora de Auditoría del Sistema"
        description="Registro cronológico e inalterable de operaciones críticas, ventas, anulaciones y cambios de inventario."
      />

      <SummaryStrip
        items={[
          {
            label: 'Total Eventos Registrados',
            value: logs.length,
            subtext: 'Trazabilidad activa en sesión',
          },
          {
            label: 'Operaciones Normales',
            value: logs.filter((l) => l.severity === 'Normal').length,
            subtext: 'Ventas, ingresos y consultas',
            tone: 'success',
          },
          {
            label: 'Advertencias Operativas',
            value: logs.filter((l) => l.severity === 'Advertencia').length,
            subtext: 'Ajustes manuales y devoluciones',
            tone: 'warning',
          },
          {
            label: 'Eventos Críticos',
            value: logs.filter((l) => l.severity === 'Crítico').length,
            subtext: 'Anulaciones y eliminaciones',
            tone: 'danger',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar evento por usuario, módulo, acción o detalle..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: 'Nivel',
            value: severityFilter,
            onChange: setSeverityFilter,
            options: [
              { value: 'ALL', label: 'Todos los niveles' },
              { value: 'Normal', label: 'Normal' },
              { value: 'Advertencia', label: 'Advertencia' },
              { value: 'Crítico', label: 'Crítico' },
            ],
          },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Fecha y Hora Exacta</th>
                <th className="py-2.5 px-3 font-semibold">Usuario / Rol</th>
                <th className="py-2.5 px-3 font-semibold">Módulo</th>
                <th className="py-2.5 px-3 font-semibold">Operación</th>
                <th className="py-2.5 px-3 font-semibold">Detalle Técnico</th>
                <th className="py-2.5 px-3 font-semibold">Nivel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="font-semibold text-slate-900">
                      {log.user}
                    </span>{' '}
                    <span className="text-slate-500">· {log.role}</span>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">
                    {log.module}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{log.detail}</td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`font-semibold ${
                        log.severity === 'Crítico'
                          ? 'text-red-700'
                          : log.severity === 'Advertencia'
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
   5. MÓDULO: CONFIGURACIÓN
   ============================================================================ */
interface ConfiguracionViewProps {
  config: CompanyConfig;
  onSaveConfig: (newConfig: CompanyConfig) => void;
  onResetFactoryData: (mode: 'demo' | 'clean') => void;
  fullBackupData: FullBackupData;
  onRestoreBackup: (backup: FullBackupData) => Promise<void> | void;
  products: Product[];
  clients: Client[];
}

export const ConfiguracionView: React.FC<ConfiguracionViewProps> = ({
  config,
  onSaveConfig,
  onResetFactoryData,
  fullBackupData,
  onRestoreBackup,
  products,
  clients,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'backup' | 'factory'>('general');
  const [formState, setFormState] = useState<CompanyConfig>(config);
  const [savedNotice, setSavedNotice] = useState(false);

  // Backup & Restore states
  const [backupFileError, setBackupFileError] = useState('');
  const [backupPreview, setBackupPreview] = useState<FullBackupData | null>(null);
  const [backupSuccessNotice, setBackupSuccessNotice] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Factory Reset states
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'demo' | 'clean'>('demo');

  // Sync if parent config changes
  React.useEffect(() => {
    setFormState(config);
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formState);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleBackupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBackupFileError('');
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed || !parsed.config || !Array.isArray(parsed.products)) {
        throw new Error('El archivo seleccionado no es una copia de seguridad válida de VARIEDADES CS.');
      }

      setBackupPreview(parsed as FullBackupData);
    } catch (err) {
      setBackupFileError(err instanceof Error ? err.message : 'Error al procesar el archivo de respaldo.');
      setBackupPreview(null);
    }
  };

  const handleExecuteRestore = async () => {
    if (!backupPreview) return;
    try {
      setIsRestoring(true);
      await onRestoreBackup(backupPreview);
      setBackupSuccessNotice('¡Copia de seguridad restaurada exitosamente con todos los datos!');
      setBackupPreview(null);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
      setTimeout(() => setBackupSuccessNotice(null), 5000);
    } catch (err) {
      setBackupFileError(err instanceof Error ? err.message : 'Error al restaurar copia.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Configuración y Administración del Sistema"
        description="Gestione los datos de su factura, copias de seguridad (backup), exportación/importación y opciones de fábrica."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportFullBackupJSON(fullBackupData)}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 shadow-xs whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Copia de Seguridad Rápida</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setResetMode('demo');
                setIsResetModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-medium border border-red-300 rounded bg-white text-red-700 hover:bg-red-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar a Fábrica</span>
            </button>
          </div>
        }
      />

      {/* Pestañas de Navegación de Configuración */}
      <div className="flex border-b border-slate-200 bg-white rounded-t px-2 pt-2 gap-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'general'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Facturación y Empresa</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'backup'
              ? 'border-blue-700 text-blue-700 bg-blue-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Archive className="w-4 h-4 text-emerald-600" />
          <span>Copias de Seguridad & Importar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('factory')}
          className={`px-4 py-2 border-b-2 font-semibold transition-colors flex items-center gap-1.5 ${
            activeTab === 'factory'
              ? 'border-red-600 text-red-700 bg-red-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>Reiniciar Sistema (Fábrica)</span>
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Los parámetros de configuración de VARIEDADES CS se han guardado correctamente y se reflejan en todas las facturas y reportes.</span>
        </div>
      )}

      {/* PESTAÑA 1: DATOS DE EMPRESA Y FACTURACIÓN */}
      {activeTab === 'general' && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded p-5 space-y-5 text-xs shadow-xs"
        >
          <div className="border-b border-slate-200 pb-2">
            <h3 className="text-sm font-bold text-slate-900">
              1. Identidad Corporativa y Datos de la Factura (Encabezado)
            </h3>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Esta información se imprime en la parte superior de cada recibo de venta y documento comercial.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nombre de la Empresa (Factura) *
              </label>
              <input
                type="text"
                required
                value={formState.companyName}
                onChange={(e) =>
                  setFormState({ ...formState, companyName: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm font-bold border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Subtítulo de la Empresa / Factura *
              </label>
              <input
                type="text"
                required
                value={formState.subtitle}
                onChange={(e) =>
                  setFormState({ ...formState, subtitle: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                NIT / RUC en Factura *
              </label>
              <input
                type="text"
                required
                value={formState.taxId}
                onChange={(e) =>
                  setFormState({ ...formState, taxId: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Dirección en Factura
              </label>
              <input
                type="text"
                value={formState.address}
                onChange={(e) =>
                  setFormState({ ...formState, address: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfonos en Factura
              </label>
              <input
                type="text"
                value={formState.phone}
                onChange={(e) =>
                  setFormState({ ...formState, phone: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Electrónico Oficial
              </label>
              <input
                type="email"
                value={formState.email}
                onChange={(e) =>
                  setFormState({ ...formState, email: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="border-b border-slate-200 pb-2 pt-2">
            <h3 className="text-sm font-bold text-slate-900">
              2. Parámetros de Moneda, Impuestos y Facturación POS
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Símbolo de Moneda
              </label>
              <input
                type="text"
                value={formState.currencySymbol}
                onChange={(e) =>
                  setFormState({ ...formState, currencySymbol: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Código ISO Moneda
              </label>
              <input
                type="text"
                value={formState.currencyCode}
                onChange={(e) =>
                  setFormState({ ...formState, currencyCode: e.target.value })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tasa Impuesto / IVA (%)
              </label>
              <input
                type="number"
                min={0}
                max={50}
                step="0.5"
                value={formState.taxRatePercent}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    taxRatePercent: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Umbral Global Stock Mínimo
              </label>
              <input
                type="number"
                min={1}
                value={formState.defaultLowStockThreshold}
                onChange={(e) =>
                  setFormState({
                    ...formState,
                    defaultLowStockThreshold: parseInt(e.target.value, 10) || 5,
                  })
                }
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Texto Legal / Pie de Página en Facturas y Recibos
            </label>
            <textarea
              rows={2}
              value={formState.receiptFooter}
              onChange={(e) =>
                setFormState({ ...formState, receiptFooter: e.target.value })
              }
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-200">
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar Configuración
            </button>
          </div>
        </form>
      )}

      {/* PESTAÑA 2: CENTRO DE COPIAS DE SEGURIDAD (BACKUP, EXPORTAR E IMPORTAR) */}
      {activeTab === 'backup' && (
        <div className="space-y-4 text-xs">
          {backupSuccessNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{backupSuccessNotice}</span>
            </div>
          )}

          {backupFileError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{backupFileError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tarjeta 1: Exportar Respaldo y Reportes */}
            <div className="bg-white border border-slate-200 rounded p-5 space-y-4 shadow-xs">
              <div className="border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-blue-700" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Exportar Copia de Seguridad Completa
                  </h3>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Descargue un respaldo con todo el catálogo de productos (incluyendo enlaces y fotos), inventario, ventas, clientes, créditos y caja.
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-900 text-[11px] space-y-1">
                <div className="font-semibold">Contenido del Respaldo Actual:</div>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <span>• {fullBackupData.products.length} Productos registrados</span>
                  <span>• {fullBackupData.clients.length} Clientes</span>
                  <span>• {fullBackupData.sales.length} Ventas realizadas</span>
                  <span>• {fullBackupData.credits.length} Cuentas por cobrar</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => exportFullBackupJSON(fullBackupData)}
                className="w-full py-2.5 px-4 rounded bg-blue-700 hover:bg-blue-800 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Copia de Seguridad (.JSON)</span>
              </button>

              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[11px] font-bold text-slate-700 mb-2">
                  Exportaciones para Microsoft Excel / Hojas de Cálculo:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => exportProductsToCSV(products)}
                    className="p-2 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Catálogo (.CSV)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportClientsToCSV(clients)}
                    className="p-2 border border-slate-300 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold flex items-center justify-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Clientes (.CSV)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Tarjeta 2: Restaurar / Importar Copia de Seguridad */}
            <div className="bg-white border border-slate-200 rounded p-5 space-y-4 shadow-xs">
              <div className="border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Restaurar Copia de Seguridad
                  </h3>
                </div>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Suba un archivo de respaldo (.json) previamente descargado para recuperar todos los datos del negocio al instante.
                </p>
              </div>

              <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-center space-y-2">
                <FileUp className="w-8 h-8 text-emerald-600 mx-auto" />
                <div className="font-semibold text-slate-800">
                  Seleccione el archivo .JSON de respaldo
                </div>
                <p className="text-[11px] text-slate-500">
                  Cargue el archivo descargado desde esta misma pantalla o desde otro dispositivo.
                </p>

                <input
                  type="file"
                  ref={backupFileInputRef}
                  accept=".json,application/json"
                  onChange={handleBackupFileSelect}
                  className="hidden"
                  id="backup-file-input"
                />
                <label
                  htmlFor="backup-file-input"
                  className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Elegir archivo de respaldo (.JSON)</span>
                </label>
              </div>

              {backupPreview && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded space-y-2 text-emerald-950">
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>Respaldo Válido Detectado:</span>
                    <span className="font-mono text-[10px] text-emerald-800">
                      Fecha: {backupPreview.exportedAt?.slice(0, 10) || 'N/A'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-emerald-900">
                    <span>• {backupPreview.products?.length || 0} Productos</span>
                    <span>• {backupPreview.categories?.length || 0} Categorías</span>
                    <span>• {backupPreview.clients?.length || 0} Clientes</span>
                    <span>• {backupPreview.sales?.length || 0} Ventas</span>
                  </div>

                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={handleExecuteRestore}
                    className="w-full mt-2 py-2 px-3 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                    <span>{isRestoring ? 'Restaurando y Sincronizando...' : 'Confirmar y Restaurar Este Respaldo'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: RESTABLECER SISTEMA A VALORES DE FÁBRICA */}
      {activeTab === 'factory' && (
        <div className="bg-white border border-red-200 rounded p-5 space-y-4 shadow-xs text-xs">
          <div className="border-b border-red-200 pb-2">
            <div className="flex items-center gap-2 text-red-700">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900">
                Restablecer el Sistema a Valores de Fábrica (Factory Reset)
              </h3>
            </div>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Utilice esta función para reiniciar completamente el sistema y comenzar de nuevo en limpio o con datos de prueba.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Opción 1: Fábrica con Datos Demo */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">
                  Opción 1: Restaurar Catálogo y Ejemplos de Demostración
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-100 text-blue-800">
                  Recomendado para pruebas
                </span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Restaura las categorías de papelería, productos base con imágenes de muestra, proveedores, clientes iniciales y sesión de caja lista para operar.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetMode('demo');
                  setIsResetModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-700" />
                <span>Restaurar Valores de Demostración</span>
              </button>
            </div>

            {/* Opción 2: Sistema Totalmente Limpio */}
            <div className="border border-red-200 rounded-lg p-4 space-y-3 bg-red-50/40">
              <div className="flex items-center justify-between">
                <span className="font-bold text-red-900 text-xs">
                  Opción 2: Reiniciar Totalmente Limpio (Desde Cero)
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-800">
                  Para negocio en producción
                </span>
              </div>
              <p className="text-red-800/80 text-[11px] leading-relaxed">
                Deja el sistema completamente en blanco: 0 ventas, 0 compras, 0 productos, 0 créditos y caja en cero. Conserva la configuración de la empresa para que ingrese sus propios productos reales.
              </p>
              <button
                type="button"
                onClick={() => {
                  setResetMode('clean');
                  setIsResetModalOpen(true);
                }}
                className="px-4 py-2 text-xs font-semibold rounded bg-red-700 hover:bg-red-800 text-white flex items-center gap-1.5 shadow-xs"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Reiniciar Sistema Limpio (Desde Cero)</span>
              </button>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" />
            <span>
              <strong>Consejo de Seguridad:</strong> Si tiene datos importantes guardados, le sugerimos descargar primero una copia en la pestaña &quot;Copias de Seguridad & Importar&quot;.
            </span>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Reinicio a Fábrica */}
      <ConfirmModal
        isOpen={isResetModalOpen}
        title={resetMode === 'clean' ? 'Reiniciar Sistema Limpio Desde Cero' : 'Restaurar Valores Iniciales de Demostración'}
        message={
          resetMode === 'clean'
            ? '¿Confirma que desea borrar todas las ventas, compras, productos, créditos y movimientos para iniciar su negocio totalmente desde cero? Esta acción no se puede deshacer.'
            : '¿Confirma que desea restablecer los productos, categorías y ejemplos de prueba a los valores de demostración de fábrica?'
        }
        confirmLabel={resetMode === 'clean' ? 'Sí, reiniciar desde cero' : 'Sí, restaurar datos demo'}
        variant="danger"
        onConfirm={() => {
          onResetFactoryData(resetMode);
          setIsResetModalOpen(false);
          setSavedNotice(true);
          setTimeout(() => setSavedNotice(false), 3000);
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
};
