// ============================================================
// Core Domain Types
// ============================================================

export type DealType = 'sale' | 'lease' | 'monthly';
export type ListingStatus = 'active' | 'deleted' | 'suspended';
export type PriceDirection = 'up' | 'down' | 'neutral';
export type ViewMode = 'card' | 'table';

export interface PriceHistory {
  date: string;
  price: number;
  note?: string;
}

export interface ActualTransaction {
  date: string;
  price: number;
  floor: number;
  area: number;
}

export interface Agent {
  name: string;
  agency: string;
  phone: string;
  license: string;
}

export interface Listing {
  id: string;
  complexId: string;
  complexName: string;
  district: string;
  neighborhood: string;
  address: string;
  dealType: DealType;
  price: number;
  depositPrice?: number;
  monthlyRent?: number;
  area: number;
  floor: number;
  totalFloors: number;
  direction: string;
  buildYear: number;
  renovated: boolean;
  status: ListingStatus;
  registeredAt: string;
  updatedAt: string;
  deletedAt?: string;
  priceHistory: PriceHistory[];
  thumbnailUrl: string;
  imageUrls: string[];
  description: string;
  agent: Agent;
  tags: string[];
  // Computed / derived
  priceChange?: number;
  priceChangeDirection?: PriceDirection;
  deviationFromActual?: number;
  deviationLabel?: string;
  isSuspectedDuplicate?: boolean;
  isReRegistered?: boolean;
  priceRiseCount?: number;
  priceDropCount?: number;
  isSubwayNear?: boolean;
  subwayLine?: string;
  subwayStation?: string;
  subwayDistance?: number;
}

export interface Complex {
  id: string;
  name: string;
  district: string;
  neighborhood: string;
  address: string;
  buildYear: number;
  totalUnits: number;
  totalDongs: number;
  parkingRatio: number;
  heatingType: string;
  managementFee?: number;
  averagePrice: number;
  lowestPrice: number;
  medianPrice: number;
  activeListings: number;
  recentTransactions: ActualTransaction[];
  priceHistory30d: { date: string; avgPrice: number }[];
  areaDistribution: { area: number; count: number; avgPrice: number }[];
  isSubwayNear: boolean;
  subwayInfo?: string;
}

export interface FilterState {
  dealType: DealType | 'all';
  districts: string[];
  priceMin?: number;
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  floorMin?: number;
  floorMax?: number;
  buildYearMin?: number;
  buildYearMax?: number;
  isSubwayNear: boolean;
  deviationMax?: number;
  hasPriceChange: boolean;
  isSuspectedFlash: boolean;
  renovated: boolean | null;
}

export interface SortState {
  field: keyof Listing | 'deviationFromActual';
  direction: 'asc' | 'desc';
}

export interface FavoriteItem {
  listingId: string;
  addedAt: string;
  note?: string;
}

export interface AlertCondition {
  id: string;
  name: string;
  districts: string[];
  complexIds?: string[];
  dealType: DealType | 'all';
  priceMax?: number;
  areaMin?: number;
  areaMax?: number;
  floorMin?: number;
  deviationMax?: number;
  channels: ('web' | 'email')[];
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  favoriteDistricts: string[];
}

export interface DashboardStat {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
}

export interface RegionSummary {
  district: string;
  newListings: number;
  avgPriceChange: number;
  flashListings: number;
  lowDeviationCount: number;
}
