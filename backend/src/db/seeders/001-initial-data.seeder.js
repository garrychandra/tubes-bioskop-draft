'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const [existingRows] = await queryInterface.sequelize.query(
        'SELECT COUNT(*)::int AS count FROM bioskop;',
        { transaction }
      );

      if (existingRows[0]?.count > 0) {
        return;
      }

      const adminId = uuidv4();
      const userId = uuidv4();
      const bioskop1Id = uuidv4();
      const bioskop2Id = uuidv4();
      const studio1Id = uuidv4();
      const studio2Id = uuidv4();
      const studio3Id = uuidv4();
      const studio4Id = uuidv4();

      const adminHash = await bcrypt.hash('admin123', 12);
      const userHash = await bcrypt.hash('user123', 12);
      const kasirHash = await bcrypt.hash('admin123', 12);

      await queryInterface.bulkInsert(
        'users',
        [
          {
            id_user: adminId,
            nama: 'admin',
            email: 'admin@cinema.com',
            password: adminHash,
            role: 'Admin',
            pending_discount: false,
          },
          {
            id_user: userId,
            nama: 'johndoe',
            email: 'john@example.com',
            password: userHash,
            role: 'User',
            pending_discount: true,
          },
          {
            id_user: uuidv4(),
            nama: 'kasir',
            email: 'qwerty@cinema.com',
            password: kasirHash,
            role: 'kasir_offline',
            pending_discount: false,
          }
        ],
        { transaction }
      );

      await queryInterface.bulkInsert(
        'bioskop',
        [
          {
            id_bioskop: bioskop1Id,
            nama_bioskop: 'CineMax Grand',
            lokasi: 'Mall Grand Indonesia, Jakarta Pusat',
            image_url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800',
          },
          {
            id_bioskop: bioskop2Id,
            nama_bioskop: 'StarPlex Cinema',
            lokasi: 'Mall of Indonesia, Jakarta Utara',
            image_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800',
          },
        ],
        { transaction }
      );

      await queryInterface.bulkInsert(
        'studio',
        [
          { id_studio: studio1Id, nama_studio: 'Studio 1', kapasitas: 80, id_bioskop: bioskop1Id },
          { id_studio: studio2Id, nama_studio: 'Studio 2 VIP', kapasitas: 48, id_bioskop: bioskop1Id },
          { id_studio: studio3Id, nama_studio: 'Theater A', kapasitas: 80, id_bioskop: bioskop2Id },
          { id_studio: studio4Id, nama_studio: 'Theater B IMAX', kapasitas: 84, id_bioskop: bioskop2Id },
        ],
        { transaction }
      );

      const seats = [];
      function pushSeats(studioId, numRows, numCols) {
        const labels = 'ABCDEFGHIJKLMNOP'.slice(0, numRows).split('');
        for (const row of labels) {
          for (let col = 1; col <= numCols; col += 1) {
            seats.push({
              id_kursi: uuidv4(),
              nomor_kursi: `${row}${col}`,
              id_studio: studioId,
            });
          }
        }
      }

      pushSeats(studio1Id, 8, 10);
      pushSeats(studio2Id, 6, 8);
      pushSeats(studio3Id, 8, 10);
      pushSeats(studio4Id, 7, 12);

      await queryInterface.bulkInsert('kursi', seats, { transaction });

      const filmIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()];
      const filmData = [
        {
          id_film: filmIds[0],
          judul: 'Avengers: Secret Wars',
          deskripsi: 'Film Action, Sci-Fi epik yang wajib ditonton.',
          poster_url: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400',
          durasi: 180,
          genre: 'Action, Sci-Fi',
          avg_rating: 8.5,
          status: 'now_showing',
          release_date: new Date(),
        },
        {
          id_film: filmIds[1],
          judul: 'The Grand Illusion',
          deskripsi: 'Film Drama, Thriller epik yang wajib ditonton.',
          poster_url: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400',
          durasi: 135,
          genre: 'Drama, Thriller',
          avg_rating: 7.8,
          status: 'now_showing',
          release_date: new Date(),
        },
        {
          id_film: filmIds[2],
          judul: 'Nusantara Rising',
          deskripsi: 'Film Action, Adventure epik yang wajib ditonton.',
          poster_url: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400',
          durasi: 150,
          genre: 'Action, Adventure',
          avg_rating: 8.1,
          status: 'now_showing',
          release_date: new Date(),
        },
        {
          id_film: filmIds[3],
          judul: 'Eternal Echoes',
          deskripsi: 'Film Romance, Drama epik yang wajib ditonton.',
          poster_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400',
          durasi: 120,
          genre: 'Romance, Drama',
          avg_rating: 7.2,
          status: 'coming_soon',
          release_date: new Date(),
        },
        {
          id_film: filmIds[4],
          judul: 'Shadow Protocol',
          deskripsi: 'Film Spy, Action epik yang wajib ditonton.',
          poster_url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400',
          durasi: 145,
          genre: 'Spy, Action',
          avg_rating: 8.0,
          status: 'now_showing',
          release_date: new Date(),
        },
      ];

      await queryInterface.bulkInsert('film', filmData, { transaction });

      const buildDay = (offset) => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + offset);
        return d;
      };

      // Keep a rolling schedule window so tests still work on following days.
      const scheduleDays = 14;
      const studios = [studio1Id, studio2Id, studio3Id, studio4Id];
      const showtimeHours = [10, 13, 16, 19];
      const showingFilms = filmData.slice(0, 4);
      const jadwalRows = [];

      for (let dayOffset = 0; dayOffset < scheduleDays; dayOffset += 1) {
        const day = buildDay(dayOffset);
        for (const studioId of studios) {
          for (let i = 0; i < Math.min(showtimeHours.length, showingFilms.length); i += 1) {
            const start = new Date(day);
            start.setHours(showtimeHours[i], 0, 0, 0);
            const end = new Date(start.getTime() + showingFilms[i].durasi * 60000);
            jadwalRows.push({
              id_jadwal: uuidv4(),
              jam_tayang: start,
              jam_selesai: end,
              harga_tiket: 50000,
              id_studio: studioId,
              id_film: showingFilms[i].id_film,
            });
          }
        }
      }

      await queryInterface.bulkInsert('jadwal', jadwalRows, { transaction });

      await queryInterface.bulkInsert(
        'fnb',
        [
          { id_item: uuidv4(), nama_item: 'Popcorn Large', harga: 35000 },
          { id_item: uuidv4(), nama_item: 'Popcorn Medium', harga: 25000 },
          { id_item: uuidv4(), nama_item: 'Coca-Cola', harga: 15000 },
          { id_item: uuidv4(), nama_item: 'Sprite', harga: 15000 },
          { id_item: uuidv4(), nama_item: 'Nachos', harga: 30000 },
          { id_item: uuidv4(), nama_item: 'Hot Dog', harga: 28000 },
          { id_item: uuidv4(), nama_item: 'Mineral Water', harga: 10000 },
        ],
        { transaction }
      );

      await queryInterface.bulkInsert(
        'rating',
        [
          {
            id_rating: uuidv4(),
            nilai_rating: 9,
            komentar: 'Film keren banget!',
            id_user: userId,
            id_film: filmIds[0],
          },
          {
            id_rating: uuidv4(),
            nilai_rating: 8,
            komentar: 'Ceritanya seru!',
            id_user: userId,
            id_film: filmIds[1],
          },
          {
            id_rating: uuidv4(),
            nilai_rating: 7,
            komentar: 'Lumayan bagus.',
            id_user: userId,
            id_film: filmIds[2],
          },
        ],
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkDelete('detail_fnb', null, { transaction });
      await queryInterface.bulkDelete('tiket', null, { transaction });
      await queryInterface.bulkDelete('kursi_locks', null, { transaction });
      await queryInterface.bulkDelete('rating', null, { transaction });
      await queryInterface.bulkDelete('jadwal', null, { transaction });
      await queryInterface.bulkDelete('kursi', null, { transaction });
      await queryInterface.bulkDelete('studio', null, { transaction });
      await queryInterface.bulkDelete('fnb', null, { transaction });
      await queryInterface.bulkDelete('film', null, { transaction });
      await queryInterface.bulkDelete('bioskop', null, { transaction });
      await queryInterface.bulkDelete('transaksi', null, { transaction });
      await queryInterface.bulkDelete('users', null, { transaction });
    });
  },
};
