import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  FileBarChart,
  Eye,
  AlertTriangle,
  ArrowUpRight,
} from 'lucide-react';
import {
  Product,
  Sale,
  CreditAccount,
  Category,
  CompanyConfig,
  ModuleId,
} from '../../types/erp';
import {
  PageHeader,
  FilterToolbar,
  formatCurrency,
} from '../ui/EnterpriseComponents';
import { TODAY_DATE } from '../../data/initialData';

interface DashboardViewProps {
  products: Product[];
  sales: Sale[];
  credits: CreditAccount[];
  categories: Category[];
  config: CompanyConfig;
  onNavigate: (module: ModuleId) => void;
  onSelectSaleForReceipt: (sale: Sale) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  sales,
  credits,
  categories,
  config,
  onNavigate,
  onSelectSaleForReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const exchangeRate = config.exchangeRate || 37;

  const activeSales = useMemo(
    () => sales.filter((s) => s.status === 'Completada'),
    [sales]
  );

  const todaySales = useMemo(
    () => activeSales.filter((s) => s.date === TODAY_DATE),
    [activeSales]
  );

  // 8 Required KPI calculations
  const ventasDelDiaCount = todaySales.length;
  const ventasDelDiaMonto = todaySales.reduce((acc, s) => acc + s.total, 0);
  const ingresosTotales = activeSales.reduce((acc, s) => acc + s.total, 0);
  const gananciasTotales = activeSales.reduce((acc, s) => acc + s.profit, 0);
  const gananciasHoy = todaySales.reduce((acc, s) => acc + s.profit, 0);

  const productosVendidosCount = activeSales.reduce(
    (acc, s) => acc + s.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );
  const productosVendidosHoy = todaySales.reduce(
    (acc, s) => acc + s.items.reduce((sum, item) => sum + item.quantity, 0),
    0
  );

  const totalUnidadesInventario = products.reduce((acc, p) => acc + p.stock, 0);
  const valorCostoInventario = products.reduce(
    (acc, p) => acc + p.stock * p.cost,
    0
  );

  const cuentasPorCobrarTotal = credits
    .filter((c) => c.status !== 'Pagado')
    .reduce((acc, c) => acc + c.balance, 0);
  const cuentasActivasCount = credits.filter((c) => c.status !== 'Pagado').length;

  const stockBajoList = products.filter(
    (p) => p.stock > 0 && p.stock <= p.minStock
  );
  const productosAgotadosList = products.filter((p) => p.stock === 0);

  // Chart 1: Sales by day (last 6 days + today)
  const dailyChartData = useMemo(() => {
    const days = [
      { date: '2026-09-23', label: '23 Sep' },
      { date: '2026-09-24', label: '24 Sep' },
      { date: '2026-09-25', label: '25 Sep' },
      { date: '2026-09-26', label: '26 Sep' },
      { date: '2026-09-27', label: '27 Sep' },
      { date: TODAY_DATE, label: 'Hoy' },
    ];

    return days.map((d) => {
      const realSalesForDay = activeSales.filter((s) => s.date === d.date);
      const realRevenue = realSalesForDay.reduce((sum, s) => sum + s.total, 0);
      const realProfit = realSalesForDay.reduce((sum, s) => sum + s.profit, 0);
      return {
        label: d.label,
        revenue: realRevenue,
        profit: realProfit,
      };
    });
  }, [activeSales]);

  const maxDailyRevenue = Math.max(
    ...dailyChartData.map((d) => d.revenue),
    100
  );

  // Chart 2: Inventory & Sales value by Category
  const categoryBreakdown = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryId === cat.id);
      const stockUnits = catProducts.reduce((sum, p) => sum + p.stock, 0);
      const stockValue = catProducts.reduce(
        (sum, p) => sum + p.stock * p.price,
        0
      );
      return {
        id: cat.id,
        name: cat.name,
        code: cat.code,
        productCount: catProducts.length,
        stockUnits,
        stockValue,
      };
    });
  }, [categories, products]);

  const maxCategoryValue = Math.max(
    ...categoryBreakdown.map((c) => c.stockValue),
    100
  );

  // Filtered products for critical inventory table on dashboard
  const filteredInventoryAlerts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory =
        categoryFilter === 'ALL' || p.categoryId === categoryFilter;
      const matchesStock =
        stockFilter === 'ALL'
          ? true
          : stockFilter === 'CRITICAL'
          ? p.stock <= p.minStock
          : stockFilter === 'OUT'
          ? p.stock === 0
          : p.stock > p.minStock;
      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  return (
    <div className="space-y-5">
      {/* 1. Título, 2. Descripción, 3. Acciones principales */}
      <PageHeader
        title="Dashboard General"
        description="Resumen operativo, financiero y estado de inventario de VARIEDADES CS en tiempo real."
        actions={
          <>
            <button
              type="button"
              onClick={() => onNavigate('pos')}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Ir a Punto de Venta
            </button>
            <button
              type="button"
              onClick={() => onNavigate('productos')}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo producto
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reportes')}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileBarChart className="w-3.5 h-3.5" />
              Ver Reportes
            </button>
          </>
        }
      />

      {/* 6. Información: 8 Tarjetas Informativas Obligatorias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. VENTAS DEL DÍA */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              VENTAS DEL DÍA
            </span>
            <span className="text-xs font-mono text-slate-500">{TODAY_DATE}</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              ${ventasDelDiaMonto.toFixed(2)} <span className="text-sm font-normal text-slate-500">USD</span>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
              C$ {(ventasDelDiaMonto * exchangeRate).toFixed(2)} NIO
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Facturas emitidas hoy:</span>
            <span className="font-mono font-semibold text-slate-900">{ventasDelDiaCount}</span>
          </div>
        </div>

        {/* 2. INGRESOS */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              INGRESOS
            </span>
            <span className="text-xs text-emerald-700 font-semibold">Acumulado</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              ${ingresosTotales.toFixed(2)} <span className="text-sm font-normal text-slate-500">USD</span>
            </div>
            <div className="text-xs font-mono font-semibold text-slate-500 mt-0.5">
              C$ {(ingresosTotales * exchangeRate).toFixed(2)} NIO
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Transacciones válidas:</span>
            <span className="font-mono font-semibold text-slate-900">{activeSales.length}</span>
          </div>
        </div>

        {/* 3. GANANCIAS */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              GANANCIAS
            </span>
            <span className="text-xs text-emerald-700 font-semibold">Utilidad Bruta</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
              ${gananciasTotales.toFixed(2)} <span className="text-sm font-normal text-emerald-600">USD</span>
            </div>
            <div className="text-xs font-mono font-semibold text-emerald-600 mt-0.5">
              C$ {(gananciasTotales * exchangeRate).toFixed(2)} NIO
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Ganancia del día:</span>
            <span className="font-mono font-semibold text-emerald-700">
              ${gananciasHoy.toFixed(2)} USD <span className="text-[10px] text-slate-500 font-normal">(C$ {(gananciasHoy * exchangeRate).toFixed(2)})</span>
            </span>
          </div>
        </div>

        {/* 4. PRODUCTOS VENDIDOS */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              PRODUCTOS VENDIDOS
            </span>
            <span className="text-xs text-slate-500">Unidades</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {productosVendidosCount}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between">
            <span>Despachados hoy:</span>
            <span className="font-mono font-semibold text-slate-900">
              {productosVendidosHoy} und.
            </span>
          </div>
        </div>

        {/* 5. INVENTARIO */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              INVENTARIO
            </span>
            <span className="text-xs text-slate-500">{products.length} referencias</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-2">
            {totalUnidadesInventario} <span className="text-sm font-normal text-slate-500">und.</span>
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span>Valorizado al costo:</span>
              <strong className="font-mono text-slate-900">${valorCostoInventario.toFixed(2)} USD</strong>
            </div>
            <div className="text-right text-[11px] font-mono text-slate-500 font-semibold">
              C$ {(valorCostoInventario * exchangeRate).toFixed(2)} NIO
            </div>
          </div>
        </div>

        {/* 6. CUENTAS POR COBRAR */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              CUENTAS POR COBRAR
            </span>
            <button
              type="button"
              onClick={() => onNavigate('creditos')}
              className="text-xs text-blue-700 hover:underline font-medium flex items-center gap-0.5"
            >
              Ver cartera
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono tabular-nums text-blue-700">
              ${cuentasPorCobrarTotal.toFixed(2)} <span className="text-sm font-normal text-blue-600">USD</span>
            </div>
            <div className="text-xs font-mono font-semibold text-blue-600 mt-0.5">
              C$ {(cuentasPorCobrarTotal * exchangeRate).toFixed(2)} NIO
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>Créditos activos:</span>
            <span className="font-mono font-semibold text-slate-900">{cuentasActivasCount}</span>
          </div>
        </div>

        {/* 7. STOCK BAJO */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              STOCK BAJO
            </span>
            <span className="text-xs font-semibold text-amber-700">Advertencia</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-2">
            {stockBajoList.length}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between">
            <span>En o bajo el mínimo:</span>
            <button
              type="button"
              onClick={() => setStockFilter('CRITICAL')}
              className="text-amber-700 hover:underline font-medium"
            >
              Filtrar abajo
            </button>
          </div>
        </div>

        {/* 8. PRODUCTOS AGOTADOS */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              PRODUCTOS AGOTADOS
            </span>
            <span className="text-xs font-semibold text-red-700">Sin existencias</span>
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-red-700 mt-2">
            {productosAgotadosList.length}
          </div>
          <div className="text-xs text-slate-600 mt-1.5 flex items-center justify-between">
            <span>Requieren compra:</span>
            <button
              type="button"
              onClick={() => onNavigate('compras')}
              className="text-red-700 hover:underline font-medium"
            >
              Generar orden
            </button>
          </div>
        </div>
      </div>

      {/* Gráficos Profesionales y Simples (Sin animaciones) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Gráfico 1: Ventas vs Ganancias Diarias */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Evolución de Ingresos y Ganancias (Últimos 6 Días)
              </h2>
              <p className="text-xs text-slate-500">
                Comparativa diaria en {config.currencyCode} ({config.currencySymbol})
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-blue-700 inline-block rounded-xs" />
                <span className="text-slate-700 font-medium">Ingresos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-600 inline-block rounded-xs" />
                <span className="text-slate-700 font-medium">Ganancias</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {dailyChartData.map((day, idx) => {
              const revPercent = Math.min(
                100,
                Math.round((day.revenue / maxDailyRevenue) * 100)
              );
              const profPercent = Math.min(
                100,
                Math.round((day.profit / maxDailyRevenue) * 100)
              );
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 w-28">{day.label}</span>
                    <div className="font-mono tabular-nums text-slate-600 space-x-3">
                      <span>
                        Venta:{' '}
                        <strong className="text-slate-900">
                          {formatCurrency(day.revenue, config.currencySymbol)}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Utilidad:{' '}
                        <strong className="text-emerald-700">
                          {formatCurrency(day.profit, config.currencySymbol)}
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-4 rounded-xs overflow-hidden flex flex-col gap-0.5 p-0.5 border border-slate-200">
                    <div
                      className="bg-blue-700 h-1.5"
                      style={{ width: `${Math.max(revPercent, 2)}%` }}
                    />
                    <div
                      className="bg-emerald-600 h-1.5"
                      style={{ width: `${Math.max(profPercent, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico 2: Distribución de Inventario por Categoría */}
        <div className="bg-white border border-slate-200 rounded p-4">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Valorización de Stock por Categoría Comercial
              </h2>
              <p className="text-xs text-slate-500">
                Distribución de unidades físicas y valor comercial de venta
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {categories.length} Categorías
            </span>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.map((cat) => {
              const barPercent = Math.min(
                100,
                Math.round((cat.stockValue / maxCategoryValue) * 100)
              );
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800 truncate pr-2">
                      {cat.code} · {cat.name}
                    </span>
                    <span className="font-mono tabular-nums text-slate-700 shrink-0">
                      {cat.stockUnits} und. /{' '}
                      <strong className="text-slate-900">
                        {formatCurrency(cat.stockValue, config.currencySymbol)}
                      </strong>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-xs overflow-hidden border border-slate-200">
                    <div
                      className="bg-slate-700 h-full"
                      style={{ width: `${Math.max(barPercent, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Búsqueda y 5. Filtros para Control Rápido de Existencias */}
      <FilterToolbar
        searchPlaceholder="Buscar en inventario por código de barras, SKU o nombre..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            label: 'Categoría',
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: [
              { value: 'ALL', label: 'Todas las categorías' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ],
          },
          {
            label: 'Estado de Stock',
            value: stockFilter,
            onChange: setStockFilter,
            options: [
              { value: 'ALL', label: 'Todos los niveles' },
              { value: 'CRITICAL', label: 'Stock Bajo o Agotado' },
              { value: 'OUT', label: 'Solo Agotados (0)' },
              { value: 'OK', label: 'Stock Óptimo' },
            ],
          },
        ]}
        rightSlot={
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('ALL');
              setStockFilter('ALL');
            }}
            className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 whitespace-nowrap"
          >
            Restablecer filtros
          </button>
        }
      />

      {/* 7. Tablas Empresariales: Control de Stock y Últimas Ventas */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Tabla Izquierda: Estado de Productos y Alertas de Reposición */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monitoreo de Existencias y Punto de Reorden
              </h3>
              <p className="text-xs text-slate-500">
                Listado operativo de referencias filtradas ({filteredInventoryAlerts.length})
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventario')}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
            >
              Ir a Inventario Completo
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Código / SKU</th>
                  <th className="py-2.5 px-3 font-semibold">Producto</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Precio ($ / C$)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Stock</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Mín.</th>
                  <th className="py-2.5 px-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInventoryAlerts.slice(0, 8).map((prod) => {
                  const isOut = prod.stock === 0;
                  const isLow = prod.stock > 0 && prod.stock <= prod.minStock;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {prod.sku}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        <div className="truncate max-w-xs">{prod.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {prod.categoryName} · {prod.location}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900">${prod.price.toFixed(2)} USD</div>
                        <div className="text-[10px] text-slate-500">C$ {(prod.price * exchangeRate).toFixed(2)}</div>
                      </td>
                      <td
                        className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                          isOut
                            ? 'text-red-700'
                            : isLow
                            ? 'text-amber-700'
                            : 'text-slate-900'
                        }`}
                      >
                        {prod.stock}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                        {prod.minStock}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isOut ? (
                          <span className="text-red-700 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Agotado
                          </span>
                        ) : isLow ? (
                          <span className="text-amber-700 font-semibold">
                            Stock Bajo
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">
                            Disponible
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredInventoryAlerts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      No se encontraron productos con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabla Derecha: Últimas Ventas Registradas */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Últimas Ventas Registradas
              </h3>
              <p className="text-xs text-slate-500">
                Facturación reciente en punto de venta
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ventas')}
              className="text-xs font-semibold text-blue-700 hover:underline whitespace-nowrap"
            >
              Ver Historial
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                  <th className="py-2.5 px-3 font-semibold">Factura</th>
                  <th className="py-2.5 px-3 font-semibold">Cliente / Pago</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sales.slice(0, 6).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      <div className="font-semibold text-slate-900">
                        {sale.invoiceNumber}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sale.date} · {sale.time}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-slate-900 truncate max-w-[160px]">
                        {sale.clientName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {sale.paymentMethod} ·{' '}
                        <span
                          className={
                            sale.status === 'Anulada'
                              ? 'text-red-700 font-semibold'
                              : 'text-emerald-700 font-medium'
                          }
                        >
                          {sale.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-bold text-slate-900">${sale.total.toFixed(2)} USD</div>
                      <div className="text-[10px] text-slate-500 font-sans">C$ {(sale.total * exchangeRate).toFixed(2)}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onSelectSaleForReceipt(sale)}
                        className="px-2.5 py-1 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
