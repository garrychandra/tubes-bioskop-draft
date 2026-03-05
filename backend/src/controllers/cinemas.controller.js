const pool = require('../db/pool');
const { v4: uuidv4 } = require('uuid');

const getAll = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cinemas ORDER BY name');
    res.json({ cinemas: rows });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch cinemas' }); }
};

const getById = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM cinemas WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Cinema not found' });
    res.json({ cinema: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const getHalls = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM halls WHERE cinema_id=$1 ORDER BY name', [req.params.id]);
    res.json({ halls: rows });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const create = async (req, res) => {
  const { name, location, image_url } = req.body;
  if (!name || !location) return res.status(400).json({ error: 'name and location required' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO cinemas (id,name,location,image_url) VALUES ($1,$2,$3,$4) RETURNING *',
      [uuidv4(), name, location, image_url]
    );
    res.status(201).json({ cinema: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const update = async (req, res) => {
  const { name, location, image_url } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE cinemas SET name=COALESCE($1,name), location=COALESCE($2,location), image_url=COALESCE($3,image_url) WHERE id=$4 RETURNING *',
      [name, location, image_url, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ cinema: rows[0] });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const remove = async (req, res) => {
  try {
    await pool.query('DELETE FROM cinemas WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

module.exports = { getAll, getById, getHalls, create, update, remove };
