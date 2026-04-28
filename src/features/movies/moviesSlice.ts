import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

export interface Movie {
  id_film: string
  judul: string
  deskripsi: string | null
  poster_url: string | null
  backdrop_url?: string
  genre: string | null
  durasi: number
  avg_rating: number | string | null
  release_date: string | null
  status: 'now_showing' | 'coming_soon' | 'ended'
}

interface MoviesState {
  items: Movie[]
  selected: Movie | null
  loading: boolean
  error: string | null
}

const initialState: MoviesState = { items: [], selected: null, loading: false, error: null }

export const fetchMovies = createAsyncThunk(
  'movies/fetchAll',
  async (params: { status?: string; search?: string } | undefined, { rejectWithValue }) => {
    try {
      const res = await api.get('/film', { params })
      return res.data.films as Movie[]
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const fetchMovieById = createAsyncThunk(
  'movies/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/film/${id}`)
      return res.data.film as Movie
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const createMovie = createAsyncThunk('movies/create', async (data: any, { rejectWithValue }) => {
  try {
    const res = await api.post('/film', data, {
      headers: {
        'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json'
      }
    })
    return res.data.film as Movie
  }
  catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
})

export const updateMovie = createAsyncThunk(
  'movies/update',
  async ({ id, data }: { id: string; data: Partial<Movie> }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/film/${id}`, data)
      return res.data.film as Movie
    }
    catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
  },
)

export const deleteMovie = createAsyncThunk('movies/delete', async (id: string, { rejectWithValue }) => {
  try { await api.delete(`/film/${id}`); return id }
  catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed') }
})

const moviesSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    clearSelected(state) { state.selected = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMovies.pending, (s) => { s.loading = true; s.error = null })
      .addCase(fetchMovies.fulfilled, (s, a) => { s.loading = false; s.items = a.payload })
      .addCase(fetchMovies.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(fetchMovieById.pending, (s) => { s.loading = true })
      .addCase(fetchMovieById.fulfilled, (s, a) => { s.loading = false; s.selected = a.payload })
      .addCase(fetchMovieById.rejected, (s, a) => { s.loading = false; s.error = a.payload as string })
      .addCase(createMovie.fulfilled, (s, a) => { s.items.unshift(a.payload) })
      .addCase(updateMovie.fulfilled, (s, a) => {
        const idx = s.items.findIndex(m => m.id_film === a.payload.id_film)
        if (idx !== -1) s.items[idx] = a.payload
        if (s.selected?.id_film === a.payload.id_film) s.selected = a.payload
      })
      .addCase(deleteMovie.fulfilled, (s, a) => { s.items = s.items.filter(m => m.id_film !== a.payload) })
  },
})

export const { clearSelected } = moviesSlice.actions
export default moviesSlice.reducer
