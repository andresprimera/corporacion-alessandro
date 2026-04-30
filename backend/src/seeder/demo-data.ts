import type { CreateProductInput } from '@base-dashboard/shared';

export interface DemoCitySeed {
  name: string;
}

export interface DemoWarehouseSeed {
  name: string;
  cityName: string;
  address?: string;
}

export interface DemoInventorySeed {
  warehouseName: string;
  productName: string;
  batch: string;
  qty: number;
}

export interface DemoSalesPersonSeed {
  name: string;
  email: string;
  cityName: string;
  commissionPercentage: number;
}

export interface DemoClientSeed {
  name: string;
  rif: string;
  address: string;
  phone: string;
  salesPersonEmail: string;
}

export interface DemoSaleItemSeed {
  productName: string;
  qty: number;
}

export interface DemoSaleSeed {
  soldByEmail: string;
  clientRif: string;
  daysAgo: number;
  notes?: string;
  items: DemoSaleItemSeed[];
}

export const DEMO_SALES_PERSON_PASSWORD = 'Test@123';

export const demoCities: DemoCitySeed[] = [
  { name: 'Caracas' },
  { name: 'Maracaibo' },
  { name: 'Valencia' },
  { name: 'Barquisimeto' },
  { name: 'Maracay' },
  { name: 'Ciudad Guayana' },
];

export const demoWarehouses: DemoWarehouseSeed[] = [
  {
    name: 'Almacén Caracas Norte',
    cityName: 'Caracas',
    address: 'Av. Francisco de Miranda',
  },
  { name: 'Almacén Caracas Sur', cityName: 'Caracas', address: 'El Valle' },
  { name: 'Almacén Maracaibo', cityName: 'Maracaibo', address: 'Av. 5 de Julio' },
  { name: 'Almacén Valencia', cityName: 'Valencia', address: 'Zona Industrial' },
  {
    name: 'Almacén Barquisimeto',
    cityName: 'Barquisimeto',
    address: 'Av. Lara',
  },
  { name: 'Almacén Maracay', cityName: 'Maracay', address: 'Av. Bolívar' },
  {
    name: 'Almacén Ciudad Guayana',
    cityName: 'Ciudad Guayana',
    address: 'Puerto Ordaz',
  },
];

export const demoProducts: CreateProductInput[] = [
  {
    kind: 'groceries',
    name: 'Harina PAN 1kg',
    price: { value: 1.5, currency: 'USD' },
  },
  {
    kind: 'groceries',
    name: 'Arroz Mary 1kg',
    price: { value: 1.2, currency: 'USD' },
  },
  {
    kind: 'groceries',
    name: 'Aceite Vatel 1L',
    price: { value: 2.8, currency: 'USD' },
  },
  {
    kind: 'groceries',
    name: 'Café Madrid 500g',
    price: { value: 4.5, currency: 'USD' },
  },
  {
    kind: 'groceries',
    name: 'Azúcar Montalbán 1kg',
    price: { value: 1.0, currency: 'USD' },
  },
  {
    kind: 'liquor',
    name: 'Ron Cacique Añejo',
    liquorType: 'rum',
    presentation: 'ML750',
    price: { value: 12.0, currency: 'USD' },
  },
  {
    kind: 'liquor',
    name: 'Ron Santa Teresa 1796',
    liquorType: 'rum',
    presentation: 'ML750',
    price: { value: 35.0, currency: 'USD' },
  },
  {
    kind: 'liquor',
    name: "Whisky Buchanan's 12",
    liquorType: 'whisky',
    presentation: 'ML750',
    price: { value: 45.0, currency: 'USD' },
  },
  {
    kind: 'liquor',
    name: 'Vodka Smirnoff',
    liquorType: 'vodka',
    presentation: 'L1',
    price: { value: 18.0, currency: 'USD' },
  },
];

export const demoInventory: DemoInventorySeed[] = [
  // Caracas Norte — flagship: full assortment
  { warehouseName: 'Almacén Caracas Norte', productName: 'Harina PAN 1kg', batch: 'B-CCN-001', qty: 500 },
  { warehouseName: 'Almacén Caracas Norte', productName: 'Arroz Mary 1kg', batch: 'B-CCN-002', qty: 400 },
  { warehouseName: 'Almacén Caracas Norte', productName: 'Aceite Vatel 1L', batch: 'B-CCN-003', qty: 200 },
  { warehouseName: 'Almacén Caracas Norte', productName: 'Ron Cacique Añejo', batch: 'B-CCN-004', qty: 80 },
  { warehouseName: 'Almacén Caracas Norte', productName: "Whisky Buchanan's 12", batch: 'B-CCN-005', qty: 40 },
  // Caracas Sur — groceries-heavy
  { warehouseName: 'Almacén Caracas Sur', productName: 'Harina PAN 1kg', batch: 'B-CCS-001', qty: 300 },
  { warehouseName: 'Almacén Caracas Sur', productName: 'Café Madrid 500g', batch: 'B-CCS-002', qty: 150 },
  { warehouseName: 'Almacén Caracas Sur', productName: 'Azúcar Montalbán 1kg', batch: 'B-CCS-003', qty: 250 },
  // Maracaibo
  { warehouseName: 'Almacén Maracaibo', productName: 'Arroz Mary 1kg', batch: 'B-MCB-001', qty: 350 },
  { warehouseName: 'Almacén Maracaibo', productName: 'Ron Santa Teresa 1796', batch: 'B-MCB-002', qty: 60 },
  { warehouseName: 'Almacén Maracaibo', productName: 'Vodka Smirnoff', batch: 'B-MCB-003', qty: 50 },
  // Valencia
  { warehouseName: 'Almacén Valencia', productName: 'Harina PAN 1kg', batch: 'B-VLC-001', qty: 280 },
  { warehouseName: 'Almacén Valencia', productName: 'Aceite Vatel 1L', batch: 'B-VLC-002', qty: 180 },
  // Barquisimeto
  { warehouseName: 'Almacén Barquisimeto', productName: 'Café Madrid 500g', batch: 'B-BAR-001', qty: 120 },
  { warehouseName: 'Almacén Barquisimeto', productName: 'Ron Cacique Añejo', batch: 'B-BAR-002', qty: 70 },
  // Maracay
  { warehouseName: 'Almacén Maracay', productName: 'Azúcar Montalbán 1kg', batch: 'B-MCY-001', qty: 200 },
  { warehouseName: 'Almacén Maracay', productName: 'Arroz Mary 1kg', batch: 'B-MCY-002', qty: 180 },
  // Ciudad Guayana
  { warehouseName: 'Almacén Ciudad Guayana', productName: 'Harina PAN 1kg', batch: 'B-CGU-001', qty: 220 },
  { warehouseName: 'Almacén Ciudad Guayana', productName: 'Vodka Smirnoff', batch: 'B-CGU-002', qty: 30 },
];

export const demoSalesPeople: DemoSalesPersonSeed[] = [
  {
    name: 'María González',
    email: 'maria.gonzalez@alessandro.demo',
    cityName: 'Caracas',
    commissionPercentage: 5,
  },
  {
    name: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@alessandro.demo',
    cityName: 'Caracas',
    commissionPercentage: 4,
  },
  {
    name: 'José Pérez',
    email: 'jose.perez@alessandro.demo',
    cityName: 'Maracaibo',
    commissionPercentage: 3,
  },
  {
    name: 'Ana Martínez',
    email: 'ana.martinez@alessandro.demo',
    cityName: 'Valencia',
    commissionPercentage: 5,
  },
  {
    name: 'Luis Sánchez',
    email: 'luis.sanchez@alessandro.demo',
    cityName: 'Barquisimeto',
    commissionPercentage: 4,
  },
  {
    name: 'Patricia López',
    email: 'patricia.lopez@alessandro.demo',
    cityName: 'Maracay',
    commissionPercentage: 3,
  },
];

export const demoClients: DemoClientSeed[] = [
  // María González — Caracas
  {
    name: 'Bodegón La Castellana',
    rif: 'J-30112233-4',
    address: 'Av. Principal La Castellana, Caracas',
    phone: '+58-212-2611001',
    salesPersonEmail: 'maria.gonzalez@alessandro.demo',
  },
  {
    name: 'Supermercado Plaza Altamira',
    rif: 'J-30445566-7',
    address: 'Plaza Altamira Sur, Caracas',
    phone: '+58-212-2632002',
    salesPersonEmail: 'maria.gonzalez@alessandro.demo',
  },
  {
    name: 'Licorería El Cardenalito',
    rif: 'J-30778899-0',
    address: 'Av. Francisco de Miranda, Chacao',
    phone: '+58-212-2643003',
    salesPersonEmail: 'maria.gonzalez@alessandro.demo',
  },
  // Carlos Rodríguez — Caracas
  {
    name: 'Abasto El Valle',
    rif: 'J-31112233-4',
    address: 'Av. Intercomunal El Valle, Caracas',
    phone: '+58-212-6814004',
    salesPersonEmail: 'carlos.rodriguez@alessandro.demo',
  },
  {
    name: 'Distribuidora Catia',
    rif: 'J-31445566-7',
    address: 'Av. Sucre, Catia, Caracas',
    phone: '+58-212-8625005',
    salesPersonEmail: 'carlos.rodriguez@alessandro.demo',
  },
  {
    name: 'Mini Market Petare',
    rif: 'J-31778899-0',
    address: 'Casco Histórico de Petare, Caracas',
    phone: '+58-212-2716006',
    salesPersonEmail: 'carlos.rodriguez@alessandro.demo',
  },
  // José Pérez — Maracaibo
  {
    name: 'Supermercado Las Mercedes',
    rif: 'J-32112233-4',
    address: 'Av. 5 de Julio, Maracaibo',
    phone: '+58-261-7917007',
    salesPersonEmail: 'jose.perez@alessandro.demo',
  },
  {
    name: 'Licorería La Curva',
    rif: 'J-32445566-7',
    address: 'Av. Bella Vista, Maracaibo',
    phone: '+58-261-7928008',
    salesPersonEmail: 'jose.perez@alessandro.demo',
  },
  {
    name: 'Bodegón Sambil',
    rif: 'J-32778899-0',
    address: 'C.C. Sambil Maracaibo',
    phone: '+58-261-7939009',
    salesPersonEmail: 'jose.perez@alessandro.demo',
  },
  // Ana Martínez — Valencia
  {
    name: 'Supermercado Naguanagua',
    rif: 'J-33112233-4',
    address: 'Av. Universidad, Naguanagua',
    phone: '+58-241-8410010',
    salesPersonEmail: 'ana.martinez@alessandro.demo',
  },
  {
    name: 'Distribuidora Industrial Carabobo',
    rif: 'J-33445566-7',
    address: 'Zona Industrial, Valencia',
    phone: '+58-241-8421011',
    salesPersonEmail: 'ana.martinez@alessandro.demo',
  },
  {
    name: 'Licorería San Diego',
    rif: 'J-33778899-0',
    address: 'Av. Don Julio Centeno, San Diego',
    phone: '+58-241-8432012',
    salesPersonEmail: 'ana.martinez@alessandro.demo',
  },
  // Luis Sánchez — Barquisimeto
  {
    name: 'Bodegón Las Trinitarias',
    rif: 'J-34112233-4',
    address: 'C.C. Las Trinitarias, Barquisimeto',
    phone: '+58-251-2543013',
    salesPersonEmail: 'luis.sanchez@alessandro.demo',
  },
  {
    name: 'Supermercado Cabudare',
    rif: 'J-34445566-7',
    address: 'Av. Libertador, Cabudare',
    phone: '+58-251-2554014',
    salesPersonEmail: 'luis.sanchez@alessandro.demo',
  },
  {
    name: 'Licorería La Lara',
    rif: 'J-34778899-0',
    address: 'Av. Lara, Barquisimeto',
    phone: '+58-251-2565015',
    salesPersonEmail: 'luis.sanchez@alessandro.demo',
  },
  // Patricia López — Maracay
  {
    name: 'Supermercado El Limón',
    rif: 'J-35112233-4',
    address: 'Av. Casanova Godoy, El Limón',
    phone: '+58-243-2376016',
    salesPersonEmail: 'patricia.lopez@alessandro.demo',
  },
  {
    name: 'Bodegón La Soledad',
    rif: 'J-35445566-7',
    address: 'Sector La Soledad, Maracay',
    phone: '+58-243-2387017',
    salesPersonEmail: 'patricia.lopez@alessandro.demo',
  },
  {
    name: 'Distribuidora Aragua',
    rif: 'J-35778899-0',
    address: 'Av. Bolívar, Maracay',
    phone: '+58-243-2398018',
    salesPersonEmail: 'patricia.lopez@alessandro.demo',
  },
];

// Sales spread across the past ~75 days, with multiple per sales person so the
// commissions report shows interesting variation. Quantities stay modest so
// city-level inventory remains positive after the seed runs.
export const demoSales: DemoSaleSeed[] = [
  // ───── María González (Caracas) ─────
  {
    soldByEmail: 'maria.gonzalez@alessandro.demo',
    clientRif: 'J-30112233-4',
    daysAgo: 72,
    items: [
      { productName: 'Harina PAN 1kg', qty: 40 },
      { productName: 'Aceite Vatel 1L', qty: 12 },
    ],
  },
  {
    soldByEmail: 'maria.gonzalez@alessandro.demo',
    clientRif: 'J-30445566-7',
    daysAgo: 60,
    items: [
      { productName: 'Arroz Mary 1kg', qty: 30 },
      { productName: 'Café Madrid 500g', qty: 8 },
    ],
  },
  {
    soldByEmail: 'maria.gonzalez@alessandro.demo',
    clientRif: 'J-30778899-0',
    daysAgo: 45,
    items: [
      { productName: 'Ron Cacique Añejo', qty: 6 },
      { productName: "Whisky Buchanan's 12", qty: 3 },
    ],
  },
  {
    soldByEmail: 'maria.gonzalez@alessandro.demo',
    clientRif: 'J-30112233-4',
    daysAgo: 30,
    items: [
      { productName: 'Azúcar Montalbán 1kg', qty: 25 },
      { productName: 'Harina PAN 1kg', qty: 50 },
    ],
  },
  {
    soldByEmail: 'maria.gonzalez@alessandro.demo',
    clientRif: 'J-30778899-0',
    daysAgo: 18,
    items: [
      { productName: "Whisky Buchanan's 12", qty: 4 },
      { productName: 'Ron Cacique Añejo', qty: 5 },
    ],
  },
  {
    soldByEmail: 'maria.gonzalez@alessandro.demo',
    clientRif: 'J-30445566-7',
    daysAgo: 7,
    items: [
      { productName: 'Café Madrid 500g', qty: 10 },
      { productName: 'Aceite Vatel 1L', qty: 8 },
    ],
  },
  {
    soldByEmail: 'maria.gonzalez@alessandro.demo',
    clientRif: 'J-30112233-4',
    daysAgo: 2,
    items: [
      { productName: 'Harina PAN 1kg', qty: 30 },
      { productName: 'Arroz Mary 1kg', qty: 20 },
    ],
  },

  // ───── Carlos Rodríguez (Caracas) ─────
  {
    soldByEmail: 'carlos.rodriguez@alessandro.demo',
    clientRif: 'J-31112233-4',
    daysAgo: 68,
    items: [
      { productName: 'Harina PAN 1kg', qty: 60 },
      { productName: 'Azúcar Montalbán 1kg', qty: 30 },
    ],
  },
  {
    soldByEmail: 'carlos.rodriguez@alessandro.demo',
    clientRif: 'J-31445566-7',
    daysAgo: 55,
    items: [
      { productName: 'Arroz Mary 1kg', qty: 40 },
      { productName: 'Aceite Vatel 1L', qty: 10 },
    ],
  },
  {
    soldByEmail: 'carlos.rodriguez@alessandro.demo',
    clientRif: 'J-31778899-0',
    daysAgo: 38,
    items: [{ productName: 'Café Madrid 500g', qty: 15 }],
  },
  {
    soldByEmail: 'carlos.rodriguez@alessandro.demo',
    clientRif: 'J-31112233-4',
    daysAgo: 22,
    items: [
      { productName: 'Ron Cacique Añejo', qty: 8 },
      { productName: 'Harina PAN 1kg', qty: 40 },
    ],
  },
  {
    soldByEmail: 'carlos.rodriguez@alessandro.demo',
    clientRif: 'J-31445566-7',
    daysAgo: 12,
    items: [
      { productName: 'Azúcar Montalbán 1kg', qty: 20 },
      { productName: 'Arroz Mary 1kg', qty: 25 },
    ],
  },
  {
    soldByEmail: 'carlos.rodriguez@alessandro.demo',
    clientRif: 'J-31778899-0',
    daysAgo: 4,
    items: [{ productName: "Whisky Buchanan's 12", qty: 2 }],
  },

  // ───── José Pérez (Maracaibo) ─────
  {
    soldByEmail: 'jose.perez@alessandro.demo',
    clientRif: 'J-32112233-4',
    daysAgo: 65,
    items: [{ productName: 'Arroz Mary 1kg', qty: 35 }],
  },
  {
    soldByEmail: 'jose.perez@alessandro.demo',
    clientRif: 'J-32445566-7',
    daysAgo: 50,
    items: [
      { productName: 'Ron Santa Teresa 1796', qty: 4 },
      { productName: 'Vodka Smirnoff', qty: 6 },
    ],
  },
  {
    soldByEmail: 'jose.perez@alessandro.demo',
    clientRif: 'J-32778899-0',
    daysAgo: 33,
    items: [
      { productName: 'Arroz Mary 1kg', qty: 25 },
      { productName: 'Vodka Smirnoff', qty: 4 },
    ],
  },
  {
    soldByEmail: 'jose.perez@alessandro.demo',
    clientRif: 'J-32445566-7',
    daysAgo: 16,
    items: [{ productName: 'Ron Santa Teresa 1796', qty: 6 }],
  },
  {
    soldByEmail: 'jose.perez@alessandro.demo',
    clientRif: 'J-32112233-4',
    daysAgo: 5,
    items: [
      { productName: 'Arroz Mary 1kg', qty: 30 },
      { productName: 'Vodka Smirnoff', qty: 3 },
    ],
  },

  // ───── Ana Martínez (Valencia) ─────
  {
    soldByEmail: 'ana.martinez@alessandro.demo',
    clientRif: 'J-33112233-4',
    daysAgo: 70,
    items: [
      { productName: 'Harina PAN 1kg', qty: 50 },
      { productName: 'Aceite Vatel 1L', qty: 12 },
    ],
  },
  {
    soldByEmail: 'ana.martinez@alessandro.demo',
    clientRif: 'J-33445566-7',
    daysAgo: 52,
    items: [
      { productName: 'Harina PAN 1kg', qty: 60 },
      { productName: 'Aceite Vatel 1L', qty: 18 },
    ],
  },
  {
    soldByEmail: 'ana.martinez@alessandro.demo',
    clientRif: 'J-33778899-0',
    daysAgo: 28,
    items: [{ productName: 'Aceite Vatel 1L', qty: 10 }],
  },
  {
    soldByEmail: 'ana.martinez@alessandro.demo',
    clientRif: 'J-33112233-4',
    daysAgo: 14,
    items: [{ productName: 'Harina PAN 1kg', qty: 40 }],
  },
  {
    soldByEmail: 'ana.martinez@alessandro.demo',
    clientRif: 'J-33445566-7',
    daysAgo: 3,
    items: [
      { productName: 'Harina PAN 1kg', qty: 35 },
      { productName: 'Aceite Vatel 1L', qty: 8 },
    ],
  },

  // ───── Luis Sánchez (Barquisimeto) ─────
  {
    soldByEmail: 'luis.sanchez@alessandro.demo',
    clientRif: 'J-34112233-4',
    daysAgo: 62,
    items: [
      { productName: 'Café Madrid 500g', qty: 12 },
      { productName: 'Ron Cacique Añejo', qty: 5 },
    ],
  },
  {
    soldByEmail: 'luis.sanchez@alessandro.demo',
    clientRif: 'J-34445566-7',
    daysAgo: 47,
    items: [{ productName: 'Café Madrid 500g', qty: 20 }],
  },
  {
    soldByEmail: 'luis.sanchez@alessandro.demo',
    clientRif: 'J-34778899-0',
    daysAgo: 26,
    items: [{ productName: 'Ron Cacique Añejo', qty: 8 }],
  },
  {
    soldByEmail: 'luis.sanchez@alessandro.demo',
    clientRif: 'J-34112233-4',
    daysAgo: 9,
    items: [
      { productName: 'Café Madrid 500g', qty: 15 },
      { productName: 'Ron Cacique Añejo', qty: 4 },
    ],
  },

  // ───── Patricia López (Maracay) ─────
  {
    soldByEmail: 'patricia.lopez@alessandro.demo',
    clientRif: 'J-35112233-4',
    daysAgo: 58,
    items: [
      { productName: 'Azúcar Montalbán 1kg', qty: 25 },
      { productName: 'Arroz Mary 1kg', qty: 20 },
    ],
  },
  {
    soldByEmail: 'patricia.lopez@alessandro.demo',
    clientRif: 'J-35445566-7',
    daysAgo: 40,
    items: [{ productName: 'Arroz Mary 1kg', qty: 35 }],
  },
  {
    soldByEmail: 'patricia.lopez@alessandro.demo',
    clientRif: 'J-35778899-0',
    daysAgo: 21,
    items: [
      { productName: 'Azúcar Montalbán 1kg', qty: 30 },
      { productName: 'Arroz Mary 1kg', qty: 25 },
    ],
  },
  {
    soldByEmail: 'patricia.lopez@alessandro.demo',
    clientRif: 'J-35112233-4',
    daysAgo: 6,
    items: [{ productName: 'Azúcar Montalbán 1kg', qty: 20 }],
  },
];
