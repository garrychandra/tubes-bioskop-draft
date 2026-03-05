const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

const getAll = async (req, res) => {
  try {
    const { status, genre, search } = req.query;
    let query = 'SELECT * FROM movies WHERE 1=1';
    const params = [];
    if (status) { params.push(status); query += ` AND status=$${params.length}`; }
    if (genre) { params.push(`%${genre}%`); query += ` AND genre ILIKE $${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND title ILIKE $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json({ movies: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch movies' }); }
};

const getById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM movies WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Movie not found' });
    res.json({ movie: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch movie' }); }
};

const create = async (req, res) => {
  const { title, description, poster_url, backdrop_url, genre, duration_min, rating, release_date, status, language } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  try {
    const { rows } = await pool.query(`
      INSERT INTO movies (id, title, description, poster_url, backdrop_url, genre, duration_min, rating, release_date, status, language)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
    `, [uuidv4(), title, description, poster_url, backdrop_url, genre, duration_min || 120, rating || 0, release_date, status || 'now_showing', language || 'Indonesian']);
    res.status(201).json({ movie: rows[0] });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create movie' }); }
};

const update = async (req, res) => {
  const { title, description, poster_url, backdrop_url, genre, duration_min, rating, release_date, status, language } = req.body;
  try {
    const { rows } = await pool.query(`
      UPDATE movies SET title=COALESCE($1,title), description=COALESCE($2,description),
      poster_url=COALESCE($3,poster_url), backdrop_url=COALESCE($4,backdrop_url),
      genre=COALESCE($5,genre), duration_min=COALESCE($6,duration_min), rating=COALESCE($7,rating),
      release_date=COALESCE($8,release_date), status=COALESCE($9,status), language=COALESCE($10,language)
      WHERE id=$11 RETURNING *
    `, [title, description, poster_url, backdrop_url, genre, duration_min, rating, release_date, status, language, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Movie not found' });
    res.json({ movie: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed to update movie' }); }
};

const remove = async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM movies WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Movie not found' });
    res.json({ message: 'Movie deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete movie' }); }
};

module.exports = { getAll, getById, create, update, remove };
