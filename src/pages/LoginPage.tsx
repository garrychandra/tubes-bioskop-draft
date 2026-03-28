import { useState, useEffect } from 'react'
import {
  Container, Paper, Typography, TextField, Button,
  Box, Alert, CircularProgress, Link, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions
} from '@mui/material'
import api from '../services/api'
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { login, clearError, clearFraudWarning } from '../features/auth/authSlice'
import MovieIcon from '@mui/icons-material/Movie'

interface LoginLocationState {
  from?: {
    pathname?: string
    search?: string
  }
}

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, error, user, fraudWarning } = useAppSelector((s) => s.auth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showFraudNotice, setShowFraudNotice] = useState(false)
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
  
  const locationState = location.state as LoginLocationState | null
  const redirectFromQuery = new URLSearchParams(location.search).get('redirect')
  const redirectFromState = locationState?.from?.pathname
    ? `${locationState.from.pathname}${locationState.from.search || ''}`
    : null
  const redirectTo = redirectFromQuery || redirectFromState || '/'

  useEffect(() => {
    if (user && fraudWarning) {
      setShowFraudNotice(true)
    } else if (user && !showFraudNotice) {
      navigate(redirectTo, { replace: true })
    }
  }, [user, navigate, redirectTo, fraudWarning, showFraudNotice])

  const handleCloseFraudNotice = () => {
    setShowFraudNotice(false)
    dispatch(clearFraudWarning())
    navigate(redirectTo, { replace: true })
  }

  const handleForgotPassword = async () => {
    try {
      const res = await api.post('/auth/reset-password', { email: resetEmail, newPassword: resetPassword })
      setResetStatus({ type: 'success', msg: res.data.message })
      setTimeout(() => setForgotPasswordOpen(false), 2000)
    } catch (err: any) {
      setResetStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to reset' })
    }
  }

  if (user && !showFraudNotice) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await dispatch(login(form))
  }

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper sx={{ p: 5 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <MovieIcon sx={{ fontSize: 50, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Welcome Back</Typography>
          <Typography color="text.secondary">Sign in to your CineMax account</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 1 }}>
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to={`/register?redirect=${encodeURIComponent(redirectTo)}`} color="primary">Register</Link>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <Link component="button" variant="body2" onClick={() => setForgotPasswordOpen(true)}>
              Forgot Password?
            </Link>
          </Typography>
        </Box>

        {/* Demo credentials */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700 }}>Demo credentials</Typography>
          <Typography variant="caption" color="text.secondary" display="block">User: john@example.com / user123</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Admin: admin@cinema.com / admin123</Typography>
        </Box>
      </Paper>

      {/* Fraud Warning Dialog */}
      <Dialog open={showFraudNotice} onClose={handleCloseFraudNotice}>
        <DialogTitle color="error">Account Warning</DialogTitle>
        <DialogContent>
          <DialogContentText color="text.primary">
            {fraudWarning}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseFraudNotice} variant="contained" color="primary">
            I Understand
          </Button>
        </DialogActions>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotPasswordOpen} onClose={() => setForgotPasswordOpen(false)}>
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter your email and your new password to reset it.
          </DialogContentText>
          {resetStatus && <Alert severity={resetStatus.type} sx={{ mb: 2 }}>{resetStatus.msg}</Alert>}
          <TextField
            label="Email" type="email" fullWidth required sx={{ mb: 2 }}
            value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
          />
          <TextField
            label="New Password" type="password" fullWidth required
            value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotPasswordOpen(false)}>Cancel</Button>
          <Button onClick={handleForgotPassword} variant="contained" color="primary">Reset</Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
