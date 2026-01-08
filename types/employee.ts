export type Role = 'super_admin' | 'admin' | 'manager' | 'member' | 'viewer';
export type Status = 'active' | 'inactive' | 'suspended' | 'resigned';
export type Gender = 'male' | 'female' | 'other';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'intern';
export type Prefix = 'mr' | 'mrs' | 'ms' | 'miss';

export interface Department {
  id: string;
  code: string;
  name: string;
  description?: string;
  manager_id?: string;
  parent_id?: string;
  color?: string;
  employee_count?: number;
  is_active: boolean;
  created_at?: string;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  level: number;
  department_id?: string;
  description?: string;
  min_salary?: number;
  max_salary?: number;
  is_active: boolean;
  created_at?: string;
}

export interface WorkSchedule {
  id: string;
  name: string;
  work_days: number[]; // 1=Mon, 7=Sun
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  break_start?: string; // HH:mm
  break_end?: string; // HH:mm
  total_hours: number;
  is_default: boolean;
  is_active: boolean;
}

export interface Employee {
  id: string;
  employee_id: string; // EMP-0001
  employee_code?: string;
  
  // Personal
  prefix?: Prefix;
  first_name: string;
  last_name: string;
  nickname?: string;
  avatar?: string;
  gender?: Gender;
  birth_date?: string; // ISO Date
  national_id?: string;
  
  // Contact
  email: string;
  phone?: string;
  line_id?: string;
  address?: string;
  
  // Work
  department_id: string;
  department?: Department;
  position_id: string;
  position?: Position;
  employment_type: EmploymentType;
  start_date: string; // ISO Date
  end_date?: string; // ISO Date
  probation_end_date?: string; // ISO Date
  manager_id?: string;
  manager?: Employee;
  work_location?: string;
  
  // Working Hours
  working_hours_per_day: number;
  working_days_per_week: number;
  work_start_time?: string;
  work_end_time?: string;
  break_duration?: number; // minutes
  work_schedule_id?: string;
  work_schedule?: WorkSchedule;
  overtime_rate?: number;

  // System
  role: Role;
  status: Status;
  password?: string; // In a real app this wouldn't be on the client mostly, but for mock form it might be needed
  last_login?: string;
  
  // Additional
  skills?: string[];
  hourly_rate?: number;
  salary?: number;
  bank_account?: string;
  bank_name?: string;
  emergency_contact?: string;
  emergency_phone?: string;
  notes?: string;
  
  // Meta
  created_at: string;
  updated_at: string;
  created_by?: string;
}
