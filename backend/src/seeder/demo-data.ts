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
