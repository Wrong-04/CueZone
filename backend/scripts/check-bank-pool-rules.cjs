// Run from backend: node scripts/check-bank-pool-rules.cjs

const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const assert = require("node:assert/strict");
const { App } = require("../dist/app");

async function main() {
  let server;
  try {
    server = new App().app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;

    console.log("--- 1. Kiểm tra gọi API công khai /public/bank-pool-rules (SCRUM-858) ---");
    const response = await fetch(`${base}/public/bank-pool-rules`);
    assert.equal(response.status, 200, "API công khai phải trả về HTTP 200");

    const result = await response.json();
    assert.equal(result.success, true);
    assert.ok(result.data, "Phải có trường data trong response");

    console.log("--- 2. Kiểm tra tính toàn vẹn cấu trúc dữ liệu quy định (SCRUM-861) ---");
    const data = result.data;
    assert.ok(data.title.includes("Bank Pool"), "Tiêu đề phải chứa Bank Pool");
    assert.ok(Array.isArray(data.coreRules), "coreRules phải là một mảng");
    assert.equal(data.coreRules.length, 4, "Phải có đủ 4 nguyên tắc cốt lõi");

    for (const rule of data.coreRules) {
      assert.ok(rule.number);
      assert.ok(rule.title);
      assert.ok(rule.content);
    }

    console.log("--- 3. Kiểm tra các tình huống kịch bản sơ đồ 2D (SCRUM-857) ---");
    assert.ok(Array.isArray(data.scenarios2D), "scenarios2D phải là một mảng");
    assert.ok(data.scenarios2D.length >= 4, "Phải có ít nhất 4 kịch bản sơ đồ");

    const crossBank = data.scenarios2D.find((s) => s.id === "cross-bank");
    assert.ok(crossBank, "Phải có kịch bản cross-bank");
    assert.equal(crossBank.isLegal, true);
    assert.equal(crossBank.cushionsCount, 1);
    assert.ok(crossBank.cueBall && crossBank.objectBall && crossBank.targetPocket);

    const straightInFoul = data.scenarios2D.find((s) => s.id === "straight-in-foul");
    assert.ok(straightInFoul, "Phải có kịch bản straight-in-foul");
    assert.equal(straightInFoul.isLegal, false);
    assert.ok(straightInFoul.foulReason);

    console.log("--- 4. Kiểm tra hướng dẫn đặt lại bi cái và tính điểm (SCRUM-859) ---");
    assert.ok(data.cueBallAndScoring, "Phải có dữ liệu cueBallAndScoring");
    assert.ok(Array.isArray(data.cueBallAndScoring.ballInHandRules));
    assert.ok(Array.isArray(data.cueBallAndScoring.respottingRules));
    assert.ok(Array.isArray(data.cueBallAndScoring.raceTargets));
    assert.ok(data.cueBallAndScoring.raceTargets.length >= 2);

    console.log("--- 5. Kiểm tra bảng đối chiếu và FAQ ---");
    assert.ok(Array.isArray(data.comparison.legal));
    assert.ok(Array.isArray(data.comparison.fouls));
    assert.ok(Array.isArray(data.faqs));
    assert.ok(data.faqs.length >= 4);

    console.log("✅ ALL SCRUM-847 BANK POOL RULES TESTS PASSED!");
  } finally {
    if (server) server.close();
  }
}

main().catch((err) => {
  console.error("❌ Check bank pool rules failed:", err);
  process.exit(1);
});
