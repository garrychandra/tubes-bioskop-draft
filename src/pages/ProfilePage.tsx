import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Container, Paper, Typography, TextField, Button,
  Box, Alert, CircularProgress, Divider, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  RadioGroup, FormControlLabel, Radio
} from '@mui/material'
import { useAppSelector, useAppDispatch } from '../app/hooks'
import { updateUser } from '../features/auth/authSlice'
import api from '../services/api'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'
import StarIcon from '@mui/icons-material/Star'

export default function ProfilePage() {
  const { user } = useAppSelector((s) => s.auth)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(false)
  const [subLoading, setSubLoading] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
  const [subStatus, setSubStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)

  // Payment states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [payMethod, setPayMethod] = useState('online')

  if (!user) return null

  const isMember = user.membership_expires_at && new Date(user.membership_expires_at) > new Date()

  const handleSubscribe = async () => {
    setSubLoading(true)
    setSubStatus(null)
    try {
      const res = await api.post('/auth/membership')
      dispatch(updateUser({ membership_expires_at: res.data.membership_expires_at }))
      setSubStatus({ type: 'success', msg: res.data.message })
      setIsPaymentModalOpen(false)
      navigate('/tickets')
    } catch (err: any) {
      setSubStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to subscribe' })
    } finally {
      setSubLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      const res = await api.put('/auth/change-password', { oldPassword, newPassword })
      setStatus({ type: 'success', msg: res.data.message })
      setOldPassword('')
      setNewPassword('')
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Failed to change password' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 10 }}>
      <Paper sx={{ p: 5 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <AccountCircleIcon sx={{ fontSize: 60, color: 'primary.main', mb: 1 }} />
          <Typography variant="h4" sx={{ fontWeight: 800 }}>My Profile</Typography>
        </Box>

        <Box sx={{ mb: 4, bgcolor: 'background.default', p: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">Name</Typography>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>{user.nama}</Typography>
          
          <Typography variant="subtitle2" color="text.secondary">Email</Typography>
          <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>{user.email}</Typography>

          <Typography variant="subtitle2" color="text.secondary">Role</Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>{user.role}</Typography>
        </Box>

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Membership</Typography>
        <Box sx={{ mb: 4, bgcolor: isMember ? 'background.paper' : 'background.default', border: isMember ? '2px solid' : '1px solid', borderColor: isMember ? 'primary.main' : 'divider', p: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
              <StarIcon color={isMember ? 'primary' : 'disabled'} />
              {isMember ? 'Active Member' : 'Become a Member'}
            </Typography>
            {isMember && <Chip size="small" color="primary" label="VIP" />}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Get an exclusive 10% discount on all movie tickets with our monthly membership (Rp50.000).
          </Typography>
          
          {isMember && (
            <Typography variant="body2" color="success.main" sx={{ mb: 2, fontWeight: 600 }}>
              Your membership is active until {new Date(user.membership_expires_at!).toLocaleDateString()}.
            </Typography>
          )}

          {subStatus && <Alert severity={subStatus.type} sx={{ mb: 2 }}>{subStatus.msg}</Alert>}

          {!isMember && ( 
            <Button 
              variant="contained" 
              onClick={() => setIsPaymentModalOpen(true)} 
              disabled={subLoading}
            >
              Subscribe Now
            </Button>
          )}           
          </Box>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Change Password</Typography>
        
        {status && <Alert severity={status.type} sx={{ mb: 2 }}>{status.msg}</Alert>}

        <Box component="form" onSubmit={handleChangePassword} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required fullWidth
          />
          <TextField
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required fullWidth
          />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={loading || !oldPassword || !newPassword} sx={{ mt: 1 }}>
            {loading ? <CircularProgress size={24} /> : 'Update Password'}
          </Button>
        </Box>
      </Paper>

      {/* Subscription Payment Dialog */}
      <Dialog open={isPaymentModalOpen} onClose={() => !subLoading && setIsPaymentModalOpen(false)}>
        <DialogTitle>Complete Subscription Payment</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2, mt: 1 }}>
            Total to Pay: <strong>Rp50.000</strong>
          </Typography>
          <RadioGroup value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
            <FormControlLabel value="online" control={<Radio />} label="Online Payment" />
            <FormControlLabel value="bank_transfer" control={<Radio />} label="Bank Transfer" />
          </RadioGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentModalOpen(false)} disabled={subLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubscribe} variant="contained" disabled={subLoading}>
            {subLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify Payment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
