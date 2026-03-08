const { Fnb } = require('../models');

const getAll = async (req, res) => {
  try {
    const fnb = await Fnb.findAll({ order: [['nama_item', 'ASC']] });
    res.json({ fnb });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch FnB' }); }
};

const getById = async (req, res) => {
  try {
    const fnb = await Fnb.findByPk(req.params.id);
    if (!fnb) return res.status(404).json({ error: 'FnB item not found' });
    res.json({ fnb });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch FnB item' }); }
};

const create = async (req, res) => {
  const { nama_item, harga } = req.body;
  if (!nama_item || harga == null) return res.status(400).json({ error: 'nama_item and harga required' });
  try {
    const fnb = await Fnb.create({ nama_item, harga });
    res.status(201).json({ fnb });
  } catch (err) { res.status(500).json({ error: 'Failed to create FnB' }); }
};

const update = async (req, res) => {
  const { nama_item, harga } = req.body;
  try {
    const fnb = await Fnb.findByPk(req.params.id);
    if (!fnb) return res.status(404).json({ error: 'FnB item not found' });
    await fnb.update({ nama_item, harga });
    res.json({ fnb });
  } catch (err) { res.status(500).json({ error: 'Failed to update FnB' }); }
};

const remove = async (req, res) => {
  try {
    const deleted = await Fnb.destroy({ where: { id_item: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'FnB item not found' });
    res.json({ message: 'FnB item deleted' });
  } catch (err) { res.status(500).json({ error: 'Failed to delete FnB' }); }
};

module.exports = { getAll, getById, create, update, remove };
