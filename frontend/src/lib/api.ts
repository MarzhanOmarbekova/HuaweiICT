// src/lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('voltai_token')
}

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra }
  const t = getToken()
  if (t) h['Authorization'] = `Bearer ${t}`
  return h
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) throw data
  return data as T
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(API_BASE + path, { headers: getHeaders() })
    return handleResponse<T>(res)
  },
  async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(API_BASE + path, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    })
    return handleResponse<T>(res)
  },
  async delete<T>(path: string): Promise<T> {
    const res = await fetch(API_BASE + path, { method: 'DELETE', headers: getHeaders() })
    return handleResponse<T>(res)
  },
}

export function setAuthData(tokens: { access: string; refresh: string }, user: User) {
  localStorage.setItem('voltai_token', tokens.access)
  localStorage.setItem('voltai_refresh', tokens.refresh)
  localStorage.setItem('voltai_user', JSON.stringify(user))
}

export function clearAuthData() {
  localStorage.removeItem('voltai_token')
  localStorage.removeItem('voltai_refresh')
  localStorage.removeItem('voltai_user')
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('voltai_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

// ---- Types ----

export interface User {
  id: number
  username: string
  email: string
  is_company: boolean
}

export interface Balance {
  energy_credits: number
  locked_credits: number
  available_credits: number
  coin_balance: number
  updated_at: string
}

export interface DashboardData {
  balance: {
    energy_credits: number
    available_credits: number
    locked_credits: number
    coin_balance: number
  }
  stats: {
    total_generated_kwh: number
    active_offers: number
    total_sales: number
    total_purchases: number
    devices: number
  }
  recent_transactions: Transaction[]
}

export interface Device {
  id: string
  name: string
  device_type: 'wind' | 'solar' | 'hybrid'
  capacity_kw: number
  latitude: number | null
  longitude: number | null
  is_active: boolean
  installed_at: string
  created_at: string
}

export interface Offer {
  id: string
  seller: { id: number; username: string; email: string }
  device: string | null
  energy_amount: number
  available_amount: number
  price_per_kwh: number
  status: 'active' | 'partially_sold' | 'sold' | 'cancelled' | 'expired'
  description: string
  expires_at: string | null
  total_value: number
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  transaction_id: string
  tx_type: 'trade' | 'mint' | 'burn'
  seller: { id: number; username: string; email: string } | null
  buyer: { id: number; username: string; email: string } | null
  energy_amount: number
  price_per_kwh: number
  total_price: number
  contract_hash: string
  blockchain_block_index: number | null
  blockchain_block_hash: string
  created_at: string
}

export interface BlockchainBlock {
  index: number
  block_hash: string
  previous_hash: string
  nonce: number
  timestamp: number
  transaction_count: number
  transactions_data: Record<string, unknown>[]
  created_at: string
}

export interface OptimalPoint {
  lat: number
  lon: number
  efficiency: number
}

export interface OptimizationResult {
  location_id: string
  optimal_points: OptimalPoint[]
  predicted_energy: {
    '1_month': string
    '3_months': string
    '6_months': string
    '12_months': string
  }
  environmental_summary: {
    avg_wind_speed: string
    avg_elevation: string
    soil_types: string[]
  }
  turbine_details: {
    latitude: number
    longitude: number
    efficiency: number
    wind_speed: number
    energy_predictions: {
      '1_month': number
      '3_months': number
      '6_months': number
      '12_months': number
      avg_power_kw: number
    }
  }[]
}

export interface OptimizationHistory {
  id: string
  created_at: string
  num_turbines: number
  status: string
  energy_12_months?: string
  optimal_points?: OptimalPoint[]
}
