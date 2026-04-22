import { useState } from 'react'
import {
  Container, Typography, Paper, TextField, Button,
  Box, CircularProgress, Chip, Divider, Alert
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { verifyTicket, clearVerify, markTicketUsed } from '../features/tickets/ticketsSlice'
import { QRCodeSVG } from 'qrcode.react'
import QrScanner from '../components/QrScanner'

export default function VerifyPage() {
  const dispatch = useAppDispatch()
  const { verifyResult, loading, error } = useAppSelector((s) => s.tickets)
  const [barcode, setBarcode] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const handleVerify = () => {
    if (barcode.trim()) dispatch(verifyTicket(barcode.trim()))
  }

  const handleScanSuccess = (decodedText: string) => {
    setBarcode(decodedText)
    setShowScanner(false)
    dispatch(verifyTicket(decodedText))
  }

  const handleReset = () => {
    dispatch(clearVerify())
    setBarcode('')
    setShowScanner(true)
  }

  const handleRedeem = async () => {
    if (verifyResult?.ticket) {
      const res = await dispatch(markTicketUsed(verifyResult.ticket.barcode))
      if (markTicketUsed.fulfilled.match(res)) {
         setTimeout(() => handleReset(), 2000)
      }
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Verify Ticket</Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Enter a barcode or scan a QR code to verify a cinema ticket.
      </Typography>

      <Paper sx={{ p: 4 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        
        {!verifyResult && (
          <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {showScanner ? (
              <Box sx={{ width: '100%', mb: 2 }}>
                <QrScanner onScanSuccess={handleScanSuccess} />
                <Button fullWidth variant="text" onClick={() => setShowScanner(false)} sx={{ mt: 1 }}>
                  Close Scanner
                </Button>
              </Box>
            ) : (
              <Button variant="outlined" onClick={() => setShowScanner(true)} sx={{ mb: 3 }}>
                Use Webcam to Scan Barcode
              </Button>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
              Or enter the barcode manually:
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
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
          </Box>
        )}

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
                    <QRCodeSVG value={verifyResult.ticket.barcode} size={150} />
                  </Box>
                </Box>
                {[
                  ['Movie', verifyResult.ticket.judul],
                  ['Cinema', verifyResult.ticket.nama_bioskop],
                  ['Hall', verifyResult.ticket.nama_studio],
                  ['Showtime', verifyResult.ticket.jam_tayang ? new Date(verifyResult.ticket.jam_tayang).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'],
                  ['Customer', `${verifyResult.ticket.nama} (${verifyResult.ticket.email})`],
                  ['Status', verifyResult.ticket.status_tiket],
                ].map(([label, value]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.8 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: label === 'Status' ? 700 : 400 }}>
                      {label === 'Status' ? <Chip label={value === 'used' ? 'REDEEMED' : String(value).toUpperCase()} size="small" color={value === 'active' ? 'success' : 'default'} /> : value}
                    </Typography>
                  </Box>
                ))}
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Seats:</Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip label={verifyResult.ticket.nomor_kursi || '-'} size="small" variant="outlined" />
                  </Box>
                </Box>
              </>
            )}

            {verifyResult.ticket && verifyResult.ticket.status_tiket === 'active' && (
              <Button fullWidth variant="contained" color="success" sx={{ mt: 3 }} onClick={handleRedeem} disabled={loading}>
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Mark as Redeemed'}
              </Button>
            )}

            <Button fullWidth variant="outlined" sx={{ mt: verifyResult.ticket?.status_tiket === 'active' ? 1.5 : 3 }} onClick={handleReset}>
              Verify Another
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  )
}
