// ============================================================
// CORE AUTH TYPES
// ============================================================

export type UserRole = 'admin' | 'operator';

// JWT payload — embedded in every authenticated request.
// PWA preferences are included to avoid a second DB round-trip on load.
export interface JwtPayload {
  userId:             number;
  username:           string;
  fullName:           string;
  role:               UserRole;
  themePreference:    string;
  fontSizePreference: string;
  iat:                number;
  exp:                number;
}

// Subset of JwtPayload attached to every validated request context.
export interface AuthUser {
  userId:             number;
  username:           string;
  fullName:           string;
  role:               UserRole;
  themePreference:    string;
  fontSizePreference: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiSuccess<T> {
  success: true;
  data:    T;
}

export interface ApiError {
  success: false;
  error:   string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================
// SHARED DOMAIN TYPES
// ============================================================

// Standardized inventory reason codes (SRS RNB-13).
export type InventoryReasonCode =
  | 'SALE'
  | 'SALE_CANCELLATION'
  | 'WORKSHOP_CONSUMPTION'
  | 'MANUAL_ADJUSTMENT_LOSS'
  | 'MANUAL_ADJUSTMENT_CORRECTION'
  | 'PURCHASE_ENTRY';

// Work order lifecycle states (SRS RF-PR-011).
export type WorkOrderStatus =
  | 'pending'
  | 'in_progress'
  | 'ready'
  | 'completed'
  | 'cancelled';

// Maintenance ticket lifecycle states (SRS RF-MA-019).
export type MaintenanceStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'paid'
  | 'cancelled';

// Consultation response states (SRS RF-CO-006).
export type ConsultationStatus = 'pending' | 'answered' | 'closed';

// Agenda entry states (SRS RF-AG-021).
export type AgendaStatus = 'pending' | 'arrived' | 'completed' | 'cancelled';

// Cash register states (SRS RF-CJ-017).
export type CashRegisterStatus = 'open' | 'closed';

// Order states (SRS RF-OR-014).
export type OrderStatus = 'pending' | 'completed' | 'cancelled';