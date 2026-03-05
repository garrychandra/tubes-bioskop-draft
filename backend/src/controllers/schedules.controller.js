const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

const getAll = async (req, res) => {
  try {
    const { movie_id, date, cinema_id } = req.query;
    let query = `
      SELECT s.*, m.title as movie_title, m.poster_url, m.duration_min, m.genre,
             h.name as hall_name, c.name as cinema_name, c.id as cinema_id
      FROM schedules s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE 1=1
    `;
    const params = [];
    if (movie_id) { params.push(movie_id); query += ` AND s.movie_id=$${params.length}`; }
    if (cinema_id) { params.push(cinema_id); query += ` AND c.id=$${params.length}`; }
    if (date) {
      params.push(date);
      query += ` AND DATE(s.start_time AT TIME ZONE 'Asia/Jakarta')=$${params.length}`;
    }
    query += ' ORDER BY s.start_time ASC';
    const { rows } = await pool.query(query, params);
    res.json({ schedules: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const getById = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, m.title as movie_title, m.poster_url, m.duration_min, m.genre, m.rating,
             h.name as hall_name, h.rows, h.cols, c.name as cinema_name
      FROM schedules s
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      WHERE s.id=$1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
    res.json({ schedule: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

// Returns all seats with their availability for a given schedule
const getSeatsForSchedule = async (req, res) => {
  const scheduleId = req.params.id;
  try {
    const { rows } = await pool.query(`
      SELECT st.*,
        CASE
          WHEN sl.id IS NOT NULL AND sl.expires_at > NOW() THEN 'locked'
          WHEN oi.id IS NOT NULL THEN 'booked'
          ELSE 'available'
        END as status,
        sl.user_id as locked_by,
        sl.expires_at as lock_expires_at
      FROM schedules sc
      JOIN halls h ON sc.hall_id = h.id
      JOIN seats st ON st.hall_id = h.id
      LEFT JOIN seat_locks sl ON sl.seat_id = st.id AND sl.schedule_id = $1 AND sl.expires_at > NOW()
      LEFT JOIN LATERAL (
        SELECT oi2.id FROM order_items oi2
        JOIN orders o2 ON oi2.order_id = o2.id
        WHERE oi2.seat_id = st.id AND o2.schedule_id = $1 AND o2.status IN ('paid','pending')
        LIMIT 1
      ) oi ON true
      WHERE sc.id = $1
      ORDER BY st.row_label, st.col_number
    `, [scheduleId]);
    res.json({ seats: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch seats' }); }
};

const create = async (req, res) => {
  const { movie_id, hall_id, start_time, price_regular, price_vip, price_couple } = req.body;
  if (!movie_id || !hall_id || !start_time) return res.status(400).json({ error: 'movie_id, hall_id, start_time required' });
  try {
    // Get movie duration to compute end_time
    const movieRes = await pool.query('SELECT duration_min FROM movies WHERE id=$1', [movie_id]);
    if (!movieRes.rows.length) return res.status(404).json({ error: 'Movie not found' });
    const duration = movieRes.rows[0].duration_min;
    const end_time = new Date(new Date(start_time).getTime() + duration * 60000);
    const { rows } = await pool.query(`
      INSERT INTO schedules (id, movie_id, hall_id, start_time, end_time, price_regular, price_vip, price_couple)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [uuidv4(), movie_id, hall_id, start_time, end_time, price_regular||50000, price_vip||100000, price_couple||150000]);
    res.status(201).json({ schedule: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const update = async (req, res) => {
  const { start_time, price_regular, price_vip, price_couple } = req.body;
  try {
    // If start_time is being updated, recalculate end_time based on movie duration
    let end_time = null;
    if (start_time) {
      const schedRes = await pool.query(
        'SELECT s.movie_id, m.duration_min FROM schedules s JOIN movies m ON s.movie_id = m.id WHERE s.id=$1',
        [req.params.id]
      );
      if (schedRes.rows.length) {
        end_time = new Date(new Date(start_time).getTime() + schedRes.rows[0].duration_min * 60000);
      }
    }
    const { rows } = await pool.query(`
      UPDATE schedules SET start_time=COALESCE($1,start_time), end_time=COALESCE($6,end_time),
      price_regular=COALESCE($2,price_regular),
      price_vip=COALESCE($3,price_vip), price_couple=COALESCE($4,price_couple) WHERE id=$5 RETURNING *
    `, [start_time, price_regular, price_vip, price_couple, req.params.id, end_time]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ schedule: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM schedules WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

module.exports = { getAll, getById, getSeatsForSchedule, create, update, remove };
