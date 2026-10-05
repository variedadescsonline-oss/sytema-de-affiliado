import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Package,
  Tags,
  ShoppingCart,
  Receipt,
  Truck,
  Users,
  Building2,
  CreditCard,
  Wallet,
  Boxes,
  RotateCcw,
  FileBarChart,
  UserCog,
  ShieldCheck,
  Settings,
  Menu,
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Smartphone,
  ShoppingBag,
  Mail,
} from 'lucide-react';
import {
  testConnection,
  ensureFirebaseAuth,
  subscribeToAuth,
  saveDocument,
  removeDocument,
  saveCompanyConfig,
  checkAndSeedFirestore,
  subscribeToCollection,
  subscribeToDocument,
  registerFirebaseAuthUser,
} from './services/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  FullBackupData,
} from './utils/backupAndImages';
import {
  ModuleId,
  Category,
  Product,
  Sale,
  SaleItem,
  PaymentMethod,
  Purchase,
  PurchaseItem,
  Client,
  Supplier,
  CreditAccount,
  CashSession,
  CashMovement,
  InventoryMovement,
  ReturnRecord,
  SystemUser,
  AuditEntry,
  CompanyConfig,
  AffiliateOrder,
  OrderStatus,
} from './types/erp';
import {
  TODAY_DATE,
  INITIAL_CONFIG,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_CLIENTS,
  INITIAL_SUPPLIERS,
  INITIAL_SALES,
  INITIAL_PURCHASES,
  INITIAL_CREDITS,
  INITIAL_CASH_SESSION,
  INITIAL_CASH_MOVEMENTS,
  INITIAL_INVENTORY_MOVEMENTS,
  INITIAL_RETURNS,
  INITIAL_USERS,
  INITIAL_AUDIT_LOGS,
  AUTHORIZED_EMAILS,
  INITIAL_AFFILIATE_ORDERS,
} from './data/initialData';
import { ReceiptModal } from './components/ui/EnterpriseComponents';
import { ActionDotsMenu } from './components/ui/ActionDotsMenu';
import { DashboardView } from './components/modules/DashboardView';
import { POSView } from './components/modules/POSView';
import {
  ProductosView,
  CategoriasView,
  InventarioView,
} from './components/modules/InventoryCatalogViews';
import {
  VentasView,
  ComprasView,
  DevolucionesView,
} from './components/modules/OperationsViews';
import {
  ClientesView,
  ProveedoresView,
  CreditosView,
} from './components/modules/DirectoryCreditViews';
import {
  CajaView,
  ReportesView,
  UsuariosView,
  AuditoriaView,
  ConfiguracionView,
} from './components/modules/AdminFinanceViews';
import { SystemLoginModal } from './components/ui/SystemLoginModal';
import { MobileScannerView } from './components/modules/MobileScannerView';
import { RemoteScannerModal } from './components/modules/RemoteScannerModal';
import { AffiliatePortalViews } from './components/modules/AffiliatePortalViews';
import { AffiliatesDirectoryView } from './components/modules/AffiliatesDirectoryView';
import { GmailCenterView } from './components/modules/GmailCenterView';

interface MenuItem {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ALL_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pedidos-afiliados', label: 'Pedidos Afiliados', icon: ShoppingBag },
  { id: 'afiliados', label: 'Directorio Afiliados', icon: Users },
  { id: 'productos', label: 'Productos & Stock', icon: Package },
  { id: 'categorias', label: 'Categorías', icon: Tags },
  { id: 'pos', label: 'Punto de Venta', icon: ShoppingCart },
  { id: 'ventas', label: 'Ventas', icon: Receipt },
  { id: 'gmail-center', label: 'Centro Gmail', icon: Mail },
  { id: 'compras', label: 'Compras', icon: Truck },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'proveedores', label: 'Proveedores', icon: Building2 },
  { id: 'creditos', label: 'Créditos', icon: CreditCard },
  { id: 'caja', label: 'Caja', icon: Wallet },
  { id: 'inventario', label: 'Inventario', icon: Boxes },
  { id: 'devoluciones', label: 'Devoluciones', icon: RotateCcw },
  { id: 'reportes', label: 'Reportes', icon: FileBarChart },
  { id: 'usuarios', label: 'Usuarios', icon: UserCog },
  { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck },
  { id: 'configuracion', label: 'Configuración', icon: Settings },
];

const STORAGE_KEY = 'variedades_cs_erp_state_v1';

function getSavedData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed && parsed[key] !== undefined && parsed[key] !== null) {
      if (Array.isArray(fallback) && !Array.isArray(parsed[key])) return fallback;
      return parsed[key];
    }
  } catch {
    // fallback
  }
  return fallback;
}

function getCurrentTimeStr(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function getCurrentTimestampStr(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${TODAY_DATE} ${hh}:${mm}:${ss}`;
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core ERP State with persistent hydration
  const [config, setConfig] = useState<CompanyConfig>(() => getSavedData('config', INITIAL_CONFIG));
  const [categories, setCategories] = useState<Category[]>(() => getSavedData('categories', INITIAL_CATEGORIES));
  const [products, setProducts] = useState<Product[]>(() => getSavedData('products', INITIAL_PRODUCTS));
  const [clients, setClients] = useState<Client[]>(() => getSavedData('clients', INITIAL_CLIENTS));
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => getSavedData('suppliers', INITIAL_SUPPLIERS));
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = getSavedData<Sale[]>('sales', INITIAL_SALES);
    const ghostIds = new Set(['sal-1001', 'sal-1002', 'sal-1003', 'sal-1004']);
    let deleted = new Set<string>();
    try {
      deleted = new Set<string>(JSON.parse(localStorage.getItem('deleted_sales_ids') || '[]'));
    } catch {}
    return saved.filter((s) => !ghostIds.has(s.id) && !deleted.has(s.id));
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() => getSavedData('purchases', INITIAL_PURCHASES));
  const [credits, setCredits] = useState<CreditAccount[]>(() => getSavedData('credits', INITIAL_CREDITS));
  const [cashSession, setCashSession] = useState<CashSession>(() => getSavedData('cashSession', INITIAL_CASH_SESSION));
  const [cashMovements, setCashMovements] = useState<CashMovement[]>(() => getSavedData('cashMovements', INITIAL_CASH_MOVEMENTS));
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(() => getSavedData('inventoryMovements', INITIAL_INVENTORY_MOVEMENTS));
  const [returns, setReturns] = useState<ReturnRecord[]>(() => getSavedData('returns', INITIAL_RETURNS));
  const [users, setUsers] = useState<SystemUser[]>(() => getSavedData('users', INITIAL_USERS));
  const [affiliateOrders, setAffiliateOrders] = useState<AffiliateOrder[]>(() =>
    getSavedData('affiliateOrders', INITIAL_AFFILIATE_ORDERS)
  );
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const savedAuth = localStorage.getItem('variedades_cs_auth_user') || sessionStorage.getItem('variedades_cs_auth_user');
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed.id) return parsed.id;
      }
    } catch {}
    return 'usr-admin';
  });
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>(() => getSavedData('auditLogs', INITIAL_AUDIT_LOGS));

  // User Authentication State (Login / Password Protection)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return !!(localStorage.getItem('variedades_cs_auth_user') || sessionStorage.getItem('variedades_cs_auth_user'));
    } catch {
      return false;
    }
  });

  // Mobile Remote Barcode Scanner Session (?scannerSession=xyz)
  const [remoteScannerSessionId, setRemoteScannerSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const qSession = params.get('scannerSession');
    if (qSession) return qSession;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return hashParams.get('scannerSession') || null;
  });

  // Remote scanner pairing launcher modal
  const [showRemoteScannerLauncher, setShowRemoteScannerLauncher] = useState<boolean>(false);

  // Active receipt modal
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);

  // Firebase Cloud State
  const [firebaseConnected, setFirebaseConnected] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [cloudSyncNotice, setCloudSyncNotice] = useState<string | null>(null);

  const handleUpdatePassword = (email: string, newPass: string) => {
    const clean = email.trim().toLowerCase();
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.email?.toLowerCase() === clean || u.username.toLowerCase() === clean.split('@')[0]) {
          return { ...u, pin: newPass };
        }
        return u;
      });
      try {
        const target = updated.find((u) => u.email?.toLowerCase() === clean || u.username.toLowerCase() === clean.split('@')[0]);
        if (target && firebaseConnected) {
          saveDocument('users', target).catch(console.error);
        }
      } catch {}
      return updated;
    });
    addAudit(
      'Seguridad',
      'Restablecimiento Criptográfico de Contraseña',
      `Se actualizó la contraseña de acceso con éxito para la cuenta: ${clean}`,
      'Normal'
    );
  };

  const handleRegisterUser = (newUser: SystemUser, businessName?: string) => {
    setUsers((prev) => [newUser, ...prev]);
    if (businessName && businessName.trim()) {
      setConfig((prev) => {
        const updated = { ...prev, companyName: businessName.trim() };
        if (firebaseConnected) {
          saveCompanyConfig(updated).catch(console.error);
        }
        return updated;
      });
    }
    if (firebaseConnected) {
      saveDocument('users', newUser).catch(console.error);
      if (newUser.email && newUser.pin) {
        registerFirebaseAuthUser(newUser.email, newUser.pin).catch(console.error);
      }
    }
    addAudit(
      'Usuarios',
      'Registro de Nuevo Negocio / Administrador',
      `Se registró la cuenta de negocio "${businessName || 'Nuevo Negocio'}" a nombre de ${newUser.fullName} (@${newUser.username}).`,
      'Normal'
    );
    handleUserLogin(newUser, true);
  };

  // Initialize and test Firebase connection, activate session & listen to Auth
  useEffect(() => {
    testConnection().then((ok) => {
      setFirebaseConnected(ok);
    });

    ensureFirebaseAuth().then((user) => {
      if (user) {
        setFirebaseUser(user);
        setAuthReady(true);
      }
    });

    const unsubscribeAuth = subscribeToAuth((user) => {
      if (user) setFirebaseUser(user);
      setAuthReady(true);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Listen to remote Firestore updates in Real-Time across all devices
  useEffect(() => {
    if (!firebaseConnected) return;

    checkAndSeedFirestore({
      config: INITIAL_CONFIG,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      clients: INITIAL_CLIENTS,
      suppliers: INITIAL_SUPPLIERS,
      sales: INITIAL_SALES,
      purchases: INITIAL_PURCHASES,
      credits: INITIAL_CREDITS,
      cashMovements: INITIAL_CASH_MOVEMENTS,
      cashSessions: [INITIAL_CASH_SESSION],
      inventoryMovements: INITIAL_INVENTORY_MOVEMENTS,
      returns: INITIAL_RETURNS,
      users: INITIAL_USERS,
      auditEntries: INITIAL_AUDIT_LOGS,
    }).catch((err) => console.warn('Firebase initial seed check:', err));

    const unsubs: (() => void)[] = [];

    unsubs.push(
      subscribeToCollection<Category>('categories', (remoteCats) => {
        const activeCats = remoteCats.filter((c) => c.active !== false);
        if (activeCats.length > 0) setCategories(activeCats);
      })
    );

    unsubs.push(
      subscribeToCollection<Product>('products', (remoteProds) => {
        const activeProds = remoteProds.filter((p) => p.active !== false);
        if (activeProds.length > 0) setProducts(activeProds);
      })
    );

    unsubs.push(
      subscribeToCollection<Client>('clients', (remoteClients) => {
        let deleted = new Set<string>();
        try {
          deleted = new Set(JSON.parse(localStorage.getItem('deleted_clients_ids') || '[]'));
        } catch {}
        const activeClients = remoteClients.filter((cli) => cli.active !== false && !deleted.has(cli.id));
        setClients(activeClients);
      })
    );

    unsubs.push(
      subscribeToCollection<Supplier>('suppliers', (remoteSupps) => {
        let deleted = new Set<string>();
        try {
          deleted = new Set(JSON.parse(localStorage.getItem('deleted_suppliers_ids') || '[]'));
        } catch {}
        const activeSupps = remoteSupps.filter((s) => s.active !== false && !deleted.has(s.id));
        setSuppliers(activeSupps);
      })
    );

    unsubs.push(
      subscribeToCollection<Sale>('sales', (remoteSales) => {
        let deleted = new Set<string>();
        try {
          deleted = new Set<string>(JSON.parse(localStorage.getItem('deleted_sales_ids') || '[]'));
        } catch {}
        const ghostIds = new Set(['sal-1001', 'sal-1002', 'sal-1003', 'sal-1004']);
        const validRemote = remoteSales.filter((s) => !ghostIds.has(s.id) && !deleted.has(s.id));
        setSales(validRemote.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (b.time || '').localeCompare(a.time || '');
        }));
      })
    );

    unsubs.push(
      subscribeToCollection<Purchase>('purchases', (remotePurchases) => {
        const cleanPurchases = remotePurchases.filter((p) => p.id !== 'pur-501' && p.id !== 'pur-502');
        setPurchases(cleanPurchases);
      })
    );

    unsubs.push(
      subscribeToCollection<CreditAccount>('credits', (remoteCredits) => {
        setCredits(remoteCredits);
      })
    );

    unsubs.push(
      subscribeToCollection<CashMovement>('cashMovements', (remoteMovements) => {
        const cleanMovements = remoteMovements.filter((m) => m.id !== 'cm-1' && m.id !== 'cm-2');
        setCashMovements(cleanMovements);
      })
    );

    unsubs.push(
      subscribeToCollection<CashSession>('cashSessions', (remoteSessions) => {
        if (remoteSessions.length > 0) {
          const active = remoteSessions.find((s) => s.status === 'Abierta') || remoteSessions[0];
          setCashSession(active);
        }
      })
    );

    unsubs.push(
      subscribeToCollection<InventoryMovement>('inventoryMovements', (remoteInv) => {
        if (remoteInv.length > 0) {
          setInventoryMovements((localInv) => {
            const map = new Map<string, InventoryMovement>();
            localInv.forEach((m) => map.set(m.id, m));
            remoteInv.forEach((m) => map.set(m.id, m));
            return Array.from(map.values());
          });
        }
      })
    );

    unsubs.push(
      subscribeToCollection<AffiliateOrder>('affiliateOrders', (remoteOrders) => {
        if (remoteOrders.length > 0) {
          setAffiliateOrders(remoteOrders);
        }
      })
    );

    unsubs.push(
      subscribeToCollection<SystemUser>('users', (remoteUsers) => {
        if (remoteUsers.length > 0) {
          setUsers(remoteUsers);
        }
      })
    );

    unsubs.push(
      subscribeToDocument<CompanyConfig>('config/company', (remoteConfig) => {
        if (remoteConfig) setConfig((prev) => ({ ...prev, ...remoteConfig }));
      })
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [firebaseConnected]);

  const handleUpdateUserPin = (userId: string, newPin: string) => {
    setUsers((prev) => {
      const updated = prev.map((u) => (u.id === userId ? { ...u, pin: newPin } : u));
      try {
        const updatedUser = updated.find((u) => u.id === userId);
        if (updatedUser && firebaseConnected) {
          saveDocument('users', updatedUser).catch(console.error);
        }
      } catch {}
      return updated;
    });
    addAudit(
      'Seguridad',
      'Restablecimiento de Contraseña',
      `Se restableció la clave de acceso de seguridad para el usuario ID: ${userId}`,
      'Normal'
    );
  };

  // Load persisted state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.config) {
          setConfig((prev) => ({
            ...prev,
            ...parsed.config,
            currencySymbol: '$',
            currencyCode: 'USD',
            exchangeRate: parsed.config.exchangeRate || 37,
          }));
        }
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.products) setProducts(parsed.products);
        if (parsed.clients) setClients(parsed.clients);
        if (parsed.suppliers) setSuppliers(parsed.suppliers);
        if (parsed.sales && Array.isArray(parsed.sales)) {
          const ghostIds = new Set(['sal-1001', 'sal-1002', 'sal-1003', 'sal-1004']);
          const cleanSales = parsed.sales.filter((s: Sale) => !ghostIds.has(s.id));
          setSales(cleanSales);
        }
        if (parsed.purchases && Array.isArray(parsed.purchases)) {
          const cleanPurchases = parsed.purchases.filter((p: Purchase) => p.id !== 'pur-501' && p.id !== 'pur-502');
          setPurchases(cleanPurchases);
        }
        if (parsed.credits && Array.isArray(parsed.credits)) setCredits(parsed.credits);
        if (parsed.cashSession) {
          const cleanSession = parsed.cashSession.id === 'caja-20260928-01' ? INITIAL_CASH_SESSION : parsed.cashSession;
          setCashSession(cleanSession);
        }
        if (parsed.cashMovements && Array.isArray(parsed.cashMovements)) {
          const cleanCm = parsed.cashMovements.filter((m: CashMovement) => m.id !== 'cm-1' && m.id !== 'cm-2');
          setCashMovements(cleanCm);
        }
        if (parsed.inventoryMovements && Array.isArray(parsed.inventoryMovements)) {
          const cleanInv = parsed.inventoryMovements.filter((i: InventoryMovement) => i.id !== 'inv-1');
          setInventoryMovements(cleanInv);
        }
        if (parsed.returns) setReturns(parsed.returns);
        if (parsed.users && Array.isArray(parsed.users)) {
          const cleanUsers = parsed.users.filter(
            (u: SystemUser) => u.username !== 'urielroques604' && u.username !== 'angeles9224sg' && u.username !== 'variedades.online'
          );
          if (cleanUsers.length > 0) setUsers(cleanUsers);
          else setUsers(INITIAL_USERS);
        }
        if (parsed.affiliateOrders && Array.isArray(parsed.affiliateOrders)) {
          setAffiliateOrders(parsed.affiliateOrders);
        }
        if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
      }
    } catch {
      // Fallback to initial state if storage unavailable
    }
  }, []);

  // Save state changes
  useEffect(() => {
    try {
      const payload = {
        config,
        categories,
        products,
        clients,
        suppliers,
        sales,
        purchases,
        credits,
        cashSession,
        cashMovements,
        inventoryMovements,
        returns,
        users,
        affiliateOrders,
        auditLogs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }, [
    config,
    categories,
    products,
    clients,
    suppliers,
    sales,
    purchases,
    credits,
    cashSession,
    cashMovements,
    inventoryMovements,
    returns,
    users,
    affiliateOrders,
    auditLogs,
  ]);

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) || users[0],
    [users, currentUserId]
  );

  const currentUserDisplay = `${currentUser.fullName} (${currentUser.role})`;

  const menuItems = useMemo<MenuItem[]>(() => {
    if (currentUser.role === 'Afiliado') {
      return [
        { id: 'pedidos-afiliados', label: 'Hacer Pedido & Mis Clientes', icon: ShoppingBag },
        { id: 'productos', label: 'Catálogo de Inventario', icon: Package },
        { id: 'gmail-center', label: 'Notificaciones Gmail', icon: Mail },
      ];
    }
    return ALL_MENU_ITEMS;
  }, [currentUser.role]);

  const addAudit = (
    moduleName: string,
    action: string,
    detail: string,
    severity: AuditEntry['severity'] = 'Normal'
  ) => {
    const newEntry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: getCurrentTimestampStr(),
      user: currentUser.fullName,
      role: currentUser.role,
      module: moduleName,
      action,
      detail,
      severity,
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
  };

  // --- HANDLERS: RED DE AFILIADOS Y PEDIDOS ---
  const handleSaveAffiliateOrder = async (order: AffiliateOrder) => {
    setAffiliateOrders((prev) => {
      const idx = prev.findIndex((o) => o.id === order.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = order;
        return copy;
      }
      return [order, ...prev];
    });

    if (firebaseConnected) {
      try {
        await saveDocument('affiliateOrders', order);
      } catch (err) {
        console.error('Error saving affiliate order in Firestore:', err);
      }
    }

    addAudit(
      'Afiliados',
      'Nuevo Pedido de Afiliado',
      `El afiliado ${order.affiliateName} generó el pedido ${order.orderNumber} para "${order.customerName}" (Total: $${order.totalAmount.toFixed(2)}, Comisión: $${order.affiliateCommissionTotal.toFixed(2)}).`,
      'Normal'
    );
  };

  const handleUpdateAffiliateOrderStatus = async (
    orderId: string,
    newStatus: OrderStatus,
    customNote?: string
  ) => {
    let targetOrder: AffiliateOrder | null = null;
    setAffiliateOrders((prev) => {
      const updated: AffiliateOrder[] = prev.map((o) => {
        if (o.id === orderId) {
          const logEntry = {
            date: new Date().toISOString(),
            message: `Estado actualizado a "${newStatus}"${customNote ? ` - ${customNote}` : ''}`,
            recipient: o.affiliateEmail || 'afiliado',
          };
          const modOrder: AffiliateOrder = {
            ...o,
            status: newStatus,
            notificationLog: [...(o.notificationLog || []), logEntry],
            updatedAt: new Date().toISOString(),
          };
          targetOrder = modOrder;
          return modOrder;
        }
        return o;
      });
      return updated;
    });

    if (targetOrder && firebaseConnected) {
      try {
        await saveDocument('affiliateOrders', targetOrder);
      } catch (err) {
        console.error('Error updating order status in Firestore:', err);
      }
    }

    addAudit(
      'Afiliados',
      'Actualización Estado Pedido',
      `El pedido ${orderId} fue marcado como "${newStatus}".`,
      'Normal'
    );
  };

  const handleUpdateStockFromAffiliate = (productId: string, deltaStock: number) => {
    setProducts((prev) => {
      const updated = prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, p.stock + deltaStock);
          const updatedProd = { ...p, stock: newStock };
          if (firebaseConnected) {
            saveDocument('products', updatedProd).catch(console.error);
          }
          return updatedProd;
        }
        return p;
      });
      return updated;
    });
  };

  /* ==========================================================================
     HANDLERS INTERCONECTADOS DEL ERP
     ========================================================================== */

  // 1. Completar Venta en POS
  const handleCompleteSale = (saleData: {
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
  }): Sale => {
    let maxNumber = 1040;
    for (const s of sales) {
      const match = s.invoiceNumber.match(/\d+$/);
      if (match) {
        const n = parseInt(match[0], 10);
        if (n > maxNumber) maxNumber = n;
      }
    }
    const nextNumber = maxNumber + 1;
    const invoiceNumber = `${config.invoicePrefix}${String(nextNumber).padStart(6, '0')}`;
    const clientObj =
      clients.find((c) => c.id === saleData.clientId) || clients[0];
    const timeStr = getCurrentTimeStr();

    const newSale: Sale = {
      id: `sal-${Date.now()}`,
      invoiceNumber,
      date: TODAY_DATE,
      time: timeStr,
      sellerId: currentUser.id,
      sellerName: currentUserDisplay,
      clientId: clientObj.id,
      clientName: clientObj.name,
      clientDocument: clientObj.document,
      items: saleData.items,
      subtotal: saleData.subtotal,
      discountTotal: saleData.discountTotal,
      taxTotal: saleData.taxTotal,
      total: saleData.total,
      profit: saleData.profit,
      paymentMethod: saleData.paymentMethod,
      amountReceived: saleData.amountReceived,
      change: saleData.change,
      status: 'Completada',
    };

    // Descontar Stock y crear Movimientos de Inventario
    const newInvMovements: InventoryMovement[] = [];
    const updatedProducts = products.map((prod) => {
      const soldItem = saleData.items.find((i) => i.productId === prod.id);
      if (!soldItem) return prod;
      const prevStock = prod.stock;
      const nextStock = Math.max(0, prevStock - soldItem.quantity);
      newInvMovements.push({
        id: `inv-${Date.now()}-${prod.id}`,
        date: TODAY_DATE,
        time: timeStr,
        productId: prod.id,
        barcode: prod.barcode,
        productName: prod.name,
        type: 'Salida',
        quantity: soldItem.quantity,
        previousStock: prevStock,
        newStock: nextStock,
        reference: invoiceNumber,
        reason: `Venta POS (${saleData.paymentMethod})`,
        user: currentUserDisplay,
      });
      return { ...prod, stock: nextStock };
    });

    const updatedInv = [...newInvMovements, ...inventoryMovements];
    const updatedSales = [newSale, ...sales];

    setProducts(updatedProducts);
    setInventoryMovements(updatedInv);
    setSales(updatedSales);

    // Respaldo instantáneo en localStorage para asegurar que nunca se pierda la venta
    try {
      const snap = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      snap.sales = updatedSales;
      snap.products = updatedProducts;
      snap.inventoryMovements = updatedInv;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (e) {
      console.warn('Error guardando venta en almacenamiento local:', e);
    }

    // Async sync to Firebase Firestore
    saveDocument('sales', newSale).catch(console.error);
    saleData.items.forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      if (prod) {
        saveDocument('products', { ...prod, stock: Math.max(0, prod.stock - item.quantity) }).catch(console.error);
      }
    });

    if (saleData.paymentMethod === 'Crédito') {
      // Crear Cuenta por Cobrar y sumar saldo al cliente
      const newCredit: CreditAccount = {
        id: `cred-${Date.now()}`,
        saleId: newSale.id,
        invoiceNumber,
        clientId: clientObj.id,
        clientName: clientObj.name,
        clientPhone: clientObj.phone,
        issueDate: TODAY_DATE,
        dueDate: '2026-10-27',
        totalAmount: saleData.total,
        paidAmount: 0,
        balance: saleData.total,
        status: 'Vigente',
        payments: [],
      };
      setCredits((prev) => [newCredit, ...prev]);
      saveDocument('credits', newCredit).catch(console.error);
      const updatedClient = { ...clientObj, currentBalance: clientObj.currentBalance + saleData.total };
      setClients((prev) =>
        prev.map((c) =>
          c.id === clientObj.id
            ? updatedClient
            : c
        )
      );
      saveDocument('clients', updatedClient).catch(console.error);
    } else {
      // Registrar Ingreso en Caja
      const newCashMov: CashMovement = {
        id: `cm-${Date.now()}`,
        date: TODAY_DATE,
        time: timeStr,
        type: 'Ingreso',
        category: 'Venta',
        paymentMethod: saleData.paymentMethod,
        reference: invoiceNumber,
        description: `Venta POS ${invoiceNumber} - ${clientObj.name}`,
        amount: saleData.total,
        user: currentUserDisplay,
      };
      setCashMovements((prev) => [newCashMov, ...prev]);
      saveDocument('cashMovements', newCashMov).catch(console.error);
    }

    addAudit(
      'Punto de Venta',
      `Venta Registrada (${saleData.paymentMethod})`,
      `Factura ${invoiceNumber} emitida a ${clientObj.name} por $${saleData.total.toFixed(
        2
      )}.`,
      'Normal'
    );

    // Mostrar Comprobante / Recibo inmediatamente
    setReceiptSale(newSale);
    return newSale;
  };

  // 2. Anular Venta
  const handleCancelSale = (saleId: string, reason: string) => {
    const target = sales.find((s) => s.id === saleId);
    if (!target || target.status === 'Anulada') return;

    const timeStr = getCurrentTimeStr();
    const finalReason = reason || 'Anulación solicitada por el usuario';

    setSales((prev) =>
      prev.map((s) =>
        s.id === saleId
          ? { ...s, status: 'Anulada', cancelReason: finalReason }
          : s
      )
    );
    saveDocument('sales', { ...target, status: 'Anulada', cancelReason: finalReason }).catch(console.error);

    // Revertir Stock
    const revMovements: InventoryMovement[] = [];
    setProducts((prev) =>
      prev.map((prod) => {
        const item = target.items.find((i) => i.productId === prod.id);
        if (!item) return prod;
        const prevStock = prod.stock;
        const nextStock = prevStock + item.quantity;
        revMovements.push({
          id: `inv-rev-${Date.now()}-${prod.id}`,
          date: TODAY_DATE,
          time: timeStr,
          productId: prod.id,
          barcode: prod.barcode,
          productName: prod.name,
          type: 'Devolución',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: nextStock,
          reference: target.invoiceNumber,
          reason: `Reversión por anulación de factura: ${finalReason}`,
          user: currentUserDisplay,
        });
        const updatedProd = { ...prod, stock: nextStock };
        saveDocument('products', updatedProd).catch(console.error);
        return updatedProd;
      })
    );

    setInventoryMovements((prev) => [...revMovements, ...prev]);
    revMovements.forEach((m) => saveDocument('inventoryMovements', m).catch(console.error));

    // Si fue en efectivo, registrar ajuste de egreso por devolución si la caja está abierta
    if (target.paymentMethod === 'Efectivo') {
      setCashMovements((prev) => [
        {
          id: `cm-rev-${Date.now()}`,
          date: TODAY_DATE,
          time: timeStr,
          type: 'Egreso',
          category: 'Ajuste Caja',
          paymentMethod: 'Efectivo',
          reference: target.invoiceNumber,
          description: `Devolución de efectivo por anulación de factura ${target.invoiceNumber}`,
          amount: target.total,
          user: currentUserDisplay,
        },
        ...prev,
      ]);
    }

    addAudit(
      'Ventas',
      'Anulación de Factura',
      `Factura ${target.invoiceNumber} anulada. Motivo: ${finalReason}. Stock restaurado.`,
      'Crítico'
    );
  };

  const handleBatchImportSales = (importedSales: Partial<Sale>[]) => {
    setSales((prev) => {
      const existingInvoices = new Set(prev.map((s) => s.invoiceNumber.trim().toLowerCase()));
      const nextList = [...prev];

      importedSales.forEach((ns, idx) => {
        const invKey = (ns.invoiceNumber || `FAC-IMP-${Date.now()}-${idx}`).trim().toLowerCase();
        if (!existingInvoices.has(invKey)) {
          existingInvoices.add(invKey);
          const sale: Sale = {
            id: ns.id || `sale-imp-${Date.now()}-${idx}`,
            invoiceNumber: ns.invoiceNumber || `FAC-IMP-${Date.now()}-${idx}`,
            date: ns.date || TODAY_DATE,
            time: ns.time || getCurrentTimeStr(),
            sellerId: ns.sellerId || currentUser.id,
            sellerName: ns.sellerName || currentUserDisplay,
            clientId: ns.clientId || 'cli-cf',
            clientName: ns.clientName || 'Consumidor Final',
            clientDocument: ns.clientDocument || '000-000000-0000',
            items: ns.items || [
              {
                productId: `p-imp-${idx}`,
                barcode: `IMP-${idx}`,
                name: 'Registro Contable Importado',
                quantity: 1,
                price: ns.total || 0,
                cost: (ns.total || 0) - (ns.profit || 0),
                discount: ns.discountTotal || 0,
                subtotal: ns.subtotal || ns.total || 0,
              },
            ],
            subtotal: ns.subtotal || ns.total || 0,
            discountTotal: ns.discountTotal || 0,
            taxTotal: ns.taxTotal || 0,
            total: ns.total || 0,
            profit: ns.profit || Number(((ns.total || 0) * 0.3).toFixed(2)),
            paymentMethod: ns.paymentMethod || 'Efectivo',
            amountReceived: ns.amountReceived || ns.total || 0,
            change: ns.change || 0,
            status: ns.status || 'Completada',
          };
          nextList.unshift(sale);
          saveDocument('sales', sale).catch(console.error);
        }
      });

      return nextList;
    });

    addAudit(
      'Ventas',
      'Importación Masiva Excel / CSV',
      `Se incorporaron ${importedSales.length} comprobantes contables al historial de ventas.`,
      'Normal'
    );
  };

  const handleDeleteSale = (saleId: string) => {
    const saleToDelete = sales.find((s) => s.id === saleId);
    if (!saleToDelete) return;

    // Registrar en deleted_sales_ids para garantizar que JAMÁS vuelva a aparecer
    try {
      const deleted = new Set<string>(JSON.parse(localStorage.getItem('deleted_sales_ids') || '[]'));
      deleted.add(saleId);
      localStorage.setItem('deleted_sales_ids', JSON.stringify(Array.from(deleted)));
    } catch {}

    setSales((prev) => prev.filter((s) => s.id !== saleId));
    removeDocument('sales', saleId).catch(console.error);

    setCashMovements((prev) =>
      prev.filter((cm) => cm.reference !== saleToDelete.invoiceNumber)
    );

    addAudit(
      'Ventas',
      'Eliminación de Factura',
      `Comprobante ${saleToDelete.invoiceNumber} eliminado permanentemente de la base de datos.`,
      'Advertencia'
    );
  };

  const handlePurgeGhostSales = () => {
    const ghostIds = new Set(['sal-1001', 'sal-1002', 'sal-1003', 'sal-1004']);
    const ghostSales = sales.filter((s) => ghostIds.has(s.id));

    setSales((prev) => prev.filter((s) => !ghostIds.has(s.id)));

    ghostSales.forEach((s) => {
      removeDocument('sales', s.id).catch(console.error);
    });

    setCashMovements((prev) =>
      prev.filter((cm) => !['cm-3', 'cm-4', 'cm-5'].includes(cm.id))
    );

    addAudit(
      'Ventas',
      'Purga de Datos de Prueba',
      `Se eliminaron ${ghostSales.length} comprobantes de prueba iniciales del sistema.`,
      'Normal'
    );
  };

  // 3. Guardar o Editar Producto
  const handleSaveProduct = (
    prodData: Omit<Product, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      const updated: Product = { ...prodData, id: existingId };
      setProducts((prev) =>
        prev.map((p) => (p.id === existingId ? updated : p))
      );
      saveDocument('products', updated).catch(console.error);
      addAudit(
        'Productos',
        'Actualización de Producto',
        `Se actualizó la referencia ${prodData.sku} (${prodData.name}).`,
        'Normal'
      );
    } else {
      const newProd: Product = {
        ...prodData,
        id: `prod-${Date.now()}`,
      };
      setProducts((prev) => [newProd, ...prev]);
      saveDocument('products', newProd).catch(console.error);
      addAudit(
        'Productos',
        'Creación de Producto',
        `Nuevo producto registrado: ${prodData.sku} - ${prodData.name}.`,
        'Normal'
      );
    }
  };

  const handleDeleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    removeDocument('products', id).catch(console.error);
    if (target) {
      addAudit(
        'Productos',
        'Eliminación de Producto',
        `Producto eliminado del catálogo: ${target.sku} - ${target.name}.`,
        'Crítico'
      );
    }
  };

  // 4. Categorías CRUD
  const handleSaveCategory = (
    catData: Omit<Category, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      const updated: Category = { ...catData, id: existingId };
      setCategories((prev) =>
        prev.map((c) => (c.id === existingId ? updated : c))
      );
      saveDocument('categories', updated).catch(console.error);
      addAudit(
        'Categorías',
        'Edición de Categoría',
        `Categoría ${catData.code} (${catData.name}) actualizada.`
      );
    } else {
      const newCat: Category = { ...catData, id: `cat-${Date.now()}` };
      setCategories((prev) => [...prev, newCat]);
      saveDocument('categories', newCat).catch(console.error);
      addAudit(
        'Categorías',
        'Nueva Categoría',
        `Categoría ${catData.code} (${catData.name}) creada.`
      );
    }
  };

  const handleDeleteCategory = (id: string) => {
    const target = categories.find((c) => c.id === id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    removeDocument('categories', id).catch(console.error);
    if (target) {
      addAudit(
        'Categorías',
        'Eliminación de Categoría',
        `Se eliminó la categoría ${target.name}.`,
        'Advertencia'
      );
    }
  };

  // 5. Ajuste Manual de Inventario
  const handleRegisterInventoryAdjustment = (data: {
    productId: string;
    type: 'Ajuste Positivo' | 'Ajuste Negativo';
    quantity: number;
    reason: string;
  }) => {
    const prod = products.find((p) => p.id === data.productId);
    if (!prod) return;
    const prevStock = prod.stock;
    const newStock =
      data.type === 'Ajuste Positivo'
        ? prevStock + data.quantity
        : Math.max(0, prevStock - data.quantity);

    setProducts((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, stock: newStock } : p))
    );

    const newMov: InventoryMovement = {
      id: `inv-adj-${Date.now()}`,
      date: TODAY_DATE,
      time: getCurrentTimeStr(),
      productId: prod.id,
      barcode: prod.barcode,
      productName: prod.name,
      type: data.type,
      quantity: data.quantity,
      previousStock: prevStock,
      newStock,
      reference: `AJU-${Math.floor(1000 + Math.random() * 9000)}`,
      reason: data.reason,
      user: currentUserDisplay,
    };

    setInventoryMovements((prev) => [newMov, ...prev]);
    addAudit(
      'Inventario',
      data.type,
      `Producto ${prod.sku}: stock pasó de ${prevStock} a ${newStock}. Motivo: ${data.reason}`,
      'Advertencia'
    );
  };

  // 6. Registrar Compra a Proveedor
  const handleRegisterPurchase = (data: {
    supplierId: string;
    supplierInvoice: string;
    paymentMethod: 'Efectivo' | 'Transferencia' | 'Crédito Proveedor';
    items: PurchaseItem[];
    notes: string;
  }) => {
    const sup = suppliers.find((s) => s.id === data.supplierId) || suppliers[0];
    const total = data.items.reduce((s, i) => s + i.subtotal, 0);
    const refNumber = `OC-CS-00${220 + purchases.length}`;
    const timeStr = getCurrentTimeStr();

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      referenceNumber: refNumber,
      supplierInvoice: data.supplierInvoice,
      date: TODAY_DATE,
      time: timeStr,
      supplierId: sup.id,
      supplierName: sup.name,
      buyerName: currentUserDisplay,
      items: data.items,
      total,
      paymentMethod: data.paymentMethod,
      status: 'Recibida',
      notes: data.notes,
    };

    const newMovs: InventoryMovement[] = [];
    setProducts((prev) =>
      prev.map((prod) => {
        const bought = data.items.find((i) => i.productId === prod.id);
        if (!bought) return prod;
        const prevStock = prod.stock;
        const nextStock = prevStock + bought.quantity;
        newMovs.push({
          id: `inv-pur-${Date.now()}-${prod.id}`,
          date: TODAY_DATE,
          time: timeStr,
          productId: prod.id,
          barcode: prod.barcode,
          productName: prod.name,
          type: 'Entrada',
          quantity: bought.quantity,
          previousStock: prevStock,
          newStock: nextStock,
          reference: refNumber,
          reason: `Compra a proveedor ${sup.name} (${data.supplierInvoice})`,
          user: currentUserDisplay,
        });
        return { ...prod, stock: nextStock, cost: bought.unitCost };
      })
    );

    setPurchases((prev) => [newPurchase, ...prev]);
    setInventoryMovements((prev) => [...newMovs, ...prev]);

    if (data.paymentMethod !== 'Crédito Proveedor') {
      setCashMovements((prev) => [
        {
          id: `cm-pur-${Date.now()}`,
          date: TODAY_DATE,
          time: timeStr,
          type: 'Egreso',
          category: 'Compra',
          paymentMethod: data.paymentMethod,
          reference: refNumber,
          description: `Pago orden de compra ${refNumber} - ${sup.name}`,
          amount: total,
          user: currentUserDisplay,
        },
        ...prev,
      ]);
    }

    addAudit(
      'Compras',
      'Recepción de Orden de Compra',
      `Orden ${refNumber} de ${sup.name} por $${total.toFixed(2)}. Stock actualizado.`,
      'Normal'
    );
  };

  const handleDeletePurchase = (purchaseId: string) => {
    const target = purchases.find((p) => p.id === purchaseId);
    if (!target) return;

    const timeStr = getCurrentTimeStr();
    const revMovements: InventoryMovement[] = [];

    // Revertir el stock sumado por esta compra
    setProducts((prev) =>
      prev.map((prod) => {
        const item = target.items.find((i) => i.productId === prod.id);
        if (!item) return prod;
        const prevStock = prod.stock;
        const nextStock = Math.max(0, prevStock - item.quantity);
        revMovements.push({
          id: `inv-pur-rev-${Date.now()}-${prod.id}`,
          date: TODAY_DATE,
          time: timeStr,
          productId: prod.id,
          barcode: prod.barcode,
          productName: prod.name,
          type: 'Salida',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: nextStock,
          reference: target.referenceNumber,
          reason: `Reversión por eliminación de orden de compra: ${target.referenceNumber}`,
          user: currentUserDisplay,
        });
        const updatedProd = { ...prod, stock: nextStock };
        saveDocument('products', updatedProd).catch(console.error);
        return updatedProd;
      })
    );

    setInventoryMovements((prev) => [...revMovements, ...prev]);
    revMovements.forEach((m) => saveDocument('inventoryMovements', m).catch(console.error));

    // Revertir egreso de caja si se había registrado
    setCashMovements((prev) => prev.filter((cm) => cm.reference !== target.referenceNumber));

    setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
    removeDocument('purchases', purchaseId).catch(console.error);

    addAudit(
      'Compras',
      'Eliminación de Compra',
      `Orden de compra ${target.referenceNumber} (${target.supplierName}) por $${target.total.toFixed(2)} eliminada. Stock revertido.`,
      'Advertencia'
    );
  };

  // 7. Registrar Devolución
  const handleRegisterReturn = (data: {
    saleInvoice: string;
    clientName: string;
    productId: string;
    quantity: number;
    refundAmount: number;
    reason: string;
    restockInventory: boolean;
  }) => {
    const prod = products.find((p) => p.id === data.productId) || products[0];
    const retNum = `DEV-CS-000${43 + returns.length}`;
    const timeStr = getCurrentTimeStr();

    const newRet: ReturnRecord = {
      id: `ret-${Date.now()}`,
      returnNumber: retNum,
      date: TODAY_DATE,
      time: timeStr,
      saleInvoice: data.saleInvoice,
      clientName: data.clientName,
      productId: prod.id,
      productName: prod.name,
      quantity: data.quantity,
      refundAmount: data.refundAmount,
      reason: data.reason,
      restockInventory: data.restockInventory,
      status: 'Procesada',
      processedBy: currentUserDisplay,
    };

    setReturns((prev) => [newRet, ...prev]);

    if (data.restockInventory) {
      const prevStock = prod.stock;
      const nextStock = prevStock + data.quantity;
      setProducts((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, stock: nextStock } : p))
      );
      setInventoryMovements((prev) => [
        {
          id: `inv-ret-${Date.now()}`,
          date: TODAY_DATE,
          time: timeStr,
          productId: prod.id,
          barcode: prod.barcode,
          productName: prod.name,
          type: 'Devolución',
          quantity: data.quantity,
          previousStock: prevStock,
          newStock: nextStock,
          reference: retNum,
          reason: `Devolución cliente sobre ${data.saleInvoice}: ${data.reason}`,
          user: currentUserDisplay,
        },
        ...prev,
      ]);
    }

    addAudit(
      'Devoluciones',
      'Devolución Procesada',
      `Devolución ${retNum} de ${data.quantity}x ${prod.name} sobre factura ${data.saleInvoice}.`,
      'Advertencia'
    );
  };

  // 8. Clientes CRUD
  const handleSaveClient = (
    clientData: Omit<Client, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      const updated: Client = { ...clientData, id: existingId };
      setClients((prev) =>
        prev.map((c) =>
          c.id === existingId ? updated : c
        )
      );
      saveDocument('clients', updated).catch(console.error);
      addAudit(
        'Clientes',
        'Actualización de Cliente',
        `Datos actualizados para ${clientData.name} (${clientData.document}).`
      );
    } else {
      const newClient: Client = { ...clientData, id: `cli-${Date.now()}` };
      setClients((prev) => [
        ...prev,
        newClient,
      ]);
      saveDocument('clients', newClient).catch(console.error);
      addAudit(
        'Clientes',
        'Nuevo Cliente',
        `Cliente registrado: ${clientData.name} (${clientData.document}).`
      );
    }
  };

  const handleQuickCreateClient = (
    clientData: Omit<Client, 'id' | 'currentBalance' | 'active'>
  ): Client => {
    const created: Client = {
      ...clientData,
      id: `cli-${Date.now()}`,
      currentBalance: 0,
      active: true,
    };
    setClients((prev) => [...prev, created]);
    saveDocument('clients', created).catch(console.error);
    addAudit(
      'Punto de Venta',
      'Alta Rápida de Cliente',
      `Cliente ${created.name} creado desde terminal POS.`
    );
    return created;
  };

  const handleDeleteClient = (id: string) => {
    try {
      const deleted = new Set<string>(JSON.parse(localStorage.getItem('deleted_clients_ids') || '[]'));
      deleted.add(id);
      localStorage.setItem('deleted_clients_ids', JSON.stringify(Array.from(deleted)));
    } catch {}

    const target = clients.find((c) => c.id === id);
    setClients((prev) => prev.filter((c) => c.id !== id));
    removeDocument('clients', id).catch(console.error);
    if (target) {
      addAudit(
        'Clientes',
        'Eliminación de Cliente',
        `Se eliminó el cliente ${target.name}.`,
        'Advertencia'
      );
    }
  };

  const handleDeleteAllClients = () => {
    const ids = clients.map((c) => c.id);
    try {
      const deleted = new Set<string>(JSON.parse(localStorage.getItem('deleted_clients_ids') || '[]'));
      ids.forEach((id) => {
        deleted.add(id);
        removeDocument('clients', id).catch(console.error);
      });
      localStorage.setItem('deleted_clients_ids', JSON.stringify(Array.from(deleted)));
    } catch {}

    setClients([]);
    addAudit(
      'Clientes',
      'Vaciado de Directorio de Clientes',
      `Se eliminaron todos los clientes registrados (${ids.length}).`,
      'Advertencia'
    );
  };

  const handleBatchImportClients = (importedList: Omit<Client, 'id'>[]) => {
    setClients((prev) => {
      const docMap = new Map(prev.map((c) => [c.document.trim().toLowerCase(), c]));
      const nextList = [...prev];

      importedList.forEach((nc, idx) => {
        const key = nc.document.trim().toLowerCase();
        if (docMap.has(key)) {
          const existing = docMap.get(key)!;
          const merged: Client = {
            ...existing,
            name: nc.name,
            phone: nc.phone !== '-' ? nc.phone : existing.phone,
            email: nc.email !== '-' ? nc.email : existing.email,
            address: nc.address !== '-' ? nc.address : existing.address,
            creditLimit: nc.creditLimit,
            active: nc.active,
          };
          const index = nextList.findIndex((c) => c.id === existing.id);
          if (index >= 0) nextList[index] = merged;
          saveDocument('clients', merged).catch(console.error);
        } else {
          const created: Client = {
            ...nc,
            id: `cli-${Date.now()}-${idx}`,
          };
          nextList.push(created);
          saveDocument('clients', created).catch(console.error);
        }
      });

      return nextList;
    });

    addAudit(
      'Clientes',
      'Importación Masiva Excel / CSV',
      `Se procesaron e importaron ${importedList.length} clientes al directorio.`,
      'Normal'
    );
  };

  // 9. Proveedores CRUD
  const handleSaveSupplier = (
    supData: Omit<Supplier, 'id'>,
    existingId?: string
  ) => {
    if (existingId) {
      const updated: Supplier = { ...supData, id: existingId };
      setSuppliers((prev) =>
        prev.map((s) =>
          s.id === existingId ? updated : s
        )
      );
      saveDocument('suppliers', updated).catch(console.error);
      addAudit(
        'Proveedores',
        'Actualización de Proveedor',
        `Proveedor actualizado: ${supData.name}.`
      );
    } else {
      const newSupplier: Supplier = { ...supData, id: `sup-${Date.now()}` };
      setSuppliers((prev) => [
        ...prev,
        newSupplier,
      ]);
      saveDocument('suppliers', newSupplier).catch(console.error);
      addAudit(
        'Proveedores',
        'Nuevo Proveedor',
        `Proveedor registrado: ${supData.name} (${supData.taxId}).`
      );
    }
  };

  const handleDeleteSupplier = (id: string) => {
    try {
      const deleted = new Set<string>(JSON.parse(localStorage.getItem('deleted_suppliers_ids') || '[]'));
      deleted.add(id);
      localStorage.setItem('deleted_suppliers_ids', JSON.stringify(Array.from(deleted)));
    } catch {}

    const target = suppliers.find((s) => s.id === id);
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    removeDocument('suppliers', id).catch(console.error);
    if (target) {
      addAudit(
        'Proveedores',
        'Eliminación de Proveedor',
        `Proveedor eliminado: ${target.name}.`,
        'Advertencia'
      );
    }
  };

  const handleDeleteAllSuppliers = () => {
    const ids = suppliers.map((s) => s.id);
    try {
      const deleted = new Set<string>(JSON.parse(localStorage.getItem('deleted_suppliers_ids') || '[]'));
      ids.forEach((id) => {
        deleted.add(id);
        removeDocument('suppliers', id).catch(console.error);
      });
      localStorage.setItem('deleted_suppliers_ids', JSON.stringify(Array.from(deleted)));
    } catch {}

    setSuppliers([]);
    addAudit(
      'Proveedores',
      'Vaciado de Directorio de Proveedores',
      `Se eliminaron todos los proveedores registrados (${ids.length}).`,
      'Advertencia'
    );
  };

  // 10. Abono a Crédito (Cuentas por Cobrar)
  const handleRegisterCreditPayment = (data: {
    creditId: string;
    amount: number;
    paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia';
    notes: string;
  }) => {
    const target = credits.find((c) => c.id === data.creditId);
    if (!target) return;
    const timeStr = getCurrentTimeStr();
    const newPaid = target.paidAmount + data.amount;
    const newBalance = Math.max(0, target.totalAmount - newPaid);
    const newStatus: CreditAccount['status'] =
      newBalance <= 0.009 ? 'Pagado' : target.status;

    setCredits((prev) =>
      prev.map((c) =>
        c.id === target.id
          ? {
              ...c,
              paidAmount: newPaid,
              balance: newBalance,
              status: newStatus,
              payments: [
                ...c.payments,
                {
                  id: `pay-${Date.now()}`,
                  creditId: target.id,
                  date: TODAY_DATE,
                  time: timeStr,
                  amount: data.amount,
                  paymentMethod: data.paymentMethod,
                  receivedBy: currentUserDisplay,
                  notes: data.notes,
                },
              ],
            }
          : c
      )
    );

    // Reducir deuda del cliente
    setClients((prev) =>
      prev.map((cli) =>
        cli.id === target.clientId
          ? {
              ...cli,
              currentBalance: Math.max(0, cli.currentBalance - data.amount),
            }
          : cli
      )
    );

    // Sumar a Caja
    setCashMovements((prev) => [
      {
        id: `cm-cred-${Date.now()}`,
        date: TODAY_DATE,
        time: timeStr,
        type: 'Ingreso',
        category: 'Abono Crédito',
        paymentMethod: data.paymentMethod,
        reference: target.invoiceNumber,
        description: `Abono cartera ${target.invoiceNumber} - ${target.clientName}`,
        amount: data.amount,
        user: currentUserDisplay,
      },
      ...prev,
    ]);

    addAudit(
      'Créditos',
      'Recepción de Abono',
      `Abono de $${data.amount.toFixed(2)} recibido sobre ${
        target.invoiceNumber
      } (${target.clientName}). Saldo restante: $${newBalance.toFixed(2)}.`,
      'Normal'
    );
  };

  // 11. Movimientos y Arqueo de Caja
  const handleAddCashMovement = (data: {
    type: 'Ingreso' | 'Egreso';
    category: 'Gasto Operativo' | 'Ajuste Caja';
    paymentMethod: string;
    description: string;
    amount: number;
  }) => {
    const newMov: CashMovement = {
      id: `cm-man-${Date.now()}`,
      date: TODAY_DATE,
      time: getCurrentTimeStr(),
      type: data.type,
      category: data.category,
      paymentMethod: data.paymentMethod,
      reference: `CAJ-${Math.floor(100 + Math.random() * 900)}`,
      description: data.description,
      amount: data.amount,
      user: currentUserDisplay,
    };
    setCashMovements((prev) => [newMov, ...prev]);
    addAudit(
      'Caja',
      `${data.type} Manual de Caja`,
      `${data.category}: ${data.description} por $${data.amount.toFixed(2)}.`,
      data.type === 'Egreso' ? 'Advertencia' : 'Normal'
    );
  };

  const handleCloseOrOpenCash = (countedCash?: number, notes?: string) => {
    if (cashSession.status === 'Abierta') {
      setCashSession({
        ...cashSession,
        status: 'Cerrada',
        closedAt: `${TODAY_DATE} ${getCurrentTimeStr()}`,
        countedCash,
        notes,
      });
      addAudit(
        'Caja',
        'Cierre y Arqueo de Turno',
        `Turno cerrado. Efectivo físico contado: $${(countedCash || 0).toFixed(
          2
        )}.`,
        'Advertencia'
      );
    } else {
      setCashSession({
        id: `caja-${Date.now()}`,
        openedAt: `${TODAY_DATE} ${getCurrentTimeStr()}`,
        cashierName: currentUserDisplay,
        openingBalance: 200.0,
        status: 'Abierta',
      });
      addAudit(
        'Caja',
        'Reapertura de Turno de Caja',
        `Turno de caja abierto por ${currentUserDisplay}.`,
        'Normal'
      );
    }
  };

  // 12. Usuarios CRUD
  const handleSaveUser = (
    userData: Omit<SystemUser, 'id' | 'lastLogin'>,
    existingId?: string
  ) => {
    if (existingId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === existingId
            ? { ...userData, id: existingId, lastLogin: u.lastLogin }
            : u
        )
      );
      addAudit(
        'Usuarios',
        'Actualización de Usuario',
        `Perfil actualizado para ${userData.fullName} (${userData.role}).`
      );
    } else {
      setUsers((prev) => [
        ...prev,
        {
          ...userData,
          id: `usr-${Date.now()}`,
          lastLogin: `${TODAY_DATE} ${getCurrentTimeStr()}`,
        },
      ]);
      addAudit(
        'Usuarios',
        'Creación de Usuario',
        `Nuevo usuario: ${userData.fullName} (${userData.role}).`
      );
    }
  };

  const handleDeleteUser = (id: string) => {
    const target = users.find((u) => u.id === id);
    const updatedUsers = users.filter((u) => u.id !== id);
    setUsers(updatedUsers);
    removeDocument('users', id).catch(console.error);

    // Si el usuario eliminado era el que estaba activo en la sesión actual
    if (currentUserId === id) {
      if (updatedUsers.length > 0) {
        setCurrentUserId(updatedUsers[0].id);
        const authData = JSON.stringify({ id: updatedUsers[0].id, username: updatedUsers[0].username, role: updatedUsers[0].role });
        localStorage.setItem('variedades_cs_auth_user', authData);
      } else {
        handleUserLogout();
      }
    }

    if (target) {
      addAudit(
        'Usuarios',
        'Baja de Usuario',
        `Cuenta eliminada permanentemente: ${target.fullName} (@${target.username} · ${target.role}).`,
        'Crítico'
      );
    }
  };

  // Importación masiva de productos (CSV / JSON)
  const handleBulkImportProducts = (imported: Omit<Product, 'id'>[]) => {
    const newItems: Product[] = imported.map((p, idx) => ({
      ...p,
      id: `prod-imp-${Date.now()}-${idx}`,
    }));

    setProducts((prev) => [...newItems, ...prev]);

    // Guardar en Firestore si está conectado
    newItems.forEach((item) => {
      saveDocument('products', item).catch(console.error);
    });

    addAudit(
      'Productos',
      'Importación Masiva de Catálogo',
      `Se importaron ${newItems.length} productos satisfactoriamente al inventario.`,
      'Normal'
    );
  };

  // Objeto de Respaldo Completo en Tiempo Real
  const fullBackupData: FullBackupData = useMemo(
    () => ({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      app: 'VARIEDADES CS ERP',
      config,
      categories,
      products,
      clients,
      suppliers,
      sales,
      purchases,
      credits,
      cashMovements,
      cashSessions: [cashSession],
      inventoryMovements,
      returns,
      users,
    }),
    [
      config,
      categories,
      products,
      clients,
      suppliers,
      sales,
      purchases,
      credits,
      cashMovements,
      cashSession,
      inventoryMovements,
      returns,
      users,
    ]
  );

  // Restaurar Copia de Seguridad Completa
  const handleRestoreBackup = async (backup: FullBackupData) => {
    if (backup.config) setConfig(backup.config);
    if (backup.categories) setCategories(backup.categories);
    if (backup.products) setProducts(backup.products);
    if (backup.clients) setClients(backup.clients);
    if (backup.suppliers) setSuppliers(backup.suppliers);
    if (backup.sales) setSales(backup.sales);
    if (backup.purchases) setPurchases(backup.purchases);
    if (backup.credits) setCredits(backup.credits);
    if (backup.cashSessions && backup.cashSessions.length > 0) setCashSession(backup.cashSessions[0]);
    if (backup.cashMovements) setCashMovements(backup.cashMovements);
    if (backup.inventoryMovements) setInventoryMovements(backup.inventoryMovements);
    if (backup.returns) setReturns(backup.returns);
    if (backup.users) setUsers(backup.users);

    // Sincronizar en Firebase si está en línea
    if (firebaseConnected) {
      try {
        if (backup.config) await saveCompanyConfig(backup.config);
        for (const p of backup.products || []) await saveDocument('products', p);
        for (const c of backup.categories || []) await saveDocument('categories', c);
        for (const cli of backup.clients || []) await saveDocument('clients', cli);
        for (const s of backup.suppliers || []) await saveDocument('suppliers', s);
        for (const sal of backup.sales || []) await saveDocument('sales', sal);
        for (const pur of backup.purchases || []) await saveDocument('purchases', pur);
        for (const cr of backup.credits || []) await saveDocument('credits', cr);
      } catch (err) {
        console.warn('Error sincronizando restauración en Firebase:', err);
      }
    }

    addAudit(
      'Configuración',
      'Restauración de Copia de Seguridad',
      `Base de datos restaurada desde archivo de respaldo del ${backup.exportedAt?.slice(0, 10) || 'archivo'}.`,
      'Advertencia'
    );
  };

  // 13. Restablecer Sistema a Valores de Fábrica (Demo o Limpio)
  const handleResetFactoryData = (mode: 'demo' | 'clean') => {
    localStorage.removeItem(STORAGE_KEY);

    if (mode === 'demo') {
      setConfig(INITIAL_CONFIG);
      setCategories(INITIAL_CATEGORIES);
      setProducts(INITIAL_PRODUCTS);
      setClients(INITIAL_CLIENTS);
      setSuppliers(INITIAL_SUPPLIERS);
      setSales(INITIAL_SALES);
      setPurchases(INITIAL_PURCHASES);
      setCredits(INITIAL_CREDITS);
      setCashSession(INITIAL_CASH_SESSION);
      setCashMovements(INITIAL_CASH_MOVEMENTS);
      setInventoryMovements(INITIAL_INVENTORY_MOVEMENTS);
      setReturns(INITIAL_RETURNS);
      setUsers(INITIAL_USERS);
      setAuditLogs(INITIAL_AUDIT_LOGS);

      if (firebaseConnected) {
        saveCompanyConfig(INITIAL_CONFIG).catch(console.error);
        INITIAL_PRODUCTS.forEach((p) => saveDocument('products', p).catch(console.error));
        INITIAL_CATEGORIES.forEach((c) => saveDocument('categories', c).catch(console.error));
      }

      addAudit(
        'Configuración',
        'Reinicio de Fábrica con Datos Demo',
        'El sistema fue restablecido a los valores y catálogo de demostración de VARIEDADES CS.',
        'Crítico'
      );
    } else {
      // Modo Limpio: Negocio real desde cero
      setConfig(INITIAL_CONFIG);
      setCategories(INITIAL_CATEGORIES); // Mantiene categorías base
      setProducts([]); // Catálogo vacío listo para ingresar productos reales
      setClients(INITIAL_CLIENTS.slice(0, 1)); // Solo Consumidor Final
      setSuppliers([]);
      setSales([]);
      setPurchases([]);
      setCredits([]);
      setCashSession({
        id: `cs-${Date.now()}`,
        openedAt: `${TODAY_DATE} 08:00:00`,
        cashierName: currentUserDisplay,
        openingBalance: 0,
        status: 'Abierta',
      });
      setCashMovements([]);
      setInventoryMovements([]);
      setReturns([]);
      setUsers(INITIAL_USERS.slice(0, 1)); // Administrador principal
      setAuditLogs([
        {
          id: `aud-reset-${Date.now()}`,
          timestamp: `${TODAY_DATE} ${getCurrentTimeStr()}`,
          user: currentUserDisplay,
          role: 'Administrador',
          module: 'Configuración',
          action: 'Reinicio Total del Sistema a Cero',
          detail: 'Sistema reiniciado en limpio para iniciar operaciones reales de negocio.',
          severity: 'Crítico',
        },
      ]);

      if (firebaseConnected) {
        saveCompanyConfig(INITIAL_CONFIG).catch(console.error);
        // Borrar productos anteriores en Firestore
        products.forEach((p) => removeDocument('products', p.id).catch(console.error));
      }
    }
  };

  const handleUserLogin = (user: SystemUser, remember: boolean) => {
    setCurrentUserId(user.id);
    setIsLoggedIn(true);
    if (user.role === 'Afiliado') {
      setActiveModule('pedidos-afiliados');
    } else {
      setActiveModule('dashboard');
    }
    const authData = JSON.stringify({ id: user.id, username: user.username, role: user.role });
    if (remember) {
      localStorage.setItem('variedades_cs_auth_user', authData);
    } else {
      sessionStorage.setItem('variedades_cs_auth_user', authData);
    }
    const timeNow = `${TODAY_DATE} ${getCurrentTimeStr()}`;
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, lastLogin: timeNow } : u))
    );
    addAudit(
      'Seguridad',
      'Inicio de Sesión',
      `El usuario ${user.fullName} (${user.role}) ingresó al sistema con éxito.`,
      'Normal'
    );
  };

  const handleUserLogout = () => {
    try {
      localStorage.removeItem('variedades_cs_auth_user');
      sessionStorage.removeItem('variedades_cs_auth_user');
    } catch {}
    setIsLoggedIn(false);
    addAudit(
      'Seguridad',
      'Cierre de Sesión',
      `El usuario ${currentUser.fullName} cerró la sesión activa.`,
      'Normal'
    );
  };

  // 1. MODO ESCÁNER REMOTO EN CELULAR (cuando se abre el QR o ?scannerSession=...)
  if (remoteScannerSessionId) {
    return (
      <MobileScannerView
        sessionId={remoteScannerSessionId}
        onExit={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('scannerSession');
          window.history.replaceState({}, '', url.pathname);
          setRemoteScannerSessionId(null);
        }}
      />
    );
  }

  // 2. PROTECCIÓN DE ACCESO POR USUARIO Y CONTRASEÑA / PIN
  if (!isLoggedIn) {
    return (
      <SystemLoginModal
        isOpen={true}
        users={users}
        onLogin={handleUserLogin}
        onRegisterUser={handleRegisterUser}
        onUpdatePassword={handleUpdatePassword}
      />
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* MENÚ LATERAL PROFESIONAL (Desktop fijo + Mobile Drawer) */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 border-r border-slate-800 flex flex-col shrink-0 ${
          mobileMenuOpen ? 'block' : 'hidden lg:flex'
        }`}
      >
        {/* Encabezado Obligatorio del Menú Principal */}
        <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs" />
              <span>VARIEDADES CS</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {currentUser.role === 'Afiliado' ? 'Portal de Afiliados' : 'Administración & POS'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1 text-slate-400 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de las Opciones del Menú Principal */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveModule(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded text-left whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-700 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Pie del Menú Lateral con Operador Activo */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50 text-xs flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <div className="font-semibold text-slate-200 truncate">
              {currentUser.fullName}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {currentUser.role} · {currentUser.branch}
            </div>
          </div>
          <button
            type="button"
            onClick={handleUserLogout}
            title="Cerrar sesión del sistema"
            className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: 3 zonas limpias */}
        <header className="bg-white border-b border-slate-200 px-3 sm:px-4 lg:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
          {/* Zona 1: Marca / Módulo */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 min-h-[38px] min-w-[38px] border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shadow-2xs"
              aria-label="Abrir menú principal"
            >
              <Menu className="w-5 h-5 text-slate-800" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
                {config.companyName}
              </span>
              <span className="hidden md:inline text-xs text-slate-500 font-normal truncate">
                — {config.subtitle}
              </span>
            </div>
          </div>

          {/* Zona 2: Accesos directos de texto limpio en desktop */}
          <nav className="hidden xl:flex items-center gap-5 text-xs font-medium text-slate-600">
            {currentUser.role === 'Afiliado' ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveModule('pedidos-afiliados')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'pedidos-afiliados'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Hacer Pedido & Clientes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('productos')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'productos'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Inventario Disponible
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('gmail-center')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'gmail-center'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Centro Gmail
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveModule('dashboard')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'dashboard'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('pedidos-afiliados')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'pedidos-afiliados'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Pedidos Afiliados
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('afiliados')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'afiliados'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Directorio Afiliados
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('pos')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'pos'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Punto de Venta
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('productos')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'productos'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Productos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('gmail-center')}
                  className={`hover:text-slate-900 whitespace-nowrap ${
                    activeModule === 'gmail-center'
                      ? 'text-blue-700 font-semibold underline underline-offset-4'
                      : ''
                  }`}
                >
                  Gmail
                </button>
              </>
            )}
          </nav>

          {/* Zona 3: Botones Móviles: Factura POS, Salir Sesión y Menú de Tres Puntos */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Usuario Activo en Sesión en desktop */}
            <div className="hidden lg:flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {currentUser.role}
                </span>
              </div>
            </div>

            {/* Botón para emparejar la cámara del teléfono móvil */}
            <button
              type="button"
              onClick={() => setShowRemoteScannerLauncher(true)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 min-h-[38px] text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors cursor-pointer"
              title="Abrir lector inalámbrico con la cámara de su teléfono celular"
            >
              <Smartphone className="w-4 h-4 text-blue-700" />
              <span>Escáner</span>
            </button>

            {/* Botón Factura POS (Fácil de pulsar en teléfonos) */}
            <button
              type="button"
              onClick={() => setActiveModule('pos')}
              className="px-2.5 sm:px-3.5 py-2 min-h-[38px] text-xs font-bold rounded-lg bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs active:scale-[0.98] transition-all"
              title="Ir al punto de venta y facturación"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Factura POS</span>
            </button>

            {/* Botón Salir Sesión (Visible y cómodo para pulsar en el teléfono) */}
            <button
              type="button"
              onClick={handleUserLogout}
              className="px-2.5 sm:px-3 py-2 min-h-[38px] text-xs font-semibold rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-2xs active:scale-[0.98] transition-all"
              title="Cerrar sesión del sistema"
            >
              <LogOut className="w-4 h-4 text-red-600" />
              <span className="hidden xs:inline sm:inline">Salir</span>
            </button>

            {/* Botón de los Tres Puntos para menú de opciones en teléfono */}
            <ActionDotsMenu
              title="Más opciones de Sync Connect"
              items={[
                {
                  label: `Usuario: ${currentUser.fullName} (${currentUser.role})`,
                  icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
                  onClick: () => {},
                },
                {
                  label: 'Escáner Celular (Cámara)',
                  icon: <Smartphone className="w-3.5 h-3.5 text-blue-600" />,
                  onClick: () => setShowRemoteScannerLauncher(true),
                  tone: 'primary',
                },
                {
                  label: 'Punto de Venta / Factura POS',
                  icon: <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />,
                  onClick: () => setActiveModule('pos'),
                },
                {
                  label: `Caja (${cashSession.status})`,
                  icon: <Wallet className="w-3.5 h-3.5 text-slate-600" />,
                  onClick: () => setActiveModule('caja'),
                },
                {
                  label: 'Cerrar Sesión',
                  icon: <LogOut className="w-3.5 h-3.5 text-red-600" />,
                  onClick: handleUserLogout,
                  tone: 'danger',
                },
              ]}
            />
          </div>
        </header>

        {cloudSyncNotice && (
          <div className="bg-blue-600 text-white text-xs py-2 px-4 text-center font-medium flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{cloudSyncNotice}</span>
          </div>
        )}

        {/* Área de Trabajo del Módulo Activo */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1600px] w-full mx-auto">
          {activeModule === 'dashboard' && (
            <DashboardView
              products={products}
              sales={sales}
              credits={credits}
              categories={categories}
              config={config}
              onNavigate={setActiveModule}
              onSelectSaleForReceipt={setReceiptSale}
            />
          )}

          {activeModule === 'pedidos-afiliados' && (
            <AffiliatePortalViews
              currentUser={currentUser}
              products={products}
              orders={affiliateOrders}
              affiliates={users.filter((u) => u.role === 'Afiliado')}
              onSaveOrder={handleSaveAffiliateOrder}
              onUpdateOrderStatus={handleUpdateAffiliateOrderStatus}
              onUpdateStock={handleUpdateStockFromAffiliate}
              currencySymbol={config.currencySymbol || '$'}
              exchangeRate={config.exchangeRate || 37}
            />
          )}

          {activeModule === 'afiliados' && (
            <AffiliatesDirectoryView
              affiliates={users.filter((u) => u.role === 'Afiliado')}
              orders={affiliateOrders}
              onToggleAffiliateStatus={(uid) => {
                setUsers((prev) => {
                  const updated = prev.map((u) => (u.id === uid ? { ...u, active: !u.active } : u));
                  const target = updated.find((u) => u.id === uid);
                  if (target && firebaseConnected) {
                    saveDocument('users', target).catch(console.error);
                  }
                  return updated;
                });
              }}
              onOpenGmailComposer={() => {
                setActiveModule('gmail-center');
              }}
              exchangeRate={config.exchangeRate || 37}
            />
          )}

          {activeModule === 'gmail-center' && (
            <GmailCenterView
              currentUser={currentUser}
              recentOrders={affiliateOrders}
            />
          )}

          {activeModule === 'pos' && (
            <POSView
              products={products}
              categories={categories}
              clients={clients}
              config={config}
              currentUserName={currentUserDisplay}
              onCompleteSale={handleCompleteSale}
              onQuickCreateClient={handleQuickCreateClient}
            />
          )}

          {activeModule === 'productos' && (
            <ProductosView
              products={products}
              categories={categories}
              suppliers={suppliers}
              config={config}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onBulkImportProducts={handleBulkImportProducts}
            />
          )}

          {activeModule === 'categorias' && (
            <CategoriasView
              categories={categories}
              products={products}
              config={config}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
            />
          )}

          {activeModule === 'ventas' && (
            <VentasView
              sales={sales}
              config={config}
              onNavigate={setActiveModule}
              onViewReceipt={setReceiptSale}
              onCancelSale={handleCancelSale}
              onDeleteSale={handleDeleteSale}
              onPurgeGhostSales={handlePurgeGhostSales}
              onBatchImportSales={handleBatchImportSales}
            />
          )}

          {activeModule === 'compras' && (
            <ComprasView
              purchases={purchases}
              products={products}
              suppliers={suppliers}
              config={config}
              onRegisterPurchase={handleRegisterPurchase}
              onDeletePurchase={handleDeletePurchase}
            />
          )}

          {activeModule === 'clientes' && (
            <ClientesView
              clients={clients}
              config={config}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
              onDeleteAllClients={handleDeleteAllClients}
              onBatchImportClients={handleBatchImportClients}
            />
          )}

          {activeModule === 'proveedores' && (
            <ProveedoresView
              suppliers={suppliers}
              onSaveSupplier={handleSaveSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onDeleteAllSuppliers={handleDeleteAllSuppliers}
            />
          )}

          {activeModule === 'creditos' && (
            <CreditosView
              credits={credits}
              clients={clients}
              config={config}
              onRegisterCreditPayment={handleRegisterCreditPayment}
            />
          )}

          {activeModule === 'caja' && (
            <CajaView
              session={cashSession}
              movements={cashMovements}
              config={config}
              onAddCashMovement={handleAddCashMovement}
              onCloseOrOpenCash={handleCloseOrOpenCash}
            />
          )}

          {activeModule === 'inventario' && (
            <InventarioView
              products={products}
              movements={inventoryMovements}
              onRegisterAdjustment={handleRegisterInventoryAdjustment}
            />
          )}

          {activeModule === 'devoluciones' && (
            <DevolucionesView
              returns={returns}
              sales={sales}
              products={products}
              config={config}
              onRegisterReturn={handleRegisterReturn}
            />
          )}

          {activeModule === 'reportes' && (
            <ReportesView
              sales={sales}
              purchases={purchases}
              products={products}
              categories={categories}
              credits={credits}
              config={config}
            />
          )}

          {activeModule === 'usuarios' && (
            <UsuariosView
              users={users}
              currentUserId={currentUserId}
              onSwitchActiveUser={(uid) => {
                setCurrentUserId(uid);
                const found = users.find((u) => u.id === uid);
                if (found) {
                  addAudit(
                    'Usuarios',
                    'Cambio de Operador en Turno',
                    `Sesión activa asignada a ${found.fullName} (${found.role}).`
                  );
                }
              }}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
            />
          )}

          {activeModule === 'auditoria' && (
            <AuditoriaView logs={auditLogs} />
          )}

          {activeModule === 'configuracion' && (
            <ConfiguracionView
              config={config}
              onSaveConfig={(newCfg) => {
                setConfig(newCfg);
                saveCompanyConfig(newCfg).catch(console.error);
                addAudit(
                  'Configuración',
                  'Actualización de Parámetros',
                  `Parámetros generales de ${newCfg.companyName} actualizados en Firestore.`
                );
              }}
              onResetFactoryData={handleResetFactoryData}
              fullBackupData={fullBackupData}
              onRestoreBackup={handleRestoreBackup}
              products={products}
              clients={clients}
            />
          )}
        </main>
      </div>

      {/* Modal Global de Factura / Recibo Imprimible */}
      <ReceiptModal
        sale={receiptSale}
        config={config}
        onClose={() => setReceiptSale(null)}
        onUpdateConfig={(newCfg) => {
          setConfig(newCfg);
          saveCompanyConfig(newCfg).catch(console.error);
          addAudit(
            'Facturación',
            'Actualización de Encabezado de Factura',
            `Datos de factura actualizados: ${newCfg.companyName}, NIT: ${newCfg.taxId}, Tel: ${newCfg.phone}.`
          );
        }}
      />

      {/* Modal Global de Emparejamiento para Escáner Remoto desde Celular */}
      <RemoteScannerModal
        isOpen={showRemoteScannerLauncher}
        onClose={() => setShowRemoteScannerLauncher(false)}
        onScan={(barcode) => {
          setActiveModule('pos');
          setShowRemoteScannerLauncher(false);
        }}
        sessionId="pos-caja-1"
      />
    </div>
  );
}
