const { Bioskop, Studio } = require('../models');

// --- Bioskop CRUD ---

const getAll = async (req, res) => {
  try {
    const bioskop = await Bioskop.findAll({ order: [['nama_bioskop', 'ASC']] });
    res.json({ bioskop });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch bioskop' }); }
};

const getById = async (req, res) => {
  try {
    const bioskop = await Bioskop.findByPk(req.params.id);
    if (!bioskop) return res.status(404).json({ error: 'Bioskop not found' });
    res.json({ bioskop });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const create = async (req, res) => {
  const { nama_bioskop, lokasi } = req.body;
  let image_url = req.body.image_url;
  if (req.file && req.file.location) {
    image_url = req.file.location;
  }

  if (!nama_bioskop || !lokasi) return res.status(400).json({ error: 'nama_bioskop and lokasi required' });
  try {
    const bioskop = await Bioskop.create({ nama_bioskop, lokasi, image_url });
    res.status(201).json({ bioskop });
  } catch (err) { res.status(500).json({ error: 'Failed to create bioskop' }); }
};

const update = async (req, res) => {
  const { nama_bioskop, lokasi } = req.body;
  let image_url = req.body.image_url;
  if (req.file && req.file.location) {
    image_url = req.file.location;
  }

  try {
    const bioskop = await Bioskop.findByPk(req.params.id);
    if (!bioskop) return res.status(404).json({ error: 'Not found' });
    await bioskop.update({ nama_bioskop, lokasi, image_url });
    res.json({ bioskop });
  } catch (err) { res.status(500).json({ error: 'Failed to update bioskop' }); }
};

const remove = async (req, res) => {
  try {
    const deleted = await Bioskop.destroy({ where: { id_bioskop: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Bioskop deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete bioskop' }); }
};

// --- Studio under Bioskop ---

const getStudios = async (req, res) => {
  try {
    const studios = await Studio.findAll({
      where: { id_bioskop: req.params.id },
      order: [['nama_studio', 'ASC']],
    });
    res.json({ studios });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch studios' }); }
};

const createStudio = async (req, res) => {
  const { nama_studio, kapasitas } = req.body;
  const id_bioskop = req.params.id;
  if (!nama_studio) return res.status(400).json({ error: 'nama_studio required' });
  try {
    const studio = await Studio.create({ nama_studio, kapasitas: kapasitas || 80, id_bioskop });
    res.status(201).json({ studio });
  } catch (err) { res.status(500).json({ error: 'Failed to create studio' }); }
};

const updateStudio = async (req, res) => {
  const { nama_studio, kapasitas } = req.body;
  try {
    const studio = await Studio.findByPk(req.params.studioId);
    if (!studio) return res.status(404).json({ error: 'Studio not found' });
    await studio.update({ nama_studio, kapasitas });
    res.json({ studio });
  } catch (err) { res.status(500).json({ error: 'Failed to update studio' }); }
};

const removeStudio = async (req, res) => {
  try {
    const deleted = await Studio.destroy({ where: { id_studio: req.params.studioId } });
    if (!deleted) return res.status(404).json({ error: 'Studio not found' });
    res.json({ message: 'Studio deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete studio' }); }
};

module.exports = { getAll, getById, create, update, remove, getStudios, createStudio, updateStudio, removeStudio };
