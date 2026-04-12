const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { User } = require('../models');

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ─── Nodemailer transporter ──────────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// ─── Register ────────────────────────────────────────────────────────────────
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

// ─── Login ───────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id_user }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    const response = {
      user: { id_user: user.id_user, nama: user.nama, email: user.email, role: user.role },
      token,
    };

    // No-show discount notification
    if (user.pending_discount) {
      response.noShowNotification = "You had a no-show on a previous visit. A 50% discount has been applied to your next ticket purchase!";
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// ─── Get Me ──────────────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  const user = await User.findByPk(req.user.id_user);
  res.json({
    user: {
      id_user: user.id_user,
      nama: user.nama,
      email: user.email,
      role: user.role,
      pending_discount: user.pending_discount,
    }
  });
};

// ─── Change Password (authenticated) ─────────────────────────────────────────
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

// ─── Forgot Password — Step 1: Send OTP via Gmail ────────────────────────────
// OTP is persisted to the database (reset_otp + reset_otp_expires columns)
// so the flow is stateless across multiple backend replicas.
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    const user = await User.findOne({ where: { email } });
    // Always return success to avoid email enumeration
    if (!user) return res.json({ message: 'If an account with that email exists, a code has been sent.' });

    // Generate 6-digit OTP and persist it to the user's DB row
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await user.update({
      reset_otp: otp,
      reset_otp_expires: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    const transporter = createTransporter();
    await transporter.sendMail({
      from: `"CineMax Cinema" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your CineMax Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #fff; border-radius: 12px; overflow: hidden;">
          <div style="background: #e50914; padding: 24px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">🎬 CineMax</h1>
          </div>
          <div style="padding: 32px;">
            <h2 style="color: #fff; margin-top: 0;">Password Reset Code</h2>
            <p style="color: #aaa;">Hi ${user.nama}, use the code below to reset your password. It expires in 10 minutes.</p>
            <div style="background: #1a1a1a; border: 2px solid #e50914; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #e50914;">${otp}</span>
            </div>
            <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>
      `,
    });

    res.json({ message: 'If an account with that email exists, a code has been sent.' });
  } catch (err) {
    console.error('[Forgot Password]', err);
    res.status(500).json({ error: 'Failed to send reset email. Please try again.' });
  }
};

// ─── Forgot Password — Step 2: Verify OTP ────────────────────────────────────
// Reads OTP from the database instead of an in-memory Map.
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'email and otp are required' });

  try {
    const user = await User.findOne({ where: { email } });
    if (!user || !user.reset_otp) {
      return res.status(400).json({ error: 'No OTP requested for this email.' });
    }
    if (new Date() > user.reset_otp_expires) {
      // Clear the expired OTP
      await user.update({ reset_otp: null, reset_otp_expires: null });
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }
    if (user.reset_otp !== otp.toString()) {
      return res.status(400).json({ error: 'Incorrect OTP code.' });
    }

    // OTP valid — clear it from DB and issue a short-lived reset token
    await user.update({ reset_otp: null, reset_otp_expires: null });
    const resetToken = jwt.sign({ email, purpose: 'password_reset' }, process.env.JWT_SECRET, { expiresIn: '10m' });

    res.json({ message: 'OTP verified.', reset_token: resetToken });
  } catch (err) {
    console.error('[Verify OTP]', err);
    res.status(500).json({ error: 'OTP verification failed.' });
  }
};

// ─── Forgot Password — Step 3: Reset Password with token ─────────────────────
const resetPassword = async (req, res) => {
  const { reset_token, newPassword } = req.body;
  if (!reset_token || !newPassword) return res.status(400).json({ error: 'reset_token and newPassword are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    let payload;
    try {
      payload = jwt.verify(reset_token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Reset token is invalid or expired. Please start over.' });
    }

    if (payload.purpose !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid token purpose.' });
    }

    const user = await User.findOne({ where: { email: payload.email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

module.exports = { register, login, getMe, changePassword, forgotPassword, verifyOtp, resetPassword };
