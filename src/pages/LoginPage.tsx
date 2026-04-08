import { useState, useEffect } from 'react'
import {
  Container, Paper, Typography, TextField, Button,
  Box, Alert, CircularProgress, Link, Dialog, DialogTitle,
  DialogContent, DialogContentText, DialogActions, Step,
  Stepper, StepLabel,
} from '@mui/material'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import LocalOfferIcon from '@mui/icons-material/LocalOffer'
import api from '../services/api'
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { login, clearError, clearNoShowNotification } from '../features/auth/authSlice'
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
  const { loading, error, user, noShowNotification } = useAppSelector((s) => s.auth)
  const [form, setForm] = useState({ email: '', password: '' })
  const [showNoShowNotice, setShowNoShowNotice] = useState(false)

  // Forgot password dialog state
  const [forgotOpen, setForgotOpen] = useState(false)
  const [fpStep, setFpStep] = useState(0) // 0=email, 1=otp, 2=newpass
  const [fpEmail, setFpEmail] = useState('')
  const [fpOtp, setFpOtp] = useState('')
  const [fpResetToken, setFpResetToken] = useState('')
  const [fpNewPassword, setFpNewPassword] = useState('')
  const [fpLoading, setFpLoading] = useState(false)
  const [fpStatus, setFpStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  const locationState = location.state as LoginLocationState | null
  const redirectFromQuery = new URLSearchParams(location.search).get('redirect')
  const redirectFromState = locationState?.from?.pathname
    ? `${locationState.from.pathname}${locationState.from.search || ''}`
    : null
  const redirectTo = redirectFromQuery || redirectFromState || '/'

  useEffect(() => {
    if (user && noShowNotification) {
      setShowNoShowNotice(true)
    } else if (user && !showNoShowNotice) {
      navigate(redirectTo, { replace: true })
    }
  }, [user, navigate, redirectTo, noShowNotification, showNoShowNotice])

  const handleCloseNoShowNotice = () => {
    setShowNoShowNotice(false)
    dispatch(clearNoShowNotification())
    navigate(redirectTo, { replace: true })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await dispatch(login(form))
  }

  // ── Forgot Password steps ────────────────────────────────────────────────
  const handleOpenForgot = () => {
    setForgotOpen(true)
    setFpStep(0)
    setFpEmail('')
    setFpOtp('')
    setFpResetToken('')
    setFpNewPassword('')
    setFpStatus(null)
  }

  const handleForgotClose = () => {
    setForgotOpen(false)
    setFpStatus(null)
  }

  const handleSendOtp = async () => {
    if (!fpEmail) return
    setFpLoading(true)
    setFpStatus(null)
    try {
      await api.post('/auth/forgot-password', { email: fpEmail })
      setFpStep(1)
      setFpStatus({ type: 'success', msg: 'A 6-digit code has been sent to your email. Check your inbox!' })
    } catch (err: any) {
      setFpStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to send code. Try again.' })
    } finally {
      setFpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!fpOtp) return
    setFpLoading(true)
    setFpStatus(null)
    try {
      const res = await api.post('/auth/verify-otp', { email: fpEmail, otp: fpOtp })
      setFpResetToken(res.data.reset_token)
      setFpStep(2)
      setFpStatus(null)
    } catch (err: any) {
      setFpStatus({ type: 'error', msg: err.response?.data?.error || 'Invalid or expired code.' })
    } finally {
      setFpLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!fpNewPassword) return
    setFpLoading(true)
    setFpStatus(null)
    try {
      await api.post('/auth/reset-password', { reset_token: fpResetToken, newPassword: fpNewPassword })
      setFpStatus({ type: 'success', msg: 'Password reset! You can now sign in.' })
      setTimeout(() => { setForgotOpen(false); setFpStep(0) }, 2500)
    } catch (err: any) {
      setFpStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to reset password.' })
    } finally {
      setFpLoading(false)
    }
  }

  if (user && !showNoShowNotice) return null

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
            label="Email" type="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            required fullWidth
          />
          <TextField
            label="Password" type="password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            required fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 1 }}>
            {loading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to={`/register?redirect=${encodeURIComponent(redirectTo)}`} color="primary">Register</Link>
          </Typography>
          <Button variant="text" onClick={handleOpenForgot} size="small" sx={{ fontWeight: 600 }}>
            Forgot Password?
          </Button>
        </Box>

        {/* Demo credentials */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontWeight: 700 }}>Demo credentials</Typography>
          <Typography variant="caption" color="text.secondary" display="block">User: john@example.com / user123</Typography>
          <Typography variant="caption" color="text.secondary" display="block">Admin: admin@cinema.com / admin123</Typography>
        </Box>
      </Paper>

      {/* ── No-Show Notification Dialog ─────────────────────────────────── */}
      <Dialog open={showNoShowNotice} onClose={handleCloseNoShowNotice} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocalOfferIcon color="warning" />
          <span>No-Show Discount Applied!</span>
        </DialogTitle>
        <DialogContent>
          <DialogContentText color="text.primary" sx={{ mb: 1 }}>
            {noShowNotification}
          </DialogContentText>
          <Alert severity="success" icon={<LocalOfferIcon />}>
            Your <strong>50% discount</strong> on 1 ticket is ready — it will be applied automatically on your next purchase!
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNoShowNotice} variant="contained" color="primary">
            Got It, Thanks!
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Forgot Password Dialog — 3-step OTP flow ────────────────────── */}
      <Dialog open={forgotOpen} onClose={handleForgotClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockOpenIcon color="primary" />
          <span>Reset Password</span>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={fpStep} sx={{ mb: 3, mt: 1 }}>
            <Step><StepLabel>Email</StepLabel></Step>
            <Step><StepLabel>Verify Code</StepLabel></Step>
            <Step><StepLabel>New Password</StepLabel></Step>
          </Stepper>

          {fpStatus && (
            <Alert severity={fpStatus.type} sx={{ mb: 2 }}>{fpStatus.msg}</Alert>
          )}

          {fpStep === 0 && (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Enter your email address and we'll send a 6-digit verification code.
              </DialogContentText>
              <TextField
                label="Email" type="email" fullWidth required autoFocus
                value={fpEmail} onChange={(e) => setFpEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
              />
            </>
          )}

          {fpStep === 1 && (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Enter the 6-digit code sent to <strong>{fpEmail}</strong>. It expires in 10 minutes.
              </DialogContentText>
              <TextField
                label="Verification Code" fullWidth required autoFocus
                value={fpOtp} onChange={(e) => setFpOtp(e.target.value)}
                inputProps={{ maxLength: 6, style: { letterSpacing: '0.4em', fontSize: 22, textAlign: 'center' } }}
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
              />
              <Button variant="text" size="small" sx={{ mt: 1 }} onClick={() => { setFpStep(0); setFpStatus(null) }}>
                ← Change email
              </Button>
            </>
          )}

          {fpStep === 2 && (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Code verified! Enter your new password.
              </DialogContentText>
              <TextField
                label="New Password" type="password" fullWidth required autoFocus
                value={fpNewPassword} onChange={(e) => setFpNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleForgotClose} disabled={fpLoading}>Cancel</Button>
          {fpStep === 0 && (
            <Button onClick={handleSendOtp} variant="contained" disabled={fpLoading || !fpEmail}>
              {fpLoading ? <CircularProgress size={20} /> : 'Send Code'}
            </Button>
          )}
          {fpStep === 1 && (
            <Button onClick={handleVerifyOtp} variant="contained" disabled={fpLoading || fpOtp.length < 6}>
              {fpLoading ? <CircularProgress size={20} /> : 'Verify Code'}
            </Button>
          )}
          {fpStep === 2 && (
            <Button onClick={handleResetPassword} variant="contained" color="success" disabled={fpLoading || fpNewPassword.length < 6}>
              {fpLoading ? <CircularProgress size={20} /> : 'Reset Password'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  )
}
