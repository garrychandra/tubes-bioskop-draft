import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

interface PurchasedTicket {
  id_tiket: string
  barcode: string
  id_kursi: string
  nomor_kursi?: string | null
}

interface PurchaseResult {
  transaksi: {
    id_transaksi: string
    total_bayar: number | string
  }
  tiket: PurchasedTicket[]
  qr_code: string
}

interface VerifyResult {
  valid: boolean
  ticket?: {
    barcode: string
    judul?: string
    nama_bioskop?: string
    nama_studio?: string
    jam_tayang?: string
    nama?: string
    email?: string
    status_tiket?: string
    nomor_kursi?: string
  }
}

export interface Ticket {
  id_transaksi: string
  id_user: string
  total_bayar: number | string
  status: string
  tanggal_bayar: string
  // joined fields
  judul?: string
  poster_url?: string
  nama_studio?: string
  nama_bioskop?: string
  jam_tayang?: string
  jam_selesai?: string
  tiket?: Array<{
    id_tiket: string
    barcode: string
    status_tiket: string
    nomor_kursi?: string
    id_kursi?: string
    judul?: string
    poster_url?: string
    jam_tayang?: string
    nama_studio?: string
    nama_bioskop?: string
  }>
  fnb_items?: Array<{
    nama_item: string
    qty: number
    harga_saat_pesan: number
  }>
}

interface TicketsState {
  myTickets: Ticket[]
  lastPurchase: PurchaseResult | null
  verifyResult: VerifyResult | null
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
    data: { id_jadwal: string; kursi_ids: string[]; fnb_items?: Array<{ id_item: string; qty: number }> },
    { rejectWithValue },
  ) => {
    try {
      const res = await api.post('/tiket/buy', data)
      return res.data
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Purchase failed') }
  },
)

export const fetchMyTickets = createAsyncThunk(
  'tickets/fetchMy',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/tiket/my')
      return res.data.transactions as Ticket[]
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const verifyTicket = createAsyncThunk(
  'tickets/verify',
  async (barcode: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tiket/verify/${barcode}`)
      return res.data
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Not found') }
  },
)

export const getTicketBarcode = createAsyncThunk(
  'tickets/getBarcode',
  async (idTiket: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/tiket/${idTiket}/barcode`)
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
