import { useEffect } from 'react'
import { Container, Typography, Box, Button, Paper, Divider, Chip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { QRCodeSVG } from 'qrcode.react'

export default function CheckoutSuccessPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { lastPurchase } = useAppSelector((s) => s.tickets)

  useEffect(() => {
    return () => { }
  }, [dispatch])

  if (!lastPurchase) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: 'center' }}>
        <Typography>No purchase data. <Button variant="outlined" onClick={() => navigate('/tickets')}>View My Tickets</Button></Typography>
      </Container>
    )
  }

  const { transaksi, tiket } = lastPurchase

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Payment Successful!</Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          Your tickets have been booked. Show the QR code at the entrance.
        </Typography>

        {/* QR Codes */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          {tiket.map((t: any) => (
            <Box key={t.id_tiket || t.barcode} sx={{ textAlign: 'center' }}>
              <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, display: 'inline-block' }}>
                <QRCodeSVG value={t.barcode} size={200} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontFamily: 'monospace' }}>
                {t.barcode} (Seat {t.nomor_kursi || t.id_kursi})
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Order Details */}
        <Box sx={{ textAlign: 'left', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography color="text.secondary">Order ID</Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{transaksi.id_transaksi.slice(0, 8).toUpperCase()}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography color="text.secondary">Status</Typography>
            <Chip label="PAID" color="success" size="small" />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography color="text.secondary">Seats</Typography>
            <Typography variant="body2">
              {tiket.map((t: any) => t.nomor_kursi || t.id_kursi).join(', ')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography color="text.secondary">Total Paid</Typography>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
              Rp{Number(transaksi.total_bayar).toLocaleString()}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button fullWidth variant="outlined" onClick={() => navigate('/tickets')}>
            View My Tickets
          </Button>
          <Button fullWidth variant="contained" onClick={() => navigate('/tickets')}>
            View Tickets
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}
