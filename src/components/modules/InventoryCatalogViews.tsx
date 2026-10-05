import React, { useState, useMemo, useRef } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  SlidersHorizontal,
  AlertTriangle,
  Upload,
  Download,
  FileUp,
  Link as LinkIcon,
  Image as ImageIcon,
  X,
  CheckCircle2,
  Camera,
  FileSpreadsheet,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  lookupProductByBarcode,
  getSmartImageForProductName,
} from '../../utils/productBarcodeLookup';
import {
  Product,
  Category,
  Supplier,
  InventoryMovement,
  CompanyConfig,
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
import {
  compressAndReadImage,
  exportProductsToCSV,
  parseProductsFile,
} from '../../utils/backupAndImages';
import {
  exportProductsToExcel,
  readProductsFromExcel,
  downloadProductsExcelTemplate,
} from '../../utils/excel';
import { BarcodeScannerModal } from '../ui/BarcodeScannerModal';

/* ============================================================================
   1. MÓDULO: PRODUCTOS
   ============================================================================ */
interface ProductosViewProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  config: CompanyConfig;
  onSaveProduct: (product: Omit<Product, 'id'>, existingId?: string) => void;
  onDeleteProduct: (id: string) => void;
  onBulkImportProducts?: (imported: Omit<Product, 'id'>[]) => void;
}

export const ProductosView: React.FC<ProductosViewProps> = ({
  products,
  categories,
  suppliers,
  config,
  onSaveProduct,
  onDeleteProduct,
  onBulkImportProducts,
}) => {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form fields
  const [barcode, setBarcode] = useState('');
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [cost, setCost] = useState('');
  const [costUSD, setCostUSD] = useState('');
  const [price, setPrice] = useState('');
  const [priceUSD, setPriceUSD] = useState('');
  const [priceMode, setPriceMode] = useState<'USD' | 'NIO' | 'BOTH'>('USD');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unit, setUnit] = useState('Unidad');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [active, setActive] = useState(true);
  const [availableForAffiliates, setAvailableForAffiliates] = useState(true);
  const [formError, setFormError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Cámara escáner para formulario y para búsqueda
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isSearchCameraOpen, setIsSearchCameraOpen] = useState(false);
  const [isSearchingImage, setIsSearchingImage] = useState(false);
  const [imageSearchNotice, setImageSearchNotice] = useState<string | null>(null);

  const handleAutoLookupProduct = async (codeToSearch: string) => {
    const code = codeToSearch.trim();
    if (!code) return;
    setIsSearchingImage(true);
    setImageSearchNotice(null);
    try {
      const res = await lookupProductByBarcode(code);
      if (res.found && res.imageUrl) {
        setImageUrl(res.imageUrl);
        if (!name.trim() && res.name) {
          setName(res.name);
        }
        setImageSearchNotice(`✓ Imagen vinculada automáticamente para "${res.name || code}"`);
      } else {
        if (name.trim()) {
          const smartImg = getSmartImageForProductName(name);
          if (smartImg) {
            setImageUrl(smartImg);
            setImageSearchNotice(`✓ Imagen sugerida según "${name}".`);
          } else {
            setImageSearchNotice('No se encontró imagen pública para este código. Puede subir una foto.');
          }
        } else {
          setImageSearchNotice('No se encontró imagen pública para este código. Puede cargar una foto.');
        }
      }
    } catch {
      setImageSearchNotice('No se pudo conectar al buscador de imágenes.');
    } finally {
      setIsSearchingImage(false);
    }
  };

  // Tasa de cambio del dólar (por defecto 37 Córdobas)
  const exchangeRate = config.exchangeRate || 37;

  // Conversión bidireccional reactiva Costo (Córdobas <-> Dólares)
  const handleCostNIOChange = (valStr: string) => {
    setCost(valStr);
    const n = parseFloat(valStr);
    if (!isNaN(n) && n >= 0) {
      setCostUSD(Number((n / exchangeRate).toFixed(2)).toString());
    } else {
      setCostUSD('');
    }
  };

  const handleCostUSDChange = (valStr: string) => {
    setCostUSD(valStr);
    const n = parseFloat(valStr);
    if (!isNaN(n) && n >= 0) {
      setCost(Number((n * exchangeRate).toFixed(2)).toString());
    } else {
      setCost('');
    }
  };

  // Conversión bidireccional reactiva Precio Venta (Córdobas <-> Dólares)
  const handlePriceNIOChange = (valStr: string) => {
    setPrice(valStr);
    const n = parseFloat(valStr);
    if (!isNaN(n) && n >= 0) {
      setPriceUSD(Number((n / exchangeRate).toFixed(2)).toString());
    } else {
      setPriceUSD('');
    }
  };

  const handlePriceUSDChange = (valStr: string) => {
    setPriceUSD(valStr);
    const n = parseFloat(valStr);
    if (!isNaN(n) && n >= 0) {
      setPrice(Number((n * exchangeRate).toFixed(2)).toString());
    } else {
      setPrice('');
    }
  };

  // Import Modal state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [importPreviewProducts, setImportPreviewProducts] = useState<Partial<Product>[]>([]);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const openNewModal = () => {
    setEditingProduct(null);
    setBarcode(`770${Math.floor(100000000 + Math.random() * 900000000)}`);
    setSku(`REF-${Math.floor(100 + Math.random() * 900)}`);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setSupplierId(suppliers[0]?.id || '');
    setPriceMode('USD');
    setCost('');
    setCostUSD('');
    setPrice('');
    setPriceUSD('');
    setStock('0');
    setMinStock(String(config.defaultLowStockThreshold));
    setUnit('Unidad');
    setLocation('Estante General');
    setImageUrl('');
    setActive(true);
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setBarcode(prod.barcode);
    setSku(prod.sku);
    setName(prod.name);
    setCategoryId(prod.categoryId);
    setSupplierId(prod.supplierId);
    setPriceMode('USD');
    setCostUSD(String(prod.cost));
    setCost(Number((prod.cost * exchangeRate).toFixed(2)).toString());
    setPriceUSD(String(prod.price));
    setPrice(Number((prod.price * exchangeRate).toFixed(2)).toString());
    setStock(String(prod.stock));
    setMinStock(String(prod.minStock));
    setUnit(prod.unit);
    setLocation(prod.location);
    setImageUrl(prod.imageUrl || '');
    setActive(prod.active);
    setAvailableForAffiliates(prod.availableForAffiliates !== false);
    setFormError('');
    setIsFormOpen(true);
  };

  // Manejo de carga de imagen desde el dispositivo
  const handleDeviceImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingImage(true);
      setFormError('');
      const compressedDataUrl = await compressAndReadImage(file, 480, 0.8);
      setImageUrl(compressedDataUrl);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al procesar la imagen.');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !sku.trim() || !name.trim()) {
      setFormError('Código de barras, SKU y Nombre del producto son obligatorios.');
      return;
    }

    // Resolver Precio de Venta (en Dólares USD como moneda principal)
    const rawPriceUSD = parseFloat(priceUSD);
    const rawPriceNIO = parseFloat(price);
    let finalPriceUSD = 0;

    if (Number.isFinite(rawPriceUSD) && rawPriceUSD > 0) {
      finalPriceUSD = rawPriceUSD;
    } else if (Number.isFinite(rawPriceNIO) && rawPriceNIO > 0) {
      finalPriceUSD = Number((rawPriceNIO / exchangeRate).toFixed(2));
    }

    if (!Number.isFinite(finalPriceUSD) || finalPriceUSD <= 0) {
      setFormError('Ingrese un precio de venta válido mayor a 0 (ej. $5.00 USD).');
      return;
    }

    // Resolver Costo (en Dólares USD como moneda principal)
    const rawCostUSD = parseFloat(costUSD);
    const rawCostNIO = parseFloat(cost);
    let finalCostUSD = 0;

    if (Number.isFinite(rawCostUSD) && rawCostUSD >= 0) {
      finalCostUSD = rawCostUSD;
    } else if (Number.isFinite(rawCostNIO) && rawCostNIO >= 0) {
      finalCostUSD = Number((rawCostNIO / exchangeRate).toFixed(2));
    }

    const numStock = parseInt(stock, 10);
    const numMinStock = parseInt(minStock, 10);

    if (finalCostUSD > 0 && finalPriceUSD < finalCostUSD) {
      setFormError('Advertencia: El precio de venta no puede ser inferior al costo unitario.');
      return;
    }

    const catObj = categories.find((c) => c.id === categoryId);
    const supObj = suppliers.find((s) => s.id === supplierId);

    onSaveProduct(
      {
        barcode: barcode.trim(),
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        categoryId,
        categoryName: catObj?.name || 'General',
        supplierId,
        supplierName: supObj?.name || 'Proveedor General',
        cost: finalCostUSD,
        price: finalPriceUSD,
        stock: Number.isFinite(numStock) ? Math.max(0, numStock) : 0,
        minStock: Number.isFinite(numMinStock) ? Math.max(0, numMinStock) : 5,
        unit: unit.trim() || 'Unidad',
        location: location.trim() || 'General',
        imageUrl: imageUrl.trim() || '',
        active,
        availableForAffiliates,
      },
      editingProduct?.id
    );

    setIsFormOpen(false);
  };

  // Manejo de archivo para importar catálogo (Excel .xlsx, .xls, .csv o JSON)
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportError('');
      setImportFileName(file.name);
      const lower = file.name.toLowerCase();
      const isExcel = lower.endsWith('.xlsx') || lower.endsWith('.xls');

      if (isExcel) {
        const res = await readProductsFromExcel(file, exchangeRate);
        if (!res.success || res.data.length === 0) {
          setImportError(
            res.errors[0] || 'No se encontraron registros de productos válidos en el archivo Excel.'
          );
          setImportPreviewProducts([]);
        } else {
          setImportPreviewProducts(res.data);
        }
      } else {
        const content = await file.text();
        const isJson = lower.endsWith('.json');
        const parsed = parseProductsFile(content, isJson);
        if (parsed.length === 0) {
          setImportError('No se encontraron registros de productos válidos en el archivo.');
          setImportPreviewProducts([]);
        } else {
          setImportPreviewProducts(parsed);
        }
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Error al procesar el archivo.');
      setImportPreviewProducts([]);
    }
  };

  const handleConfirmImport = () => {
    if (importPreviewProducts.length === 0 || !onBulkImportProducts) return;

    const formatted: Omit<Product, 'id'>[] = importPreviewProducts.map((p, idx) => {
      const cat = categories.find((c) => c.name.toLowerCase() === (p.categoryName || '').toLowerCase()) || categories[0];
      const sup = suppliers[0];
      return {
        barcode: p.barcode || `770${Date.now()}${idx}`,
        sku: p.sku || `REF-${Date.now()}-${idx}`,
        name: p.name || `Producto ${idx + 1}`,
        categoryId: cat ? cat.id : 'cat-1',
        categoryName: cat ? cat.name : 'General',
        supplierId: sup ? sup.id : 'sup-1',
        supplierName: sup ? sup.name : 'Proveedor General',
        cost: typeof p.cost === 'number' ? p.cost : 1000,
        price: typeof p.price === 'number' ? p.price : 2000,
        stock: typeof p.stock === 'number' ? p.stock : 10,
        minStock: typeof p.minStock === 'number' ? p.minStock : 5,
        unit: p.unit || 'Unidad',
        location: p.location || 'Bodega General',
        imageUrl: p.imageUrl || '',
        active: p.active !== false,
      };
    });

    onBulkImportProducts(formatted);
    setIsImportModalOpen(false);
    setImportPreviewProducts([]);
    setImportFileName('');
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      const matchCat = catFilter === 'ALL' || p.categoryId === catFilter;
      const matchStock =
        stockFilter === 'ALL'
          ? true
          : stockFilter === 'LOW'
          ? p.stock > 0 && p.stock <= p.minStock
          : stockFilter === 'OUT'
          ? p.stock === 0
          : p.stock > p.minStock;
      return matchQ && matchCat && matchStock;
    });
  }, [products, search, catFilter, stockFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const totalCostValue = products.reduce((s, p) => s + p.stock * p.cost, 0);
  const totalSaleValue = products.reduce((s, p) => s + p.stock * p.price, 0);
  const lowOrOutCount = products.filter((p) => p.stock <= p.minStock).length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Catálogo de Productos"
        description="Administración maestra de referencias, precios, costos, ubicación en bodega y niveles mínimos."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => exportProductsToExcel(products, exchangeRate)}
              title="Descargar catálogo completo en formato Excel (.xlsx) con precios en Córdobas y Dólares"
              className="px-3 py-1.5 text-xs font-semibold rounded border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel (.xlsx)</span>
            </button>

            <button
              type="button"
              onClick={() => exportProductsToCSV(products)}
              title="Descargar catálogo en formato CSV compatible con Microsoft Excel"
              className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar (CSV)</span>
            </button>

            {onBulkImportProducts && (
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                title="Cargar catálogo de productos masivo desde archivo Excel (.xlsx), CSV o JSON"
                className="px-3 py-1.5 text-xs font-semibold rounded border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
              >
                <FileUp className="w-3.5 h-3.5 text-blue-600" />
                <span>Importar Excel / CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={openNewModal}
              className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo producto
            </button>
          </div>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Total Referencias',
            value: products.length,
            subtext: `${products.reduce((s, p) => s + p.stock, 0)} unidades totales`,
          },
          {
            label: 'Costo Total Inventario',
            value: `$${totalCostValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
            subtext: `Equiv. C$ ${(totalCostValue * exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIO (Tasa: ${exchangeRate})`,
          },
          {
            label: 'Valor Comercial Venta',
            value: `$${totalSaleValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`,
            subtext: `Equiv. C$ ${(totalSaleValue * exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} NIO proyectado`,
            tone: 'primary',
          },
          {
            label: 'Alertas de Reposición',
            value: lowOrOutCount,
            subtext: 'Productos con stock bajo o agotado',
            tone: lowOrOutCount > 0 ? 'warning' : 'success',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar por nombre de producto, SKU o código de barras..."
        searchValue={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        rightSlot={
          <button
            type="button"
            onClick={() => setIsSearchCameraOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 whitespace-nowrap shadow-2xs"
            title="Escanear código de barras con la cámara del celular para buscar producto"
          >
            <Camera className="w-3.5 h-3.5 text-blue-600" />
            <span>Escanear con Cámara</span>
          </button>
        }
        filters={[
          {
            label: 'Categoría',
            value: catFilter,
            onChange: (val) => {
              setCatFilter(val);
              setPage(1);
            },
            options: [
              { value: 'ALL', label: 'Todas las categorías' },
              ...categories.map((c) => ({ value: c.id, label: c.name })),
            ],
          },
          {
            label: 'Disponibilidad',
            value: stockFilter,
            onChange: (val) => {
              setStockFilter(val);
              setPage(1);
            },
            options: [
              { value: 'ALL', label: 'Todos los estados' },
              { value: 'OK', label: 'Stock Normal' },
              { value: 'LOW', label: 'Stock Bajo' },
              { value: 'OUT', label: 'Agotados (0)' },
            ],
          },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Código / SKU</th>
                <th className="py-2.5 px-3 font-semibold">Producto</th>
                <th className="py-2.5 px-3 font-semibold">Categoría</th>
                <th className="py-2.5 px-3 font-semibold text-right">Costo ($ / C$)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Precio Venta ($ / C$)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Margen</th>
                <th className="py-2.5 px-3 font-semibold text-right">Stock</th>
                <th className="py-2.5 px-3 font-semibold">Estado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((prod) => {
                const marginPct =
                  prod.price > 0
                    ? Math.round(((prod.price - prod.cost) / prod.price) * 100)
                    : 0;
                const isOut = prod.stock === 0;
                const isLow = prod.stock > 0 && prod.stock <= prod.minStock;
                const costInUSD = prod.cost;
                const priceInUSD = prod.price;
                const costInNIO = Number((prod.cost * exchangeRate).toFixed(2));
                const priceInNIO = Number((prod.price * exchangeRate).toFixed(2));

                return (
                  <tr key={prod.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{prod.sku}</div>
                      <div className="text-[11px] text-slate-500">{prod.barcode}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2.5">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-9 h-9 object-cover rounded border border-slate-200 shrink-0 bg-slate-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">{prod.name}</div>
                          <div className="text-[11px] text-slate-500">
                            Ubicación: {prod.location} · Prov: {prod.supplierName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {prod.categoryName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">${costInUSD.toFixed(2)} USD</div>
                      <div className="text-[10px] text-slate-500 font-sans">C$ {costInNIO.toFixed(2)} NIO</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <div className="font-bold text-blue-800 text-sm">${priceInUSD.toFixed(2)} USD</div>
                      <div className="text-[10px] text-slate-500 font-sans font-medium">C$ {priceInNIO.toFixed(2)} NIO</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-700 whitespace-nowrap">
                      {marginPct}%
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                      <span
                        className={`font-bold ${
                          isOut
                            ? 'text-red-700'
                            : isLow
                            ? 'text-amber-700'
                            : 'text-slate-900'
                        }`}
                      >
                        {prod.stock}
                      </span>{' '}
                      <span className="text-slate-400 text-[11px]">
                        / mín {prod.minStock}
                      </span>
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
                          Normal
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setViewingProduct(prod)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100"
                          title="Ver ficha técnica"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(prod)}
                          className="px-2 py-1 text-xs border border-red-200 rounded bg-white text-red-700 hover:bg-red-50"
                          title="Eliminar producto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No existen productos que coincidan con la búsqueda.
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

      {/* Modal Formulario Crear / Editar Producto */}
      <Modal
        isOpen={isFormOpen}
        title={editingProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
        subtitle="Complete los campos obligatorios (*) para el control de inventario y facturación."
        onClose={() => setIsFormOpen(false)}
        maxWidth="lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
          {formError && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded font-medium">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Código de Barras (EAN / Interno) *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCameraScannerOpen(true)}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition-colors"
                  title="Escanear código de barras con la cámara del celular"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Escanear con Cámara</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="770..."
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => handleAutoLookupProduct(barcode)}
                  disabled={isSearchingImage || !barcode.trim()}
                  className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-40 px-2.5 py-1 rounded border border-blue-200 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                  title="Buscar foto y nombre del producto automáticamente por código de barras"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>{isSearchingImage ? 'Buscando imagen...' : 'Buscar Foto Automática'}</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Código SKU / Referencia *
              </label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded focus:outline-none focus:border-blue-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre / Descripción del Producto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Cuaderno Cosido Profesional 100 Hojas"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Categoría *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Proveedor Principal
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="">(Sin proveedor / Venta directa)</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de Modo de Moneda: Solo Dólares vs Córdobas vs Ambas */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                Fijación de Precios:
              </span>
              <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPriceMode('USD')}
                  className={`px-3 py-1 text-xs font-bold rounded transition-all ${
                    priceMode === 'USD'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ★ Solo Dólares ($ USD)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode('NIO')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    priceMode === 'NIO'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Córdobas (C$)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode('BOTH')}
                  className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                    priceMode === 'BOTH'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ambas Monedas
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-t border-slate-200/60 pt-2">
              <span>Tipo de cambio oficial: <strong>1 USD = {exchangeRate} Córdobas (C$)</strong></span>
              {priceMode === 'USD' && (
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ✓ Puede ingresar solo el precio en dólares; Córdobas se calcula automáticamente.
                </span>
              )}
            </div>
          </div>

          {/* MODO 1: SOLO DÓLARES ($ USD) - El usuario solo pone el precio en dólares */}
          {priceMode === 'USD' && (
            <div className="space-y-3 p-3.5 bg-blue-50/60 border border-blue-200 rounded-lg">
              <div>
                <label className="block font-bold text-blue-950 text-sm mb-1">
                  Precio de Venta en Dólares ($ USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-blue-700 font-bold font-mono text-base">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={priceUSD}
                    onChange={(e) => handlePriceUSDChange(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full pl-8 pr-3 py-2 text-base font-mono font-bold border-2 border-blue-400 rounded-lg bg-white text-blue-950 focus:outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {parseFloat(priceUSD || '0') > 0 ? (
                  <div className="mt-1.5 text-xs text-blue-900 font-medium flex items-center gap-1.5">
                    <span>Equivalente automático:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-300 text-slate-900">
                      C$ {(parseFloat(priceUSD || '0') * exchangeRate).toFixed(2)} NIO
                    </span>
                    <span className="text-slate-400 text-[11px]">(Tasa: {exchangeRate} C$/$)</span>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Ingrese el valor de venta en dólares. El sistema aplicará la tasa de cambio ({exchangeRate} C$) automáticamente.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">
                  Costo de Compra en Dólares ($ USD) <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-slate-500 font-bold font-mono text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costUSD}
                    onChange={(e) => handleCostUSDChange(e.target.value)}
                    placeholder="0.00 (Opcional)"
                    className="w-full pl-7 pr-3 py-1.5 text-sm font-mono border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-700"
                  />
                </div>
                {parseFloat(costUSD || '0') > 0 && (
                  <div className="mt-1 text-[11px] text-slate-600">
                    Costo equivalente: C$ {(parseFloat(costUSD || '0') * exchangeRate).toFixed(2)} NIO
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODO 2: SOLO CÓRDOBAS (C$) */}
          {priceMode === 'NIO' && (
            <div className="space-y-3 p-3.5 bg-emerald-50/60 border border-emerald-300 rounded-lg">
              <div>
                <label className="block font-bold text-slate-900 text-sm mb-1">
                  Precio de Venta en Córdobas (C$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-emerald-700 font-bold font-mono text-base">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={price}
                    onChange={(e) => handlePriceNIOChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-2 text-base font-mono font-bold border-2 border-emerald-400 rounded-lg bg-white text-slate-900 focus:outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                {parseFloat(price || '0') > 0 && (
                  <div className="mt-1.5 text-xs text-emerald-900 font-medium flex items-center gap-1.5">
                    <span>Equivalente en Dólares:</span>
                    <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-emerald-300 text-slate-900">
                      ${(parseFloat(price || '0') / exchangeRate).toFixed(2)} USD
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">
                  Costo de Compra en Córdobas (C$) <span className="text-slate-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1.5 text-slate-500 font-bold font-mono text-sm">C$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => handleCostNIOChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3 py-1.5 text-sm font-mono border border-slate-300 rounded bg-white text-slate-800 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>
            </div>
          )}

          {/* MODO 3: AMBAS MONEDAS */}
          {priceMode === 'BOTH' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/60 border border-blue-200 rounded-lg">
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Precio Venta ($ USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-blue-700 font-bold font-mono text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={priceUSD}
                      onChange={(e) => handlePriceUSDChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-1.5 text-sm font-mono font-bold border border-blue-400 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-900 mb-1">
                    Precio Venta (C$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-emerald-700 font-bold font-mono text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={price}
                      onChange={(e) => handlePriceNIOChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-1.5 text-sm font-mono font-bold border border-emerald-400 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Costo ($ USD) (Opcional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-500 font-bold font-mono text-xs">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={costUSD}
                      onChange={(e) => handleCostUSDChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-1.5 text-sm font-mono border border-slate-300 rounded bg-white text-slate-700 focus:outline-none focus:border-blue-700"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Costo (C$) (Opcional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1.5 text-slate-500 font-bold font-mono text-xs">C$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost}
                      onChange={(e) => handleCostNIOChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-1.5 text-sm font-mono border border-slate-300 rounded bg-white focus:outline-none focus:border-blue-700"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Stock Actual *
              </label>
              <input
                type="number"
                min="0"
                required
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Stock Mínimo (Alerta) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Unidad de Medida
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Unidad, Caja, Resma..."
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ubicación en Almacén
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ej. Estante A-02"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estado en POS
              </label>
              <select
                value={active ? 'ACTIVE' : 'INACTIVE'}
                onChange={(e) => setActive(e.target.value === 'ACTIVE')}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="ACTIVE">Activo (Habilitado)</option>
                <option value="INACTIVE">Inactivo (Suspendido)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catálogo Afiliados
              </label>
              <select
                value={availableForAffiliates ? 'YES' : 'NO'}
                onChange={(e) => setAvailableForAffiliates(e.target.value === 'YES')}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="YES">Disponible para Afiliados</option>
                <option value="NO">Ocultar a Afiliados</option>
              </select>
            </div>
          </div>

          {/* Sección de Imagen de Producto: Link directo o Cargar desde dispositivo */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800 text-xs">
                Fotografía / Imagen del Producto
              </label>
              <span className="text-[11px] text-slate-500">
                Pega un link web o súbela desde tu teléfono/computador
              </span>
            </div>

            {imageSearchNotice && (
              <div className="mb-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between gap-2 shadow-2xs animate-fade-in">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{imageSearchNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setImageSearchNotice(null)}
                  className="text-slate-400 hover:text-slate-700 text-xs px-1"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Vista previa miniatura */}
              <div className="sm:col-span-3 flex flex-col items-center justify-center">
                {imageUrl ? (
                  <div className="relative group w-24 h-24 rounded-lg overflow-hidden border border-slate-300 bg-white shadow-xs">
                    <img
                      src={imageUrl}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      title="Eliminar imagen"
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-sm"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-300 bg-white flex flex-col items-center justify-center text-slate-400 p-2 text-center">
                    <ImageIcon className="w-6 h-6 mb-1 text-slate-300" />
                    <span className="text-[10px] leading-tight">Sin imagen</span>
                  </div>
                )}
              </div>

              {/* Opciones: Link directo o Subir archivo */}
              <div className="sm:col-span-9 space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                    Opción A: Pegar Link / URL de imagen web (https://...)
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={imageUrl.startsWith('data:') ? '' : imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://ejemplo.com/fotos/cuaderno.jpg"
                      className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-blue-700"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-[11px] text-slate-500 font-semibold">o bien:</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleDeviceImageUpload}
                    className="hidden"
                    id="product-device-img-input"
                  />
                  <label
                    htmlFor="product-device-img-input"
                    className={`cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 shadow-xs transition-colors ${
                      isProcessingImage ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isProcessingImage ? 'Comprimiendo...' : 'Cargar desde este Dispositivo'}</span>
                  </label>

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-xs text-red-600 hover:underline font-medium"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white"
            >
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Ver Ficha Técnica */}
      <Modal
        isOpen={!!viewingProduct}
        title="Ficha Técnica de Producto"
        subtitle={viewingProduct?.sku}
        onClose={() => setViewingProduct(null)}
        maxWidth="md"
        footer={
          <button
            type="button"
            onClick={() => setViewingProduct(null)}
            className="px-4 py-1.5 text-xs font-semibold rounded bg-slate-800 text-white"
          >
            Cerrar
          </button>
        }
      >
        {viewingProduct && (
          <div className="space-y-3.5 text-xs">
            {viewingProduct.imageUrl && (
              <div className="w-full flex justify-center bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-hidden">
                <img
                  src={viewingProduct.imageUrl}
                  alt={viewingProduct.name}
                  className="max-h-52 object-contain rounded"
                />
              </div>
            )}
            <div className="border-b border-slate-200 pb-2">
              <div className="text-base font-bold text-slate-900">
                {viewingProduct.name}
              </div>
              <div className="text-slate-500 mt-0.5">
                Categoría: {viewingProduct.categoryName} · Proveedor:{' '}
                {viewingProduct.supplierName}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 font-mono">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 font-sans block">Código de Barras</span>
                <strong className="text-slate-900">{viewingProduct.barcode}</strong>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 font-sans block">Ubicación Física</span>
                <strong className="text-slate-900 font-sans">
                  {viewingProduct.location}
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 font-sans block">Costo Unitario</span>
                <strong className="text-slate-900 block text-sm">
                  ${viewingProduct.cost.toFixed(2)} USD
                </strong>
                <span className="text-[11px] text-slate-500 font-sans font-semibold">
                  C$ {(viewingProduct.cost * exchangeRate).toFixed(2)} NIO
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 font-sans block">Precio de Venta</span>
                <strong className="text-blue-700 block text-sm">
                  ${viewingProduct.price.toFixed(2)} USD
                </strong>
                <span className="text-[11px] text-slate-500 font-sans font-semibold">
                  C$ {(viewingProduct.price * exchangeRate).toFixed(2)} NIO
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 font-sans block">Existencia Actual</span>
                <strong className="text-slate-900 block text-sm">
                  {viewingProduct.stock} {viewingProduct.unit}
                </strong>
              </div>
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded">
                <span className="text-slate-500 font-sans block">Utilidad Unitaria</span>
                <strong className="text-emerald-700 block text-sm">
                  ${(viewingProduct.price - viewingProduct.cost).toFixed(2)} USD
                </strong>
                <span className="text-[11px] text-emerald-600 font-sans font-semibold">
                  C$ {((viewingProduct.price - viewingProduct.cost) * exchangeRate).toFixed(2)} NIO
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Importar Catálogo de Productos */}
      <Modal
        isOpen={isImportModalOpen}
        title="Importar Catálogo de Productos"
        subtitle="Cargue masivamente productos desde Excel (.XLSX, .XLS), CSV o JSON con soporte de Córdobas y Dólares"
        onClose={() => {
          setIsImportModalOpen(false);
          setImportPreviewProducts([]);
          setImportFileName('');
          setImportError('');
        }}
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          {importError && (
            <div className="p-3 bg-red-50 border border-red-300 text-red-700 rounded font-medium">
              {importError}
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div>
              <div className="font-semibold text-emerald-900">¿Desea usar la plantilla oficial de Excel?</div>
              <p className="text-[11px] text-emerald-700">
                Descargue la plantilla .XLSX prediseñada con ejemplos de precios en Córdobas y Dólares.
              </p>
            </div>
            <button
              type="button"
              onClick={() => downloadProductsExcelTemplate(exchangeRate)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded text-xs flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bajar Plantilla Excel</span>
            </button>
          </div>

          <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 text-center space-y-2">
            <FileUp className="w-8 h-8 text-blue-600 mx-auto" />
            <div className="font-semibold text-slate-800">
              Seleccione archivo Excel (.xlsx, .xls) o CSV desde su dispositivo
            </div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Soporta nombres de columnas estándar (Código, SKU, Nombre, Costo, Precio Venta en Córdobas o Dólares, Stock).
            </p>
            <input
              type="file"
              ref={importFileInputRef}
              accept=".xlsx,.xls,.csv,.json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/json"
              onChange={handleImportFileChange}
              className="hidden"
              id="import-catalog-file-input"
            />
            <label
              htmlFor="import-catalog-file-input"
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Elegir archivo Excel (.XLSX) / CSV</span>
            </label>
            {importFileName && (
              <div className="text-emerald-700 font-semibold pt-1 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Archivo cargado: {importFileName}</span>
              </div>
            )}
          </div>

          {importPreviewProducts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-700">
                <span className="font-bold">
                  Vista Previa ({importPreviewProducts.length} productos detectados):
                </span>
                <span className="text-[11px] text-slate-500">
                  Mostrando primeros {Math.min(5, importPreviewProducts.length)} registros
                </span>
              </div>
              <div className="border border-slate-200 rounded overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-2 font-semibold">SKU / Código</th>
                      <th className="p-2 font-semibold">Producto</th>
                      <th className="p-2 font-semibold text-right">Precio (C$)</th>
                      <th className="p-2 font-semibold text-right">Precio ($ USD)</th>
                      <th className="p-2 font-semibold text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {importPreviewProducts.slice(0, 5).map((p, i) => (
                      <tr key={i}>
                        <td className="p-2 font-mono">{p.sku || p.barcode}</td>
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(p.price || 0, config.currencySymbol)}
                        </td>
                        <td className="p-2 text-right font-mono text-blue-700">
                          ${Number((p.price || 0) / exchangeRate).toFixed(2)}
                        </td>
                        <td className="p-2 text-right font-mono">{p.stock || 0}</td>
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
                setImportPreviewProducts([]);
                setImportFileName('');
              }}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={importPreviewProducts.length === 0}
              onClick={handleConfirmImport}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmar e Importar {importPreviewProducts.length} Productos</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <ConfirmModal
        isOpen={!!deletingProduct}
        title="Eliminar Producto del Catálogo"
        message={`¿Confirma la eliminación permanente del producto "${deletingProduct?.name}" (${deletingProduct?.sku})? Esta acción quedará registrada en auditoría.`}
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={() => {
          if (deletingProduct) {
            onDeleteProduct(deletingProduct.id);
            setDeletingProduct(null);
          }
        }}
        onCancel={() => setDeletingProduct(null)}
      />

      {/* Modal Cámara para Formulario (Ingresar Código de Barras) */}
      <BarcodeScannerModal
        isOpen={isCameraScannerOpen}
        title="Escanear Código de Barras para el Producto"
        subtitle="Apunte la cámara del teléfono hacia el código de barras impreso en el empaque."
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={(code) => {
          setBarcode(code);
          setIsCameraScannerOpen(false);
          handleAutoLookupProduct(code);
        }}
      />

      {/* Modal Cámara para Búsqueda rápida en Catálogo */}
      <BarcodeScannerModal
        isOpen={isSearchCameraOpen}
        title="Buscar Producto por Código de Barras"
        subtitle="Escanee cualquier código para filtrar y localizar el producto en su catálogo."
        onClose={() => setIsSearchCameraOpen(false)}
        onScan={(code) => {
          setSearch(code);
          setPage(1);
          setIsSearchCameraOpen(false);
        }}
      />
    </div>
  );
};

/* ============================================================================
   2. MÓDULO: CATEGORÍAS
   ============================================================================ */
interface CategoriasViewProps {
  categories: Category[];
  products: Product[];
  config: CompanyConfig;
  onSaveCategory: (cat: Omit<Category, 'id'>, existingId?: string) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoriasView: React.FC<CategoriasViewProps> = ({
  categories,
  products,
  config,
  onSaveCategory,
  onDeleteCategory,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');

  const openNew = () => {
    setEditingCat(null);
    setCode(`CAT-0${categories.length + 1}`);
    setName('');
    setDescription('');
    setActive(true);
    setError('');
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setCode(cat.code);
    setName(cat.name);
    setDescription(cat.description);
    setActive(cat.active);
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) {
      setError('El código y el nombre de la categoría son obligatorios.');
      return;
    }
    onSaveCategory(
      {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || 'Sin descripción adicional.',
        active,
      },
      editingCat?.id
    );
    setIsModalOpen(false);
  };

  const filtered = categories.filter((c) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q);
    const matchStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? c.active
        : !c.active;
    return matchQ && matchStatus;
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categorías de Productos"
        description="Clasificación estructural del inventario de VARIEDADES CS para reportes y filtrado rápido."
        actions={
          <button
            type="button"
            onClick={openNew}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva categoría
          </button>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Total Categorías',
            value: categories.length,
            subtext: 'Líneas comerciales registradas',
          },
          {
            label: 'Categorías Activas',
            value: categories.filter((c) => c.active).length,
            subtext: 'Habilitadas en catálogo',
            tone: 'success',
          },
          {
            label: 'Productos Asociados',
            value: products.length,
            subtext: 'Total referencias vinculadas',
          },
          {
            label: 'Promedio por Categoría',
            value:
              categories.length > 0
                ? Math.round(products.length / categories.length)
                : 0,
            subtext: 'Referencias por línea',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar categoría por código, nombre o descripción..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            label: 'Estado',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ALL', label: 'Todas' },
              { value: 'ACTIVE', label: 'Activas' },
              { value: 'INACTIVE', label: 'Inactivas' },
            ],
          },
        ]}
      />

      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[11px]">
                <th className="py-2.5 px-3 font-semibold">Código</th>
                <th className="py-2.5 px-3 font-semibold">Nombre de Categoría</th>
                <th className="py-2.5 px-3 font-semibold">Descripción</th>
                <th className="py-2.5 px-3 font-semibold text-right">Productos</th>
                <th className="py-2.5 px-3 font-semibold text-right">Unidades Stock</th>
                <th className="py-2.5 px-3 font-semibold text-right">Valor Stock</th>
                <th className="py-2.5 px-3 font-semibold">Estado</th>
                <th className="py-2.5 px-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((cat) => {
                const catProds = products.filter((p) => p.categoryId === cat.id);
                const units = catProds.reduce((s, p) => s + p.stock, 0);
                const val = catProds.reduce((s, p) => s + p.stock * p.price, 0);

                return (
                  <tr key={cat.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {cat.code}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                      {cat.name}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-md">
                      {cat.description}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {catProds.length}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                      {units}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(val, config.currencySymbol)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={
                          cat.active
                            ? 'text-emerald-700 font-medium'
                            : 'text-slate-400 font-medium'
                        }
                      >
                        {cat.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(cat)}
                          className="px-2.5 py-1 text-xs border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCat(cat)}
                          className="px-2 py-1 text-xs border border-red-200 rounded bg-white text-red-700 hover:bg-red-50"
                          title="Eliminar categoría"
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
        title={editingCat ? 'Editar Categoría' : 'Nueva Categoría'}
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
                Código *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
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
                <option value="ACTIVE">Activa</option>
                <option value="INACTIVE">Inactiva</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Descripción
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              Guardar
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingCat}
        title="Eliminar Categoría"
        message={`¿Confirma eliminar la categoría "${deletingCat?.name}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deletingCat) {
            onDeleteCategory(deletingCat.id);
            setDeletingCat(null);
          }
        }}
        onCancel={() => setDeletingCat(null)}
      />
    </div>
  );
};

/* ============================================================================
   3. MÓDULO: INVENTARIO (KARDEX Y AJUSTES DE STOCK)
   ============================================================================ */
interface InventarioViewProps {
  products: Product[];
  movements: InventoryMovement[];
  onRegisterAdjustment: (data: {
    productId: string;
    type: 'Ajuste Positivo' | 'Ajuste Negativo';
    quantity: number;
    reason: string;
  }) => void;
}

export const InventarioView: React.FC<InventarioViewProps> = ({
  products,
  movements,
  onRegisterAdjustment,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedProdId, setSelectedProdId] = useState(products[0]?.id || '');
  const [adjType, setAdjType] = useState<'Ajuste Positivo' | 'Ajuste Negativo'>(
    'Ajuste Positivo'
  );
  const [adjQty, setAdjQty] = useState('1');
  const [adjReason, setAdjReason] = useState('');
  const [adjError, setAdjError] = useState('');

  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const q = search.trim().toLowerCase();
      const matchQ =
        !q ||
        m.productName.toLowerCase().includes(q) ||
        m.barcode.includes(q) ||
        m.reference.toLowerCase().includes(q) ||
        m.reason.toLowerCase().includes(q);
      const matchType = typeFilter === 'ALL' || m.type === typeFilter;
      return matchQ && matchType;
    });
  }, [movements, search, typeFilter]);

  const paginated = filteredMovements.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(adjQty, 10);
    const prod = products.find((p) => p.id === selectedProdId);
    if (!prod) return;
    if (!Number.isFinite(qty) || qty <= 0) {
      setAdjError('La cantidad a ajustar debe ser un entero mayor a 0.');
      return;
    }
    if (adjType === 'Ajuste Negativo' && qty > prod.stock) {
      setAdjError(
        `No puede descontar ${qty} unidades porque el stock actual es ${prod.stock}.`
      );
      return;
    }
    if (!adjReason.trim()) {
      setAdjError('Debe especificar el motivo del ajuste físico de inventario.');
      return;
    }

    onRegisterAdjustment({
      productId: selectedProdId,
      type: adjType,
      quantity: qty,
      reason: adjReason.trim(),
    });
    setIsAdjustOpen(false);
    setAdjQty('1');
    setAdjReason('');
    setAdjError('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Control de Inventario y Kardex"
        description="Trazabilidad completa de entradas, salidas, devoluciones y ajustes físicos de almacén."
        actions={
          <button
            type="button"
            onClick={() => {
              setSelectedProdId(products[0]?.id || '');
              setAdjError('');
              setIsAdjustOpen(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Ajuste de Inventario
          </button>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Movimientos Kardex',
            value: movements.length,
            subtext: 'Registros históricos auditados',
          },
          {
            label: 'Unidades en Almacén',
            value: products.reduce((s, p) => s + p.stock, 0),
            subtext: 'Existencia física consolidada',
            tone: 'primary',
          },
          {
            label: 'Referencias Stock Bajo',
            value: products.filter((p) => p.stock > 0 && p.stock <= p.minStock)
              .length,
            subtext: 'Por debajo del punto de reorden',
            tone: 'warning',
          },
          {
            label: 'Referencias Agotadas',
            value: products.filter((p) => p.stock === 0).length,
            subtext: 'Con saldo cero en sistema',
            tone: 'danger',
          },
        ]}
      />

      <FilterToolbar
        searchPlaceholder="Buscar movimiento por producto, código de barras, documento o motivo..."
        searchValue={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        filters={[
          {
            label: 'Tipo de Movimiento',
            value: typeFilter,
            onChange: (v) => {
              setTypeFilter(v);
              setPage(1);
            },
            options: [
              { value: 'ALL', label: 'Todos los movimientos' },
              { value: 'Entrada', label: 'Entradas (Compras)' },
              { value: 'Salida', label: 'Salidas (Ventas)' },
              { value: 'Devolución', label: 'Devoluciones' },
              { value: 'Ajuste Positivo', label: 'Ajuste Positivo (+)' },
              { value: 'Ajuste Negativo', label: 'Ajuste Negativo (-)' },
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
                <th className="py-2.5 px-3 font-semibold">Producto</th>
                <th className="py-2.5 px-3 font-semibold">Tipo</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cantidad</th>
                <th className="py-2.5 px-3 font-semibold text-right">Stock Ant.</th>
                <th className="py-2.5 px-3 font-semibold text-right">Stock Nuevo</th>
                <th className="py-2.5 px-3 font-semibold">Motivo / Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginated.map((mov) => {
                const isPositive =
                  mov.type === 'Entrada' ||
                  mov.type === 'Ajuste Positivo' ||
                  mov.type === 'Devolución';
                return (
                  <tr key={mov.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {mov.date} · {mov.time}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {mov.reference}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">
                        {mov.productName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {mov.barcode}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          isPositive ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {mov.type}
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                        isPositive ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {isPositive ? `+${mov.quantity}` : `-${mov.quantity}`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                      {mov.previousStock}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-900">
                      {mov.newStock}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="text-slate-800">{mov.reason}</div>
                      <div className="text-[11px] text-slate-500">
                        Usuario: {mov.user}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationBar
          currentPage={page}
          totalItems={filteredMovements.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Modal Ajuste Manual de Inventario */}
      <Modal
        isOpen={isAdjustOpen}
        title="Registrar Ajuste Físico de Inventario"
        subtitle="Actualiza las existencias reales del producto por conteo físico, avería o reposición interna."
        onClose={() => setIsAdjustOpen(false)}
        maxWidth="md"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
          {adjError && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
              {adjError}
            </div>
          )}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Producto a Ajustar *
            </label>
            <select
              value={selectedProdId}
              onChange={(e) => setSelectedProdId(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name} (Stock actual: {p.stock})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tipo de Ajuste *
              </label>
              <select
                value={adjType}
                onChange={(e) =>
                  setAdjType(
                    e.target.value as 'Ajuste Positivo' | 'Ajuste Negativo'
                  )
                }
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Ajuste Positivo">
                  Ajuste Positivo (+ Incrementar Stock)
                </option>
                <option value="Ajuste Negativo">
                  Ajuste Negativo (- Disminuir Stock / Merma)
                </option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cantidad de Unidades *
              </label>
              <input
                type="number"
                min={1}
                required
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                className="w-full px-3 py-1.5 text-sm font-mono border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Motivo Justificativo del Ajuste *
            </label>
            <textarea
              rows={3}
              required
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="Ej. Sobrante detectado en arqueo de estantería / Baja por empaque deteriorado..."
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAdjustOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 text-white"
            >
              Guardar Ajuste
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
