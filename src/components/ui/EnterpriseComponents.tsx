import React, { useState } from 'react';
import { Search, X, Printer, ChevronLeft, ChevronRight, AlertTriangle, Edit3, Check, Share2 } from 'lucide-react';
import { Sale, CompanyConfig } from '../../types/erp';

export function formatCurrency(value: number, symbol = '$'): string {
  const num = Number.isFinite(value) ? value : 0;
  return `${symbol}${symbol.endsWith('$') ? ' ' : ''}${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDualCurrency(value: number, symbol = '$', exchangeRate = 37): { primary: string; secondary: string; full: string } {
  const num = Number.isFinite(value) ? value : 0;
  const isCordobas = symbol.includes('C$') || symbol.includes('NIO');
  
  if (isCordobas) {
    const usd = exchangeRate > 0 ? num / exchangeRate : 0;
    const primary = `C$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const secondary = `$${usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    return { primary, secondary, full: `${primary} (${secondary})` };
  } else {
    const nio = num * exchangeRate;
    const primary = `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
    const secondary = `C$ ${nio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return { primary, secondary, full: `${primary} (${secondary})` };
  }
}

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {description && <p className="text-xs text-slate-600 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};

export interface SummaryItem {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
}

export const SummaryStrip: React.FC<{ items: SummaryItem[] }> = ({ items }) => {
  const getValueColor = (tone?: SummaryItem['tone']) => {
    switch (tone) {
      case 'success':
        return 'text-emerald-700';
      case 'warning':
        return 'text-amber-700';
      case 'danger':
        return 'text-red-700';
      case 'primary':
        return 'text-blue-700';
      default:
        return 'text-slate-900';
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200 rounded p-3.5 flex flex-col justify-between"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {item.label}
          </span>
          <div className={`text-lg font-bold font-mono tabular-nums mt-1 ${getValueColor(item.tone)}`}>
            {item.value}
          </div>
          {item.subtext && (
            <span className="text-xs text-slate-500 mt-1 truncate">{item.subtext}</span>
          )}
        </div>
      ))}
    </div>
  );
};

interface FilterOption {
  value: string;
  label: string;
}

interface FilterToolbarProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (val: string) => void;
  filters?: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: FilterOption[];
  }[];
  rightSlot?: React.ReactNode;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filters = [],
  rightSlot,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded p-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-8 py-1.5 text-sm bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-700"
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              title="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {filters.map((filter, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
              {filter.label}:
            </label>
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-800 focus:outline-none focus:border-blue-700"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
    </div>
  );
};

interface PaginationBarProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
      <div className="font-mono tabular-nums">
        Mostrando <span className="font-semibold text-slate-900">{startItem}</span> a{' '}
        <span className="font-semibold text-slate-900">{endItem}</span> de{' '}
        <span className="font-semibold text-slate-900">{totalItems}</span> registros
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2.5 py-1 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 whitespace-nowrap"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Anterior
        </button>
        <span className="px-3 py-1 font-mono tabular-nums text-slate-800 font-medium">
          Página {currentPage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2.5 py-1 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1 whitespace-nowrap"
        >
          Siguiente
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

interface ModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 overflow-y-auto">
      <div
        className={`bg-white border border-slate-300 rounded w-full ${widthClass} overflow-hidden my-auto`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-600 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-800 rounded"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[78vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireReason?: boolean;
  reasonLabel?: string;
  reasonValue?: string;
  onReasonChange?: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  variant = 'danger',
  requireReason = false,
  reasonLabel = 'Motivo de la operación *',
  reasonValue = '',
  onReasonChange,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const btnColor =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 text-white'
      : variant === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-blue-700 hover:bg-blue-800 text-white';

  return (
    <Modal
      isOpen={isOpen}
      title={title}
      onClose={onCancel}
      maxWidth="sm"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 min-h-[40px] text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={requireReason && !reasonValue.trim()}
            onClick={onConfirm}
            className={`w-full sm:w-auto px-4 py-2 min-h-[40px] text-xs font-semibold rounded-lg flex items-center justify-center cursor-pointer transition-colors disabled:opacity-40 shadow-xs ${btnColor}`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              variant === 'danger' ? 'text-red-600' : 'text-amber-600'
            }`}
          />
          <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
        </div>
        {requireReason && onReasonChange && (
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {reasonLabel}
            </label>
            <textarea
              rows={2}
              value={reasonValue}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Especifique el motivo para registro en auditoría..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-700"
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

interface ReceiptModalProps {
  sale: Sale | null;
  config: CompanyConfig;
  onClose: () => void;
  onUpdateConfig?: (newConfig: CompanyConfig) => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  config,
  onClose,
  onUpdateConfig,
}) => {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerName, setHeaderName] = useState(config.companyName);
  const [headerSubtitle, setHeaderSubtitle] = useState(config.subtitle);
  const [headerTaxId, setHeaderTaxId] = useState(config.taxId);
  const [headerAddress, setHeaderAddress] = useState(config.address);
  const [headerPhone, setHeaderPhone] = useState(config.phone);
  const [headerFooter, setHeaderFooter] = useState(config.receiptFooter);

  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSaveHeader = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateConfig) {
      onUpdateConfig({
        ...config,
        companyName: headerName.trim() || 'VARIEDADES CS',
        subtitle: headerSubtitle.trim() || 'Sistema de Inventario, Ventas y Administración',
        taxId: headerTaxId.trim() || '901.482.319-4',
        address: headerAddress.trim() || 'Av. Comercial Central #45-18, Local 102',
        phone: headerPhone.trim() || '+57 (601) 742-8910 / 315 890 4412',
        receiptFooter: headerFooter.trim(),
      });
    }
    setIsEditingHeader(false);
  };

  return (
    <Modal
      isOpen={!!sale}
      title={`Factura POS — ${sale.invoiceNumber}`}
      subtitle="Comprobante fiscal de venta preparado para impresión térmica o envío digital"
      onClose={onClose}
      maxWidth="md"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full no-print">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <span className="text-xs text-slate-500">
              Estado:{' '}
              <strong className={sale.status === 'Anulada' ? 'text-red-700' : 'text-emerald-700'}>
                {sale.status}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setHeaderName(config.companyName);
                setHeaderSubtitle(config.subtitle);
                setHeaderTaxId(config.taxId);
                setHeaderAddress(config.address);
                setHeaderPhone(config.phone);
                setHeaderFooter(config.receiptFooter);
                setIsEditingHeader(!isEditingHeader);
              }}
              className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {isEditingHeader ? 'Cancelar' : 'Editar Datos'}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `*Factura POS ${sale.invoiceNumber}* - ${config.companyName}\nCliente: ${sale.clientName}\nFecha: ${sale.date} ${sale.time}\nTotal: ${formatCurrency(sale.total, config.currencySymbol)}\n¡Muchas gracias por su compra!`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-3 py-2 min-h-[38px] text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={handlePrint}
              className="w-full sm:w-auto px-4 py-2 min-h-[38px] text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99] transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Ticket</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-3.5 py-2 min-h-[38px] text-xs font-medium border border-slate-300 rounded-lg bg-white text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      }
    >
      {/* Panel para Editar Información del Encabezado de Factura */}
      {isEditingHeader && (
        <form
          onSubmit={handleSaveHeader}
          className="mb-4 p-3.5 bg-blue-50/50 border border-blue-200 rounded text-xs space-y-2.5 no-print"
        >
          <div className="font-bold text-slate-900 border-b border-blue-200 pb-1 flex items-center justify-between">
            <span>Editar Información del Encabezado de Factura</span>
            <span className="text-[11px] text-blue-700 font-normal">Se guardará para todas las facturas</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">Nombre de la Empresa</label>
              <input
                type="text"
                required
                value={headerName}
                onChange={(e) => setHeaderName(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">Subtítulo</label>
              <input
                type="text"
                required
                value={headerSubtitle}
                onChange={(e) => setHeaderSubtitle(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">NIT/RUC</label>
              <input
                type="text"
                required
                value={headerTaxId}
                onChange={(e) => setHeaderTaxId(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">Dirección</label>
              <input
                type="text"
                value={headerAddress}
                onChange={(e) => setHeaderAddress(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">Teléfonos</label>
              <input
                type="text"
                value={headerPhone}
                onChange={(e) => setHeaderPhone(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-0.5">Pie de Página / Garantía</label>
            <input
              type="text"
              value={headerFooter}
              onChange={(e) => setHeaderFooter(e.target.value)}
              className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditingHeader(false)}
              className="px-3 py-1 border border-slate-300 rounded bg-white text-slate-700 text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold text-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              Guardar Cambios
            </button>
          </div>
        </form>
      )}

      <div id="printable-area" className="bg-white text-slate-900 border border-slate-200 p-5 rounded text-xs">
        {/* Encabezado de Factura / Recibo */}
        <div className="text-center border-b border-slate-300 pb-3 mb-3">
          <h3 className="text-base font-bold tracking-tight text-slate-900 uppercase">
            {config.companyName}
          </h3>
          <p className="text-xs text-slate-600">{config.subtitle}</p>
          <p className="text-xs text-slate-600 font-mono mt-0.5">NIT/RUC: {config.taxId}</p>
          <p className="text-xs text-slate-600">{config.address}</p>
          <p className="text-xs text-slate-600">Tel: {config.phone}</p>
        </div>

        {/* Datos de la Venta */}
        <div className="grid grid-cols-2 gap-y-1 gap-x-4 border-b border-slate-300 pb-3 mb-3 text-xs">
          <div>
            <span className="text-slate-500">Número de venta:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{sale.invoiceNumber}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Fecha:</span>{' '}
            <span className="font-mono font-semibold text-slate-900">{sale.date}</span>
          </div>
          <div>
            <span className="text-slate-500">Vendedor:</span>{' '}
            <span className="font-medium text-slate-900">{sale.sellerName}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Hora:</span>{' '}
            <span className="font-mono font-semibold text-slate-900">{sale.time}</span>
          </div>
          <div className="col-span-2 pt-0.5">
            <span className="text-slate-500">Cliente:</span>{' '}
            <span className="font-semibold text-slate-900">{sale.clientName}</span>{' '}
            <span className="text-slate-500 font-mono">({sale.clientDocument})</span>
          </div>
        </div>

        {/* Detalle de Productos */}
        <div className="border-b border-slate-300 pb-3 mb-3">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 text-[11px] uppercase">
                <th className="py-1.5 font-semibold">Producto</th>
                <th className="py-1.5 font-semibold text-right">Cant.</th>
                <th className="py-1.5 font-semibold text-right">Precio</th>
                <th className="py-1.5 font-semibold text-right">Desc.</th>
                <th className="py-1.5 font-semibold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
              {sale.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 pr-2 font-sans text-slate-900">
                    <div className="font-medium leading-snug">{item.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{item.barcode}</div>
                  </td>
                  <td className="py-1.5 text-right align-top">{item.quantity}</td>
                  <td className="py-1.5 text-right align-top">
                    {formatCurrency(item.price, config.currencySymbol)}
                  </td>
                  <td className="py-1.5 text-right align-top">
                    {item.discount > 0
                      ? `-${formatCurrency(item.discount, config.currencySymbol)}`
                      : formatCurrency(0, config.currencySymbol)}
                  </td>
                  <td className="py-1.5 text-right font-semibold text-slate-900 align-top">
                    {formatCurrency(item.subtotal, config.currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales y Pago */}
        <div className="space-y-1 font-mono tabular-nums text-xs border-b border-slate-300 pb-3 mb-3">
          <div className="flex justify-between text-slate-600">
            <span className="font-sans">Subtotal Bruto:</span>
            <span>{formatCurrency(sale.subtotal, config.currencySymbol)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span className="font-sans">Descuento Total:</span>
            <span>-{formatCurrency(sale.discountTotal, config.currencySymbol)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span className="font-sans">Impuesto ({config.taxRatePercent}% incluido):</span>
            <span>{formatCurrency(sale.taxTotal, config.currencySymbol)}</span>
          </div>
          <div className="flex justify-between items-baseline text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-200">
            <span className="font-sans">TOTAL:</span>
            <div className="text-right">
              <div>{formatCurrency(sale.total, config.currencySymbol)}</div>
              {config.currencySymbol === '$' ? (
                <div className="text-[11px] font-normal text-slate-600 font-mono">
                  (C$ {Number(sale.total * (config.exchangeRate || 37)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIO · T.C: {config.exchangeRate || 37})
                </div>
              ) : (
                <div className="text-[11px] font-normal text-slate-600 font-mono">
                  (${Number(sale.total / (config.exchangeRate || 37)).toFixed(2)} USD · T.C: {config.exchangeRate || 37})
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1 font-mono tabular-nums text-xs">
          <div className="flex justify-between">
            <span className="font-sans text-slate-600">Método de pago:</span>
            <span className="font-sans font-semibold text-slate-900">{sale.paymentMethod}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-slate-600">Pago recibido:</span>
            <span>{formatCurrency(sale.amountReceived, config.currencySymbol)}</span>
          </div>
          <div className="flex justify-between font-semibold text-slate-900">
            <span className="font-sans">Cambio:</span>
            <span>{formatCurrency(sale.change, config.currencySymbol)}</span>
          </div>
        </div>

        {sale.status === 'Anulada' && (
          <div className="mt-3 p-2 border border-red-300 bg-red-50 text-red-800 text-center font-semibold">
            DOCUMENTO ANULADO — Motivo: {sale.cancelReason || 'Anulación administrativa'}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-slate-200 text-center text-[11px] text-slate-500">
          {config.receiptFooter}
        </div>
      </div>
    </Modal>
  );
};
