const { sequelize, Jadwal, KursiLock, Tiket, Transaksi, DetailFnb, Fnb } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const QRCode = require('qrcode');

/**
 * Buy tickets – creates a transaksi with tiket records
 * Body: { id_jadwal, kursi_ids: string[], fnb_items?: [{id_item, qty}] }
 */
const buy = async (req, res) => {
  const { id_jadwal, kursi_ids, fnb_items = [] } = req.body;
  const id_user = req.user.id_user;

  if (!id_jadwal || !Array.isArray(kursi_ids) || !kursi_ids.length)
    return res.status(400).json({ error: 'id_jadwal and kursi_ids[] required' });

  const t = await sequelize.transaction();
  try {
    const jadwal = await Jadwal.findByPk(id_jadwal, { transaction: t });
    if (!jadwal) {
      await t.rollback();
      return res.status(404).json({ error: 'Jadwal not found' });
    }
    const hargaTiket = parseFloat(jadwal.harga_tiket);

    // Verify user holds active locks for all requested seats
    const locks = await KursiLock.findAll({
      where: { id_kursi: kursi_ids, id_jadwal, id_user, expires_at: { [Op.gt]: new Date() } },
      transaction: t,
    });
    if (locks.length !== kursi_ids.length) {
      await t.rollback();
      return res.status(409).json({ error: 'Seat locks expired or not held by you. Please re-select seats.' });
    }

    // Double-check no seat is already occupied
    const occupied = await Tiket.findAll({
      where: { id_kursi: kursi_ids, id_jadwal, status_tiket: 'active' },
      transaction: t,
    });
    if (occupied.length) {
      await t.rollback();
      return res.status(409).json({ error: 'Some seats were already purchased.' });
    }

    let total = hargaTiket * kursi_ids.length;

    // Calculate FnB total
    const validatedFnb = [];
    for (const item of fnb_items) {
      if (!item.id_item || !item.qty || item.qty < 1) continue;
      const fnbItem = await Fnb.findByPk(item.id_item, { transaction: t });
      if (fnbItem) {
        const harga = parseFloat(fnbItem.harga);
        total += harga * item.qty;
        validatedFnb.push({ id_item: item.id_item, qty: item.qty, harga_saat_pesan: harga });
      }
    }

    // Create transaksi
    const transaksi = await Transaksi.create(
      { total_bayar: total, tanggal_bayar: new Date(), status: 'paid', id_user },
      { transaction: t }
    );

    // Load seat numbers so checkout response can show user-facing seat labels
    const kursiRows = await sequelize.query(`
      SELECT id_kursi, nomor_kursi
      FROM kursi
      WHERE id_kursi = ANY($1::uuid[])
    `, { bind: [kursi_ids], type: QueryTypes.SELECT, transaction: t });
    const nomorByKursiId = new Map(kursiRows.map(k => [k.id_kursi, k.nomor_kursi]));

    // Create tiket for each kursi
    const tiketResults = [];
    for (const kursiId of kursi_ids) {
      const barcode = `TIX-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const tiket = await Tiket.create(
        { barcode, status_tiket: 'active', id_transaksi: transaksi.id_transaksi, id_jadwal, id_kursi: kursiId },
        { transaction: t }
      );
      tiketResults.push({
        id_tiket: tiket.id_tiket,
        barcode,
        id_kursi: kursiId,
        nomor_kursi: nomorByKursiId.get(kursiId) || null,
      });
    }

    // Create detail_fnb records
    for (const item of validatedFnb) {
      await DetailFnb.create(
        { qty: item.qty, harga_saat_pesan: item.harga_saat_pesan, id_transaksi: transaksi.id_transaksi, id_item: item.id_item },
        { transaction: t }
      );
    }

    // Release seat locks
    await KursiLock.destroy({ where: { id_kursi: kursi_ids, id_jadwal, id_user }, transaction: t });

    await t.commit();

    const qrDataUrl = await QRCode.toDataURL(tiketResults[0].barcode, { width: 300, margin: 2 });
    res.status(201).json({
      transaksi: { id_transaksi: transaksi.id_transaksi, total_bayar: total },
      tiket: tiketResults,
      qr_code: qrDataUrl,
    });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: 'Purchase failed' });
  }
};

const getMyTransactions = async (req, res) => {
  try {
    const rows = await sequelize.query(`
      SELECT tr.*,
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'id_tiket', t.id_tiket, 'barcode', t.barcode, 'status_tiket', t.status_tiket,
          'nomor_kursi', k.nomor_kursi, 'id_kursi', k.id_kursi,
          'judul', f.judul, 'poster_url', f.poster_url, 'jam_tayang', j.jam_tayang,
          'nama_studio', s.nama_studio, 'nama_bioskop', b.nama_bioskop
        )) FILTER (WHERE t.id_tiket IS NOT NULL) as tiket,
        JSON_AGG(DISTINCT JSONB_BUILD_OBJECT(
          'nama_item', fn.nama_item, 'qty', df.qty, 'harga_saat_pesan', df.harga_saat_pesan
        )) FILTER (WHERE df.id_detail IS NOT NULL) as fnb_items
      FROM transaksi tr
      LEFT JOIN tiket t ON t.id_transaksi = tr.id_transaksi
      LEFT JOIN jadwal j ON t.id_jadwal = j.id_jadwal
      LEFT JOIN film f ON j.id_film = f.id_film
      LEFT JOIN studio s ON j.id_studio = s.id_studio
      LEFT JOIN bioskop b ON s.id_bioskop = b.id_bioskop
      LEFT JOIN kursi k ON t.id_kursi = k.id_kursi
      LEFT JOIN detail_fnb df ON df.id_transaksi = tr.id_transaksi
      LEFT JOIN fnb fn ON df.id_item = fn.id_item
      WHERE tr.id_user = $1
      GROUP BY tr.id_transaksi
      ORDER BY tr.tanggal_bayar DESC
    `, { bind: [req.user.id_user], type: QueryTypes.SELECT });
    res.json({ transactions: rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch transactions' }); }
};

const verify = async (req, res) => {
  const { barcode } = req.params;
  try {
    const rows = await sequelize.query(`
      SELECT t.*, u.nama, u.email,
             j.jam_tayang, j.harga_tiket,
             f.judul, s.nama_studio, b.nama_bioskop,
             k.nomor_kursi,
             tr.total_bayar, tr.tanggal_bayar
      FROM tiket t
      JOIN transaksi tr ON t.id_transaksi = tr.id_transaksi
      JOIN users u ON tr.id_user = u.id_user
      JOIN jadwal j ON t.id_jadwal = j.id_jadwal
      JOIN film f ON j.id_film = f.id_film
      JOIN studio s ON j.id_studio = s.id_studio
      JOIN bioskop b ON s.id_bioskop = b.id_bioskop
      JOIN kursi k ON t.id_kursi = k.id_kursi
      WHERE t.barcode = $1
    `, { bind: [barcode], type: QueryTypes.SELECT });

    if (!rows.length) return res.status(404).json({ valid: false, error: 'Ticket not found' });
    const ticket = rows[0];
    const valid = ticket.status_tiket === 'active';
    res.json({ valid, ticket });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Verification failed' }); }
};

const markUsed = async (req, res) => {
  const { barcode } = req.params;
  try {
    const [count] = await Tiket.update(
      { status_tiket: 'used' },
      { where: { barcode, status_tiket: 'active' } }
    );
    if (!count) return res.status(404).json({ error: 'Ticket not found or already used' });
    const tiket = await Tiket.findOne({ where: { barcode } });
    res.json({ message: 'Ticket marked as used', tiket });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

const getBarcode = async (req, res) => {
  try {
    const tiket = await Tiket.findOne({
      where: { id_tiket: req.params.id },
      include: [{ model: Transaksi, where: { id_user: req.user.id_user }, attributes: [] }],
      attributes: ['barcode'],
    });
    if (!tiket) return res.status(404).json({ error: 'Ticket not found' });
    const qrDataUrl = await QRCode.toDataURL(tiket.barcode, { width: 300, margin: 2 });
    res.json({ barcode: tiket.barcode, qr_code: qrDataUrl });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
};

module.exports = { buy, getMyTransactions, verify, markUsed, getBarcode };
