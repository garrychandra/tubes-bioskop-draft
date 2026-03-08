const { Kursi } = require('../models');

const getByStudio = async (req, res) => {
  try {
    const kursi = await Kursi.findAll({
      where: { id_studio: req.params.studioId },
      order: [['nomor_kursi', 'ASC']],
    });
    res.json({ kursi });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch kursi' }); }
};

const create = async (req, res) => {
  const { nomor_kursi, id_studio } = req.body;
  if (!nomor_kursi || !id_studio) return res.status(400).json({ error: 'nomor_kursi and id_studio required' });
  try {
    const kursi = await Kursi.create({ nomor_kursi, id_studio });
    res.status(201).json({ kursi });
  } catch (err) { res.status(500).json({ error: 'Failed to create kursi' }); }
};

const remove = async (req, res) => {
  try {
    const deleted = await Kursi.destroy({ where: { id_kursi: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Kursi not found' });
    res.json({ message: 'Kursi deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete kursi' }); }
};

module.exports = { getByStudio, create, remove };
