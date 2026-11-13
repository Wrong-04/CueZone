require("dotenv/config");
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const { BookingService } = require("../dist/modules/booking/booking.service");
const { Booking } = require("../dist/modules/booking/booking.model");
const { BookingPaymentReceipt } = require("../dist/modules/booking/booking-payment.model");
const { Invoice } = require("../dist/modules/invoice/invoice.model");
const { Notification } = require("../dist/modules/notification/notification.model");
const { PricingTier } = require("../dist/modules/pricing/pricing.model");
const { SessionService } = require("../dist/modules/session/session.service");
const { Table } = require("../dist/modules/table/table.model");
const { User } = require("../dist/modules/user/user.model");
const { Wallet } = require("../dist/modules/wallet/wallet.model");

async function main() {
  const dbName = `cz_check_booking_deposit_${randomUUID().slice(0, 12)}`;
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 8000,
    });
    await Promise.all([
      Booking.init(),
      BookingPaymentReceipt.init(),
      Invoice.init(),
      Notification.init(),
      PricingTier.init(),
      Table.init(),
      User.init(),
      Wallet.init(),
    ]);

    process.env.SEPAY_WEBHOOK_KEY = "test-sepay-webhook-key-000000000";
    process.env.SEPAY_BANK_CODE = "VCB";
    process.env.SEPAY_ACCOUNT_NUMBER = "1234567890";
    process.env.SEPAY_ACCOUNT_NAME = "CUEZONE TEST";

    const table = await Table.create({
      code: `DEPOSIT-${randomUUID().slice(0, 8)}`,
      name: "Deposit POS test table",
      type: "carom",
      area: "Test",
      pricePerHour: 50000,
      status: "available",
      isActive: true,
    });
    const date = new Date(Date.now() + 7 * 3600000 + 24 * 3600000)
      .toISOString()
      .slice(0, 10);
    const bookingService = new BookingService();
    const booking = await bookingService.create(
      {
        customerName: "Deposit POS test",
        phone: "0912345678",
        tableId: String(table._id),
        date,
        time: "10:00",
        duration: 2,
        preOrderItems: [],
      },
      undefined,
      "approved",
      true,
    );
    assert.equal(booking.paymentStatus, "awaiting_payment");
    assert.equal(booking.deposit, 50000);

    const paymentReference = booking.payment.reference;
    const bankPaidAt = new Date(Date.now() + 7 * 3600000)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");
    await bookingService.handleSepayWebhook(`Apikey ${process.env.SEPAY_WEBHOOK_KEY}`, {
      id: String(Date.now()),
      transferType: "in",
      accountNumber: "1234567890",
      transferAmount: booking.deposit,
      transactionDate: bankPaidAt,
      content: paymentReference,
    });

    const paidBooking = await Booking.findOne({ paymentReference });
    assert.equal(paidBooking.paymentStatus, "paid");
    assert.equal(paidBooking.status, "approved");

    const sessionService = new SessionService();
    const openedTable = await sessionService.open(String(table._id), {
      bookingId: String(paidBooking._id),
    });
    assert.equal(openedTable.currentSession.deposit, booking.deposit);

    const sessionId = openedTable.currentSession.sessionId;
    await Table.updateOne(
      { _id: table._id, "currentSession.sessionId": sessionId },
      { $set: { "currentSession.startedAt": Date.now() - 90 * 60 * 1000 } },
    );
    const receipt = await sessionService.checkout(String(table._id), {
      sessionId,
      paymentMethod: "cash",
      discountPercent: 0,
    });
    assert.equal(receipt.deposit, booking.deposit);
    assert.equal(receipt.subtotal, 75000);
    assert.equal(receipt.finalAmount, receipt.subtotal - receipt.deposit);

    const savedInvoice = await Invoice.findOne({ sessionId, tableId: table._id });
    assert.equal(savedInvoice.receipt.deposit, booking.deposit);
    assert.equal(savedInvoice.receipt.finalAmount, receipt.finalAmount);

    const unpaidTable = await Table.create({
      code: `UNPAID-${randomUUID().slice(0, 8)}`,
      name: "Unpaid deposit test table",
      type: "carom",
      area: "Test",
      pricePerHour: 50000,
      status: "available",
      isActive: true,
    });
    const unpaidBooking = await bookingService.create(
      {
        customerName: "Unpaid deposit test",
        phone: "0912345678",
        tableId: String(unpaidTable._id),
        date,
        time: "12:00",
        duration: 2,
        deposit: 50000,
        preOrderItems: [],
      },
    );
    assert.equal(unpaidBooking.paymentStatus, "not_required");
    const unpaidCheckIn = await sessionService.open(String(unpaidTable._id), {
      bookingId: String(unpaidBooking._id),
    });
    assert.equal(unpaidCheckIn.currentSession.deposit, 0);

    console.log("SePay booking deposit POS checks passed.");
  } finally {
    if (mongoose.connection.readyState) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
