// ESP32-C3 UART block 7 single-port loopback lifecycle test
// Covers: polling RX, event RX, and repeated setup/write/read/unsetup cycles

echo(false);

var TEST_NAME = "c3_uart_single_loop_lifecycle";
var TIMEOUT_MS = 40000;
var SETTLE_MS = 180;
var INTER_CASE_MS = 80;
var ITERATIONS = 100;
var PORT = Serial2;
var TX_PIN = D3;
var RX_PIN = D4;
var done = false;
var timeoutId;
var timerIds = [];
var checksTotal = 0;
var checksPassed = 0;
var checksFailed = 0;

function info(key, value) { print("INFO " + key + "=" + value); }
function metric(key, value) { print("METRIC " + key + "=" + value); }
function pass(name, extra) { checksTotal++; checksPassed++; print("PASS " + name + (extra ? " " + extra : "")); }
function fail(name, extra) { checksTotal++; checksFailed++; print("FAIL " + name + (extra ? " " + extra : "")); }
function expectEq(name, actual, expected) {
  if (actual === expected) pass(name, "got=" + JSON.stringify(actual));
  else fail(name, "got=" + JSON.stringify(actual) + " expected=" + JSON.stringify(expected));
}
function safeCall(fn) { try { fn(); } catch (e) {} }
function schedule(delayMs, fn) {
  var id = setTimeout(fn, delayMs);
  timerIds.push(id);
  return id;
}
function clearAllTimers() {
  while (timerIds.length) {
    var id = timerIds.pop();
    safeCall(function() { clearTimeout(id); });
  }
}
function cleanup() {
  clearAllTimers();
  safeCall(function() { PORT.removeAllListeners("data"); });
  safeCall(function() { PORT.unsetup(); });
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
function drain() {
  var text = "";
  safeCall(function() {
    while (PORT.available()) {
      var value = PORT.read();
      if (value) text += value;
    }
  });
  return text;
}
function setup(baud, checkName) {
  try {
    PORT.setup(baud, {tx:TX_PIN, rx:RX_PIN});
    return true;
  } catch (e) {
    fail(checkName, "error=" + e);
    finish();
    return false;
  }
}

function runSoakIteration(index) {
  if (index >= ITERATIONS) {
    finish();
    return;
  }
  var baud = (index % 2) ? 57600 : 115200;
  var payload = "C3_SOAK_" + index + "_" + baud;
  var checkName = "c3_uart_soak_iter_" + index;

  safeCall(function() { PORT.removeAllListeners("data"); });
  safeCall(function() { PORT.unsetup(); });
  schedule(INTER_CASE_MS, function() {
    if (!setup(baud, checkName + "_setup")) return;
    drain();
    PORT.write(payload);
    schedule(SETTLE_MS, function() {
      var received = PORT.read() || "";
      metric(checkName + "_baud", baud);
      expectEq(checkName + "_rx", received, payload);
      runSoakIteration(index + 1);
    });
  });
}

function runEventCase() {
  safeCall(function() { PORT.unsetup(); });
  schedule(INTER_CASE_MS, function() {
    if (!setup(115200, "c3_uart_event_setup")) return;
    drain();
    var received = "";
    PORT.on("data", function(data) { received += data; });
    PORT.write("C3_EVENT_RX");
    schedule(SETTLE_MS, function() {
      expectEq("c3_uart_event_rx", received, "C3_EVENT_RX");
      PORT.removeAllListeners("data");
      runSoakIteration(0);
    });
  });
}

function runPollingCase() {
  if (!setup(115200, "c3_uart_poll_setup")) return;
  drain();
  PORT.write("C3_POLL_RX");
  schedule(SETTLE_MS, function() {
    var available = PORT.available();
    var received = PORT.read() || "";
    metric("c3_uart_poll_available", available);
    expectEq("c3_uart_poll_rx", received, "C3_POLL_RX");
    runEventCase();
  });
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";
  print("TEST=" + TEST_NAME);
  print("TARGET=ESP32_C3_V1");
  info("board", boardId);
  info("api", 'Serial.setup,Serial.write,Serial.available,Serial.read,Serial.on("data"),Serial.unsetup');
  info("mode", "C3_UART_SINGLE_LOOP");
  info("console", "native USB Serial/JTAG on D18/D19");
  info("selectors", "SEL_D3=LOOP_B_OUT SEL_D4=LOOP_B_IN J10_signal_shunts=open");
  info("uart", "Serial2 tx=D3 rx=D4");
  info("iterations", "" + ITERATIONS);
  if (boardId !== "ESP32C3_IDF5" && boardId !== "ESP32C3_IDF4") {
    fail("unsupported_target", "board=" + boardId);
    finish();
    return;
  }
  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);
  runPollingCase();
}

run();
