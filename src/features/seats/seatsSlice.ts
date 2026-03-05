import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import api from '../../services/api'

export interface Seat {
  id: string
  hall_id: string
  row_label: string
  col_number: number
  seat_type: 'regular' | 'vip' | 'couple'
  status: 'available' | 'locked' | 'booked'
  locked_by?: string
  lock_expires_at?: string
}

interface SeatsState {
  seats: Seat[]
  selectedSeats: string[]  // seat IDs the current user has selected
  loading: boolean
  lockLoading: boolean
  error: string | null
  lockExpiry: string | null
}

const initialState: SeatsState = {
  seats: [],
  selectedSeats: [],
  loading: false,
  lockLoading: false,
  error: null,
  lockExpiry: null,
}

export const fetchSeatsForSchedule = createAsyncThunk(
  'seats/fetchForSchedule',
  async (scheduleId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/schedules/${scheduleId}/seats`)
      return res.data.seats as Seat[]
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const lockSeats = createAsyncThunk(
  'seats/lock',
  async ({ schedule_id, seat_ids }: { schedule_id: string; seat_ids: string[] }, { rejectWithValue }) => {
    try {
      const res = await api.post('/seats/lock', { schedule_id, seat_ids })
      return res.data as { locked: boolean; expires_at: string; ttl_seconds: number }
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed to lock seats') }
  },
)

export const unlockSeats = createAsyncThunk(
  'seats/unlock',
  async ({ schedule_id, seat_ids }: { schedule_id: string; seat_ids: string[] }, { rejectWithValue }) => {
    try { await api.post('/seats/unlock', { schedule_id, seat_ids }) }
    catch (err: any) { return rejectWithValue(err.response?.data?.error) }
  },
)

const seatsSlice = createSlice({
  name: 'seats',
  initialState,
  reducers: {
    toggleSeat(state, action: PayloadAction<string>) {
      const id = action.payload
      if (state.selectedSeats.includes(id)) {
        state.selectedSeats = state.selectedSeats.filter(s => s !== id)
      } else {
        state.selectedSeats.push(id)
      }
    },
    clearSelection(state) {
      state.selectedSeats = []
      state.lockExpiry = null
    },
    clearSeats(state) {
      state.seats = []
      state.selectedSeats = []
      state.lockExpiry = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSeatsForSchedule.pending, (s) => { s.loading = true; s.error = null })
      .addCase(fetchSeatsForSchedule.fulfilled, (s, a) => { s.loading = false; s.seats = a.payload })
      .addCase(fetchSeatsForSchedule.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(lockSeats.pending, (s) => { s.lockLoading = true; s.error = null })
      .addCase(lockSeats.fulfilled, (s, a) => {
        s.lockLoading = false;
        s.lockExpiry = a.payload.expires_at;
        // Mark locked seats as 'locked' in the local state
        for (const seat of s.seats) {
          if (s.selectedSeats.includes(seat.id)) {
            seat.status = 'locked';
          }
        }
      })
      .addCase(lockSeats.rejected, (s, a) => { s.lockLoading = false; s.error = a.payload as string })
      .addCase(unlockSeats.fulfilled, (s) => { s.selectedSeats = []; s.lockExpiry = null })
  },
})

export const { toggleSeat, clearSelection, clearSeats } = seatsSlice.actions
export default seatsSlice.reducer
