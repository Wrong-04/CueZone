require("dotenv/config");
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { randomUUID } = require("node:crypto");
const { App } = require("../dist/app");
const { Booking } = require("../dist/modules/booking/booking.model");
const { BookingPaymentReceipt } = require("../dist/modules/booking/booking-payment.model");
const { Notification } = require("../dist/modules/notification/notification.model");
const { Table } = require("../dist/modules/table/table.model");
const { User } = require("../dist/modules/user/user.model");

async function main() {
  const dbName = `cz_check_booking_cancel_${randomUUID().slice(0, 12)}`;
  let server;
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 8000,
    });
    await Promise.all([
      Booking.init(),
      BookingPaymentReceipt.init(),
      Notification.init(),
      Table.init(),
      User.init(),
    ]);

    process.env.SEPAY_WEBHOOK_KEY = "test-sepay-webhook-key-000000000";
    process.env.SEPAY_BANK_CODE = "VCB";
    process.env.SEPAY_ACCOUNT_NUMBER = "1234567890";
    process.env.SEPAY_ACCOUNT_NAME = "CUEZONE TEST";

    server = new App().app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const request = async (path, method = "GET", body, headers = {}) => {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { ...(await response.json()), httpStatus: response.status };
    };

    const table = await Table.create({
      code: `CANCEL-${randomUUID().slice(0, 8)}`,
      name: "Cancellation test table",
      type: "carom",
      area: "Test",
      pricePerHour: 50000,
      status: "available",
      isActive: true,
    });
    const date = new Date(Date.now() + 7 * 3600000 + 24 * 3600000)
      .toISOString()
      .slice(0, 10);
    const bookingInput = {
      customerName: "Cancellation test",
      phone: "0912345678",
      tableId: String(table._id),
      date,
      time: "10:00",
      duration: 2,
      deposit: 0,
      preOrderItems: [],
    };

    const created = await request("/public/bookings", "POST", bookingInput);
    assert.equal(created.httpStatus, 201, created.message);
    const firstReference = created.data.payment.reference;
    assert.equal(created.data.paymentStatus, "awaiting_payment");

    const cancelled = await request(
      `/public/bookings/payment/${firstReference}/cancel`,
      "POST",
    );
    assert.equal(cancelled.httpStatus, 200, cancelled.message);
    assert.equal(cancelled.data.status, "cancelled");
    assert.equal((await Booking.findOne({ paymentReference: firstReference })).paymentStatus, "cancelled");

    const repeatedCancellation = await request(
      `/public/bookings/payment/${firstReference}/cancel`,
      "POST",
    );
    assert.equal(repeatedCancellation.httpStatus, 200);
    assert.equal(repeatedCancellation.data.status, "cancelled");

    const availability = await request(
      `/public/booking-availability?date=${date}&time=10%3A00&duration=2&type=carom`,
    );
    assert.equal(availability.httpStatus, 200);
    assert.ok(availability.data.some((availableTable) => availableTable._id === String(table._id)));

    const webhook = (reference, id) => ({
      id,
      transferType: "in",
      accountNumber: "1234567890",
      transferAmount: 50000,
      transactionDate: new Date(Date.now() + 7 * 3600000)
        .toISOString()
        .slice(0, 19)
        .replace("T", " "),
      content: reference,
    });
    const sepayHeaders = {
      Authorization: `Apikey ${process.env.SEPAY_WEBHOOK_KEY}`,
    };
    const lateTransfer = await request(
      "/public/sepay/webhook",
      "POST",
      webhook(firstReference, String(Date.now())),
      sepayHeaders,
    );
    assert.equal(lateTransfer.httpStatus, 200, lateTransfer.message);
    assert.equal(
      (await Booking.findOne({ paymentReference: firstReference })).paymentStatus,
      "refund_required",
    );

    const paidBooking = await request("/public/bookings", "POST", bookingInput);
    assert.equal(paidBooking.httpStatus, 201, paidBooking.message);
    const paidReference = paidBooking.data.payment.reference;
    const paid = await request(
      "/public/sepay/webhook",
      "POST",
      webhook(paidReference, `9${Date.now()}`),
      sepayHeaders,
    );
    assert.equal(paid.httpStatus, 200, paid.message);
    assert.equal((await Booking.findOne({ paymentReference: paidReference })).paymentStatus, "paid");

    const cancelPaid = await request(
      `/public/bookings/payment/${paidReference}/cancel`,
      "POST",
    );
    assert.equal(cancelPaid.httpStatus, 409);
    assert.equal((await Booking.findOne({ paymentReference: paidReference })).paymentStatus, "paid");

    console.log("Booking deposit cancellation checks passed.");
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
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
