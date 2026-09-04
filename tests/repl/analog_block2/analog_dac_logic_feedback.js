// Analog block 2 DAC endpoint test through the ESP32 V1 D25/D26 loopback
// Covers: analogWrite, pinMode, digitalRead

echo(false);

var TEST_NAME = "analog_dac_logic_feedback";
var TIMEOUT_MS = 2000;
var SETTLE_MS = 100;
var checksTotal = 0;
var checksPassed = 0;
var checksFailed = 0;
var done = false;
var timeoutId;

function metric(key, value) {
  print("METRIC " + key + "=" + value);
}

function expectEq(name, actual, expected) {
  checksTotal++;
  if (actual === expected) {
    checksPassed++;
    print("PASS " + name + " got=" + actual + " expected=" + expected);
  } else {
    checksFailed++;
    print("FAIL " + name + " got=" + actual + " expected=" + expected);
  }
}

function cleanup() {
  try { digitalWrite(D25, 0); } catch (e) {}
  try { pinMode(D25, "input"); } catch (e) {}
  try { pinMode(D26, "input"); } catch (e) {}
}

function finish() {
  if (done) return;
  done = true;
  if (timeoutId) clearTimeout(timeoutId);
  cleanup();
  metric("checks_total", checksTotal);
  metric("checks_passed", checksPassed);
  metric("checks_failed", checksFailed);
  echo(true);
  print("DONE=" + TEST_NAME);
}

function run() {
  print("TEST=" + TEST_NAME);
  print("TARGET=ESP32_V1");
  print("INFO board=" + (process.env.BOARD || "UNKNOWN"));
  print("INFO api=analogWrite,pinMode,digitalRead");
  print("INFO harness=ESP32 DevKitC V4 / ESP32_V1 harness");
  print("INFO mode=ESP32_BASELINE_HARDWARE");
  print("INFO selectors=SEL_D26=1-2 (D25 to D26 loopback)");
  print("INFO dac_out=D25");
  print("INFO logic_feedback=D26");

  timeoutId = setTimeout(function() {
    print("FAIL timeout ms=" + TIMEOUT_MS);
    checksTotal++;
    checksFailed++;
    finish();
  }, TIMEOUT_MS);

  pinMode(D26, "input");
  analogWrite(D25, 0);
  setTimeout(function() {
    var low = digitalRead(D26);
    metric("dac_logic_low", low);
    expectEq("dac_logic_low", low, 0);

    analogWrite(D25, 1);
    setTimeout(function() {
      var high = digitalRead(D26);
      metric("dac_logic_high", high);
      expectEq("dac_logic_high", high, 1);
      finish();
    }, SETTLE_MS);
  }, SETTLE_MS);
}

run();
