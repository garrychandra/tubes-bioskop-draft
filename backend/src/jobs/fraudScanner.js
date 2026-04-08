const { Op } = require('sequelize');
const { Tiket, Jadwal, Transaksi, User } = require('../models');

const runFraudScanner = async () => {
  try {
    console.log('[No-Show Scanner] Starting scan for unredeemed tickets past showtime...');

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
      console.log('[No-Show Scanner] No new past-due active tickets found.');
      return;
    }

    // Mark found tickets as 'fraud' (technical status = no-show)
    const ticketIds = pastDueTickets.map(t => t.id_tiket);
    await Tiket.update({ status_tiket: 'fraud' }, { where: { id_tiket: ticketIds } });

    // Mark parent transactions as 'fraud' if entirely unredeemed (still 'paid', no 'used' tickets)
    const transactionIds = [...new Set(pastDueTickets.map(t => t.id_transaksi))];
    await Transaksi.update({ status: 'fraud' }, { where: { id_transaksi: transactionIds, status: 'paid' } });

    console.log(`[No-Show Scanner] Marked ${ticketIds.length} no-show tickets across ${transactionIds.length} orders.`);

    // Grant a discount to each affected user (if they don't already have one pending)
    const affectedUserIds = [...new Set(pastDueTickets.map(t => t.Transaksi.id_user))];

    for (const userId of affectedUserIds) {
      const user = await User.findByPk(userId);
      if (user && !user.pending_discount) {
        await user.update({ pending_discount: true });
        console.log(`[No-Show Scanner] Pending discount granted to user ${userId}.`);
      }
    }

    console.log('[No-Show Scanner] Scan completed.');
  } catch (error) {
    console.error('[No-Show Scanner] Error during scan:', error);
  }
};

const startFraudScanner = () => {
  // Run immediately on start, then every 15 minutes
  runFraudScanner();
  setInterval(runFraudScanner, 15 * 60 * 1000); // 15 mins
};

module.exports = { startFraudScanner, runFraudScanner };
