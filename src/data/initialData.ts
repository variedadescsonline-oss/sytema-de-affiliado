import {
  Category,
  Product,
  Sale,
  Purchase,
  Client,
  Supplier,
  CreditAccount,
  CashMovement,
  CashSession,
  InventoryMovement,
  ReturnRecord,
  SystemUser,
  AuditEntry,
  CompanyConfig,
  AffiliateOrder,
} from '../types/erp';

export const TODAY_DATE = '2026-09-28';

export const INITIAL_CONFIG: CompanyConfig = {
  companyName: 'VARIEDADES CS',
  subtitle: 'Sistema de Inventario, Ventas y Red de Afiliados',
  taxId: 'J0310000000000',
  address: 'Sede Principal, Nicaragua',
  phone: '+505 8888-9224',
  email: 'variedadescs.online@gmail.com',
  currencySymbol: '$',
  currencyCode: 'USD',
  exchangeRate: 37, // Tasa fija: 1 USD = 37 Córdobas
  taxRatePercent: 15,
  pricesIncludeTax: true,
  invoicePrefix: 'FAC-SC-',
  receiptFooter: 'Gracias por su compra. Conserve su comprobante para cambios o garantías.',
  defaultLowStockThreshold: 10,
  requireClientForCredit: true,
};

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    code: 'PAP-01',
    name: 'Papelería y Oficina',
    description: 'Cuadernos, bolígrafos, resmas de papel, carpetas y suministros escolares y corporativos.',
    active: true,
  },
  {
    id: 'cat-2',
    code: 'TEC-02',
    name: 'Tecnología y Accesorios',
    description: 'Cables USB, cargadores, audífonos, memorias USB, periféricos y baterías.',
    active: true,
  },
  {
    id: 'cat-3',
    code: 'HOG-03',
    name: 'Hogar y Organización',
    description: 'Termos, organizadores plásticos, iluminación LED, utensilios y artículos domésticos.',
    active: true,
  },
  {
    id: 'cat-4',
    code: 'CUI-04',
    name: 'Cuidado Personal y Cosmética',
    description: 'Perfumería, cremas, kits de aseo, espejos y accesorios de cuidado diario.',
    active: true,
  },
  {
    id: 'cat-5',
    code: 'FER-05',
    name: 'Ferretería Liviana y Eléctricos',
    description: 'Cintas aislantes, extensiones eléctricas, bombillos LED, candados y herramientas básicas.',
    active: true,
  },
  {
    id: 'cat-6',
    code: 'REG-06',
    name: 'Juguetería y Detalles',
    description: 'Bolsas de regalo, juegos de mesa, termos decorativos, empaques y artículos de temporada.',
    active: true,
  },
];

// Eliminados todos los proveedores a petición del usuario
export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    barcode: '770100100201',
    sku: 'PAP-CUA-100',
    name: 'Cuaderno Cosido Profesional 100 Hojas Cuadriculado',
    categoryId: 'cat-1',
    categoryName: 'Papelería y Oficina',
    supplierId: '',
    supplierName: 'General',
    cost: 1.80,
    price: 3.20,
    stock: 85,
    minStock: 20,
    unit: 'Unidad',
    location: 'Estante A-01',
    active: true,
  },
  {
    id: 'prod-2',
    barcode: '770100100202',
    sku: 'PAP-RES-CARTA',
    name: 'Resma de Papel Alcalino Tamaño Carta 75g (500 Hojas)',
    categoryId: 'cat-1',
    categoryName: 'Papelería y Oficina',
    supplierId: '',
    supplierName: 'General',
    cost: 4.50,
    price: 6.80,
    stock: 42,
    minStock: 15,
    unit: 'Resma',
    location: 'Bodega P-02',
    active: true,
  },
  {
    id: 'prod-3',
    barcode: '770100100203',
    sku: 'PAP-BOL-CAJ12',
    name: 'Caja Bolígrafo Gel Negro Punta Fina 0.7mm (x12 und)',
    categoryId: 'cat-1',
    categoryName: 'Papelería y Oficina',
    supplierId: '',
    supplierName: 'General',
    cost: 2.90,
    price: 5.00,
    stock: 6,
    minStock: 10,
    unit: 'Caja',
    location: 'Vitrina V-01',
    active: true,
  },
  {
    id: 'prod-4',
    barcode: '770200300101',
    sku: 'TEC-CAR-25W',
    name: 'Cargador Carga Rápida USB-C PD 25W + Cable 1m',
    categoryId: 'cat-2',
    categoryName: 'Tecnología y Accesorios',
    supplierId: '',
    supplierName: 'General',
    cost: 6.20,
    price: 11.50,
    stock: 28,
    minStock: 8,
    unit: 'Unidad',
    location: 'Vitrina T-01',
    active: true,
  },
  {
    id: 'prod-5',
    barcode: '770200300102',
    sku: 'TEC-AUD-BT5',
    name: 'Audífonos Inalámbricos Bluetooth 5.3 Estuche Carga',
    categoryId: 'cat-2',
    categoryName: 'Tecnología y Accesorios',
    supplierId: '',
    supplierName: 'General',
    cost: 9.50,
    price: 18.00,
    stock: 4,
    minStock: 8,
    unit: 'Unidad',
    location: 'Vitrina T-02',
    active: true,
  },
  {
    id: 'prod-6',
    barcode: '770200300103',
    sku: 'TEC-MEM-64G',
    name: 'Memoria USB 3.2 Metálica 64GB Alta Velocidad',
    categoryId: 'cat-2',
    categoryName: 'Tecnología y Accesorios',
    supplierId: '',
    supplierName: 'General',
    cost: 4.80,
    price: 8.90,
    stock: 0,
    minStock: 10,
    unit: 'Unidad',
    location: 'Vitrina T-03',
    active: true,
  },
  {
    id: 'prod-7',
    barcode: '770300400101',
    sku: 'HOG-TER-750',
    name: 'Termo Acero Inoxidable Doble Pared 750ml Mate',
    categoryId: 'cat-3',
    categoryName: 'Hogar y Organización',
    supplierId: '',
    supplierName: 'General',
    cost: 5.40,
    price: 9.80,
    stock: 19,
    minStock: 6,
    unit: 'Unidad',
    location: 'Estante H-01',
    active: true,
  },
  {
    id: 'prod-8',
    barcode: '770300400102',
    sku: 'HOG-ORG-3N',
    name: 'Organizador Multiusos Acrílico Transparente 3 Niveles',
    categoryId: 'cat-3',
    categoryName: 'Hogar y Organización',
    supplierId: '',
    supplierName: 'General',
    cost: 7.00,
    price: 12.50,
    stock: 5,
    minStock: 6,
    unit: 'Unidad',
    location: 'Estante H-04',
    active: true,
  },
  {
    id: 'prod-9',
    barcode: '770500200101',
    sku: 'FER-MUL-6T',
    name: 'Multitoma Supresor de Picos 6 Salidas Cable 1.8m',
    categoryId: 'cat-5',
    categoryName: 'Ferretería Liviana y Eléctricos',
    supplierId: '',
    supplierName: 'General',
    cost: 4.10,
    price: 7.50,
    stock: 31,
    minStock: 10,
    unit: 'Unidad',
    location: 'Góndola F-02',
    active: true,
  },
  {
    id: 'prod-10',
    barcode: '770500200102',
    sku: 'FER-BOM-12W',
    name: 'Bombillo LED Alta Potencia 12W Luz Blanca 6500K E27',
    categoryId: 'cat-5',
    categoryName: 'Ferretería Liviana y Eléctricos',
    supplierId: '',
    supplierName: 'General',
    cost: 1.10,
    price: 2.20,
    stock: 0,
    minStock: 24,
    unit: 'Unidad',
    location: 'Góndola F-01',
    active: true,
  },
  {
    id: 'prod-11',
    barcode: '770400500101',
    sku: 'CUI-KIT-VIA',
    name: 'Set Cuidado Personal y Estuche Organizador Impermeable',
    categoryId: 'cat-4',
    categoryName: 'Cuidado Personal y Cosmética',
    supplierId: '',
    supplierName: 'General',
    cost: 3.90,
    price: 7.20,
    stock: 22,
    minStock: 8,
    unit: 'Set',
    location: 'Estante C-02',
    active: true,
  },
  {
    id: 'prod-12',
    barcode: '770600100101',
    sku: 'REG-BOL-MED12',
    name: 'Paquete Bolsas de Regalo Kraft Laminadas Medianas (x12)',
    categoryId: 'cat-6',
    categoryName: 'Juguetería y Detalles',
    supplierId: '',
    supplierName: 'General',
    cost: 3.60,
    price: 6.50,
    stock: 7,
    minStock: 10,
    unit: 'Paquete',
    location: 'Estante R-01',
    active: true,
  },
];

// Eliminados todos los clientes a petición del usuario
export const INITIAL_CLIENTS: Client[] = [];

// Eliminadas todas las ventas fantasma / de prueba a petición del usuario
export const INITIAL_SALES: Sale[] = [];

export const INITIAL_PURCHASES: Purchase[] = [];

export const INITIAL_CREDITS: CreditAccount[] = [];

export const INITIAL_CASH_SESSION: CashSession = {
  id: 'caja-principal',
  openedAt: `${TODAY_DATE} 08:00`,
  cashierName: 'Administrador',
  openingBalance: 0.0,
  status: 'Cerrada',
};

export const INITIAL_CASH_MOVEMENTS: CashMovement[] = [];

export const INITIAL_INVENTORY_MOVEMENTS: InventoryMovement[] = [];

// Eliminadas devoluciones de prueba asociadas a ventas fantasma
export const INITIAL_RETURNS: ReturnRecord[] = [];

export const AUTHORIZED_EMAILS = [
  'variedadescs.online@gmail.com',
  'afiliacion.variedadescs@gmail.com',
  'variedadescs@gmail.com',
  'syncconnect.online@gmail.com',
] as const;

export const RECOVERY_KEYS: Record<string, string> = {
  'variedadescs.online@gmail.com': 'CS-SEC-9224',
  'afiliacion.variedadescs@gmail.com': 'CS-SEC-9224',
  'variedadescs@gmail.com': 'CS-SEC-9224',
};

export const INITIAL_USERS: SystemUser[] = [
  {
    id: 'usr-admin-principal',
    username: 'admin',
    fullName: 'Administrador VARIEDADES CS',
    role: 'Administrador',
    email: 'variedadescs.online@gmail.com',
    phone: '+505 8888-9224',
    branch: 'Sede Administrativa Principal',
    active: true,
    lastLogin: `${TODAY_DATE} 08:00`,
    pin: '1234',
  },
];

export const INITIAL_AUDIT_LOGS: AuditEntry[] = [];

export const INITIAL_AFFILIATE_ORDERS: AffiliateOrder[] = [];
