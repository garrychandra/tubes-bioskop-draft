import { useEffect } from 'react'
import { Container, Typography, Box, Button, Paper, Divider, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearLastPurchase } from '../features/tickets/ticketsSlice'
import { QRCodeSVG } from 'qrcode.react'

export default function CheckoutSuccessPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { lastPurchase } = useAppSelector((s) => s.tickets)

  useEffect(() => {
    return () => { dispatch(clearLastPurchase()) }
  }, [dispatch])

  if (!lastPurchase) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <Typography>No purchase data. <Button onClick={() => navigate('/')}>Go Home</Button></Typography>
      </Container>
    )
  }

  const { order, seats } = lastPurchase

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Payment Successful!</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Your tickets have been booked. Show the QR code at the entrance.
        </Typography>

        {/* QR Code */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
            <QRCodeSVG value={order.barcode_data} size={200} />
          </Box>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3, fontFamily: 'monospace' }}>
          {order.barcode_data}
        </Typography>

        <Divider sx={{ mb: 3 }} />

        {/* Order Details */}
        <Box sx={{ textAlign: 'left', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography color="text.secondary">Order ID</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{order.id.slice(0, 8).toUpperCase()}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography color="text.secondary">Status</Typography>
            <Chip label={order.status.toUpperCase()} color="success" size="small" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography color="text.secondary">Seats</Typography>
            <Typography variant="body2">
              {seats.map((s: any) => `${s.row_label}${s.col_number}`).join(', ')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary">Total Paid</Typography>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
              Rp{Number(order.total_price).toLocaleString()}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button fullWidth variant="outlined" onClick={() => navigate('/tickets')}>
            View My Tickets
          </Button>
          <Button fullWidth variant="contained" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
