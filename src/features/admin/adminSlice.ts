import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

interface AdminStats {
  total_users: number
  total_movies: number
  total_revenue: number
  today_revenue: number
  today_orders: number
  orders: Record<string, number>
}

interface AdminState {
  stats: AdminStats | null
  income: any[]
  orders: any[]
  users: any[]
  loading: boolean
  error: string | null
}

const initialState: AdminState = { stats: null, income: [], orders: [], users: [], loading: false, error: null }

export const fetchAdminStats = createAsyncThunk('admin/fetchStats', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/admin/stats'); return res.data }
  catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
})

export const fetchIncome = createAsyncThunk(
  'admin/fetchIncome',
  async (params: { period?: string; days?: number } = {}, { rejectWithValue }) => {
    try { const res = await api.get('/admin/income', { params }); return res.data.income }
    catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const fetchAdminOrders = createAsyncThunk(
  'admin/fetchOrders',
  async (params: Record<string, unknown> | undefined, { rejectWithValue }) => {
    try { const res = await api.get('/admin/orders', { params }); return res.data }
    catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const fetchAdminUsers = createAsyncThunk('admin/fetchUsers', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/admin/users'); return res.data.users }
  catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
})

export const updateUserRole = createAsyncThunk(
  'admin/updateUserRole',
  async ({ id, role }: { id: string; role: string }, { rejectWithValue }) => {
    try { const res = await api.put(`/admin/users/${id}/role`, { role }); return res.data.user }
    catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminStats.pending, (s) => { s.loading = true })
      .addCase(fetchAdminStats.fulfilled, (s, a) => { s.loading = false; s.stats = a.payload })
      .addCase(fetchAdminStats.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(fetchIncome.fulfilled, (s, a) => { s.income = a.payload })
      .addCase(fetchAdminOrders.fulfilled, (s, a) => { s.orders = a.payload.orders || [] })
      .addCase(fetchAdminUsers.fulfilled, (s, a) => { s.users = a.payload })
      .addCase(updateUserRole.fulfilled, (s, a) => {
        const idx = s.users.findIndex((u: any) => u.id === a.payload.id)
        if (idx !== -1) s.users[idx] = { ...s.users[idx], role: a.payload.role }
      })
  },
})

export default adminSlice.reducer
