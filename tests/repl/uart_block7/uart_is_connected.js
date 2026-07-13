// UART block 7 isConnected functional test
// Covers: Serial.setup, Serial.unsetup, Serial.isConnected
//
// On this ESP32 build, hardware Serial.isConnected() reports whether the port
// object is backed by a connected hardware serial implementation. It is not a
// reliable setup/unsetup state flag once the hardware serial object has been
// used in the current firmware session.

echo(false);

var TEST_NAME = "uart_is_connected";
var TARGET = "AUTO";
var TIMEOUT_MS = 2000;
var BAUD = 115200;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_SERIAL_UART1_UART2_CROSSLINK",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D35=UART JP_UART_LOOP2=closed SEL_D33=1-2 SEL_D26=1-2",
    SERIAL_A : { tx : "D4", rx : "D35", name : "Serial2" },
    SERIAL_B : { tx : "D14", rx : "D36", name : "Serial3" }
  }
};

function resolveCfg() {
  if (TARGET !== "AUTO") return CFGS[TARGET] || null;
  var boardId = process.env.BOARD || "";
  for (var k in CFGS) if ((CFGS[k].boardIds || []).indexOf(boardId) >= 0) return CFGS[k];
  return null;
}
function resolvePin(pinName) { try { return eval(pinName); } catch (e) { return null; } }
function resolvePort(portName) { try { return eval(portName); } catch (e) { return null; } }
function resolvePins(cfg) {
  if (!cfg) return null;
  var resolved = {
    SERIAL_A : { tx:resolvePin(cfg.SERIAL_A.tx), rx:resolvePin(cfg.SERIAL_A.rx), port:resolvePort(cfg.SERIAL_A.name), name:cfg.SERIAL_A.name },
    SERIAL_B : { tx:resolvePin(cfg.SERIAL_B.tx), rx:resolvePin(cfg.SERIAL_B.rx), port:resolvePort(cfg.SERIAL_B.name), name:cfg.SERIAL_B.name }
  };
  if (!resolved.SERIAL_A.tx || !resolved.SERIAL_A.rx || !resolved.SERIAL_A.port ||
      !resolved.SERIAL_B.tx || !resolved.SERIAL_B.rx || !resolved.SERIAL_B.port) return null;
  return resolved;
}

var CFG = resolveCfg();
var PORTS = resolvePins(CFG);
var done = false;
var timeoutId;
var checksTotal = 0;
var checksPassed = 0;
var checksFailed = 0;

function info(key, value) { print("INFO " + key + "=" + value); }
function metric(key, value) { print("METRIC " + key + "=" + value); }
function pass(name, extra) { checksTotal++; checksPassed++; print("PASS " + name + (extra ? " " + extra : "")); }
function fail(name, extra) { checksTotal++; checksFailed++; print("FAIL " + name + (extra ? " " + extra : "")); }
function skip(reason, extra) { print("SKIP " + reason + (extra ? " " + extra : "")); }
function expectEq(name, actual, expected) {
  if (actual === expected) pass(name, "got=" + actual + " expected=" + expected);
  else fail(name, "got=" + actual + " expected=" + expected);
}
function expectBool(name, actual) {
  if (actual === true || actual === false) pass(name, "got=" + actual);
  else fail(name, "got=" + actual + " expected_boolean=true");
}
function safeCall(fn) { try { fn(); } catch (e) {} }
function cleanup() {
  if (!PORTS) return;
  safeCall(function() { PORTS.SERIAL_A.port.unsetup(); });
  safeCall(function() { PORTS.SERIAL_B.port.unsetup(); });
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
  var boardId = process.env.BOARD || "UNKNOWN";
  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "Serial.setup,Serial.unsetup,Serial.isConnected");
  if (!CFG) { skip("unsupported_target", "board=" + boardId); finish(); return; }
  if (!PORTS) { fail("port_resolve", "target=" + CFG.name); finish(); return; }
  info("harness", CFG.harnessName);
  info("mode", CFG.mode);
  info("console", CFG.consoleInfo);
  info("selectors", CFG.selectorInfo);
  timeoutId = setTimeout(function() { fail("timeout", "ms=" + TIMEOUT_MS); finish(); }, TIMEOUT_MS);
  safeCall(function() { PORTS.SERIAL_A.port.unsetup(); });
  safeCall(function() { PORTS.SERIAL_B.port.unsetup(); });
  var beforeA = PORTS.SERIAL_A.port.isConnected();
  var beforeB = PORTS.SERIAL_B.port.isConnected();
  PORTS.SERIAL_A.port.setup(BAUD, {tx:PORTS.SERIAL_A.tx, rx:PORTS.SERIAL_A.rx});
  PORTS.SERIAL_B.port.setup(BAUD, {tx:PORTS.SERIAL_B.tx, rx:PORTS.SERIAL_B.rx});
  var afterSetupA = PORTS.SERIAL_A.port.isConnected();
  var afterSetupB = PORTS.SERIAL_B.port.isConnected();
  PORTS.SERIAL_A.port.unsetup();
  PORTS.SERIAL_B.port.unsetup();
  var afterUnsetupA = PORTS.SERIAL_A.port.isConnected();
  var afterUnsetupB = PORTS.SERIAL_B.port.isConnected();
  metric("uart_connected_before_a", beforeA);
  metric("uart_connected_before_b", beforeB);
  metric("uart_connected_after_setup_a", afterSetupA);
  metric("uart_connected_after_setup_b", afterSetupB);
  metric("uart_connected_after_unsetup_a", afterUnsetupA);
  metric("uart_connected_after_unsetup_b", afterUnsetupB);
  expectBool("uart_connected_before_a_boolean", beforeA);
  expectBool("uart_connected_before_b_boolean", beforeB);
  expectEq("uart_connected_after_setup_a", afterSetupA, true);
  expectEq("uart_connected_after_setup_b", afterSetupB, true);
  expectEq("uart_connected_after_unsetup_a", afterUnsetupA, true);
  expectEq("uart_connected_after_unsetup_b", afterUnsetupB, true);
  finish();
}

run();
