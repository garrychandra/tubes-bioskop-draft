const { Op } = require('sequelize');
const { Film } = require('../models');

const getAll = async (req, res) => {
  try {
    const { genre, search, status } = req.query;
    const where = {};
    if (genre) where.genre = { [Op.iLike]: `%${genre}%` };
    if (search) where.judul = { [Op.iLike]: `%${search}%` };
    if (status) where.status = status;
    const films = await Film.findAll({ where, order: [['judul', 'ASC']] });
    res.json({ films });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch films' }); }
};

const getById = async (req, res) => {
  try {
    const film = await Film.findByPk(req.params.id);
    if (!film) return res.status(404).json({ error: 'Film not found' });
    res.json({ film });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch film' }); }
};

const create = async (req, res) => {
  const { judul, deskripsi, poster_url, durasi, genre, status, release_date } = req.body;
  if (!judul) return res.status(400).json({ error: 'Judul is required' });
  try {
    const film = await Film.create({
      judul, deskripsi, poster_url,
      durasi: durasi || 120, genre,
      avg_rating: 0,
      status: status || 'now_showing',
      release_date,
    });
    res.status(201).json({ film });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create film' }); }
};

const update = async (req, res) => {
  const { judul, deskripsi, poster_url, durasi, genre, status, release_date } = req.body;
  try {
    const film = await Film.findByPk(req.params.id);
    if (!film) return res.status(404).json({ error: 'Film not found' });
    await film.update({ judul, deskripsi, poster_url, durasi, genre, status, release_date });
    res.json({ film });
  } catch (err) { res.status(500).json({ error: 'Failed to update film' }); }
};

const remove = async (req, res) => {
  try {
    const deleted = await Film.destroy({ where: { id_film: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Film not found' });
    res.json({ message: 'Film deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete film' }); }
};

module.exports = { getAll, getById, create, update, remove };
