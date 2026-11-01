// Run from backend: pnpm check:vnpay
// Uses a disposable database on the configured MongoDB server.
require("dotenv/config");
const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {}
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const { App } = require("../dist/app");
const { User } = require("../dist/modules/user/user.model");
const { Wallet } = require("../dist/modules/wallet/wallet.model");
const { WalletPayment } = require("../dist/modules/wallet/wallet-payment.model");

function signParameters(parameters, secret) {
  const data = Object.keys(parameters)
    .filter((key) => key.startsWith("vnp_") && key !== "vnp_SecureHash")
    .sort()
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(parameters[key]).replace(/%20/g, "+")}`,
    )
    .join("&");
  return {
    ...parameters,
    vnp_SecureHash: crypto.createHmac("sha512", secret).update(data).digest("hex"),
  };
}

async function main() {
  const dbName = `cz_vnpay_check_${crypto.randomUUID().slice(0, 18)}`;
  const previousConfig = {
    VNPAY_TMN_CODE: process.env.VNPAY_TMN_CODE,
    VNPAY_HASH_SECRET: process.env.VNPAY_HASH_SECRET,
    VNPAY_RETURN_URL: process.env.VNPAY_RETURN_URL,
  };
  let server;
  try {
    process.env.VNPAY_TMN_CODE = "CHECK123";
    process.env.VNPAY_HASH_SECRET = crypto.randomBytes(32).toString("hex");
    process.env.VNPAY_RETURN_URL = "http://localhost:5173/customer/wallet";
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db", {
      dbName,
      serverSelectionTimeoutMS: 5000,
    });
    await Promise.all([User.init(), Wallet.init(), WalletPayment.init()]);
    server = new App().app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;

    async function request(path, method = "GET", body, token) {
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return response.json();
    }

    const customer = await User.create({
      name: "VNPay customer",
      email: "vnpay-customer@check.invalid",
      password: "CheckPassword123",
      role: "customer",
    });
    const staff = await User.create({
      name: "VNPay staff",
      email: "vnpay-staff@check.invalid",
      password: "CheckPassword123",
      role: "staff",
    });
    const customerLogin = await request("/auth/login", "POST", {
      email: "vnpay-customer@check.invalid",
      password: "CheckPassword123",
    });
    assert.equal(customerLogin.success, true, customerLogin.message);
    const customerToken = customerLogin.data.accessToken;
    const staffLogin = await request("/auth/login", "POST", {
      email: "vnpay-staff@check.invalid",
      password: "CheckPassword123",
    });
    assert.equal(staffLogin.success, true, staffLogin.message);
    const staffToken = staffLogin.data.accessToken;

    assert.equal(
      (await request("/wallet/topups/vnpay", "POST", { amount: 150000 }, customerToken)).success,
      false,
    );
    const started = await request(
      "/wallet/topups/vnpay",
      "POST",
      { amount: 200000 },
      customerToken,
    );
    assert.equal(started.success, true, started.message);
    const payment = started.data;
    assert.equal(payment.amount, 200000);
    const paymentUrl = new URL(payment.paymentUrl);
    assert.equal(paymentUrl.hostname, "sandbox.vnpayment.vn");
    assert.equal(paymentUrl.searchParams.get("vnp_Amount"), "20000000");
    assert.equal(paymentUrl.searchParams.get("vnp_TxnRef"), payment.referenceCode);
    assert.equal(paymentUrl.searchParams.get("vnp_SecureHash").length, 128);

    const initialWallet = await request("/wallet", "GET", undefined, customerToken);
    assert.equal(initialWallet.data.balance, 0);
    assert.equal(initialWallet.data.transactions[0].status, "pending");
    assert.equal(initialWallet.data.transactions[0].gateway, "vnpay");

    const pending = await request("/wallet/topups/pending", "GET", undefined, staffToken);
    assert.equal(
      pending.data.some((item) => item.transaction.referenceCode === payment.referenceCode),
      false,
      "Pending VNPay transactions must not appear in the staff review queue",
    );
    const walletRecord = await Wallet.findOne({ userId: customer._id });
    const ledgerEntry = walletRecord.transactions.find(
      (item) => item.referenceCode === payment.referenceCode,
    );
    assert.ok(ledgerEntry);
    const manualReview = await request(
      `/wallet/topups/${ledgerEntry._id}`,
      "PATCH",
      { status: "success" },
      staffToken,
    );
    assert.equal(manualReview.success, false);
    assert.equal((await Wallet.findOne({ userId: customer._id })).balance, 0);

    const date = new Date();
    const payDate = new Date(date.getTime() + 7 * 60 * 60 * 1000)
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const callback = signParameters(
      {
        vnp_TmnCode: "CHECK123",
        vnp_TxnRef: payment.referenceCode,
        vnp_Amount: "20000000",
        vnp_CurrCode: "VND",
        vnp_ResponseCode: "00",
        vnp_TransactionStatus: "00",
        vnp_TransactionNo: "CHECK-TXN-1",
        vnp_BankCode: "NCB",
        vnp_PayDate: payDate,
      },
      process.env.VNPAY_HASH_SECRET,
    );
    const ipnPath = (params) => `/public/vnpay/ipn?${new URLSearchParams(params).toString()}`;
    const invalidSignature = { ...callback, vnp_SecureHash: "0".repeat(128) };
    assert.equal(
      (await request(ipnPath(invalidSignature))).RspCode,
      "97",
      "IPN with an invalid checksum must be rejected",
    );
    const mismatchedAmount = signParameters(
      { ...callback, vnp_Amount: "20000001", vnp_SecureHash: undefined },
      process.env.VNPAY_HASH_SECRET,
    );
    assert.equal((await request(ipnPath(mismatchedAmount))).RspCode, "04");

    const callbacks = await Promise.all(
      Array.from({ length: 3 }, () => request(ipnPath(callback))),
    );
    assert.ok(callbacks.every((result) => result.RspCode === "00"));
    const settledWallet = await request("/wallet", "GET", undefined, customerToken);
    assert.equal(settledWallet.data.balance, 200000);
    assert.equal(settledWallet.data.transactions[0].status, "success");
    assert.equal(settledWallet.data.transactions[0].balanceAfter, 200000);

    const status = await request(
      `/wallet/topups/vnpay/${payment.referenceCode}`,
      "GET",
      undefined,
      customerToken,
    );
    assert.equal(status.data.status, "success");
    assert.equal(status.data.transactionNo, "CHECK-TXN-1");

    assert.equal((await Wallet.findOne({ userId: customer._id })).balance, 200000);

    const otherStatus = await request(
      `/wallet/topups/vnpay/${payment.referenceCode}`,
      "GET",
      undefined,
      staffToken,
    );
    assert.equal(otherStatus.success, false, "Only the wallet owner may inspect payment status");
    console.log("PASS: VNPay URL signing, IPN checksum, amount validation, idempotency and wallet ledger");
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    if (mongoose.connection.readyState) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    for (const [key, value] of Object.entries(previousConfig)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
