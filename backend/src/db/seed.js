require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, User, Bioskop, Studio, Kursi, Film, Jadwal, Fnb, Rating } = require('../models');

async function seed() {
  const t = await sequelize.transaction();
  try {
    const existing = await Bioskop.count({ transaction: t });
    if (existing > 0) {
      await t.rollback();
      console.log('Database already seeded — skipping.');
      return;
    }

    console.log('Seeding database...');

    // Users
    const adminHash = await bcrypt.hash('admin123', 12);
    const userHash = await bcrypt.hash('user123', 12);
    const admin = await User.create({ nama: 'admin', email: 'admin@cinema.com', password: adminHash, role: 'Admin' }, { transaction: t });
    const user = await User.create({ nama: 'johndoe', email: 'john@example.com', password: userHash, role: 'User' }, { transaction: t });

    // Bioskop
    const bioskop1 = await Bioskop.create({
      nama_bioskop: 'CineMax Grand',
      lokasi: 'Mall Grand Indonesia, Jakarta Pusat',
      image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800',
    }, { transaction: t });
    const bioskop2 = await Bioskop.create({
      nama_bioskop: 'StarPlex Cinema',
      lokasi: 'Mall of Indonesia, Jakarta Utara',
      image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
    }, { transaction: t });

    // Studios
    const studio1 = await Studio.create({ nama_studio: 'Studio 1', kapasitas: 80, id_bioskop: bioskop1.id_bioskop }, { transaction: t });
    const studio2 = await Studio.create({ nama_studio: 'Studio 2 VIP', kapasitas: 48, id_bioskop: bioskop1.id_bioskop }, { transaction: t });
    const studio3 = await Studio.create({ nama_studio: 'Theater A', kapasitas: 80, id_bioskop: bioskop2.id_bioskop }, { transaction: t });
    const studio4 = await Studio.create({ nama_studio: 'Theater B IMAX', kapasitas: 84, id_bioskop: bioskop2.id_bioskop }, { transaction: t });

    // Generate kursi for each studio
    async function generateKursi(studioId, numRows, numCols) {
      const labels = 'ABCDEFGHIJKLMNOP'.slice(0, numRows).split('');
      const seats = [];
      for (const row of labels) {
        for (let col = 1; col <= numCols; col++) {
          seats.push({ nomor_kursi: `${row}${col}`, id_studio: studioId });
        }
      }
      await Kursi.bulkCreate(seats, { transaction: t });
    }

    await generateKursi(studio1.id_studio, 8, 10);
    await generateKursi(studio2.id_studio, 6, 8);
    await generateKursi(studio3.id_studio, 8, 10);
    await generateKursi(studio4.id_studio, 7, 12);

    // Film
    const filmData = [
      { judul: 'Avengers: Secret Wars', genre: 'Action, Sci-Fi', durasi: 180, avg_rating: 8.5, status: 'now_showing', poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400' },
      { judul: 'The Grand Illusion', genre: 'Drama, Thriller', durasi: 135, avg_rating: 7.8, status: 'now_showing', poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400' },
      { judul: 'Nusantara Rising', genre: 'Action, Adventure', durasi: 150, avg_rating: 8.1, status: 'now_showing', poster_url: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400' },
      { judul: 'Eternal Echoes', genre: 'Romance, Drama', durasi: 120, avg_rating: 7.2, status: 'coming_soon', poster_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400' },
      { judul: 'Shadow Protocol', genre: 'Spy, Action', durasi: 145, avg_rating: 8.0, status: 'now_showing', poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400' },
    ];

    const films = await Film.bulkCreate(filmData.map(f => ({
      judul: f.judul,
      deskripsi: `Film ${f.genre} epik yang wajib ditonton.`,
      poster_url: f.poster_url,
      durasi: f.durasi,
      genre: f.genre,
      avg_rating: f.avg_rating,
      status: f.status,
      release_date: new Date(),
    })), { transaction: t });

    // Jadwal
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const studios = [studio1, studio2, studio3, studio4];
    const showtimeHours = [10, 13, 16, 19];
    const jadwalBulk = [];

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const day = new Date(today.getTime() + dayOffset * 86400000);
      for (const studio of studios) {
        const showingFilms = films.slice(0, 4);
        for (let s = 0; s < Math.min(showtimeHours.length, showingFilms.length); s++) {
          const film = showingFilms[s % showingFilms.length];
          const start = new Date(day);
          start.setHours(showtimeHours[s], 0, 0, 0);
          const end = new Date(start.getTime() + film.durasi * 60000);
          jadwalBulk.push({
            jam_tayang: start,
            jam_selesai: end,
            harga_tiket: 50000,
            id_studio: studio.id_studio,
            id_film: film.id_film,
          });
        }
      }
    }
    await Jadwal.bulkCreate(jadwalBulk, { transaction: t });

    // FnB items
    await Fnb.bulkCreate([
      { nama_item: 'Popcorn Large', harga: 35000 },
      { nama_item: 'Popcorn Medium', harga: 25000 },
      { nama_item: 'Coca-Cola', harga: 15000 },
      { nama_item: 'Sprite', harga: 15000 },
      { nama_item: 'Nachos', harga: 30000 },
      { nama_item: 'Hot Dog', harga: 28000 },
      { nama_item: 'Mineral Water', harga: 10000 },
    ], { transaction: t });

    // Sample ratings from johndoe
    const ratingData = [
      { nilai_rating: 9, komentar: 'Film keren banget!', id_user: user.id_user, id_film: films[0].id_film },
      { nilai_rating: 8, komentar: 'Ceritanya seru!', id_user: user.id_user, id_film: films[1].id_film },
      { nilai_rating: 7, komentar: 'Lumayan bagus.', id_user: user.id_user, id_film: films[2].id_film },
    ];
    await Rating.bulkCreate(ratingData, { transaction: t });

    await t.commit();
    console.log('Seeding completed successfully.');
    console.log('Admin: admin@cinema.com / admin123');
    console.log('User: john@example.com / user123');
  } catch (err) {
    await t.rollback();
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();

