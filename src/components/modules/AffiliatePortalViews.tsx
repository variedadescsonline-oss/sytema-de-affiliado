import React, { useState, useMemo } from 'react';
import {
  Package,
  ShoppingCart,
  Send,
  CheckCircle2,
  Clock,
  Truck,
  CheckCheck,
  XCircle,
  Search,
  Filter,
  User,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  Plus,
  Minus,
  Trash2,
  Eye,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Product, SystemUser, AffiliateOrder, AffiliateOrderItem, OrderStatus } from '../../types/erp';
import { sendOrderEmailNotification, getGoogleAccessToken } from '../../services/firebase';

interface AffiliatePortalViewsProps {
  currentUser: SystemUser;
  products: Product[];
  orders: AffiliateOrder[];
  affiliates: SystemUser[];
  onSaveOrder: (order: AffiliateOrder) => Promise<void> | void;
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus, customNote?: string) => Promise<void> | void;
  onUpdateStock: (productId: string, deltaStock: number) => void;
  currencySymbol?: string;
  exchangeRate?: number;
}

export const AffiliatePortalViews: React.FC<AffiliatePortalViewsProps> = ({
  currentUser,
  products,
  orders,
  affiliates,
  onSaveOrder,
  onUpdateOrderStatus,
  onUpdateStock,
  currencySymbol = '$',
  exchangeRate = 37,
}) => {
  const isAdmin = currentUser.role === 'Administrador' || currentUser.role === 'Supervisor';
  const isAffiliate = currentUser.role === 'Afiliado';

  // Tabs
  const [activeTab, setActiveTab] = useState<'create-order' | 'my-orders' | 'catalog' | 'admin-orders'>(
    isAffiliate ? 'create-order' : 'admin-orders'
  );

  // New Order Form State (para clientes, ej: "Roques")
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [customerCity, setCustomerCity] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<AffiliateOrderItem[]>([]);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Product Picker state
  const [searchProductQuery, setSearchProductQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Admin filter
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('all');
  const [adminAffiliateFilter, setAdminAffiliateFilter] = useState<string>('all');
  const [adminSearchQuery, setAdminSearchQuery] = useState<string>('');

  // Selected Order for Detail Modal
  const [viewingOrder, setViewingOrder] = useState<AffiliateOrder | null>(null);

  // Gmail Notification Confirmation Modal
  const [emailModalOrder, setEmailModalOrder] = useState<AffiliateOrder | null>(null);
  const [emailRecipient, setEmailRecipient] = useState<string>('');
  const [emailCustomNote, setEmailCustomNote] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Available products for affiliates (stock > 0 and available)
  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      const isAvailable = p.active !== false && (p.availableForAffiliates !== false);
      const matchesSearch =
        p.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
        p.categoryName?.toLowerCase().includes(searchProductQuery.toLowerCase());
      const matchesCategory =
        selectedCategoryFilter === 'all' || p.categoryName === selectedCategoryFilter;
      return isAvailable && matchesSearch && matchesCategory;
    });
  }, [products, searchProductQuery, selectedCategoryFilter]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.categoryName) set.add(p.categoryName);
    });
    return Array.from(set);
  }, [products]);

  // Orders filtered for affiliate or admin
  const displayedOrders = useMemo(() => {
    let list = orders;
    if (isAffiliate) {
      list = list.filter((o) => o.affiliateId === currentUser.id || o.affiliateEmail?.toLowerCase() === currentUser.email?.toLowerCase());
    } else {
      if (adminStatusFilter !== 'all') {
        list = list.filter((o) => o.status === adminStatusFilter);
      }
      if (adminAffiliateFilter !== 'all') {
        list = list.filter((o) => o.affiliateId === adminAffiliateFilter);
      }
      if (adminSearchQuery.trim()) {
        const q = adminSearchQuery.toLowerCase();
        list = list.filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerAddress.toLowerCase().includes(q) ||
            o.affiliateName.toLowerCase().includes(q)
        );
      }
    }
    return [...list].sort((a, b) => new Date(b.date + ' ' + b.time).getTime() - new Date(a.date + ' ' + a.time).getTime());
  }, [orders, isAffiliate, currentUser, adminStatusFilter, adminAffiliateFilter, adminSearchQuery]);

  // Totals for current affiliate
  const affiliateStats = useMemo(() => {
    const myOrders = orders.filter(
      (o) => o.affiliateId === currentUser.id || o.affiliateEmail?.toLowerCase() === currentUser.email?.toLowerCase()
    );
    const validOrders = myOrders.filter((o) => o.status !== 'Cancelado');
    const totalSalesAmount = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalEarnings = validOrders.reduce((sum, o) => sum + (o.affiliateCommissionTotal || 0), 0);
    const earnedDelivered = myOrders
      .filter((o) => o.status === 'Entregado')
      .reduce((sum, o) => sum + (o.affiliateCommissionTotal || 0), 0);
    const pendingCommission = myOrders
      .filter((o) => o.status === 'Pendiente' || o.status === 'Aprobado' || o.status === 'En Camino')
      .reduce((sum, o) => sum + (o.affiliateCommissionTotal || 0), 0);
    const deliveredCount = myOrders.filter((o) => o.status === 'Entregado').length;
    const pendingCount = myOrders.filter((o) => o.status === 'Pendiente' || o.status === 'Aprobado' || o.status === 'En Camino').length;

    return {
      totalOrders: myOrders.length,
      totalSalesAmount,
      totalEarnings,
      earnedDelivered,
      pendingCommission,
      deliveredCount,
      pendingCount,
    };
  }, [orders, currentUser]);

  // Totals for Admin
  const adminStats = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'Cancelado');
    const totalAffiliateSales = validOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalCommissions = validOrders.reduce((sum, o) => sum + (o.affiliateCommissionTotal || 0), 0);
    const deliveredOrders = orders.filter((o) => o.status === 'Entregado').length;
    const pendingOrders = orders.filter((o) => o.status === 'Pendiente').length;
    const inTransitOrders = orders.filter((o) => o.status === 'En Camino' || o.status === 'Aprobado').length;

    return {
      totalOrders: orders.length,
      totalAffiliateSales,
      totalCommissions,
      deliveredOrders,
      pendingOrders,
      inTransitOrders,
    };
  }, [orders]);

  // Order Cart Totals
  const cartTotals = useMemo(() => {
    const baseTotal = selectedItems.reduce((acc, item) => acc + item.basePrice * item.quantity, 0);
    const commissionTotal = selectedItems.reduce((acc, item) => acc + item.totalCommission, 0);
    const grandTotal = selectedItems.reduce((acc, item) => acc + item.subtotal, 0);
    return { baseTotal, commissionTotal, grandTotal };
  }, [selectedItems]);

  // Add product to new order
  const handleAddProductToOrder = (prod: Product) => {
    setOrderError(null);
    if (prod.stock <= 0) {
      setOrderError(`El producto "${prod.name}" no tiene existencias disponibles en bodega.`);
      return;
    }

    const existingIndex = selectedItems.findIndex((i) => i.productId === prod.id);
    if (existingIndex >= 0) {
      const current = selectedItems[existingIndex];
      if (current.quantity >= prod.stock) {
        setOrderError(`No hay más existencias disponibles en inventario para "${prod.name}".`);
        return;
      }
      const updated = [...selectedItems];
      const newQty = current.quantity + 1;
      updated[existingIndex] = {
        ...current,
        quantity: newQty,
        subtotal: current.salePrice * newQty,
        totalCommission: current.unitCommission * newQty,
      };
      setSelectedItems(updated);
    } else {
      // Default commission: 15% over base or at least suggested price
      const base = prod.cost > 0 ? prod.cost : Math.round(prod.price * 0.8);
      const suggestedSale = prod.price > base ? prod.price : base + 2;
      const unitComm = Math.max(0, suggestedSale - base);

      const newItem: AffiliateOrderItem = {
        productId: prod.id,
        productName: prod.name,
        barcode: prod.barcode,
        quantity: 1,
        basePrice: base,
        salePrice: suggestedSale,
        unitCommission: unitComm,
        subtotal: suggestedSale,
        totalCommission: unitComm,
      };
      setSelectedItems([...selectedItems, newItem]);
    }
  };

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    setOrderError(null);
    const item = selectedItems[index];
    const product = products.find((p) => p.id === item.productId);
    const maxStock = product ? product.stock : 999;

    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    if (newQty > maxStock) {
      setOrderError(`Solo hay ${maxStock} unidades disponibles en el inventario para "${item.productName}".`);
      return;
    }

    const updated = [...selectedItems];
    updated[index] = {
      ...item,
      quantity: newQty,
      subtotal: item.salePrice * newQty,
      totalCommission: item.unitCommission * newQty,
    };
    setSelectedItems(updated);
  };

  const handleUpdateItemSalePrice = (index: number, newSalePrice: number) => {
    const item = selectedItems[index];
    const sale = Math.max(item.basePrice, newSalePrice);
    const unitComm = Number((sale - item.basePrice).toFixed(2));
    const updated = [...selectedItems];
    updated[index] = {
      ...item,
      salePrice: sale,
      unitCommission: unitComm,
      subtotal: sale * item.quantity,
      totalCommission: unitComm * item.quantity,
    };
    setSelectedItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, idx) => idx !== index));
  };

  // Submit Order
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError(null);
    setOrderSuccessMsg(null);

    if (!customerName.trim()) {
      setOrderError('Por favor ingrese el nombre del cliente destinatario (ejemplo: Roques).');
      return;
    }
    if (!customerPhone.trim()) {
      setOrderError('Por favor ingrese el teléfono de contacto del cliente.');
      return;
    }
    if (!customerAddress.trim()) {
      setOrderError('Por favor ingrese la dirección completa de entrega.');
      return;
    }
    if (selectedItems.length === 0) {
      setOrderError('Seleccione al menos un producto del inventario para crear el pedido.');
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5);
      const orderNumber = `PED-${dateStr.replace(/-/g, '').slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;

      const newOrder: AffiliateOrder = {
        id: `ord-${Date.now()}`,
        orderNumber,
        date: dateStr,
        time: timeStr,
        affiliateId: currentUser.id,
        affiliateName: currentUser.fullName,
        affiliateEmail: currentUser.email || '',
        affiliatePhone: currentUser.phone || '',
        affiliateCedula: currentUser.cedula || '',
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim(),
        customerCity: customerCity.trim() || 'Principal',
        notes: orderNotes.trim(),
        items: selectedItems,
        baseTotal: cartTotals.baseTotal,
        affiliateCommissionTotal: cartTotals.commissionTotal,
        totalAmount: cartTotals.grandTotal,
        paymentStatus: 'Pago contra entrega',
        status: 'Pendiente',
        gmailNotificationSent: false,
        notificationLog: [],
        updatedAt: now.toISOString(),
      };

      // Guardar pedido
      await onSaveOrder(newOrder);

      // Descontar inventario disponible
      for (const item of selectedItems) {
        onUpdateStock(item.productId, -item.quantity);
      }

      setOrderSuccessMsg(
        `¡Pedido ${orderNumber} creado exitosamente para ${customerName.trim()}! Se ha enviado al departamento de despacho de VARIEDADES CS.`
      );

      // Limpiar formulario
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerCity('');
      setOrderNotes('');
      setSelectedItems([]);
      setActiveTab('my-orders');
    } catch (err: unknown) {
      setOrderError(err instanceof Error ? err.message : 'Error al guardar el pedido en el sistema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Gmail dispatch modal
  const handleOpenEmailModal = (order: AffiliateOrder) => {
    setEmailModalOrder(order);
    setEmailRecipient(order.affiliateEmail || currentUser.email || 'variedadescs.online@gmail.com');
    setEmailCustomNote('');
    setEmailStatusMsg(null);
  };

  // Send Order notification via Gmail (RFC 2822 standard)
  const handleSendGmailNotification = async () => {
    if (!emailModalOrder) return;
    if (!emailRecipient.trim() || !emailRecipient.includes('@')) {
      setEmailStatusMsg({ type: 'error', text: 'Ingrese un correo electrónico válido de destinatario.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatusMsg(null);
    try {
      const itemsPayload = emailModalOrder.items.map((i) => ({
        name: i.productName,
        quantity: i.quantity,
        subtotal: i.subtotal,
      }));

      const res = await sendOrderEmailNotification(
        emailRecipient.trim(),
        emailModalOrder.customerName,
        emailModalOrder.orderNumber,
        emailModalOrder.status,
        itemsPayload,
        emailModalOrder.totalAmount,
        emailModalOrder.customerAddress,
        emailCustomNote.trim() || undefined
      );

      if (res.success) {
        setEmailStatusMsg({
          type: 'success',
          text: `Correo oficial despachado con éxito mediante Gmail a: ${emailRecipient}`,
        });
        // Marcar orden
        const updated = {
          ...emailModalOrder,
          gmailNotificationSent: true,
          notificationLog: [
            ...(emailModalOrder.notificationLog || []),
            {
              date: new Date().toLocaleString(),
              message: `Notificación enviada a ${emailRecipient} (Estado: ${emailModalOrder.status})`,
              recipient: emailRecipient,
            },
          ],
        };
        onSaveOrder(updated);
      } else {
        if (res.error === 'NO_GOOGLE_TOKEN') {
          setEmailStatusMsg({
            type: 'error',
            text: 'Para enviar correos directamente con Gmail, inicie sesión con su cuenta de Google en el botón superior.',
          });
        } else {
          setEmailStatusMsg({ type: 'error', text: res.error || 'Error al conectar con la API de Gmail.' });
        }
      }
    } catch (err: unknown) {
      setEmailStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Error inesperado.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* CABECERA CORPORATIVA DE AFILIADOS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-blue-100 text-blue-800 rounded-full uppercase tracking-wider">
              {isAdmin ? 'Módulo Administrativo' : 'Portal de Vendedores'}
            </span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs font-medium text-slate-600">
              {currentUser.fullName} ({currentUser.role})
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">
            {isAdmin ? 'Gestión Central de Pedidos de Afiliados' : 'Catálogo & Creación de Pedidos para Clientes'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin
              ? 'Supervisión de pedidos solicitados por afiliados, direcciones de entrega y comisiones devengadas.'
              : 'Seleccione productos disponibles, defina su margen de comisión y envíe pedidos para entrega a sus clientes.'}
          </p>
        </div>

        {/* TABS DE NAVEGACIÓN */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg text-xs font-semibold">
          {isAffiliate && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('create-order')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'create-order' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Hacer Pedido</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('my-orders')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'my-orders' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Mis Pedidos ({affiliateStats.totalOrders})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'catalog' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Ver Inventario Disponible</span>
              </button>
            </>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('admin-orders')}
              className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'admin-orders' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Pedidos Recibidos ({orders.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* TARJETAS RESUMEN DE AFILIADO */}
      {isAffiliate && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Pedidos</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-bold text-slate-900">{affiliateStats.totalOrders}</span>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {affiliateStats.deliveredCount} entregados · {affiliateStats.pendingCount} en proceso
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Vendido</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-bold text-slate-900">
                ${affiliateStats.totalSalesAmount.toFixed(2)}
              </span>
              <DollarSign className="w-5 h-5 text-slate-600" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              ≈ C$ {(affiliateStats.totalSalesAmount * exchangeRate).toFixed(2)}
            </span>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Comisión Ganada</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-extrabold text-emerald-700">
                ${affiliateStats.earnedDelivered.toFixed(2)}
              </span>
              <CheckCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] text-emerald-600 mt-1 block font-medium">
              Lista para cobro administrativo
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Comisión en Trámite</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-extrabold text-amber-700">
                ${affiliateStats.pendingCommission.toFixed(2)}
              </span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] text-amber-600 mt-1 block font-medium">
              Pedidos en despacho
            </span>
          </div>

          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">Comisión Total</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-extrabold text-blue-900">
                ${affiliateStats.totalEarnings.toFixed(2)}
              </span>
              <TrendingUp className="w-5 h-5 text-blue-700" />
            </div>
            <span className="text-[10px] text-blue-700 mt-1 block font-medium">
              Cobro en variedadescs.online@gmail.com
            </span>
          </div>
        </div>
      )}

      {/* TARJETAS RESUMEN DE ADMINISTRADOR */}
      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pedidos Recibidos</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-bold text-slate-900">{adminStats.totalOrders}</span>
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              {adminStats.deliveredOrders} entregados · {adminStats.pendingOrders} pendientes
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Ventas de Afiliados</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-bold text-slate-900">
                ${adminStats.totalAffiliateSales.toFixed(2)}
              </span>
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              ≈ C$ {(adminStats.totalAffiliateSales * exchangeRate).toFixed(2)}
            </span>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">Total Comisiones Afiliados</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-extrabold text-purple-900">
                ${adminStats.totalCommissions.toFixed(2)}
              </span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-[10px] text-purple-600 mt-1 block font-medium">
              Comisiones generadas por la red
            </span>
          </div>

          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Pendientes de Despacho</span>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xl font-extrabold text-amber-800">
                {adminStats.pendingOrders}
              </span>
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] text-amber-700 mt-1 block font-medium">
              Requieren revisión y envío
            </span>
          </div>
        </div>
      )}

      {/* ALERTA DE ÉXITO */}
      {orderSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{orderSuccessMsg}</p>
          </div>
        </div>
      )}

      {/* ALERTA DE ERROR */}
      {orderError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{orderError}</p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 1: CREAR PEDIDO PARA CLIENTE (EJ: ROQUES)          */}
      {/* ======================================================== */}
      {activeTab === 'create-order' && isAffiliate && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LADO IZQUIERDO: SELECCIÓN DE PRODUCTOS DEL INVENTARIO */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">1. Seleccionar Productos en Inventario</h2>
                  <p className="text-xs text-slate-500">Solo se muestran artículos con existencias reales disponibles.</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchProductQuery}
                      onChange={(e) => setSearchProductQuery(e.target.value)}
                      placeholder="Buscar producto..."
                      className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 w-44"
                    />
                  </div>

                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="py-1.5 px-2.5 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
                  >
                    <option value="all">Todas</option>
                    {categoriesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LISTA DE PRODUCTOS DISPONIBLES */}
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {availableProducts.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">No se encontraron productos con existencias disponibles.</p>
                  </div>
                ) : (
                  availableProducts.map((p) => {
                    const inCartItem = selectedItems.find((i) => i.productId === p.id);
                    const qtyInCart = inCartItem?.quantity || 0;
                    const remainingStock = p.stock - qtyInCart;

                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/20 transition-all gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-12 h-12 object-cover rounded-lg shrink-0 border border-slate-200" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-400">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-xs font-bold text-slate-900 truncate">{p.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                              <span className="font-mono">{p.barcode}</span>
                              <span>•</span>
                              <span>{p.categoryName}</span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs">
                              <span className="font-semibold text-slate-700">
                                Base: <strong className="text-slate-900">${p.cost > 0 ? p.cost.toFixed(2) : p.price.toFixed(2)}</strong>
                              </span>
                              <span className="text-slate-400">|</span>
                              <span className={`font-semibold ${remainingStock <= 5 ? 'text-amber-600' : 'text-emerald-700'}`}>
                                Disponible: {remainingStock} unid.
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddProductToOrder(p)}
                          disabled={remainingStock <= 0}
                          className="py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Agregar</span>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* LADO DERECHO: FORMULARIO DEL PEDIDO Y DESTINATARIO */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleSubmitOrder} className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">2. Datos del Cliente & Entrega</h2>
                <p className="text-xs text-slate-500">Información para despachar el pedido a su cliente final.</p>
              </div>

              {/* Nombre del Cliente (ej: Roques) */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Nombre del Cliente Destinatario *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="ej: Roques o Familia Roques"
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Teléfono y Ciudad */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Teléfono del Cliente *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+505 8888-0000"
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Ciudad / Municipio
                  </label>
                  <input
                    type="text"
                    value={customerCity}
                    onChange={(e) => setCustomerCity(e.target.value)}
                    placeholder="ej: Managua"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Dirección de Entrega */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Dirección Exacta de Entrega *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="Calle, Barrio, Puntos de referencia..."
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Notas del Pedido */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Instrucciones o Notas de Despacho (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="ej: Entregar en horario de la tarde, llamar antes de llegar..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* DETALLE Y COMISIÓN DEL AFILIADO */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-900">3. Artículos & Comisión del Afiliado</h3>
                  <span className="text-[11px] text-slate-500">{selectedItems.length} seleccionados</span>
                </div>

                {selectedItems.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">
                    Agregue productos desde la lista izquierda para fijar su comisión.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {selectedItems.map((item, idx) => (
                      <div key={item.productId} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{item.productName}</p>
                            <p className="text-[11px] text-slate-500">Base VARIEDADES CS: ${item.basePrice.toFixed(2)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Cantidad y Precio de Venta fijado por el afiliado */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] font-semibold text-slate-600 block">Cantidad:</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(idx, item.quantity - 1)}
                                className="w-6 h-6 rounded border border-slate-300 bg-white flex items-center justify-center hover:bg-slate-100 text-xs font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-8 text-center font-bold text-slate-900">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => handleUpdateItemQuantity(idx, item.quantity + 1)}
                                className="w-6 h-6 rounded border border-slate-300 bg-white flex items-center justify-center hover:bg-slate-100 text-xs font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold text-slate-600 block">Precio al Cliente ($):</span>
                            <input
                              type="number"
                              step="0.5"
                              min={item.basePrice}
                              value={item.salePrice}
                              onChange={(e) => handleUpdateItemSalePrice(idx, parseFloat(e.target.value) || item.basePrice)}
                              className="w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 mt-0.5"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                          <span className="text-emerald-700 font-semibold">
                            Su ganancia: +${item.totalCommission.toFixed(2)} (${item.unitCommission.toFixed(2)}/u)
                          </span>
                          <span className="text-slate-900 font-bold">Subtotal: ${item.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TOTALES FINALES */}
              {selectedItems.length > 0 && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Costo Base VARIEDADES CS:</span>
                    <span className="font-semibold">${cartTotals.baseTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Su Comisión / Ganancia Neta:</span>
                    <span>+${cartTotals.commissionTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-1 border-t border-blue-200">
                    <span>Total a Cobrar al Cliente:</span>
                    <span className="text-blue-700">${cartTotals.grandTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-right text-[11px] text-slate-500 font-mono">
                    ≈ C$ {(cartTotals.grandTotal * exchangeRate).toFixed(2)} Córdobas
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || selectedItems.length === 0}
                className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Enviando pedido...' : 'Confirmar y Enviar Pedido a Despacho'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: LISTADO DE PEDIDOS (AFILIADOS O ADMINISTRADOR)   */}
      {/* ======================================================== */}
      {(activeTab === 'my-orders' || activeTab === 'admin-orders') && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isAdmin ? 'Todos los Pedidos de la Red de Afiliados' : 'Historial de Mis Pedidos Realizados'}
              </h2>
              <p className="text-xs text-slate-500">
                {isAdmin
                  ? 'Revise pedidos entrantes, direcciones de entrega, productos y apruebe despachos.'
                  : 'Siga en tiempo real el estado de entrega de los pedidos enviados para sus clientes.'}
              </p>
            </div>

            {/* FILTROS ADMIN */}
            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  placeholder="Buscar por cliente, pedido..."
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 w-48"
                />

                <select
                  value={adminStatusFilter}
                  onChange={(e) => setAdminStatusFilter(e.target.value)}
                  className="py-1.5 px-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
                >
                  <option value="all">Todos los estados</option>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Aprobado">Aprobado</option>
                  <option value="En Camino">En Camino</option>
                  <option value="Entregado">Entregado</option>
                  <option value="Cancelado">Cancelado</option>
                </select>

                <select
                  value={adminAffiliateFilter}
                  onChange={(e) => setAdminAffiliateFilter(e.target.value)}
                  className="py-1.5 px-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-600"
                >
                  <option value="all">Todos los afiliados</option>
                  {affiliates.map((aff) => (
                    <option key={aff.id} value={aff.id}>
                      {aff.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {displayedOrders.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No hay pedidos registrados</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAffiliate
                  ? 'Aún no ha creado pedidos para clientes. Ingrese a "Hacer Pedido" para comenzar.'
                  : 'No se encontraron pedidos con los filtros seleccionados.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Pedido #</th>
                    <th className="py-2.5 px-3">Fecha</th>
                    {isAdmin && <th className="py-2.5 px-3">Afiliado / Vendedor</th>}
                    <th className="py-2.5 px-3">Cliente Destinatario</th>
                    <th className="py-2.5 px-3">Dirección de Entrega</th>
                    <th className="py-2.5 px-3 text-right">Comisión Afiliado</th>
                    <th className="py-2.5 px-3 text-right">Total Pedido</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedOrders.map((order) => {
                    const statusColors: Record<OrderStatus, { bg: string; text: string; icon: React.ReactNode }> = {
                      Pendiente: { bg: 'bg-amber-100', text: 'text-amber-800', icon: <Clock className="w-3 h-3" /> },
                      Aprobado: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <CheckCircle2 className="w-3 h-3" /> },
                      'En Camino': { bg: 'bg-purple-100', text: 'text-purple-800', icon: <Truck className="w-3 h-3" /> },
                      Entregado: { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCheck className="w-3 h-3" /> },
                      Cancelado: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> },
                    };
                    const color = statusColors[order.status] || statusColors.Pendiente;

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">{order.orderNumber}</td>
                        <td className="py-3 px-3 text-slate-500">
                          {order.date} <span className="text-[10px] text-slate-400">{order.time}</span>
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {order.affiliateName}
                            {order.affiliatePhone && <span className="block text-[10px] text-slate-400 font-normal">{order.affiliatePhone}</span>}
                          </td>
                        )}
                        <td className="py-3 px-3">
                          <strong className="text-slate-900 block font-semibold">{order.customerName}</strong>
                          <span className="text-[11px] text-slate-500">{order.customerPhone}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={order.customerAddress}>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{order.customerAddress}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-700">
                          +${order.affiliateCommissionTotal?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          ${order.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${color.bg} ${color.text}`}
                          >
                            {color.icon}
                            <span>{order.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Ver detalle */}
                            <button
                              type="button"
                              onClick={() => setViewingOrder(order)}
                              title="Ver detalle del pedido"
                              className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Notificar por Gmail (Solo Admin o remitente) */}
                            <button
                              type="button"
                              onClick={() => handleOpenEmailModal(order)}
                              title="Enviar notificación vía Gmail"
                              className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded cursor-pointer"
                            >
                              <Mail className="w-4 h-4" />
                            </button>

                            {/* Cambio de estado para administrador */}
                            {isAdmin && (
                              <select
                                value={order.status}
                                onChange={(e) => onUpdateOrderStatus(order.id, e.target.value as OrderStatus)}
                                className="py-0.5 px-1.5 border border-slate-300 rounded text-[11px] font-semibold text-slate-700 bg-white"
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Aprobado">Aprobado</option>
                                <option value="En Camino">En Camino</option>
                                <option value="Entregado">Entregado</option>
                                <option value="Cancelado">Cancelado</option>
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 3: CATÁLOGO DE PRODUCTOS DISPONIBLES               */}
      {/* ======================================================== */}
      {activeTab === 'catalog' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Catálogo de Productos para Afiliados</h2>
              <p className="text-xs text-slate-500">
                Consulte existencias en tiempo real de los artículos disponibles en bodega para vender a sus clientes.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  placeholder="Buscar en catálogo..."
                  className="pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-600 w-52"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pt-2">
            {availableProducts.map((prod) => (
              <div
                key={prod.id}
                className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col bg-white"
              >
                {prod.imageUrl ? (
                  <img src={prod.imageUrl} alt={prod.name} className="w-full h-40 object-cover bg-slate-100" />
                ) : (
                  <div className="w-full h-40 bg-slate-100 flex items-center justify-center text-slate-300">
                    <Package className="w-12 h-12" />
                  </div>
                )}
                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      {prod.categoryName || 'General'}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-2">{prod.name}</h3>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">{prod.barcode}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Base Afiliado:</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        ${prod.cost > 0 ? prod.cost.toFixed(2) : prod.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Existencias:</span>
                      <span
                        className={`font-bold text-xs ${
                          prod.stock <= 5 ? 'text-amber-600' : 'text-emerald-700'
                        }`}
                      >
                        {prod.stock} unid.
                      </span>
                    </div>
                  </div>

                  {isAffiliate && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAddProductToOrder(prod);
                        setActiveTab('create-order');
                      }}
                      disabled={prod.stock <= 0}
                      className="w-full py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Hacer Pedido</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DETALLE DE PEDIDO                                  */}
      {/* ======================================================== */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Detalle del Pedido</span>
                <h3 className="text-lg font-bold text-slate-900">{viewingOrder.orderNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Info del Cliente */}
            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">Cliente Destinatario:</span>
                <strong className="text-slate-900 font-bold">{viewingOrder.customerName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Teléfono:</span>
                <span className="text-slate-900 font-medium">{viewingOrder.customerPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dirección de Entrega:</span>
                <span className="text-slate-900 font-medium">{viewingOrder.customerAddress} ({viewingOrder.customerCity})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Afiliado que Gestiona:</span>
                <span className="text-slate-900 font-semibold">{viewingOrder.affiliateName} ({viewingOrder.affiliatePhone || 'Sin tel.'})</span>
              </div>
              {viewingOrder.notes && (
                <div className="pt-1 text-slate-600 border-t border-slate-200">
                  <strong>Notas:</strong> {viewingOrder.notes}
                </div>
              )}
            </div>

            {/* Artículos */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Productos Solicitados</h4>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                {viewingOrder.items.map((i) => (
                  <div key={i.productId} className="p-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{i.productName}</p>
                      <p className="text-[11px] text-slate-500">
                        {i.quantity} unid. × ${i.salePrice.toFixed(2)} (Base: ${i.basePrice.toFixed(2)})
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900">${i.subtotal.toFixed(2)}</p>
                      <p className="text-[10px] text-emerald-700 font-semibold">+${i.totalCommission.toFixed(2)} comisión</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totales */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Costo Base VARIEDADES CS:</span>
                <span className="font-semibold">${viewingOrder.baseTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Comisión para el Afiliado:</span>
                <span>+${viewingOrder.affiliateCommissionTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-blue-900 pt-1 border-t border-blue-200">
                <span>Total a Cobrar al Cliente:</span>
                <span>${viewingOrder.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={() => {
                  const ord = viewingOrder;
                  setViewingOrder(null);
                  handleOpenEmailModal(ord);
                }}
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Notificar por Gmail</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE CONFIRMACIÓN DE ENVÍO POR GMAIL (OAUTH WORKSPACE)*/}
      {/* ======================================================== */}
      {emailModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Confirmar Envío de Correo Oficial (Gmail)</h3>
                <p className="text-[11px] text-slate-500">
                  Despachar notificación de estado del pedido <strong>#{emailModalOrder.orderNumber}</strong>
                </p>
              </div>
            </div>

            {emailStatusMsg && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                  emailStatusMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {emailStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <span>{emailStatusMsg.text}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Destinatario del Correo *
                </label>
                <input
                  type="email"
                  required
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="ej: cliente@gmail.com o afiliado@gmail.com"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
                <span className="text-[10px] text-slate-400">
                  Se enviará desde la cuenta autorizada de Gmail de VARIEDADES CS.
                </span>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">
                  Nota Adicional para el Correo (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={emailCustomNote}
                  onChange={(e) => setEmailCustomNote(e.target.value)}
                  placeholder="ej: El repartidor llegará aproximadamente a las 3:00 PM con su paquete."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong>Cliente:</strong> {emailModalOrder.customerName}
                </p>
                <p>
                  <strong>Estado actual:</strong> {emailModalOrder.status}
                </p>
                <p>
                  <strong>Total:</strong> ${emailModalOrder.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmailModalOrder(null)}
                className="w-1/3 py-2 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSendGmailNotification}
                disabled={isSendingEmail}
                className="w-2/3 py-2 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSendingEmail ? 'Enviando vía Gmail...' : 'Confirmar y Enviar Correo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
