import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Container, Typography, Box, Button, Paper, Grid, Chip,
  CircularProgress, Alert, Divider,
} from '@mui/material'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchScheduleById } from '../features/schedules/schedulesSlice'
import { fetchSeatsForSchedule, lockSeats, unlockSeats, toggleSeat, clearSeats } from '../features/seats/seatsSlice'
import { buyTickets } from '../features/tickets/ticketsSlice'
import SeatMap from '../components/SeatMap'

export default function SeatSelectionPage() {
  const { id } = useParams<{ id: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((s) => s.auth)
  const { selected: schedule, loading: scheduleLoading } = useAppSelector((s) => s.schedules)
  const { seats, selectedSeats, loading: seatsLoading, lockLoading, error: seatsError, lockExpiry } = useAppSelector((s) => s.seats)
  const { loading: buyLoading, error: buyError } = useAppSelector((s) => s.tickets)

  const [step, setStep] = useState<'select' | 'review'>('select')
  const [payMethod, setPayMethod] = useState('online')

  useEffect(() => {
    if (id) {
      dispatch(fetchScheduleById(id))
      dispatch(fetchSeatsForSchedule(id))
    }
    return () => { dispatch(clearSeats()) }
  }, [dispatch, id])

  const getPriceForSeat = (seatId: string) => {
    const seat = seats.find((s) => s.id_kursi === seatId)
    if (!seat || !schedule) return 0
    return Number(schedule.harga_tiket)
  }

  const totalPrice = selectedSeats.reduce((sum, sid) => sum + getPriceForSeat(sid), 0)

  const handleProceed = async () => {
    if (!id || selectedSeats.length === 0) return
    const result = await dispatch(lockSeats({ id_jadwal: id, kursi_ids: selectedSeats }))
    if (lockSeats.fulfilled.match(result)) setStep('review')
  }

  const handleBuy = async () => {
    if (!id) return
    const result = await dispatch(buyTickets({ id_jadwal: id, kursi_ids: selectedSeats }))
    if (buyTickets.fulfilled.match(result)) navigate('/checkout/success')
  }

  if (scheduleLoading || seatsLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress /></Box>
  }

  if (!schedule) return null

  const selectedSeatObjects = seats.filter((s) => selectedSeats.includes(s.id_kursi))

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>{schedule.judul}</Typography>
        <Typography color="text.secondary">
          {schedule.nama_bioskop} · {schedule.nama_studio} ·{' '}
          {new Date(schedule.jam_tayang).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
        </Typography>
      </Box>

      {/* Steps */}
      <Box sx={{ display: 'flex', gap: 1, mb: 4 }}>
        <Chip label="1. Select Seats" color={step === 'select' ? 'primary' : 'default'} />
        <Chip label="2. Review & Pay" color={step === 'review' ? 'primary' : 'default'} />
      </Box>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          {step === 'select' ? (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>Choose Your Seats</Typography>
              {seatsError && <Alert severity="error" sx={{ mb: 2 }}>{seatsError}</Alert>}
              <SeatMap
                seats={seats}
                selectedSeats={selectedSeats}
                currentUserId={user?.id_user}
                onToggle={(seatId) => dispatch(toggleSeat(seatId))}
              />
            </Paper>
          ) : (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Review Your Order</Typography>
              {buyError && <Alert severity="error" sx={{ mb: 2 }}>{buyError}</Alert>}

              {lockExpiry && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Seats reserved until {new Date(lockExpiry).toLocaleTimeString('id-ID')}. Complete payment now!
                </Alert>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {selectedSeatObjects.map((seat) => (
                  <Box key={seat.id_kursi} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1">
                        Seat {seat.nomor_kursi}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Regular</Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      Rp{getPriceForSeat(seat.id_kursi).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                {['online', 'bank_transfer', 'cash'].map((method) => (
                  <Chip
                    key={method}
                    label={method.replace('_', ' ').toUpperCase()}
                    variant={payMethod === method ? 'filled' : 'outlined'}
                    color={payMethod === method ? 'primary' : 'default'}
                    onClick={() => setPayMethod(method)}
                    clickable
                  />
                ))}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h6" color="primary.main" sx={{ fontWeight: 800 }}>
                  Rp{totalPrice.toLocaleString()}
                </Typography>
              </Box>

              <Button
                fullWidth variant="contained" size="large" sx={{ mt: 3 }}
                onClick={handleBuy} disabled={buyLoading}
              >
                {buyLoading ? <CircularProgress size={24} /> : `Confirm Payment — Rp${totalPrice.toLocaleString()}`}
              </Button>
            </Paper>
          )}
        </Grid>

        {/* Summary sidebar */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: 80 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Order Summary</Typography>
            <Box component="img"
              src={schedule.poster_url || 'https://via.placeholder.com/300x450'} alt={schedule.judul || 'Movie Poster'}
              sx={{ width: '100%', borderRadius: 1, mb: 2 }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{schedule.judul}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{schedule.nama_bioskop}</Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(schedule.jam_tayang).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Selected: <strong>{selectedSeats.length} seat(s)</strong>
            </Typography>
            <Typography variant="h5" color="primary.main" sx={{ fontWeight: 800, mt: 1 }}>
              Rp{totalPrice.toLocaleString()}
            </Typography>

            {step === 'select' && (
              <Button
                fullWidth variant="contained" sx={{ mt: 2 }}
                disabled={selectedSeats.length === 0 || lockLoading}
                onClick={handleProceed}
              >
                {lockLoading ? <CircularProgress size={20} /> : 'Proceed to Checkout'}
              </Button>
            )}
            {step === 'review' && (
              <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={() => {
                if (id) dispatch(unlockSeats({ id_jadwal: id, kursi_ids: selectedSeats }))
                setStep('select')
              }}>
                Back to Selection
              </Button>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  )
}
