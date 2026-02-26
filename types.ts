
export enum AppState {
  SPLASH = 'SPLASH',
  LOGIN = 'LOGIN',
  OTP = 'OTP',
  IDENTITY = 'IDENTITY',
  GST = 'GST',
  LOCATIONS = 'LOCATIONS',
  SUCCESS = 'SUCCESS',
  DASHBOARD = 'DASHBOARD'
}

export interface Car {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'rented' | 'maintenance';
  price: number;
  image: string;
}

export interface UserProfile {
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  businessAddress: string;
  isGstEnabled: boolean;
  gstType: string;
  gstNumber: string;
  locations: string[];
}

export interface Reminder {
  id: number;
  vehicle: string;
  model: string;
  type: string;
  category: 'Critical' | 'Maintenance' | 'Financial';
  dueDate: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Overdue' | 'Due Soon' | 'Upcoming' | 'Completed';
  assignee: string;
  daysRemaining: number;
  notes?: string;
  notificationMethods?: string[];
}
