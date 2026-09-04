// UART block 7 polling read/available functional test
// Covers: Serial.setup, Serial.write, Serial.available, Serial.read, Serial.unsetup

echo(false);

var TEST_NAME = "uart_read_available_polling";
var TARGET = "AUTO";
var TIMEOUT_MS = 5000;
var BAUD = 115200;
var SETTLE_MS = 180;
var INTER_CASE_MS = 80;

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
  },
  ESP32_C3_V1 : {
    name : "ESP32_C3_V1",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5"],
    harnessName : "ESP32-C3 DevKitC-02 / ESP32_C3_V1 harness",
    mode : "C3_SERIAL_UART0_UART1_CROSSLINK",
    consoleInfo : "native USB Serial/JTAG on D18/D19",
    selectorInfo : "SEL_D3=a3-b3 SEL_D4=a3-b3 J10_columns_1_2=closed",
    SERIAL_A : { tx : "D21", rx : "D20", name : "Serial1" },
    SERIAL_B : { tx : "D3", rx : "D4", name : "Serial2" }
  }
};

function resolveCfg() {
  if (TARGET !== "AUTO") return CFGS[TARGET] || null;
  var boardId = process.env.BOARD || "";
  for (var k in CFGS) {
    var ids = CFGS[k].boardIds || [];
    if (ids.indexOf(boardId) >= 0) return CFGS[k];
  }
  return null;
}
function resolvePin(pinName) { try { return eval(pinName); } catch (e) { return null; } }
function resolvePort(portName) { try { return eval(portName); } catch (e) { return null; } }
function resolvePins(cfg) {
  if (!cfg) return null;
  var resolved = {
    SERIAL_A : { tx : resolvePin(cfg.SERIAL_A.tx), rx : resolvePin(cfg.SERIAL_A.rx), port : resolvePort(cfg.SERIAL_A.name), name : cfg.SERIAL_A.name },
    SERIAL_B : { tx : resolvePin(cfg.SERIAL_B.tx), rx : resolvePin(cfg.SERIAL_B.rx), port : resolvePort(cfg.SERIAL_B.name), name : cfg.SERIAL_B.name }
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
function clearAllTimers() {
  while (timerIds.length) {
    var id = timerIds.pop();
    safeCall(function() { clearTimeout(id); });
  }
}
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

var CASES = [
  { label : "s2_to_s3", senderKey : "SERIAL_A", receiverKey : "SERIAL_B", text : "POLL_A_0123456789" },
  { label : "s3_to_s2", senderKey : "SERIAL_B", receiverKey : "SERIAL_A", text : "POLL_B_abcdefghijklmnopqrstuvwxyz" }
];

function runCase(index) {
  if (index >= CASES.length) { finish(); return; }
  var c = CASES[index];
  var sender = PORTS[c.senderKey];
  var receiver = PORTS[c.receiverKey];
  var firstLen = 5;
  var secondLen = 4;
  var remaining = c.text.length - firstLen - secondLen;
  var checkPrefix = "uart_poll_" + c.label;

  safeCall(function() { sender.port.removeAllListeners("data"); });
  safeCall(function() { receiver.port.removeAllListeners("data"); });
  drain(receiver);
  sender.port.write(c.text);

  schedule(SETTLE_MS, function() {
    var availableBefore = receiver.port.available();
    var part1 = receiver.port.read(firstLen) || "";
    var availableAfterPart1 = receiver.port.available();
    var part2 = receiver.port.read(secondLen) || "";
    var rest = receiver.port.read() || "";
    var availableAfterDrain = receiver.port.available();
    var all = part1 + part2 + rest;

    metric(checkPrefix + "_available_before", availableBefore);
    metric(checkPrefix + "_available_after_part1", availableAfterPart1);
    metric(checkPrefix + "_available_after_drain", availableAfterDrain);
    metric(checkPrefix + "_part1", JSON.stringify(part1));
    metric(checkPrefix + "_part2", JSON.stringify(part2));
    metric(checkPrefix + "_rest", JSON.stringify(rest));

    expectTrue(checkPrefix + "_available_before", availableBefore >= c.text.length, "value=" + availableBefore);
    expectEq(checkPrefix + "_read_part1", part1, c.text.substr(0, firstLen));
    expectEq(checkPrefix + "_available_after_part1", availableAfterPart1, c.text.length - firstLen);
    expectEq(checkPrefix + "_read_part2", part2, c.text.substr(firstLen, secondLen));
    expectEq(checkPrefix + "_read_rest", rest, c.text.substr(firstLen + secondLen, remaining));
    expectEq(checkPrefix + "_read_all", all, c.text);
    expectEq(checkPrefix + "_available_after_drain", availableAfterDrain, 0);

    schedule(INTER_CASE_MS, function() { runCase(index + 1); });
  });
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";
  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "Serial.setup,Serial.write,Serial.available,Serial.read,Serial.unsetup");
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
  } catch (e) {
    fail("serial_setup", "" + e);
    finish();
    return;
  }
  runCase(0);
}

run();
