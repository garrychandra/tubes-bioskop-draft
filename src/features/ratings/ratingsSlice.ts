import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import api from '../../services/api'

export interface Rating {
  id_rating: string
  nilai_rating: number
  komentar: string | null
  id_user: string
  id_film: string
  User?: { nama: string }
}

interface RatingsState {
  items: Rating[]
  loading: boolean
  error: string | null
}

const initialState: RatingsState = { items: [], loading: false, error: null }

export const fetchRatingsByFilm = createAsyncThunk(
  'ratings/fetchByFilm',
  async (filmId: string, { rejectWithValue }) => {
    try {
      const res = await api.get(`/rating/film/${filmId}`)
      return res.data.ratings as Rating[]
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed to fetch ratings') }
  }
)

export const createRating = createAsyncThunk(
  'ratings/create',
  async (data: { id_film: string; nilai_rating: number; komentar?: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/rating', data)
      return res.data.rating as Rating
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed to create rating') }
  }
)

export const updateRating = createAsyncThunk(
  'ratings/update',
  async ({ id, data }: { id: string; data: { nilai_rating: number; komentar?: string } }, { rejectWithValue }) => {
    try {
      const res = await api.put(`/rating/${id}`, data)
      return res.data.rating as Rating
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed to update rating') }
  }
)

export const deleteRating = createAsyncThunk(
  'ratings/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await api.delete(`/rating/${id}`)
      return id
    } catch (err: any) { return rejectWithValue(err.response?.data?.error || 'Failed to delete rating') }
  }
)

const ratingsSlice = createSlice({
  name: 'ratings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRatingsByFilm.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchRatingsByFilm.fulfilled, (state, action) => { state.loading = false; state.items = action.payload })
      .addCase(fetchRatingsByFilm.rejected, (state, action) => { state.loading = false; state.error = action.payload as string })
      
      .addCase(createRating.fulfilled, (state, action) => { 
        state.items.unshift(action.payload)
      })
      
      .addCase(updateRating.fulfilled, (state, action) => {
        const index = state.items.findIndex(r => r.id_rating === action.payload.id_rating)
        if (index !== -1) {
          const existingUser = state.items[index].User
          state.items[index] = { ...action.payload, User: existingUser }
        }
      })
      
      .addCase(deleteRating.fulfilled, (state, action) => {
        state.items = state.items.filter(r => r.id_rating !== action.payload)
      })
  }
})

export default ratingsSlice.reducer
