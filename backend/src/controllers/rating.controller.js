const { sequelize, Rating, User, Film } = require('../models');
const { QueryTypes } = require('sequelize');

const getByFilm = async (req, res) => {
  try {
    const ratings = await Rating.findAll({
      where: { id_film: req.params.filmId },
      include: [{ model: User, attributes: ['nama'] }],
      order: [['id_rating', 'DESC']],
    });
    res.json({ ratings });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch ratings' }); }
};

const create = async (req, res) => {
  const { id_film, nilai_rating, komentar } = req.body;
  const id_user = req.user.id_user;
  if (!id_film || !nilai_rating) return res.status(400).json({ error: 'id_film and nilai_rating required' });
  if (nilai_rating < 1 || nilai_rating > 10) return res.status(400).json({ error: 'nilai_rating must be 1-10' });
  try {
    const rating = await Rating.create({ nilai_rating, komentar, id_user, id_film });

    // Update avg_rating on film
    const [result] = await sequelize.query(
      `SELECT ROUND(AVG(nilai_rating)::numeric, 1) as avg FROM rating WHERE id_film=$1`,
      { bind: [id_film], type: QueryTypes.SELECT }
    );
    await Film.update({ avg_rating: result.avg || 0 }, { where: { id_film } });

    res.status(201).json({ rating });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') return res.status(409).json({ error: 'You already rated this film' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create rating' });
  }
};

const update = async (req, res) => {
  const { nilai_rating, komentar } = req.body;
  const id_user = req.user.id_user;
  try {
    const rating = await Rating.findOne({ where: { id_rating: req.params.id, id_user } });
    if (!rating) return res.status(404).json({ error: 'Rating not found or not yours' });
    await rating.update({ nilai_rating, komentar });

    // Recalculate avg_rating
    const [result] = await sequelize.query(
      `SELECT ROUND(AVG(nilai_rating)::numeric, 1) as avg FROM rating WHERE id_film=$1`,
      { bind: [rating.id_film], type: QueryTypes.SELECT }
    );
    await Film.update({ avg_rating: result.avg || 0 }, { where: { id_film: rating.id_film } });

    res.json({ rating });
  } catch (err) { res.status(500).json({ error: 'Failed to update rating' }); }
};

const remove = async (req, res) => {
  const id_user = req.user.id_user;
  try {
    const rating = await Rating.findOne({ where: { id_rating: req.params.id, id_user } });
    if (!rating) return res.status(404).json({ error: 'Rating not found or not yours' });
    const id_film = rating.id_film;
    await rating.destroy();

    // Recalculate avg_rating
    const [result] = await sequelize.query(
      `SELECT ROUND(AVG(nilai_rating)::numeric, 1) as avg FROM rating WHERE id_film=$1`,
      { bind: [id_film], type: QueryTypes.SELECT }
    );
    await Film.update({ avg_rating: result.avg || 0 }, { where: { id_film } });

    res.json({ message: 'Rating deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete rating' }); }
};

module.exports = { getByFilm, create, update, remove };
