import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

export interface Schedule {
  id: string
  movie_id: string
  hall_id: string
  start_time: string
  end_time: string
  price_regular: number
  price_vip: number
  price_couple: number
  movie_title: string
  poster_url: string
  duration_min: number
  genre: string
  hall_name: string
  cinema_name: string
  cinema_id: string
  rows?: number
  cols?: number
  rating?: number
}

interface SchedulesState {
  items: Schedule[]
  selected: Schedule | null
  loading: boolean
  error: string | null
}

const initialState: SchedulesState = { items: [], selected: null, loading: false, error: null }

export const fetchSchedules = createAsyncThunk(
  'schedules/fetchAll',
  async (params: { movie_id?: string; date?: string; cinema_id?: string } | undefined, { rejectWithValue }) => {
    try {
      const res = await api.get('/schedules', { params })
      return res.data.schedules as Schedule[]
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const fetchScheduleById = createAsyncThunk(
  'schedules/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/schedules/${id}`)
      return res.data.schedule as Schedule
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const createSchedule = createAsyncThunk(
  'schedules/create',
  async (data: any, { rejectWithValue }) => {
    try { const res = await api.post('/schedules', data); return res.data.schedule }
    catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const deleteSchedule = createAsyncThunk(
  'schedules/delete',
  async (id: string, { rejectWithValue }) => {
    try { await api.delete(`/schedules/${id}`); return id }
    catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

const schedulesSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    clearSelected(state) { state.selected = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchedules.pending, (s) => { s.loading = true; s.error = null })
      .addCase(fetchSchedules.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
      .addCase(fetchSchedules.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(fetchScheduleById.pending, (s) => { s.loading = true })
      .addCase(fetchScheduleById.fulfilled, (s, a) => { s.loading = false; s.selected = a.payload })
      .addCase(fetchScheduleById.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(createSchedule.fulfilled, (s, a) => { s.items.push(a.payload) })
      .addCase(deleteSchedule.fulfilled, (s, a) => { s.items = s.items.filter(sc => sc.id !== a.payload) })
  },
})

export const { clearSelected } = schedulesSlice.actions
export default schedulesSlice.reducer
