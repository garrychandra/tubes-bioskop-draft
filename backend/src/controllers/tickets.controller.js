const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

/**
 * Buy tickets
 * Body: { schedule_id, seat_ids: string[], payment_method: string }
 */
const buy = async (req, res) => {
  const { schedule_id, seat_ids, payment_method = 'online' } = req.body;
  const userId = req.user.id;

  if (!schedule_id || !Array.isArray(seat_ids) || !seat_ids.length)
    return res.status(400).json({ error: 'schedule_id and seat_ids[] required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify locks belong to this user
    const lockCheck = await client.query(`
      SELECT seat_id FROM seat_locks
      WHERE seat_id = ANY($1::uuid[]) AND schedule_id=$2 AND user_id=$3 AND expires_at > NOW()
    `, [seat_ids, schedule_id, userId]);

    if (lockCheck.rows.length !== seat_ids.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Seat locks expired or not held by you. Please re-select seats.' });
    }

    // Get seat types and schedule prices
    const scheduleRes = await client.query(
      'SELECT price_regular, price_vip, price_couple FROM schedules WHERE id=$1', [schedule_id]
    );
    if (!scheduleRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Schedule not found' });
    }
    const prices = scheduleRes.rows[0];

    const seatsRes = await client.query(
      'SELECT id, seat_type FROM seats WHERE id = ANY($1::uuid[])', [seat_ids]
    );
    const seatMap = Object.fromEntries(seatsRes.rows.map(s => [s.id, s]));

    // Calculate total
    let total = 0;
    const itemPrices = seat_ids.map(sid => {
      const seat = seatMap[sid];
      let price = prices.price_regular;
      if (seat?.seat_type === 'vip') price = prices.price_vip;
      if (seat?.seat_type === 'couple') price = prices.price_couple;
      total += parseFloat(price);
      return { seat_id: sid, price };
    });

    // Generate barcode data
    const orderId = uuidv4();
    const barcodeData = `CINEMA-${orderId.split('-')[0].toUpperCase()}-${Date.now()}`;

    // Create order
    await client.query(`
      INSERT INTO orders (id, user_id, schedule_id, total_price, status, barcode_data, payment_method, paid_at)
      VALUES ($1,$2,$3,$4,'paid',$5,$6,NOW())
    `, [orderId, userId, schedule_id, total, barcodeData, payment_method]);

    // Create order items
    for (const item of itemPrices) {
      await client.query(
        'INSERT INTO order_items (id, order_id, seat_id, price) VALUES ($1,$2,$3,$4)',
        [uuidv4(), orderId, item.seat_id, item.price]
      );
    }

    // Release seat locks
    await client.query(
      'DELETE FROM seat_locks WHERE seat_id = ANY($1::uuid[]) AND schedule_id=$2 AND user_id=$3',
      [seat_ids, schedule_id, userId]
    );

    await client.query('COMMIT');

    // Generate QR code
    const qrDataUrl = await QRCode.toDataURL(barcodeData, { width: 300, margin: 2 });

    res.status(201).json({
      order: { id: orderId, total_price: total, barcode_data: barcodeData, status: 'paid' },
      qr_code: qrDataUrl,
      seats: seatsRes.rows,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Purchase failed' });
  } finally {
    client.release();
  }
};

const getMyTickets = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT o.*, s.start_time, s.end_time, s.price_regular,
             m.title as movie_title, m.poster_url, m.duration_min, m.genre,
             h.name as hall_name, c.name as cinema_name,
             JSON_AGG(JSON_BUILD_OBJECT('seat_id', oi.seat_id, 'price', oi.price,
               'row_label', st.row_label, 'col_number', st.col_number, 'seat_type', st.seat_type)
             ) as items
      FROM orders o
      JOIN schedules s ON o.schedule_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN seats st ON st.id = oi.seat_id
      WHERE o.user_id = $1
      GROUP BY o.id, s.id, m.id, h.id, c.id
      ORDER BY o.created_at DESC
    `, [req.user.id]);
    res.json({ tickets: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const verify = async (req, res) => {
  const { barcode } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT o.*, u.username, u.email,
             s.start_time, s.end_time,
             m.title as movie_title,
             h.name as hall_name, c.name as cinema_name,
             JSON_AGG(JSON_BUILD_OBJECT('row_label', st.row_label, 'col_number', st.col_number, 'seat_type', st.seat_type)) as seats
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN schedules s ON o.schedule_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      LEFT JOIN seats st ON st.id = oi.seat_id
      WHERE o.barcode_data = $1
      GROUP BY o.id, u.id, s.id, m.id, h.id, c.id
    `, [barcode]);

    if (!rows.length) return res.status(404).json({ valid: false, error: 'Ticket not found' });

    const ticket = rows[0];
    const valid = ticket.status === 'paid';
    res.json({ valid, ticket });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Verification failed' }); }
};

const markUsed = async (req, res) => {
  const { barcode } = req.params;
  try {
    const { rows } = await pool.query(
      "UPDATE orders SET status='used' WHERE barcode_data=$1 AND status='paid' RETURNING *",
      [barcode]
    );
    if (!rows.length) return res.status(404).json({ error: 'Ticket not found or already used' });
    res.json({ message: 'Ticket marked as used', order: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const getBarcode = async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT barcode_data FROM orders WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const qrDataUrl = await QRCode.toDataURL(rows[0].barcode_data, { width: 300, margin: 2 });
    res.json({ barcode_data: rows[0].barcode_data, qr_code: qrDataUrl });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

module.exports = { buy, getMyTickets, verify, markUsed, getBarcode };
