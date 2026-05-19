import type { Currency } from '@base-dashboard/shared';

export interface DemoUnitSeed {
  name: string;
  abbreviation: string;
}

export interface DemoPresentationSeed {
  name: string;
  abbreviation: string;
}

export interface DemoLiquorTypeSeed {
  name: string;
  abbreviation: string;
}

interface DemoProductSeedBase {
  name: string;
  price: { value: number; currency: Currency };
  basicUnitName: string;
  packageUnitName?: string;
  unitsPerPackage?: number;
}

interface DemoGroceryProductSeed extends DemoProductSeedBase {
  kind: 'groceries';
}

interface DemoLiquorProductSeed extends DemoProductSeedBase {
  kind: 'liquor';
  liquorTypeName: string;
  presentationName: string;
}

export type DemoProductSeed =
  | DemoGroceryProductSeed
  | DemoLiquorProductSeed;

export interface DemoCitySeed {
  name: string;
}

export interface DemoWarehouseSeed {
  name: string;
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
  commissionPercentage: number;
}

export interface DemoAdminSeed {
  name: string;
  email: string;
  password: string;
}

export interface DemoClientSeed {
  name: string;
  rif: string;
  address: string;
  phone: string;
  cityName: string;
  salesPersonEmail: string;
}

export const DEMO_SALES_PERSON_PASSWORD = 'Test@123';

export const demoAdmins: DemoAdminSeed[] = [
  {
    name: 'Andres Primera',
    email: 'andresprimera@gmail.com',
    password: 'Test@123',
  },
];

export const demoCities: DemoCitySeed[] = [{ name: 'Maracay' }];

export const demoWarehouses: DemoWarehouseSeed[] = [
  {
    name: 'Almacén Caracas Norte',
    address: 'Av. Francisco de Miranda',
  },
  { name: 'Almacén Caracas Sur', address: 'El Valle' },
  { name: 'Almacén Maracaibo', address: 'Av. 5 de Julio' },
  { name: 'Almacén Valencia', address: 'Zona Industrial' },
  {
    name: 'Almacén Barquisimeto',
    address: 'Av. Lara',
  },
  { name: 'Almacén Maracay', address: 'Av. Bolívar' },
  {
    name: 'Almacén Ciudad Guayana',
    address: 'Puerto Ordaz',
  },
];

export const demoUnits: DemoUnitSeed[] = [
  { name: 'Botella', abbreviation: 'bta' },
  { name: 'Caja', abbreviation: 'cja' },
  { name: 'Lata', abbreviation: 'lat' },
  { name: 'Unidad', abbreviation: 'und' },
];

export const demoPresentations: DemoPresentationSeed[] = [
  { name: '1 Litro', abbreviation: '1L' },
  { name: '750 ml', abbreviation: '750ml' },
];

export const demoLiquorTypes: DemoLiquorTypeSeed[] = [
  { name: 'Ron', abbreviation: 'ron' },
  { name: 'Whisky', abbreviation: 'wsk' },
  { name: 'Vodka', abbreviation: 'vdk' },
  { name: 'Ginebra', abbreviation: 'gin' },
  { name: 'Tequila', abbreviation: 'tql' },
  { name: 'Otro', abbreviation: 'otr' },
];

export const demoProducts: DemoProductSeed[] = [
  {
    kind: 'groceries',
    name: 'Harina PAN 1kg',
    price: { value: 1.5, currency: 'USD' },
    basicUnitName: 'Unidad',
    packageUnitName: 'Caja',
    unitsPerPackage: 24,
  },
  {
    kind: 'groceries',
    name: 'Arroz Mary 1kg',
    price: { value: 1.2, currency: 'USD' },
    basicUnitName: 'Unidad',
    packageUnitName: 'Caja',
    unitsPerPackage: 24,
  },
  {
    kind: 'groceries',
    name: 'Aceite Vatel 1L',
    price: { value: 2.8, currency: 'USD' },
    basicUnitName: 'Unidad',
    packageUnitName: 'Caja',
    unitsPerPackage: 12,
  },
  {
    kind: 'groceries',
    name: 'Café Madrid 500g',
    price: { value: 4.5, currency: 'USD' },
    basicUnitName: 'Unidad',
  },
  {
    kind: 'groceries',
    name: 'Azúcar Montalbán 1kg',
    price: { value: 1.0, currency: 'USD' },
    basicUnitName: 'Unidad',
    packageUnitName: 'Caja',
    unitsPerPackage: 24,
  },
  {
    kind: 'liquor',
    name: 'Ron Cacique Añejo',
    liquorTypeName: 'Ron',
    presentationName: '750 ml',
    price: { value: 12.0, currency: 'USD' },
    basicUnitName: 'Botella',
    packageUnitName: 'Caja',
    unitsPerPackage: 12,
  },
  {
    kind: 'liquor',
    name: 'Ron Santa Teresa 1796',
    liquorTypeName: 'Ron',
    presentationName: '750 ml',
    price: { value: 35.0, currency: 'USD' },
    basicUnitName: 'Botella',
    packageUnitName: 'Caja',
    unitsPerPackage: 12,
  },
  {
    kind: 'liquor',
    name: "Whisky Buchanan's 12",
    liquorTypeName: 'Whisky',
    presentationName: '750 ml',
    price: { value: 45.0, currency: 'USD' },
    basicUnitName: 'Botella',
    packageUnitName: 'Caja',
    unitsPerPackage: 12,
  },
  {
    kind: 'liquor',
    name: 'Vodka Smirnoff',
    liquorTypeName: 'Vodka',
    presentationName: '1 Litro',
    price: { value: 18.0, currency: 'USD' },
    basicUnitName: 'Botella',
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
    commissionPercentage: 5,
  },
  {
    name: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@alessandro.demo',
    commissionPercentage: 4,
  },
  {
    name: 'José Pérez',
    email: 'jose.perez@alessandro.demo',
    commissionPercentage: 3,
  },
  {
    name: 'Ana Martínez',
    email: 'ana.martinez@alessandro.demo',
    commissionPercentage: 5,
  },
  {
    name: 'Luis Sánchez',
    email: 'luis.sanchez@alessandro.demo',
    commissionPercentage: 4,
  },
  {
    name: 'Patricia López',
    email: 'patricia.lopez@alessandro.demo',
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
    cityName: 'Maracay',
    salesPersonEmail: 'maria.gonzalez@alessandro.demo',
  },
  {
    name: 'Supermercado Plaza Altamira',
    rif: 'J-30445566-7',
    address: 'Plaza Altamira Sur, Caracas',
    phone: '+58-212-2632002',
    cityName: 'Maracay',
    salesPersonEmail: 'maria.gonzalez@alessandro.demo',
  },
  {
    name: 'Licorería El Cardenalito',
    rif: 'J-30778899-0',
    address: 'Av. Francisco de Miranda, Chacao',
    phone: '+58-212-2643003',
    cityName: 'Maracay',
    salesPersonEmail: 'maria.gonzalez@alessandro.demo',
  },
  // Carlos Rodríguez — Caracas
  {
    name: 'Abasto El Valle',
    rif: 'J-31112233-4',
    address: 'Av. Intercomunal El Valle, Caracas',
    phone: '+58-212-6814004',
    cityName: 'Maracay',
    salesPersonEmail: 'carlos.rodriguez@alessandro.demo',
  },
  {
    name: 'Distribuidora Catia',
    rif: 'J-31445566-7',
    address: 'Av. Sucre, Catia, Caracas',
    phone: '+58-212-8625005',
    cityName: 'Maracay',
    salesPersonEmail: 'carlos.rodriguez@alessandro.demo',
  },
  {
    name: 'Mini Market Petare',
    rif: 'J-31778899-0',
    address: 'Casco Histórico de Petare, Caracas',
    phone: '+58-212-2716006',
    cityName: 'Maracay',
    salesPersonEmail: 'carlos.rodriguez@alessandro.demo',
  },
  // José Pérez — Maracaibo
  {
    name: 'Supermercado Las Mercedes',
    rif: 'J-32112233-4',
    address: 'Av. 5 de Julio, Maracaibo',
    phone: '+58-261-7917007',
    cityName: 'Maracay',
    salesPersonEmail: 'jose.perez@alessandro.demo',
  },
  {
    name: 'Licorería La Curva',
    rif: 'J-32445566-7',
    address: 'Av. Bella Vista, Maracaibo',
    phone: '+58-261-7928008',
    cityName: 'Maracay',
    salesPersonEmail: 'jose.perez@alessandro.demo',
  },
  {
    name: 'Bodegón Sambil',
    rif: 'J-32778899-0',
    address: 'C.C. Sambil Maracaibo',
    phone: '+58-261-7939009',
    cityName: 'Maracay',
    salesPersonEmail: 'jose.perez@alessandro.demo',
  },
  // Ana Martínez — Valencia
  {
    name: 'Supermercado Naguanagua',
    rif: 'J-33112233-4',
    address: 'Av. Universidad, Naguanagua',
    phone: '+58-241-8410010',
    cityName: 'Maracay',
    salesPersonEmail: 'ana.martinez@alessandro.demo',
  },
  {
    name: 'Distribuidora Industrial Carabobo',
    rif: 'J-33445566-7',
    address: 'Zona Industrial, Valencia',
    phone: '+58-241-8421011',
    cityName: 'Maracay',
    salesPersonEmail: 'ana.martinez@alessandro.demo',
  },
  {
    name: 'Licorería San Diego',
    rif: 'J-33778899-0',
    address: 'Av. Don Julio Centeno, San Diego',
    phone: '+58-241-8432012',
    cityName: 'Maracay',
    salesPersonEmail: 'ana.martinez@alessandro.demo',
  },
  // Luis Sánchez — Barquisimeto
  {
    name: 'Bodegón Las Trinitarias',
    rif: 'J-34112233-4',
    address: 'C.C. Las Trinitarias, Barquisimeto',
    phone: '+58-251-2543013',
    cityName: 'Maracay',
    salesPersonEmail: 'luis.sanchez@alessandro.demo',
  },
  {
    name: 'Supermercado Cabudare',
    rif: 'J-34445566-7',
    address: 'Av. Libertador, Cabudare',
    phone: '+58-251-2554014',
    cityName: 'Maracay',
    salesPersonEmail: 'luis.sanchez@alessandro.demo',
  },
  {
    name: 'Licorería La Lara',
    rif: 'J-34778899-0',
    address: 'Av. Lara, Barquisimeto',
    phone: '+58-251-2565015',
    cityName: 'Maracay',
    salesPersonEmail: 'luis.sanchez@alessandro.demo',
  },
  // Patricia López — Maracay
  {
    name: 'Supermercado El Limón',
    rif: 'J-35112233-4',
    address: 'Av. Casanova Godoy, El Limón',
    phone: '+58-243-2376016',
    cityName: 'Maracay',
    salesPersonEmail: 'patricia.lopez@alessandro.demo',
  },
  {
    name: 'Bodegón La Soledad',
    rif: 'J-35445566-7',
    address: 'Sector La Soledad, Maracay',
    phone: '+58-243-2387017',
    cityName: 'Maracay',
    salesPersonEmail: 'patricia.lopez@alessandro.demo',
  },
  {
    name: 'Distribuidora Aragua',
    rif: 'J-35778899-0',
    address: 'Av. Bolívar, Maracay',
    phone: '+58-243-2398018',
    cityName: 'Maracay',
    salesPersonEmail: 'patricia.lopez@alessandro.demo',
  },
];
