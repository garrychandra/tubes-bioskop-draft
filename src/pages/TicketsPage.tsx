import { useEffect, useState } from 'react'
import {
  Container, Typography, Box, Paper, Chip, Divider,
  CircularProgress, Button, Dialog, DialogContent,
} from '@mui/material'
import QrCodeIcon from '@mui/icons-material/QrCode2'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchMyTickets } from '../features/tickets/ticketsSlice'
import { QRCodeSVG } from 'qrcode.react'

export default function TicketsPage() {
  const dispatch = useAppDispatch()
  const { myTickets, loading } = useAppSelector((s) => s.tickets)
  const [qrOpen, setQrOpen] = useState<any[] | null>(null)

  useEffect(() => {
    dispatch(fetchMyTickets())
  }, [dispatch])

  const statusColor = (s: string) => {
    if (s === 'paid') return 'success'
    if (s === 'used') return 'default'
    if (s === 'cancelled') return 'error'
    return 'warning'
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress /></Box>

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" sx={{ fontWeight: 800, mb: 4 }}>My Tickets</Typography>

      {myTickets.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 10 }}>
          <Typography color="text.secondary">No tickets yet. Go book a movie!</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {myTickets.map((ticket) => {
            const firstTicket = ticket.tiket?.[0]
            return (
            <Paper key={ticket.id_transaksi} sx={{ p: 3, display: 'flex', gap: 3 }}>
              <Box
                component="img"
                src={firstTicket?.poster_url || ticket.poster_url || 'https://via.placeholder.com/80x120'}
                alt={firstTicket?.judul || ticket.judul || 'Movie Poster'}
                sx={{ width: 80, height: 120, objectFit: 'cover', borderRadius: 1, flexShrink: 0 }}
              />
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{firstTicket?.judul || ticket.judul || 'Untitled Movie'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {firstTicket?.nama_bioskop || ticket.nama_bioskop || '-'} · {firstTicket?.nama_studio || ticket.nama_studio || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {(firstTicket?.jam_tayang || ticket.jam_tayang)
                        ? new Date((firstTicket?.jam_tayang || ticket.jam_tayang) as string).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                        : '-'}
                    </Typography>
                  </Box>
                  <Chip label={ticket.status.toUpperCase()} color={statusColor(ticket.status) as any} size="small" />
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {ticket.tiket?.map((item) => (
                    <Chip
                      key={item.id_tiket}
                      label={`${item.nomor_kursi || '-'} (${item.status_tiket})`}
                      size="small" variant="outlined"
                    />
                  ))}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                  <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
                    Rp{Number(ticket.total_bayar).toLocaleString()}
                  </Typography>
                  {ticket.status === 'paid' && ticket.tiket && ticket.tiket.length > 0 && (
                    <Button
                      variant="outlined" startIcon={<QrCodeIcon />} size="small"
                      onClick={() => setQrOpen(ticket.tiket!)}
                    >
                      Show QR
                    </Button>
                  )}
                </Box>
              </Box>
            </Paper>
            )
          })}
        </Box>
      )}

      {/* QR Code Dialog */}
      <Dialog open={Boolean(qrOpen)} onClose={() => setQrOpen(null)}>
        <DialogContent sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Ticket QR Codes</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: '60vh', overflowY: 'auto' }}>
            {qrOpen && qrOpen.map((t) => (
              <Box key={t.id_tiket}>
                <Box sx={{ p: 2, bgcolor: 'white', display: 'inline-block', borderRadius: 1 }}>
                  <QRCodeSVG value={t.barcode} size={220} />
                </Box>
                <Typography variant="caption" sx={{ display: 'block', mt: 1, fontFamily: 'monospace', color: 'text.secondary' }}>
                  {t.barcode} (Seat {t.nomor_kursi})
                </Typography>
              </Box>
            ))}
          </Box>
          <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={() => setQrOpen(null)}>Close</Button>
        </DialogContent>
      </Dialog>
    </Container>
  )
}
