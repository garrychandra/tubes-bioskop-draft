require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    // Skip seed if data already exists
    const existing = await client.query('SELECT COUNT(*) FROM cinemas');
    if (parseInt(existing.rows[0].count) > 0) {
      console.log('Database already seeded — skipping.');
      return;
    }

    console.log('Seeding database...');
    await client.query('BEGIN');

    // Admin user
    const adminHash = await bcrypt.hash('admin123', 12);
    const userHash = await bcrypt.hash('user123', 12);

    const adminId = uuidv4();
    const userId = uuidv4();

    await client.query(`
      INSERT INTO users (id, username, email, password_hash, role) VALUES
      ($1, 'admin', 'admin@cinema.com', $2, 'admin'),
      ($3, 'johndoe', 'john@example.com', $4, 'user')
      ON CONFLICT DO NOTHING
    `, [adminId, adminHash, userId, userHash]);

    // Cinemas
    const cinema1Id = uuidv4();
    const cinema2Id = uuidv4();
    await client.query(`
      INSERT INTO cinemas (id, name, location, image_url) VALUES
      ($1, 'CineMax Grand', 'Mall Grand Indonesia, Jakarta Pusat', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800'),
      ($2, 'StarPlex Cinema', 'Mall of Indonesia, Jakarta Utara', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800')
    `, [cinema1Id, cinema2Id]);

    // Halls — Cinema 1
    const hall1Id = uuidv4();
    const hall2Id = uuidv4();
    await client.query(`
      INSERT INTO halls (id, cinema_id, name, rows, cols) VALUES
      ($1, $3, 'Studio 1', 8, 10),
      ($2, $3, 'Studio 2 VIP', 6, 8)
    `, [hall1Id, hall2Id, cinema1Id]);

    // Halls — Cinema 2
    const hall3Id = uuidv4();
    const hall4Id = uuidv4();
    await client.query(`
      INSERT INTO halls (id, cinema_id, name, rows, cols) VALUES
      ($1, $3, 'Theater A', 8, 10),
      ($2, $3, 'Theater B IMAX', 7, 12)
    `, [hall3Id, hall4Id, cinema2Id]);

    // Helper: generate seats for a hall
    async function generateSeats(hallId, numRows, numCols) {
      const labels = 'ABCDEFGHIJKLMNOP'.slice(0, numRows).split('');
      const vipRows = labels.slice(-2); // last 2 rows are VIP
      for (const row of labels) {
        for (let col = 1; col <= numCols; col++) {
          const type = vipRows.includes(row) ? 'vip' : 'regular';
          await client.query(`
            INSERT INTO seats (id, hall_id, row_label, col_number, seat_type)
            VALUES ($1, $2, $3, $4, $5)
          `, [uuidv4(), hallId, row, col, type]);
        }
      }
    }

    await generateSeats(hall1Id, 8, 10);
    await generateSeats(hall2Id, 6, 8);
    await generateSeats(hall3Id, 8, 10);
    await generateSeats(hall4Id, 7, 12);

    // Movies
    const movies = [
      { title: 'Avengers: Secret Wars', genre: 'Action, Sci-Fi', duration: 180, rating: 8.5, status: 'now_showing', poster: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400' },
      { title: 'The Grand Illusion', genre: 'Drama, Thriller', duration: 135, rating: 7.8, status: 'now_showing', poster: 'https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400' },
      { title: 'Nusantara Rising', genre: 'Action, Adventure', duration: 150, rating: 8.1, status: 'now_showing', poster: 'https://images.unsplash.com/photo-1574267432553-4b4628081c31?w=400' },
      { title: 'Eternal Echoes', genre: 'Romance, Drama', duration: 120, rating: 7.2, status: 'coming_soon', poster: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400' },
      { title: 'Shadow Protocol', genre: 'Spy, Action', duration: 145, rating: 8.0, status: 'now_showing', poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400' },
    ];

    const movieIds = [];
    for (const m of movies) {
      const mid = uuidv4();
      movieIds.push(mid);
      await client.query(`
        INSERT INTO movies (id, title, description, poster_url, genre, duration_min, rating, release_date, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
      `, [mid, m.title, `An epic ${m.genre} film that will blow your mind.`, m.poster, m.genre, m.duration, m.rating, m.status]);
    }

    // Schedules — generate for today, tomorrow, and day after for both cinemas
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hallsConfig = [
      { hallId: hall1Id, label: 'CineMax Studio 1' },
      { hallId: hall2Id, label: 'CineMax Studio 2 VIP' },
      { hallId: hall3Id, label: 'StarPlex Theater A' },
      { hallId: hall4Id, label: 'StarPlex Theater B IMAX' },
    ];

    const showtimeHours = [10, 13, 16, 19]; // 10am, 1pm, 4pm, 7pm

    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const day = new Date(today.getTime() + dayOffset * 86400000);
      for (const hall of hallsConfig) {
        // Pick 2-3 movies per hall per day
        const hallMovies = movieIds.filter((_, i) => movies[i].status === 'now_showing');
        for (let s = 0; s < Math.min(showtimeHours.length, hallMovies.length); s++) {
          const mid = hallMovies[s % hallMovies.length];
          const movieDuration = movies[movieIds.indexOf(mid)].duration;
          const start = new Date(day);
          start.setHours(showtimeHours[s], 0, 0, 0);
          const end = new Date(start.getTime() + movieDuration * 60000);
          await client.query(`
            INSERT INTO schedules (id, movie_id, hall_id, start_time, end_time, price_regular, price_vip, price_couple)
            VALUES ($1, $2, $3, $4, $5, 50000, 100000, 150000)
          `, [uuidv4(), mid, hall.hallId, start, end]);
        }
      }
    }

    await client.query('COMMIT');
    console.log('Seeding completed successfully.');
    console.log('Admin: admin@cinema.com / admin123');
    console.log('User: john@example.com / user123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
