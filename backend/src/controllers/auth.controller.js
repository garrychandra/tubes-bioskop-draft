const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const register = async (req, res) => {
  const { nama, email, password } = req.body;
  if (!nama || !email || !password)
    return res.status(400).json({ error: 'nama, email and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email already taken' });
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({ nama, email, password: hash, role: 'User' });
    const token = jwt.sign({ id: user.id_user }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.status(201).json({ user: { id_user: user.id_user, nama: user.nama, email: user.email, role: user.role }, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.role === 'Banned') return res.status(403).json({ error: 'Your account has been banned due to policy violations.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id_user }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    // Check for fraud warning
    const { Op } = require('sequelize');
    const { Tiket, Transaksi, Jadwal } = require('../models');
    
    // Check frauds for this current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    
    const fraudCount = await Tiket.count({
      where: { status_tiket: 'fraud' },
      include: [
        { model: Transaksi, where: { id_user: user.id_user }, required: true },
        { model: Jadwal, where: { jam_tayang: { [Op.gte]: startOfMonth } }, required: true }
      ]
    });

    const response = { user: { id_user: user.id_user, nama: user.nama, email: user.email, role: user.role }, token };
    if (fraudCount === 3) {
      response.fraudWarning = "You currently have 3 unused (fraud) tickets this month. One more will result in an account ban.";
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

const getMe = async (req, res) => {
  res.json({ user: req.user });
};

const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword and newPassword are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await User.findByPk(req.user.id_user);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Incorrect old password' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to change password' });
  }
};

const resetPassword = async (req, res) => {
  try {
    // For demo purposes, we allow resetting password just by knowing the email.
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ error: 'email and newPassword are required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = { register, login, getMe, changePassword, resetPassword };
