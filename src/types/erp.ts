export type ModuleId =
  | 'dashboard'
  | 'productos'
  | 'categorias'
  | 'pos'
  | 'ventas'
  | 'pedidos-afiliados'
  | 'afiliados'
  | 'gmail-center'
  | 'compras'
  | 'clientes'
  | 'proveedores'
  | 'creditos'
  | 'caja'
  | 'inventario'
  | 'devoluciones'
  | 'reportes'
  | 'usuarios'
  | 'auditoria'
  | 'configuracion';

export interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  active: boolean;
}

export interface Product {
  id: string;
  barcode: string;
  sku: string;
  name: string;
  categoryId: string;
  categoryName: string;
  supplierId: string;
  supplierName: string;
  cost: number;
  price: number;
  stock: number;
  minStock: number;
  unit: string;
  location: string;
  imageUrl?: string;
  active: boolean;
  availableForAffiliates?: boolean; // Habilitado para catálogo de pedidos de afiliados
}

export interface SaleItem {
  productId: string;
  barcode: string;
  name: string;
  quantity: number;
  price: number;
  cost: number;
  discount: number;
  subtotal: number;
}

export type PaymentMethod = 'Efectivo' | 'Tarjeta' | 'Transferencia' | 'Crédito';

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  sellerId: string;
  sellerName: string;
  clientId: string;
  clientName: string;
  clientDocument: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  profit: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  change: number;
  status: 'Completada' | 'Anulada';
  cancelReason?: string;
}

export interface PurchaseItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface Purchase {
  id: string;
  referenceNumber: string;
  supplierInvoice: string;
  date: string;
  time: string;
  supplierId: string;
  supplierName: string;
  buyerName: string;
  items: PurchaseItem[];
  total: number;
  paymentMethod: 'Efectivo' | 'Transferencia' | 'Crédito Proveedor';
  status: 'Recibida' | 'Anulada';
  notes: string;
}

export interface Client {
  id: string;
  document: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  creditLimit: number;
  currentBalance: number;
  active: boolean;
}

export interface Supplier {
  id: string;
  taxId: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  categorySpecialty: string;
  paymentTerms: string;
  active: boolean;
}

export interface CreditPayment {
  id: string;
  creditId: string;
  date: string;
  time: string;
  amount: number;
  paymentMethod: 'Efectivo' | 'Tarjeta' | 'Transferencia';
  receivedBy: string;
  notes: string;
}

export interface CreditAccount {
  id: string;
  saleId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: 'Vigente' | 'Vencido' | 'Pagado';
  payments: CreditPayment[];
}

export interface CashMovement {
  id: string;
  date: string;
  time: string;
  type: 'Ingreso' | 'Egreso';
  category: 'Venta' | 'Abono Crédito' | 'Compra' | 'Gasto Operativo' | 'Apertura' | 'Ajuste Caja';
  paymentMethod: string;
  reference: string;
  description: string;
  amount: number;
  user: string;
}

export interface CashSession {
  id: string;
  openedAt: string;
  closedAt?: string;
  cashierName: string;
  openingBalance: number;
  status: 'Abierta' | 'Cerrada';
  countedCash?: number;
  difference?: number;
  notes?: string;
}

export interface InventoryMovement {
  id: string;
  date: string;
  time: string;
  productId: string;
  barcode: string;
  productName: string;
  type: 'Entrada' | 'Salida' | 'Ajuste Positivo' | 'Ajuste Negativo' | 'Devolución';
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string;
  reason: string;
  user: string;
}

export interface ReturnRecord {
  id: string;
  returnNumber: string;
  date: string;
  time: string;
  saleInvoice: string;
  clientName: string;
  productId: string;
  productName: string;
  quantity: number;
  refundAmount: number;
  reason: string;
  restockInventory: boolean;
  status: 'Procesada' | 'Anulada';
  processedBy: string;
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  role: 'Administrador' | 'Supervisor' | 'Cajero' | 'Almacén' | 'Afiliado';
  email: string;
  phone: string;
  branch: string;
  active: boolean;
  lastLogin: string;
  pin?: string;
  // Campos específicos de Afiliado / Vendedor
  cedula?: string;
  address?: string;
  totalOrdersCount?: number;
  totalCommissionsEarned?: number;
}

export interface AffiliateOrderItem {
  productId: string;
  productName: string;
  barcode: string;
  quantity: number;
  basePrice: number; // Precio base mayorista VARIEDADES CS
  salePrice: number; // Precio final al cliente establecido por el afiliado
  unitCommission: number; // Comisión por unidad (salePrice - basePrice)
  subtotal: number; // salePrice * quantity
  totalCommission: number; // unitCommission * quantity
}

export type OrderStatus = 'Pendiente' | 'Aprobado' | 'En Camino' | 'Entregado' | 'Cancelado';

export interface AffiliateOrder {
  id: string;
  orderNumber: string;
  date: string;
  time: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  affiliatePhone: string;
  affiliateCedula?: string;
  // Datos del Destinatario / Cliente Final (ej. Roques)
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity?: string;
  notes?: string;
  items: AffiliateOrderItem[];
  baseTotal: number; // Monto base para VARIEDADES CS
  affiliateCommissionTotal: number; // Total ganancia / comisión del afiliado
  totalAmount: number; // Total cobrado al cliente (baseTotal + affiliateCommissionTotal)
  paymentStatus: 'Pendiente' | 'Pagado' | 'Pago contra entrega';
  status: OrderStatus;
  gmailNotificationSent?: boolean;
  notificationLog?: { date: string; message: string; recipient: string }[];
  updatedAt?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  module: string;
  action: string;
  detail: string;
  severity: 'Normal' | 'Advertencia' | 'Crítico';
}

export interface CompanyConfig {
  companyName: string;
  subtitle: string;
  taxId: string;
  address: string;
  phone: string;
  email: string;
  currencySymbol: string;
  currencyCode: string;
  exchangeRate: number; // Tasa de cambio NIO (Córdobas) por 1 USD (Dólar)
  taxRatePercent: number;
  pricesIncludeTax: boolean;
  invoicePrefix: string;
  receiptFooter: string;
  defaultLowStockThreshold: number;
  requireClientForCredit: boolean;
}
