require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./pool');

const schema = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(80) UNIQUE NOT NULL,
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cinemas
CREATE TABLE IF NOT EXISTS cinemas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Halls (screens inside a cinema)
CREATE TABLE IF NOT EXISTS halls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cinema_id UUID NOT NULL REFERENCES cinemas(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  rows INT NOT NULL DEFAULT 8,
  cols INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seats
CREATE TABLE IF NOT EXISTS seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
  row_label CHAR(1) NOT NULL,
  col_number INT NOT NULL,
  seat_type VARCHAR(20) NOT NULL DEFAULT 'regular', -- 'regular' | 'vip' | 'couple'
  UNIQUE(hall_id, row_label, col_number)
);

-- Movies
CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  genre VARCHAR(100),
  duration_min INT NOT NULL DEFAULT 120,
  rating DECIMAL(3,1) DEFAULT 0,
  language VARCHAR(50) DEFAULT 'Indonesian',
  release_date DATE,
  status VARCHAR(20) DEFAULT 'now_showing', -- 'now_showing' | 'coming_soon' | 'ended'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  price_regular DECIMAL(12,2) NOT NULL DEFAULT 50000,
  price_vip DECIMAL(12,2) NOT NULL DEFAULT 100000,
  price_couple DECIMAL(12,2) NOT NULL DEFAULT 150000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seat locks (temporary hold during checkout)
CREATE TABLE IF NOT EXISTS seat_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seat_id UUID NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE(seat_id, schedule_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  schedule_id UUID NOT NULL REFERENCES schedules(id),
  total_price DECIMAL(12,2) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'cancelled' | 'used'
  barcode_data TEXT UNIQUE NOT NULL,
  payment_method VARCHAR(50),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order items (each reserved seat)
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES seats(id),
  price DECIMAL(12,2) NOT NULL,
  UNIQUE(order_id, seat_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_schedules_movie ON schedules(movie_id);
CREATE INDEX IF NOT EXISTS idx_schedules_hall ON schedules(hall_id);
CREATE INDEX IF NOT EXISTS idx_schedules_start ON schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_seat_locks_schedule ON seat_locks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expires ON seat_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seat ON order_items(seat_id);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');
    await client.query(schema);
    console.log('Migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
