// UART block 7 inject/buffering functional test
// Covers: Serial.setup, Serial.inject, Serial.available, Serial.read, Serial.on("data"), Serial.unsetup

echo(false);

var TEST_NAME = "uart_inject_buffering";
var TARGET = "AUTO";
var TIMEOUT_MS = 5000;
var BAUD = 115200;
var SETTLE_MS = 180;

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
var timerIds = [];
var checksTotal = 0;
var checksPassed = 0;
var checksFailed = 0;

function info(key, value) { print("INFO " + key + "=" + value); }
function metric(key, value) { print("METRIC " + key + "=" + value); }
function pass(name, extra) { checksTotal++; checksPassed++; print("PASS " + name + (extra ? " " + extra : "")); }
function fail(name, extra) { checksTotal++; checksFailed++; print("FAIL " + name + (extra ? " " + extra : "")); }
function skip(reason, extra) { print("SKIP " + reason + (extra ? " " + extra : "")); }
function expectEq(name, actual, expected) {
  if (actual === expected) pass(name, "got=" + JSON.stringify(actual));
  else fail(name, "got=" + JSON.stringify(actual) + " expected=" + JSON.stringify(expected));
}
function expectTrue(name, condition, extra) { if (condition) pass(name, extra); else fail(name, extra); }
function safeCall(fn) { try { fn(); } catch (e) {} }
function schedule(delayMs, fn) { var id = setTimeout(fn, delayMs); timerIds.push(id); return id; }
function clearAllTimers() { while (timerIds.length) { var id = timerIds.pop(); safeCall(function() { clearTimeout(id); }); } }
function removeListenersAndUnsetup(portInfo) {
  if (!portInfo || !portInfo.port) return;
  safeCall(function() { portInfo.port.removeAllListeners("data"); });
  safeCall(function() { portInfo.port.unsetup(); });
}
function drain(portInfo) {
  if (!portInfo || !portInfo.port) return "";
  var s = "";
  safeCall(function() {
    while (portInfo.port.available && portInfo.port.available()) {
      var r = portInfo.port.read();
      if (r) s += r;
    }
  });
  return s;
}
function cleanup() {
  clearAllTimers();
  removeListenersAndUnsetup(PORTS && PORTS.SERIAL_A);
  removeListenersAndUnsetup(PORTS && PORTS.SERIAL_B);
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
  var target = PORTS && PORTS.SERIAL_B;
  var callbackText = "";
  var callbackCount = 0;

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", 'Serial.setup,Serial.inject,Serial.available,Serial.read,Serial.on("data"),Serial.unsetup');
  if (!CFG) { skip("unsupported_target", "board=" + boardId); finish(); return; }
  if (!PORTS) { fail("port_resolve", "target=" + CFG.name); finish(); return; }
  info("harness", CFG.harnessName);
  info("mode", CFG.mode);
  info("console", CFG.consoleInfo);
  info("selectors", CFG.selectorInfo);
  info("baud", "" + BAUD);
  timeoutId = setTimeout(function() { fail("timeout", "ms=" + TIMEOUT_MS); finish(); }, TIMEOUT_MS);
  try {
    PORTS.SERIAL_A.port.setup(BAUD, {tx:PORTS.SERIAL_A.tx, rx:PORTS.SERIAL_A.rx});
    PORTS.SERIAL_B.port.setup(BAUD, {tx:PORTS.SERIAL_B.tx, rx:PORTS.SERIAL_B.rx});
  } catch (e) { fail("serial_setup", "" + e); finish(); return; }

  drain(target);
  target.port.inject("INJECT_BUF");
  schedule(SETTLE_MS, function() {
    var availableBefore = target.port.available();
    var got = target.port.read() || "";
    metric("uart_inject_buffer_available", availableBefore);
    metric("uart_inject_buffer_read", JSON.stringify(got));
    expectTrue("uart_inject_buffer_available", availableBefore >= 10, "value=" + availableBefore);
    expectEq("uart_inject_buffer_read", got, "INJECT_BUF");

    target.port.on("data", function(d) {
      callbackCount++;
      callbackText += d;
    });
    target.port.inject("INJECT_CB");
    schedule(SETTLE_MS, function() {
      metric("uart_inject_callback_count", callbackCount);
      metric("uart_inject_callback_text", JSON.stringify(callbackText));
      expectEq("uart_inject_callback_text", callbackText, "INJECT_CB");
      expectEq("uart_inject_callback_count", callbackCount, 1);
      finish();
    });
  });
}

run();
