import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

export interface Schedule {
  id_jadwal: string
  id_film: string
  id_studio: string
  jam_tayang: string
  jam_selesai: string
  harga_tiket: number | string
  judul?: string | null
  poster_url?: string | null
  durasi?: number
  genre?: string | null
  nama_studio?: string | null
  nama_bioskop?: string | null
  id_bioskop?: string
  kapasitas?: number
  lokasi?: string | null
  avg_rating?: number | string
  film_status?: string
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
  async (params: { id_film?: string; date?: string; id_bioskop?: string } | undefined, { rejectWithValue }) => {
    try {
      const queryParams = {
        id_film: params?.id_film,
        id_bioskop: params?.id_bioskop,
        date: params?.date,
      }
      const res = await api.get('/jadwal', { params: queryParams })
      return res.data.jadwal as Schedule[]
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const fetchScheduleById = createAsyncThunk(
  'schedules/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/jadwal/${id}`)
      return res.data.jadwal as Schedule
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const createSchedule = createAsyncThunk(
  'schedules/create',
  async (data: { id_film: string; id_studio: string; jam_tayang: string; harga_tiket: number }, { rejectWithValue }) => {
    try {
      const res = await api.post('/jadwal', data)
      return res.data.jadwal as Schedule
    }
    catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const deleteSchedule = createAsyncThunk(
  'schedules/delete',
  async (id: string, { rejectWithValue }) => {
    try { await api.delete(`/jadwal/${id}`); return id }
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
      .addCase(deleteSchedule.fulfilled, (s, a) => { s.items = s.items.filter(sc => sc.id_jadwal !== a.payload) })
  },
})

export const { clearSelected } = schedulesSlice.actions
export default schedulesSlice.reducer
