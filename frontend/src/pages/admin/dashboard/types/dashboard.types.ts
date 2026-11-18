export interface DashboardFloorStats {
  total: number;
  playing: number;
  paused: number;
  booked: number;
  available: number;
  maintenance: number;
  totalTempRevenue: number;
  totalTempTableRevenue: number;
  totalTempDrinkRevenue: number;
  totalTempSnackRevenue: number;
  paidRevenueToday: number;
  grandRevenueToday: number;
  occupancyRate: number;
  occupiedTables: number;
}

export interface CustomerStats {
  total: number;
  members: number;
  guests: number;
  memberPercent: number;
}

export interface HourlyDataPoint {
  hour: string;
  revenue: number;
  height: number;
  isPeak: boolean;
}

export interface RevenueSplit {
  tablePercent: number;
  drinkPercent: number;
  snackPercent: number;
  hasData: boolean;
}
