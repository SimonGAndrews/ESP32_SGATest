// ESP32-S3 two-UART crosslink and driver-lifecycle test.
// Cross-connect D6 to D18 and D17 to D7.
// Keep the REPL on native USB Serial/JTAG or the independent UART0 bridge.

echo(false);

var TEST_NAME = "esp32s3_uart_crosslink_lifecycle";
var PORT_A = Serial2;
var PORT_B = Serial3;
var A_TX = D6;
var A_RX = D7;
var B_TX = D17;
var B_RX = D18;
var ITERATIONS = 100;
var SETTLE_MS = 180;
var INTER_CASE_MS = 60;
var checksTotal = 0;
var checksPassed = 0;
var checksFailed = 0;
var finished = false;
var deadline;

function pass(name) {
  checksTotal++;
  checksPassed++;
  print("PASS " + name);
}

function fail(name, detail) {
  checksTotal++;
  checksFailed++;
  print("FAIL " + name + (detail ? " " + detail : ""));
}

function cleanup() {
  try { PORT_A.removeAllListeners("data"); } catch (e) {}
  try { PORT_B.removeAllListeners("data"); } catch (e) {}
  try { PORT_A.unsetup(); } catch (e) {}
  try { PORT_B.unsetup(); } catch (e) {}
}

function finish() {
  if (finished) return;
  finished = true;
  if (deadline) clearTimeout(deadline);
  cleanup();
  print("METRIC checks_total=" + checksTotal);
  print("METRIC checks_passed=" + checksPassed);
  print("METRIC checks_failed=" + checksFailed);
  echo(true);
  print("DONE=" + TEST_NAME);
}

function setupBoth(baud) {
  PORT_A.setup(baud, {tx:A_TX, rx:A_RX});
  PORT_B.setup(baud, {tx:B_TX, rx:B_RX});
  PORT_A.read();
  PORT_B.read();
}

function runIteration(index) {
  if (finished) return;
  if (index >= ITERATIONS) {
    finish();
    return;
  }

  cleanup();
  setTimeout(function() {
    var baud = (index & 1) ? 57600 : 115200;
    var reverse = !!(index & 1);
    var sender = reverse ? PORT_B : PORT_A;
    var receiver = reverse ? PORT_A : PORT_B;
    var payload = "S3_UART_" + index + "_" + baud;

    try {
      setupBoth(baud);
      sender.write(payload);
    } catch (e) {
      fail("iteration_" + index, "setup_or_write=" + e);
      finish();
      return;
    }

    setTimeout(function() {
      var received = receiver.read() || "";
      if (received === payload) {
        pass("iteration_" + index);
      } else {
        fail("iteration_" + index,
             "got=" + JSON.stringify(received) +
             " expected=" + JSON.stringify(payload));
      }
      runIteration(index + 1);
    }, SETTLE_MS);
  }, INTER_CASE_MS);
}

var boardId = process.env.BOARD || "UNKNOWN";
print("TEST=" + TEST_NAME);
print("INFO board=" + boardId);
print("INFO wiring=D6_to_D18,D17_to_D7");
print("INFO Serial2=tx_D6_rx_D7");
print("INFO Serial3=tx_D17_rx_D18");
print("INFO iterations=" + ITERATIONS);

if (boardId !== "ESP32S3_IDF4" && boardId !== "ESP32S3_IDF5") {
  fail("supported_board", "board=" + boardId);
  finish();
} else {
  deadline = setTimeout(function() {
    fail("timeout", "ms=40000");
    finish();
  }, 40000);
  runIteration(0);
}
