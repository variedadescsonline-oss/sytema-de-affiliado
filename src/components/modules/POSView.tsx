import React, { useState, useMemo } from 'react';
import {
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LayoutGrid,
  List,
  Image as ImageIcon,
  Camera,
  Smartphone,
} from 'lucide-react';
import {
  Product,
  Category,
  Client,
  SaleItem,
  PaymentMethod,
  CompanyConfig,
  Sale,
} from '../../types/erp';
import {
  PageHeader,
  Modal,
  ConfirmModal,
  ReceiptModal,
  formatCurrency,
} from '../ui/EnterpriseComponents';
import { BarcodeScannerModal } from '../ui/BarcodeScannerModal';
import { RemoteScannerModal } from './RemoteScannerModal';

interface POSViewProps {
  products: Product[];
  categories: Category[];
  clients: Client[];
  config: CompanyConfig;
  currentUserName: string;
  onCompleteSale: (saleData: {
    clientId: string;
    items: SaleItem[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    total: number;
    profit: number;
    paymentMethod: PaymentMethod;
    amountReceived: number;
    change: number;
  }) => Sale;
  onQuickCreateClient: (clientData: Omit<Client, 'id' | 'currentBalance' | 'active'>) => Client;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  categories,
  clients,
  config,
  currentUserName,
  onCompleteSale,
  onQuickCreateClient,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [catalogDisplayMode, setCatalogDisplayMode] = useState<'grid' | 'table'>('grid');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [isRemoteScannerOpen, setIsRemoteScannerOpen] = useState(false);
  const [isLocalScannerOpen, setIsLocalScannerOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>(
    clients[0]?.id || 'cli-0'
  );
  const [globalDiscount, setGlobalDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');
  const [posMessage, setPosMessage] = useState<{
    type: 'error' | 'info' | 'success';
    text: string;
  } | null>(null);

  // Confirm clear cart modal
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Quick client creation modal
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientDoc, setNewClientDoc] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [newClientCreditLimit, setNewClientCreditLimit] = useState('200');
  const [clientFormError, setClientFormError] = useState('');

  const activeProducts = useMemo(
    () => products.filter((p) => p.active),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      const matchesCat =
        selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(q);
      return matchesCat && matchesSearch;
    });
  }, [activeProducts, selectedCategory, searchQuery]);

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) || clients[0],
    [clients, selectedClientId]
  );

  const addProductToCart = (product: Product) => {
    setPosMessage(null);
    if (product.stock <= 0) {
      setPosMessage({
        type: 'error',
        text: `El producto "${product.name}" está agotado (Stock: 0).`,
      });
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === product.id);
      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        if (existing.quantity + 1 > product.stock) {
          setPosMessage({
            type: 'error',
            text: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}.`,
          });
          return prev;
        }
        const newQty = existing.quantity + 1;
        const updated: SaleItem = {
          ...existing,
          quantity: newQty,
          subtotal: Math.max(0, newQty * existing.price - existing.discount),
        };
        const copy = [...prev];
        copy[existingIndex] = updated;
        return copy;
      } else {
        const newItem: SaleItem = {
          productId: product.id,
          barcode: product.barcode,
          name: product.name,
          quantity: 1,
          price: product.price,
          cost: product.cost,
          discount: 0,
          subtotal: product.price,
        };
        return [...prev, newItem];
      }
    });
  };

  const handleScanBarcode = (barcode: string) => {
    const code = barcode.trim();
    if (!code) return;

    const match = activeProducts.find(
      (p) =>
        p.barcode.toLowerCase() === code.toLowerCase() ||
        p.sku.toLowerCase() === code.toLowerCase()
    );

    if (!match) {
      setPosMessage({
        type: 'error',
        text: `No se encontró ningún producto con el código de barras o SKU "${code}".`,
      });
      return;
    }

    addProductToCart(match);
    setPosMessage({
      type: 'success',
      text: `¡Agregado al carrito!: ${match.name} (Código: ${match.barcode})`,
    });
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleScanBarcode(barcodeInput);
      setBarcodeInput('');
    }
  };

  const updateCartQuantity = (productId: string, newQty: number) => {
    setPosMessage(null);
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (newQty <= 0) {
      removeCartItem(productId);
      return;
    }

    if (newQty > product.stock) {
      setPosMessage({
        type: 'error',
        text: `Stock máximo disponible para "${product.name}": ${product.stock} unidades.`,
      });
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: newQty,
              subtotal: Math.max(0, newQty * item.price - item.discount),
            }
          : item
      )
    );
  };

  const updateItemDiscount = (productId: string, discountVal: number) => {
    setPosMessage(null);
    const cleanDiscount = Math.max(0, Number.isFinite(discountVal) ? discountVal : 0);
    setCart((prev) =>
      prev.map((item) => {
        if (item.productId !== productId) return item;
        const maxLineAmount = item.quantity * item.price;
        const validDiscount = Math.min(cleanDiscount, maxLineAmount);
        return {
          ...item,
          discount: validDiscount,
          subtotal: Math.max(0, maxLineAmount - validDiscount),
        };
      })
    );
  };

  const removeCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  // Totals calculation
  const grossSubtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity * item.price, 0),
    [cart]
  );

  const lineDiscountsTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.discount, 0),
    [cart]
  );

  const parsedGlobalDiscount = Math.max(0, parseFloat(globalDiscount) || 0);
  const totalDiscount = Math.min(
    grossSubtotal,
    lineDiscountsTotal + parsedGlobalDiscount
  );

  const finalTotal = Math.max(0, grossSubtotal - totalDiscount);

  const taxAmount = useMemo(() => {
    const rate = config.taxRatePercent / 100;
    if (config.pricesIncludeTax) {
      return finalTotal - finalTotal / (1 + rate);
    }
    return finalTotal * rate;
  }, [finalTotal, config]);

  const totalCost = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity * item.cost, 0),
    [cart]
  );

  const estimatedProfit = Math.max(0, finalTotal - totalCost);

  const effectiveAmountReceived = useMemo(() => {
    if (paymentMethod === 'Crédito') return 0;
    if (paymentMethod === 'Tarjeta' || paymentMethod === 'Transferencia') {
      return finalTotal;
    }
    const parsed = parseFloat(amountReceivedInput);
    return Number.isFinite(parsed) ? parsed : finalTotal;
  }, [paymentMethod, amountReceivedInput, finalTotal]);

  const changeAmount =
    paymentMethod === 'Efectivo'
      ? Math.max(0, effectiveAmountReceived - finalTotal)
      : 0;

  const handleCheckout = () => {
    setPosMessage(null);
    if (cart.length === 0) {
      setPosMessage({
        type: 'error',
        text: 'Agregue al menos un producto al carrito antes de cobrar.',
      });
      return;
    }

    if (
      paymentMethod === 'Efectivo' &&
      amountReceivedInput.trim() !== '' &&
      effectiveAmountReceived < finalTotal
    ) {
      setPosMessage({
        type: 'error',
        text: `El monto recibido (${formatCurrency(
          effectiveAmountReceived,
          config.currencySymbol
        )}) es menor al total a cobrar (${formatCurrency(
          finalTotal,
          config.currencySymbol
        )}).`,
      });
      return;
    }

    if (paymentMethod === 'Crédito') {
      if (selectedClient.id === 'cli-0') {
        setPosMessage({
          type: 'error',
          text: 'Las ventas a Crédito requieren seleccionar un cliente registrado distinto a Consumidor Final.',
        });
        return;
      }
      const availableCredit =
        selectedClient.creditLimit - selectedClient.currentBalance;
      if (finalTotal > availableCredit) {
        setPosMessage({
          type: 'error',
          text: `Cupo de crédito insuficiente para ${
            selectedClient.name
          }. Cupo disponible: ${formatCurrency(
            availableCredit,
            config.currencySymbol
          )}.`,
        });
        return;
      }
    }

    const createdSale = onCompleteSale({
      clientId: selectedClient.id,
      items: cart,
      subtotal: grossSubtotal,
      discountTotal: totalDiscount,
      taxTotal: taxAmount,
      total: finalTotal,
      profit: estimatedProfit,
      paymentMethod,
      amountReceived: effectiveAmountReceived,
      change: changeAmount,
    });

    // Mostrar Factura POS inmediatamente
    setCompletedSale(createdSale);

    // Reset POS state for next customer
    setCart([]);
    setGlobalDiscount('0');
    setAmountReceivedInput('');
    setPaymentMethod('Efectivo');
    setPosMessage({
      type: 'success',
      text: `Factura POS ${createdSale.invoiceNumber} generada con éxito.`,
    });
  };

  const handleCreateQuickClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientDoc.trim() || !newClientName.trim()) {
      setClientFormError('El documento y el nombre completo son obligatorios.');
      return;
    }
    const created = onQuickCreateClient({
      document: newClientDoc.trim(),
      name: newClientName.trim(),
      phone: newClientPhone.trim() || '-',
      email: newClientEmail.trim() || '-',
      address: newClientAddress.trim() || 'Registrado en POS',
      creditLimit: Math.max(0, parseFloat(newClientCreditLimit) || 0),
    });
    setSelectedClientId(created.id);
    setIsNewClientModalOpen(false);
    setNewClientDoc('');
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientAddress('');
    setClientFormError('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Punto de Venta (POS)"
        description={`Terminal de facturación directa · Vendedor activo: ${currentUserName}`}
        actions={
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">
              Ítems en carrito:{' '}
              <strong className="font-mono text-slate-900">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={() => setIsNewClientModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-800 hover:bg-slate-100 flex items-center gap-1.5 whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Nuevo Cliente Rápido
            </button>
          </div>
        }
      />

      {posMessage && (
        <div
          className={`p-3 rounded border text-xs font-medium flex items-center justify-between ${
            posMessage.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : posMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-blue-50 border-blue-300 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{posMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setPosMessage(null)}
            className="text-xs underline ml-4 whitespace-nowrap"
          >
            Cerrar aviso
          </button>
        </div>
      )}

      {/* Distribución Oficial POS: IZQUIERDA (Buscador, Código de Barras, Productos) | DERECHA (Carrito, Cliente, Totales, COBRAR) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* COLUMNA IZQUIERDA (7 columnas en desktop) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Barra Superior de Búsqueda y Lector de Código de Barras */}
          <div className="bg-white border border-slate-200 rounded p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Buscador por nombre o referencia */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Buscador de Productos
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por nombre, SKU o código..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-700"
                  />
                </div>
              </div>

              {/* Lector directo de Código de Barras */}
              <form onSubmit={handleBarcodeSubmit}>
                <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                  Código de Barras (Enter para agregar)
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="Escanear p.ej. 770100100201"
                      className="w-full pl-9 pr-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded focus:outline-none focus:border-blue-700"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-900 text-white whitespace-nowrap"
                  >
                    Agregar
                  </button>
                </div>
                {/* Botones de Escáner Celular y Cámara */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsRemoteScannerOpen(true)}
                    className="flex-1 py-1.5 px-2.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white text-xs font-semibold rounded flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                    title="Usar la cámara de su teléfono como escáner de códigos"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Usar Celular como Escáner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLocalScannerOpen(true)}
                    className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded border border-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    title="Abrir cámara del equipo"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-700" />
                    <span>Cámara Local</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Filtros de Categoría */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2.5 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                  selectedCategory === 'ALL'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todos ({activeProducts.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded border whitespace-nowrap ${
                    selectedCategory === cat.id
                      ? 'bg-blue-700 text-white border-blue-700'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Catálogo de Productos para Selección Rápida (Grid o Tabla) */}
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider">
                  Catálogo de Productos
                </span>
                <span className="font-mono text-slate-500">
                  ({filteredProducts.length} disponibles)
                </span>
              </div>
              <div className="flex items-center border border-slate-200 rounded bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setCatalogDisplayMode('grid')}
                  title="Vista Cuadrícula Visual con Fotos"
                  className={`p-1 rounded ${
                    catalogDisplayMode === 'grid'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCatalogDisplayMode('table')}
                  title="Vista Lista Tabular"
                  className={`p-1 rounded ${
                    catalogDisplayMode === 'table'
                      ? 'bg-blue-700 text-white'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* VISTA 1: CUADRÍCULA VISUAL (FOTOS GRANDES + PRECIOS + BOTÓN RÁPIDO) */}
            {catalogDisplayMode === 'grid' ? (
              <div className="p-3 max-h-[540px] overflow-y-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {filteredProducts.map((product) => {
                    const inCart = cart.find((c) => c.productId === product.id);
                    const isOut = product.stock <= 0;
                    const isLow = product.stock > 0 && product.stock <= product.minStock;

                    return (
                      <div
                        key={product.id}
                        onClick={() => !isOut && addProductToCart(product)}
                        className={`group relative border rounded-lg p-2.5 flex flex-col justify-between transition-all select-none ${
                          isOut
                            ? 'opacity-50 bg-slate-50 border-slate-200 cursor-not-allowed'
                            : inCart
                            ? 'border-emerald-500 bg-emerald-50/40 shadow-xs cursor-pointer hover:border-emerald-600'
                            : 'border-slate-200 bg-white hover:border-blue-400 hover:shadow-xs cursor-pointer'
                        }`}
                      >
                        {/* Imagen o Placeholder */}
                        <div className="w-full h-28 mb-2 rounded bg-slate-100 border border-slate-100 overflow-hidden flex items-center justify-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-slate-300">
                              <ImageIcon className="w-8 h-8 mb-1" />
                              <span className="text-[10px] text-slate-400">Sin foto</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="font-bold text-slate-900 text-xs line-clamp-2 leading-tight mb-1">
                            {product.name}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-mono">
                            <span>{product.sku}</span>
                            <span
                              className={`font-semibold ${
                                isOut
                                  ? 'text-red-700'
                                  : isLow
                                  ? 'text-amber-700'
                                  : 'text-slate-600'
                              }`}
                            >
                              Stock: {product.stock}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                          <div>
                            <span className="font-bold text-sm text-blue-800 font-mono block leading-tight">
                              ${(product.price / (config.exchangeRate || 37)).toFixed(2)} USD
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {formatCurrency(product.price, config.currencySymbol)}
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                              isOut
                                ? 'bg-slate-200 text-slate-500'
                                : inCart
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600 text-white'
                            }`}
                          >
                            {isOut ? 'Agotado' : inCart ? `+ (${inCart.quantity})` : '+ Añadir'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {filteredProducts.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                      No se encontraron productos coincidentes.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* VISTA 2: TABULAR CLÁSICA CON MINIATURA */
              <div className="overflow-x-auto max-h-[540px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 font-semibold">Producto</th>
                      <th className="py-2.5 px-3 font-semibold">SKU / Código</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Stock</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Precio</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredProducts.map((product) => {
                      const inCart = cart.find((c) => c.productId === product.id);
                      const isOut = product.stock <= 0;
                      const isLow =
                        product.stock > 0 && product.stock <= product.minStock;

                      return (
                        <tr
                          key={product.id}
                          className={`hover:bg-slate-50 ${
                            isOut ? 'opacity-60 bg-slate-50/50' : ''
                          }`}
                        >
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="w-8 h-8 rounded object-cover border border-slate-200 shrink-0 bg-slate-100"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                  <ImageIcon className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-slate-900 leading-tight">
                                  {product.name}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {product.categoryName} · {product.location}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                            <div>{product.barcode}</div>
                            <div className="text-[10px] text-slate-400">
                              {product.sku}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                            <span
                              className={`font-bold ${
                                isOut
                                  ? 'text-red-700'
                                  : isLow
                                  ? 'text-amber-700'
                                  : 'text-slate-800'
                              }`}
                            >
                              {product.stock}
                            </span>{' '}
                            <span className="text-[10px] text-slate-400">
                              {product.unit}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                            <div className="font-bold text-blue-800 text-xs">
                              ${(product.price / (config.exchangeRate || 37)).toFixed(2)} USD
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatCurrency(product.price, config.currencySymbol)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              disabled={isOut}
                              onClick={() => addProductToCart(product)}
                              className={`px-3 py-1 text-xs font-semibold rounded inline-flex items-center gap-1 whitespace-nowrap ${
                                isOut
                                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                                  : inCart
                                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                                  : 'bg-blue-700 hover:bg-blue-800 text-white'
                              }`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              {isOut
                                ? 'Agotado'
                                : inCart
                                ? `En carrito (${inCart.quantity})`
                                : 'Agregar'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredProducts.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-10 text-center text-slate-500"
                        >
                          No se encontraron productos para el criterio de búsqueda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Carrito, Cantidades, Descuentos, Subtotal, Total, Método de Pago, Cliente, Botón COBRAR (5 columnas en desktop) */}
        <div className="lg:col-span-5 bg-white border border-slate-300 rounded overflow-hidden flex flex-col">
          {/* Selección de Cliente */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Cliente de la Factura
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                Doc: {selectedClient?.document}
              </span>
            </div>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full py-1.5 px-2.5 text-sm bg-white border border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:border-blue-700"
            >
              {clients.map((cli) => (
                <option key={cli.id} value={cli.id}>
                  {cli.name} ({cli.document})
                </option>
              ))}
            </select>
            {selectedClient && selectedClient.id !== 'cli-0' && (
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5 font-mono tabular-nums">
                <span>
                  Cupo Crédito:{' '}
                  <strong>
                    {formatCurrency(
                      selectedClient.creditLimit,
                      config.currencySymbol
                    )}
                  </strong>
                </span>
                <span>
                  Deuda actual:{' '}
                  <strong className="text-amber-700">
                    {formatCurrency(
                      selectedClient.currentBalance,
                      config.currencySymbol
                    )}
                  </strong>
                </span>
                <span>
                  Disponible:{' '}
                  <strong className="text-emerald-700">
                    {formatCurrency(
                      Math.max(
                        0,
                        selectedClient.creditLimit - selectedClient.currentBalance
                      ),
                      config.currencySymbol
                    )}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Tabla del Carrito de Venta */}
          <div className="overflow-x-auto max-h-[280px] overflow-y-auto border-b border-slate-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 uppercase text-[11px]">
                <tr>
                  <th className="py-2 px-2.5 font-semibold">Producto</th>
                  <th className="py-2 px-2 font-semibold text-center">Cant.</th>
                  <th className="py-2 px-2 font-semibold text-right">Desc.($)</th>
                  <th className="py-2 px-2.5 font-semibold text-right">Subtotal</th>
                  <th className="py-2 px-2 font-semibold text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cart.map((item) => (
                  <tr key={item.productId} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5">
                      <div className="font-semibold text-slate-900 leading-tight">
                        {item.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {formatCurrency(item.price, config.currencySymbol)} c/u
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(item.productId, item.quantity - 1)
                          }
                          className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700"
                          title="Disminuir cantidad"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartQuantity(
                              item.productId,
                              parseInt(e.target.value, 10) || 1
                            )
                          }
                          className="w-11 py-0.5 text-center font-mono text-xs border border-slate-300 rounded"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(item.productId, item.quantity + 1)
                          }
                          className="w-6 h-6 border border-slate-300 rounded bg-white hover:bg-slate-100 flex items-center justify-center text-slate-700"
                          title="Aumentar cantidad"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step="0.10"
                        value={item.discount || ''}
                        placeholder="0.00"
                        onChange={(e) =>
                          updateItemDiscount(
                            item.productId,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-16 py-0.5 px-1.5 text-right font-mono text-xs border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono tabular-nums font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(item.subtotal, config.currencySymbol)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeCartItem(item.productId)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Quitar producto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      El carrito está vacío. Seleccione productos o escanee un código
                      de barras.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Resumen de Descuentos, Subtotal, TOTAL y Método de Pago */}
          <div className="p-4 space-y-3 bg-white">
            <div className="space-y-1.5 text-xs border-b border-slate-200 pb-3">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal Bruto:</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatCurrency(grossSubtotal, config.currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Descuento adicional en factura ({config.currencySymbol}):</span>
                <input
                  type="number"
                  min={0}
                  step="0.50"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value)}
                  className="w-24 py-0.5 px-2 text-right font-mono text-xs border border-slate-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Descuento Total Aplicado:</span>
                <span className="font-mono tabular-nums text-amber-700 font-semibold">
                  -{formatCurrency(totalDiscount, config.currencySymbol)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <span>Impuesto estimado ({config.taxRatePercent}%):</span>
                <span className="font-mono tabular-nums">
                  {formatCurrency(taxAmount, config.currencySymbol)}
                </span>
              </div>
            </div>

            {/* TOTAL CLARAMENTE VISIBLE */}
            <div className="bg-slate-900 text-white rounded p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  TOTAL A PAGAR
                </span>
                <span className="text-[11px] text-slate-400">
                  {cart.length} líneas ·{' '}
                  {cart.reduce((s, i) => s + i.quantity, 0)} unidades
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight">
                  {formatCurrency(finalTotal, config.currencySymbol)}
                </div>
                <div className="text-xs text-blue-300 font-mono font-semibold">
                  ≈ ${(finalTotal / (config.exchangeRate || 37)).toFixed(2)} USD
                </div>
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {(
                  ['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito'] as PaymentMethod[]
                ).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-2 text-xs font-semibold rounded border text-center whitespace-nowrap ${
                      paymentMethod === method
                        ? 'bg-blue-700 text-white border-blue-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Pago Recibido y Cambio (Cuando es Efectivo) */}
            {paymentMethod === 'Efectivo' && (
              <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      Pago Recibido ({config.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.50"
                      value={amountReceivedInput}
                      onChange={(e) => setAmountReceivedInput(e.target.value)}
                      placeholder={finalTotal.toFixed(2)}
                      className="w-full py-1.5 px-2.5 text-sm font-mono font-bold bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </div>
                  <div className="text-right">
                    <span className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                      Cambio a Entregar
                    </span>
                    <span className="text-lg font-bold font-mono tabular-nums text-emerald-700">
                      {formatCurrency(changeAmount, config.currencySymbol)}
                    </span>
                  </div>
                </div>
                {/* Botones de denominación rápida */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 mr-1">Rápido:</span>
                  <button
                    type="button"
                    onClick={() => setAmountReceivedInput(finalTotal.toFixed(2))}
                    className="px-2 py-0.5 text-[11px] font-mono border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-700"
                  >
                    Exacto
                  </button>
                  {[10, 20, 50, 100, 200].map((bill) => (
                    <button
                      key={bill}
                      type="button"
                      onClick={() => setAmountReceivedInput(String(bill))}
                      className="px-2 py-0.5 text-[11px] font-mono border border-slate-300 rounded bg-white hover:bg-slate-100 text-slate-700"
                    >
                      {config.currencySymbol}
                      {bill}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Botones Principales: Cancelar y COBRAR */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => setIsClearModalOpen(true)}
                className="col-span-1 py-2.5 px-3 text-xs font-semibold border border-red-300 rounded bg-white text-red-700 hover:bg-red-50 disabled:opacity-40 flex items-center justify-center gap-1 whitespace-nowrap"
              >
                <XCircle className="w-4 h-4" />
                Cancelar
              </button>
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleCheckout}
                className="col-span-2 min-h-[44px] py-2.5 px-3 sm:px-4 text-xs sm:text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-40 flex items-center justify-center gap-2 whitespace-nowrap shadow-xs active:scale-[0.99] transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>EMITIR FACTURA POS ({formatCurrency(finalTotal, config.currencySymbol)})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Confirmar Cancelación de Carrito */}
      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Vaciar Carrito de Venta"
        message="¿Está seguro de que desea cancelar la orden actual y retirar todos los productos del carrito?"
        confirmLabel="Sí, vaciar carrito"
        variant="danger"
        onConfirm={() => {
          setCart([]);
          setGlobalDiscount('0');
          setAmountReceivedInput('');
          setIsClearModalOpen(false);
        }}
        onCancel={() => setIsClearModalOpen(false)}
      />

      {/* Modal Registro Rápido de Cliente desde POS */}
      <Modal
        isOpen={isNewClientModalOpen}
        title="Registrar Nuevo Cliente"
        subtitle="Alta rápida de cliente para facturación o asignación de crédito"
        onClose={() => setIsNewClientModalOpen(false)}
        maxWidth="md"
      >
        <form onSubmit={handleCreateQuickClient} className="space-y-3 text-xs">
          {clientFormError && (
            <div className="p-2.5 bg-red-50 border border-red-300 text-red-700 rounded">
              {clientFormError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Documento / NIT / Cédula *
              </label>
              <input
                type="text"
                required
                value={newClientDoc}
                onChange={(e) => setNewClientDoc(e.target.value)}
                placeholder="Ej. 900.123.456-1"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Teléfono *
              </label>
              <input
                type="text"
                value={newClientPhone}
                onChange={(e) => setNewClientPhone(e.target.value)}
                placeholder="Ej. 310 555 0192"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nombre Completo o Razón Social *
            </label>
            <input
              type="text"
              required
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Nombre del cliente o empresa"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="cliente@correo.com"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Cupo de Crédito Autorizado ({config.currencySymbol})
              </label>
              <input
                type="number"
                min={0}
                step="10"
                value={newClientCreditLimit}
                onChange={(e) => setNewClientCreditLimit(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={newClientAddress}
              onChange={(e) => setNewClientAddress(e.target.value)}
              placeholder="Dirección física del cliente"
              className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsNewClientModalOpen(false)}
              className="px-3.5 py-1.5 text-xs font-medium border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold rounded bg-blue-700 hover:bg-blue-800 text-white"
            >
              Guardar y Seleccionar
            </button>
          </div>
        </form>
      </Modal>
      {/* Modales de Escáner Remoto y Local */}
      <RemoteScannerModal
        isOpen={isRemoteScannerOpen}
        onClose={() => setIsRemoteScannerOpen(false)}
        onScan={handleScanBarcode}
        sessionId="pos-caja-1"
      />

      <BarcodeScannerModal
        isOpen={isLocalScannerOpen}
        onClose={() => setIsLocalScannerOpen(false)}
        onScan={handleScanBarcode}
        continuous={true}
        title="Cámara del Equipo · Lector de Códigos"
        subtitle="Apunte la cámara del dispositivo al código de barras para agregarlo de inmediato al carrito."
      />

      {/* Factura POS Modal tras completar la venta */}
      <ReceiptModal
        sale={completedSale}
        config={config}
        onClose={() => setCompletedSale(null)}
      />
    </div>
  );
};
