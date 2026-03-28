import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import api from '../../services/api'

export interface User {
  id_user: string
  nama: string
  email: string
  role: 'User' | 'Admin'
  created_at: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  fraudWarning: string | null
}

const storedUser = localStorage.getItem('cinema_user')
const storedToken = localStorage.getItem('cinema_token')

const initialState: AuthState = {
  user: storedUser ? (JSON.parse(storedUser) as User) : null,
  token: storedToken,
  loading: false,
  error: null,
  fraudWarning: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (creds: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', creds)
      return res.data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Login failed')
    }
  },
)

export const register = createAsyncThunk(
  'auth/register',
  async (data: { nama: string; email: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/register', {
        nama: data.nama,
        email: data.email,
        password: data.password,
      })
      return res.data
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.error || 'Registration failed')
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null
      state.token = null
      localStorage.removeItem('cinema_token')
      localStorage.removeItem('cinema_user')
    },
    clearError(state) {
      state.error = null
    },
    clearFraudWarning(state) {
      state.fraudWarning = null
    },
  },
  extraReducers: (builder) => {
    const defaultSuccess = (state: AuthState, action: PayloadAction<{ user: User; token: string }>) => {
      state.loading = false
      state.user = action.payload.user
      state.token = action.payload.token
      state.error = null
      localStorage.setItem('cinema_token', action.payload.token)
      localStorage.setItem('cinema_user', JSON.stringify(action.payload.user))
    }
    const loginSuccess = (state: AuthState, action: PayloadAction<{ user: User; token: string, fraudWarning?: string }>) => {
      defaultSuccess(state, action)
      state.fraudWarning = action.payload.fraudWarning || null
    }

    const pending = (state: AuthState) => { state.loading = true; state.error = null }
    const failed = (state: AuthState, action: PayloadAction<any>) => {
      state.loading = false; state.error = action.payload
    }
    builder
      .addCase(login.pending, pending).addCase(login.fulfilled, loginSuccess).addCase(login.rejected, failed)
      .addCase(register.pending, pending).addCase(register.fulfilled, defaultSuccess).addCase(register.rejected, failed)
  },
})

export const { logout, clearError, clearFraudWarning } = authSlice.actions
export default authSlice.reducer
