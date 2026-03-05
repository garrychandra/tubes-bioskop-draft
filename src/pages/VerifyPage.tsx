import { useState } from 'react'
import {
  Container, Typography, Paper, TextField, Button,
  Box, CircularProgress, Chip, Divider,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { verifyTicket, clearVerify } from '../features/tickets/ticketsSlice'
import { QRCodeSVG } from 'qrcode.react'

export default function VerifyPage() {
  const dispatch = useAppDispatch()
  const { verifyResult, loading } = useAppSelector((s) => s.tickets)
  const [barcode, setBarcode] = useState('')

  const handleVerify = () => {
    if (barcode.trim()) dispatch(verifyTicket(barcode.trim()))
  }

  const handleReset = () => {
    dispatch(clearVerify())
    setBarcode('')
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Verify Ticket</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Enter a barcode or scan a QR code to verify a cinema ticket.
      </Typography>

      <Paper sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
          <TextField
            fullWidth label="Ticket Barcode" value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="CINEMA-XXXXXXXX-..."
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
          />
          <Button variant="contained" onClick={handleVerify} disabled={loading || !barcode.trim()}>
            {loading ? <CircularProgress size={22} /> : 'Verify'}
          </Button>
        </Box>

        {verifyResult && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              {verifyResult.valid ? (
                <CheckCircleIcon sx={{ color: 'success.main', fontSize: 36 }} />
              ) : (
                <CancelIcon sx={{ color: 'error.main', fontSize: 36 }} />
              )}
              <Typography variant="h5" color={verifyResult.valid ? 'success.main' : 'error.main'} sx={{ fontWeight: 700 }}>
                {verifyResult.valid ? 'Valid Ticket' : 'Invalid Ticket'}
              </Typography>
            </Box>

            {verifyResult.valid && verifyResult.ticket && (
              <>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1 }}>
                    <QRCodeSVG value={verifyResult.ticket.barcode_data} size={150} />
                  </Box>
                </Box>
                {[
                  ['Movie', verifyResult.ticket.movie_title],
                  ['Cinema', verifyResult.ticket.cinema_name],
                  ['Hall', verifyResult.ticket.hall_name],
                  ['Showtime', new Date(verifyResult.ticket.start_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })],
                  ['Customer', `${verifyResult.ticket.username} (${verifyResult.ticket.email})`],
                  ['Status', verifyResult.ticket.status],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: label === 'Status' ? 700 : 400 }}>
                      {label === 'Status' ? <Chip label={String(value).toUpperCase()} size="small" color={value === 'paid' ? 'success' : 'default'} /> : value}
                    </Typography>
                  </Box>
                ))}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Seats:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {verifyResult.ticket.seats?.map((s: any) => (
                      <Chip key={`${s.row_label}${s.col_number}`} label={`${s.row_label}${s.col_number}`} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              </>
            )}

            <Button fullWidth variant="outlined" sx={{ mt: 3 }} onClick={handleReset}>
              Verify Another
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  )
}
