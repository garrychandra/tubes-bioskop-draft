const { sequelize, KursiLock, Tiket } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { QueryTypes } = require('sequelize');

const LOCK_TTL_SEC = parseInt(process.env.SEAT_LOCK_TTL) || 600;

/**
 * Lock seats for a jadwal during checkout.
 * Body: { id_jadwal, kursi_ids: string[] }
 */
const lockSeats = async (req, res) => {
  const { id_jadwal, kursi_ids } = req.body;
  const id_user = req.user.id_user;

  if (!id_jadwal || !Array.isArray(kursi_ids) || !kursi_ids.length)
    return res.status(400).json({ error: 'id_jadwal and kursi_ids[] required' });

  const t = await sequelize.transaction();
  try {
    // Remove expired locks
    await KursiLock.destroy({ where: { expires_at: { [require('sequelize').Op.lte]: new Date() } }, transaction: t });

    // Check for conflicts via raw query (UNION of locked + occupied)
    const conflicts = await sequelize.query(`
      SELECT kl.id_kursi, 'locked' as reason FROM kursi_locks kl
        WHERE kl.id_kursi = ANY($1::uuid[]) AND kl.id_jadwal=$2 AND kl.expires_at > NOW()
          AND kl.id_user != $3
      UNION
      SELECT t.id_kursi, 'occupied' as reason FROM tiket t
        WHERE t.id_kursi = ANY($1::uuid[]) AND t.id_jadwal=$2 AND t.status_tiket='active'
    `, { bind: [kursi_ids, id_jadwal, id_user], type: QueryTypes.SELECT, transaction: t });

    if (conflicts.length) {
      await t.rollback();
      return res.status(409).json({ error: 'Some seats are unavailable', conflicting: conflicts });
    }

    const expiresAt = new Date(Date.now() + LOCK_TTL_SEC * 1000);

    for (const kursiId of kursi_ids) {
      await sequelize.query(`
        INSERT INTO kursi_locks (id_lock, id_kursi, id_jadwal, id_user, expires_at)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id_kursi, id_jadwal) DO UPDATE
          SET id_user=$4, locked_at=NOW(), expires_at=$5
          WHERE kursi_locks.id_user=$4 OR kursi_locks.expires_at <= NOW()
      `, { bind: [uuidv4(), kursiId, id_jadwal, id_user, expiresAt], transaction: t });
    }

    await t.commit();
    res.json({ locked: true, expires_at: expiresAt, ttl_seconds: LOCK_TTL_SEC });
  } catch (err) {
    await t.rollback();
    console.error(err);
    res.status(500).json({ error: 'Failed to lock seats' });
  }
};

/**
 * Unlock seats (user cancelled checkout).
 * Body: { id_jadwal, kursi_ids: string[] }
 */
const unlockSeats = async (req, res) => {
  const { id_jadwal, kursi_ids } = req.body;
  const id_user = req.user.id_user;

  if (!id_jadwal || !Array.isArray(kursi_ids) || !kursi_ids.length)
    return res.status(400).json({ error: 'id_jadwal and kursi_ids[] required' });

  try {
    await KursiLock.destroy({
      where: { id_kursi: kursi_ids, id_jadwal, id_user },
    });
    res.json({ unlocked: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlock seats' });
  }
};

module.exports = { lockSeats, unlockSeats };
