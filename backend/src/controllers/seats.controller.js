const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

const LOCK_TTL_SEC = parseInt(process.env.SEAT_LOCK_TTL) || 600; // 10 minutes

/**
 * Lock seats for a schedule. Atomically checks availability and locks.
 * Body: { schedule_id, seat_ids: string[] }
 */
const lockSeats = async (req, res) => {
  const { schedule_id, seat_ids } = req.body;
  const userId = req.user.id;

  if (!schedule_id || !Array.isArray(seat_ids) || !seat_ids.length) {
    return res.status(400).json({ error: 'schedule_id and seat_ids[] required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean expired locks first
    await client.query('DELETE FROM seat_locks WHERE expires_at <= NOW()');

    // Check if any seats are already locked or booked
    const conflictCheck = await client.query(`
      SELECT sl.seat_id, 'locked' as reason FROM seat_locks sl
        WHERE sl.seat_id = ANY($1::uuid[]) AND sl.schedule_id=$2 AND sl.expires_at > NOW()
      UNION
      SELECT oi.seat_id, 'booked' as reason FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.seat_id = ANY($1::uuid[]) AND o.schedule_id=$2 AND o.status IN ('paid','pending')
    `, [seat_ids, schedule_id]);

    if (conflictCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'Some seats are unavailable',
        conflicting: conflictCheck.rows,
      });
    }

    // Lock the seats using SELECT ... FOR UPDATE to prevent race conditions
    const expiresAt = new Date(Date.now() + LOCK_TTL_SEC * 1000);
    for (const seatId of seat_ids) {
      await client.query(`
        INSERT INTO seat_locks (id, seat_id, schedule_id, user_id, expires_at)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (seat_id, schedule_id) DO UPDATE
          SET user_id=$4, locked_at=NOW(), expires_at=$5
          WHERE seat_locks.user_id=$4 OR seat_locks.expires_at <= NOW()
      `, [uuidv4(), seatId, schedule_id, userId, expiresAt]);
    }

    await client.query('COMMIT');
    res.json({ locked: true, expires_at: expiresAt, ttl_seconds: LOCK_TTL_SEC });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to lock seats' });
  } finally {
    client.release();
  }
};

/**
 * Release seat locks (called when user cancels checkout or leaves)
 * Body: { schedule_id, seat_ids: string[] }
 */
const unlockSeats = async (req, res) => {
  const { schedule_id, seat_ids } = req.body;
  const userId = req.user.id;
  try {
    await pool.query(
      'DELETE FROM seat_locks WHERE seat_id = ANY($1::uuid[]) AND schedule_id=$2 AND user_id=$3',
      [seat_ids, schedule_id, userId]
    );
    res.json({ unlocked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlock seats' });
  }
};

module.exports = { lockSeats, unlockSeats };
