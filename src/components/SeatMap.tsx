import { Box, Typography, Tooltip } from '@mui/material'
import { Seat } from '../features/seats/seatsSlice'

interface Props {
  seats: Seat[]
  selectedSeats: string[]
  currentUserId?: string
  onToggle: (seatId: string) => void
  disabled?: boolean
}

const SEAT_COLORS = {
  available_regular: '#2d2d2d',
  available_vip: '#1a2a1a',
  available_couple: '#1a1a2a',
  selected: '#e50914',
  locked: '#555',
  booked: '#333',
  mine_locked: '#ff6b35',
}

export default function SeatMap({ seats, selectedSeats, currentUserId, onToggle, disabled }: Props) {

  if (!seats.length) return <Typography color="text.secondary">No seats available</Typography>

  // Group by row
  const rowMap = new Map<string, Seat[]>()
  for (const seat of seats) {
    const row = seat.row_label
    if (!rowMap.has(row)) rowMap.set(row, [])
    rowMap.get(row)!.push(seat)
  }
  const rows = Array.from(rowMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const getSeatColor = (seat: Seat) => {
    if (selectedSeats.includes(seat.id)) return SEAT_COLORS.selected
    if (seat.status === 'booked') return SEAT_COLORS.booked
    if (seat.status === 'locked') {
      if (seat.locked_by === currentUserId) return SEAT_COLORS.mine_locked
      return SEAT_COLORS.locked
    }
    if (seat.seat_type === 'vip') return SEAT_COLORS.available_vip
    if (seat.seat_type === 'couple') return SEAT_COLORS.available_couple
    return SEAT_COLORS.available_regular
  }

  const isClickable = (seat: Seat) => {
    if (disabled) return false
    if (seat.status === 'booked') return false
    if (seat.status === 'locked' && seat.locked_by !== currentUserId) return false
    return true
  }

  return (
    <Box>
      {/* Screen */}
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box sx={{
          width: '70%', mx: 'auto', height: 8, borderRadius: '50%',
          background: 'linear-gradient(90deg, transparent, #fff 20%, #fff 80%, transparent)',
          opacity: 0.3, mb: 0.5,
        }} />
        <Typography variant="caption" color="text.secondary">SCREEN</Typography>
      </Box>

      {/* Rows */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, alignItems: 'center' }}>
        {rows.map(([rowLabel, rowSeats]) => (
          <Box key={rowLabel} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" sx={{ width: 16, color: 'text.secondary', textAlign: 'center' }}>
              {rowLabel}
            </Typography>
            {rowSeats.sort((a, b) => a.col_number - b.col_number).map((seat) => (
              <Tooltip
                key={seat.id}
                title={`${seat.row_label}${seat.col_number} — ${seat.seat_type} — ${seat.status}`}
                arrow
              >
                <Box
                  onClick={() => isClickable(seat) && onToggle(seat.id)}
                  sx={{
                    width: seat.seat_type === 'couple' ? 44 : 28,
                    height: 26,
                    borderRadius: '4px 4px 0 0',
                    bgcolor: getSeatColor(seat),
                    border: '1px solid',
                    borderColor: selectedSeats.includes(seat.id)
                      ? 'primary.main'
                      : seat.seat_type === 'vip'
                      ? '#2e5c2e'
                      : seat.seat_type === 'couple'
                      ? '#2e2e5c'
                      : '#444',
                    cursor: isClickable(seat) ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    '&:hover': isClickable(seat) ? { opacity: 0.8, transform: 'scale(1.1)' } : {},
                    fontSize: 9,
                    color: 'text.secondary',
                    userSelect: 'none',
                  }}
                >
                  {seat.col_number}
                </Box>
              </Tooltip>
            ))}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { color: SEAT_COLORS.available_regular, label: 'Regular' },
          { color: SEAT_COLORS.available_vip, label: 'VIP' },
          { color: SEAT_COLORS.selected, label: 'Selected' },
          { color: SEAT_COLORS.booked, label: 'Booked' },
          { color: SEAT_COLORS.locked, label: 'Locked' },
        ].map(({ color, label }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 16, height: 14, bgcolor: color, borderRadius: '3px 3px 0 0', border: '1px solid #555' }} />
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
