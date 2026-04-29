const {
  sequelize,
  Jadwal,
  Film,
  Studio,
  Bioskop,
  KursiLock,
  Tiket,
} = require("../models")
const { Op, QueryTypes } = require("sequelize")

const getAll = async (req, res) => {
  try {
    const { id_film, id_bioskop, date } = req.query
    const where = {}
    if (id_film) where.id_film = id_film
    if (date) {
      const start = new Date(date)
      const end = new Date(date)
      end.setDate(end.getDate() + 1)
      where.jam_tayang = { [Op.gte]: start, [Op.lt]: end }
    }

    const includeStudio = {
      model: Studio,
      attributes: ["nama_studio", "kapasitas"],
      required: true,
      include: [
        {
          model: Bioskop,
          attributes: ["id_bioskop", "nama_bioskop", "lokasi"],
          required: true,
          ...(id_bioskop ? { where: { id_bioskop } } : {}),
        },
      ],
    }

    const rows = await Jadwal.findAll({
      where,
      include: [
        {
          model: Film,
          attributes: [
            "judul",
            "poster_url",
            "durasi",
            "genre",
            "avg_rating",
            "status",
          ],
        },
        includeStudio,
      ],
      order: [["jam_tayang", "ASC"]],
    })

    // Flatten associations to match original flat response shape
    const jadwal = rows.map(j => ({
      ...j.toJSON(),
      judul: j.Film?.judul,
      poster_url: j.Film?.poster_url,
      durasi: j.Film?.durasi,
      genre: j.Film?.genre,
      avg_rating: j.Film?.avg_rating,
      film_status: j.Film?.status,
      nama_studio: j.Studio?.nama_studio,
      kapasitas: j.Studio?.kapasitas,
      nama_bioskop: j.Studio?.Bioskop?.nama_bioskop,
      lokasi: j.Studio?.Bioskop?.lokasi,
      id_bioskop: j.Studio?.Bioskop?.id_bioskop,
    }))

    res.json({ jadwal })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch jadwal" })
  }
}

const getById = async (req, res) => {
  try {
    const j = await Jadwal.findByPk(req.params.id, {
      include: [
        {
          model: Film,
          attributes: ["judul", "poster_url", "durasi", "genre", "avg_rating"],
        },
        {
          model: Studio,
          attributes: ["nama_studio", "kapasitas"],
          include: [{ model: Bioskop, attributes: ["nama_bioskop", "lokasi"] }],
        },
      ],
    })
    if (!j) return res.status(404).json({ error: "Jadwal not found" })
    const jadwal = {
      ...j.toJSON(),
      judul: j.Film?.judul,
      poster_url: j.Film?.poster_url,
      durasi: j.Film?.durasi,
      genre: j.Film?.genre,
      avg_rating: j.Film?.avg_rating,
      nama_studio: j.Studio?.nama_studio,
      kapasitas: j.Studio?.kapasitas,
      nama_bioskop: j.Studio?.Bioskop?.nama_bioskop,
      lokasi: j.Studio?.Bioskop?.lokasi,
    }
    res.json({ jadwal })
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jadwal" })
  }
}

const getSeatsForSchedule = async (req, res) => {
  const jadwalId = req.params.id
  try {
    const jadwal = await Jadwal.findByPk(jadwalId, {
      attributes: ["id_studio"],
    })
    if (!jadwal) return res.status(404).json({ error: "Jadwal not found" })

    // Clean up expired locks first
    await KursiLock.destroy({ where: { expires_at: { [Op.lte]: new Date() } } })

    const seats = await sequelize.query(
      `
      SELECT k.*,
        CASE
          WHEN t.id_tiket IS NOT NULL  THEN 'occupied'
          WHEN kl.id_lock IS NOT NULL  THEN 'locked'
          ELSE 'available'
        END as status,
        kl.id_user as locked_by,
        kl.expires_at as lock_expires_at
      FROM kursi k
      LEFT JOIN tiket t
        ON t.id_kursi = k.id_kursi AND t.id_jadwal = $1 AND t.status_tiket = 'active'
      LEFT JOIN kursi_locks kl
        ON kl.id_kursi = k.id_kursi AND kl.id_jadwal = $1 AND kl.expires_at > NOW()
      WHERE k.id_studio = $2
      ORDER BY k.nomor_kursi
    `,
      { bind: [jadwalId, jadwal.id_studio], type: QueryTypes.SELECT },
    )

    res.json({ seats })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to fetch seats" })
  }
}

const create = async (req, res) => {
  const { id_film, id_studio, jam_tayang, harga_tiket } = req.body
  if (!id_film || !id_studio || !jam_tayang)
    return res
      .status(400)
      .json({ error: "id_film, id_studio, jam_tayang required" })
  try {
    const film = await Film.findByPk(id_film, { attributes: ["durasi"] })
    if (!film) return res.status(404).json({ error: "Film not found" })
    const jam_selesai = new Date(
      new Date(jam_tayang).getTime() + film.durasi * 60000,
    )
    const jadwal = await Jadwal.create({
      jam_tayang,
      jam_selesai,
      harga_tiket: harga_tiket || 50000,
      id_studio,
      id_film,
    })
    res.status(201).json({ jadwal })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Failed to create jadwal" })
  }
}

const update = async (req, res) => {
  const { jam_tayang, harga_tiket } = req.body
  try {
    const jadwal = await Jadwal.findByPk(req.params.id, {
      include: [{ model: Film, attributes: ["durasi"] }],
    })
    if (!jadwal) return res.status(404).json({ error: "Jadwal not found" })

    const updates = {}
    if (harga_tiket !== undefined) updates.harga_tiket = harga_tiket
    if (jam_tayang) {
      updates.jam_tayang = jam_tayang
      updates.jam_selesai = new Date(
        new Date(jam_tayang).getTime() + jadwal.Film.durasi * 60000,
      )
    }
    await jadwal.update(updates)
    res.json({ jadwal })
  } catch (err) {
    res.status(500).json({ error: "Failed to update jadwal" })
  }
}

const remove = async (req, res) => {
  try {
    const deleted = await Jadwal.destroy({
      where: { id_jadwal: req.params.id },
    })
    if (!deleted) return res.status(404).json({ error: "Jadwal not found" })
    res.json({ message: "Jadwal deleted" })
  } catch (err) {
    res.status(500).json({ error: "Failed to delete jadwal" })
  }
}

module.exports = {
  getAll,
  getById,
  getSeatsForSchedule,
  create,
  update,
  remove,
}
