const pool = require('../db/pool');

const getStats = async (req, res) => {
  try {
    const [usersRes, ordersRes, moviesRes, revenueRes, todayRes] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role='user'"),
      pool.query("SELECT COUNT(*), status FROM orders GROUP BY status"),
      pool.query('SELECT COUNT(*) FROM movies'),
      pool.query("SELECT COALESCE(SUM(total_price),0) as total FROM orders WHERE status IN ('paid','used')"),
      pool.query(`
        SELECT COALESCE(SUM(total_price),0) as today_revenue, COUNT(*) as today_orders
        FROM orders WHERE status IN ('paid','used') AND DATE(created_at)=CURRENT_DATE
      `),
    ]);

    const orderStats = {};
    ordersRes.rows.forEach(r => { orderStats[r.status] = parseInt(r.count); });

    res.json({
      total_users: parseInt(usersRes.rows[0].count),
      total_movies: parseInt(moviesRes.rows[0].count),
      total_revenue: parseFloat(revenueRes.rows[0].total),
      today_revenue: parseFloat(todayRes.rows[0].today_revenue),
      today_orders: parseInt(todayRes.rows[0].today_orders),
      orders: orderStats,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const getIncome = async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    let groupBy, dateExpr;
    if (period === 'monthly') {
      dateExpr = "TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM')";
      groupBy = "DATE_TRUNC('month', created_at)";
    } else {
      dateExpr = "TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD')";
      groupBy = "DATE_TRUNC('day', created_at)";
    }
    const { rows } = await pool.query(`
      SELECT ${dateExpr} as date,
             COALESCE(SUM(total_price),0) as revenue,
             COUNT(*) as orders
      FROM orders
      WHERE status IN ('paid','used') AND created_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY ${groupBy}
      ORDER BY ${groupBy} ASC
    `, [parseInt(days) || 30]);
    res.json({ income: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [parseInt(limit), offset];
    let where = '';
    if (status) { params.push(status); where = `WHERE o.status=$${params.length}`; }

    const { rows } = await pool.query(`
      SELECT o.*, u.username, u.email,
             m.title as movie_title, s.start_time, c.name as cinema_name
      FROM orders o
      JOIN users u ON o.user_id = u.id
      JOIN schedules s ON o.schedule_id = s.id
      JOIN movies m ON s.movie_id = m.id
      JOIN halls h ON s.hall_id = h.id
      JOIN cinemas c ON h.cinema_id = c.id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const countParams = status ? [status] : [];
    const countWhere = status ? `WHERE o.status=$1` : '';
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM orders o ${countWhere}`,
      countParams
    );

    res.json({ orders: rows, total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
};

const getUsers = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.email, u.role, u.created_at,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(o.total_price) FILTER (WHERE o.status IN ('paid','used')), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      GROUP BY u.id ORDER BY u.created_at DESC
    `);
    res.json({ users: rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const { rows } = await pool.query(
      'UPDATE users SET role=$1 WHERE id=$2 RETURNING id, username, email, role',
      [role, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ user: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

module.exports = { getStats, getIncome, getOrders, getUsers, updateUserRole };
