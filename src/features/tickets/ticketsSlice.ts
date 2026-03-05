import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

export interface OrderItem {
  seat_id: string
  price: number
  row_label: string
  col_number: number
  seat_type: string
}

export interface Ticket {
  id: string
  user_id: string
  schedule_id: string
  total_price: number
  status: 'pending' | 'paid' | 'cancelled' | 'used'
  barcode_data: string
  payment_method: string
  paid_at: string
  created_at: string
  // joined fields
  movie_title?: string
  poster_url?: string
  hall_name?: string
  cinema_name?: string
  start_time?: string
  end_time?: string
  items?: OrderItem[]
}

interface TicketsState {
  myTickets: Ticket[]
  lastPurchase: { order: any; qr_code: string; seats: any[] } | null
  verifyResult: { valid: boolean; ticket?: any } | null
  loading: boolean
  error: string | null
}

const initialState: TicketsState = {
  myTickets: [],
  lastPurchase: null,
  verifyResult: null,
  loading: false,
  error: null,
}

export const buyTickets = createAsyncThunk(
  'tickets/buy',
  async (
    data: { schedule_id: string; seat_ids: string[]; payment_method?: string },
    { rejectWithValue },
  ) => {
    try {
      const res = await api.post('/tickets/buy', data)
      return res.data
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Purchase failed') }
  },
)

export const fetchMyTickets = createAsyncThunk(
  'tickets/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/tickets/my')
      return res.data.tickets as Ticket[]
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const verifyTicket = createAsyncThunk(
  'tickets/verify',
  async (barcode: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tickets/verify/${barcode}`)
      return res.data
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Not found') }
  },
)

export const getTicketBarcode = createAsyncThunk(
  'tickets/getBarcode',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tickets/${orderId}/barcode`)
      return res.data
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    clearLastPurchase(state) { state.lastPurchase = null },
    clearVerify(state) { state.verifyResult = null },
    clearError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(buyTickets.pending, (s) => { s.loading = true; s.error = null })
      .addCase(buyTickets.fulfilled, (s, a) => { s.loading = false; s.lastPurchase = a.payload })
      .addCase(buyTickets.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(fetchMyTickets.pending, (s) => { s.loading = true })
      .addCase(fetchMyTickets.fulfilled, (s, a) => { s.loading = false; s.myTickets = a.payload })
      .addCase(fetchMyTickets.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(verifyTicket.pending, (s) => { s.loading = true; s.verifyResult = null })
      .addCase(verifyTicket.fulfilled, (s, a) => { s.loading = false; s.verifyResult = a.payload })
      .addCase(verifyTicket.rejected, (s, a) => { s.loading = false; s.verifyResult = { valid: false }; s.error = a.payload as string })
  },
})

export const { clearLastPurchase, clearVerify, clearError } = ticketsSlice.actions
export default ticketsSlice.reducer
