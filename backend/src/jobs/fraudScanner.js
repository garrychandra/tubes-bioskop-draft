const { Op } = require('sequelize');
const { Tiket, Jadwal, Transaksi, User } = require('../models');

const runFraudScanner = async () => {
  try {
    console.log('[Fraud Scanner] Starting scan for unused tickets past showtime...');
    
    // Find all 'active' tickets attached to a schedule that has already started
    const pastDueTickets = await Tiket.findAll({
      where: {
        status_tiket: 'active'
      },
      include: [
        {
          model: Jadwal,
          where: {
            jam_tayang: { [Op.lt]: new Date() }
          },
          required: true
        },
        {
          model: Transaksi,
          include: [User],
          required: true
        }
      ]
    });

    if (pastDueTickets.length === 0) {
      console.log('[Fraud Scanner] No new past-due active tickets found.');
      return;
    }

    // Step 1: Update found tickets to 'fraud'
    const ticketIds = pastDueTickets.map(t => t.id_tiket);
    await Tiket.update({ status_tiket: 'fraud' }, { where: { id_tiket: ticketIds } });

    console.log(`[Fraud Scanner] Marked ${ticketIds.length} tickets as fraud.`);

    // Step 2: Check monthly limits for affected users
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    // Get unique users affected
    const affectedUserIds = [...new Set(pastDueTickets.map(t => t.Transaksi.id_user))];

    for (const userId of affectedUserIds) {
      const fraudCountThisMonth = await Tiket.count({
        where: { status_tiket: 'fraud' },
        include: [
          { model: Transaksi, where: { id_user: userId }, required: true },
          { model: Jadwal, where: { jam_tayang: { [Op.gte]: startOfMonth } }, required: true }
        ]
      });

      if (fraudCountThisMonth > 4) {
        // Ban user
        await User.update({ role: 'Banned' }, { where: { id_user: userId, role: { [Op.ne]: 'Banned' } } });
        console.log(`[Fraud Scanner] User ${userId} has been Banned (${fraudCountThisMonth} fraud tickets this month).`);
      }
    }
    
    console.log('[Fraud Scanner] Scan completed.');
  } catch (error) {
    console.error('[Fraud Scanner] Error during scan:', error);
  }
};

const startFraudScanner = () => {
  // Run immediately on start, then every 15 minutes
  runFraudScanner();
  setInterval(runFraudScanner, 15 * 60 * 1000); // 15 mins
};

module.exports = { startFraudScanner, runFraudScanner };
