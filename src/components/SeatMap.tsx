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
  available: '#2e7d32',
  selected: '#e50914',
  locked: '#1565c0',
  occupied: '#8b1e1e',
  mine_locked: '#ff6b35',
}

export default function SeatMap({ seats, selectedSeats, currentUserId, onToggle, disabled }: Props) {

  if (!seats.length) return <Typography color="text.secondary">No seats available</Typography>

  const parseSeat = (nomorKursi: string) => {
    const match = /^([A-Za-z]+)(\d+)$/.exec(nomorKursi)
    if (!match) return { rowLabel: nomorKursi, colNumber: Number.MAX_SAFE_INTEGER }
    return {
      rowLabel: match[1].toUpperCase(),
      colNumber: Number(match[2]),
    }
  }

  // Group by row
  const rowMap = new Map<string, Seat[]>()
  for (const seat of seats) {
    const row = parseSeat(seat.nomor_kursi).rowLabel
    if (!rowMap.has(row)) rowMap.set(row, [])
    rowMap.get(row)!.push(seat)
  }
  const rows = Array.from(rowMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  const getSeatColor = (seat: Seat) => {
    if (selectedSeats.includes(seat.id_kursi)) return SEAT_COLORS.selected
    if (seat.status === 'occupied') return SEAT_COLORS.occupied
    if (seat.status === 'locked') {
      if (seat.locked_by === currentUserId) return SEAT_COLORS.mine_locked
      return SEAT_COLORS.locked
    }
    return SEAT_COLORS.available
  }

  const isClickable = (seat: Seat) => {
    if (disabled) return false
    if (seat.status === 'occupied') return false
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
            {rowSeats.sort((a, b) => parseSeat(a.nomor_kursi).colNumber - parseSeat(b.nomor_kursi).colNumber).map((seat) => (
              <Tooltip
                key={seat.id_kursi}
                title={`${seat.nomor_kursi} — ${seat.status}`}
                arrow
              >
                <Box
                  onClick={() => isClickable(seat) && onToggle(seat.id_kursi)}
                  sx={{
                    width: 28,
                    height: 26,
                    borderRadius: '4px 4px 0 0',
                    bgcolor: getSeatColor(seat),
                    border: '1px solid',
                    borderColor: selectedSeats.includes(seat.id_kursi)
                      ? 'primary.main'
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
                  {parseSeat(seat.nomor_kursi).colNumber === Number.MAX_SAFE_INTEGER ? '?' : parseSeat(seat.nomor_kursi).colNumber}
                </Box>
              </Tooltip>
            ))}
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { color: SEAT_COLORS.available, label: 'Available' },
          { color: SEAT_COLORS.selected, label: 'Selected' },
          { color: SEAT_COLORS.occupied, label: 'Occupied' },
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
