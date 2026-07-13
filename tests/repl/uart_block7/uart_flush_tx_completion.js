// UART block 7 flush functional test
// Covers: Serial.setup, Serial.write, Serial.flush, Serial.read, Serial.unsetup

echo(false);

var TEST_NAME = "uart_flush_tx_completion";
var TARGET = "AUTO";
var TIMEOUT_MS = 5000;
var BAUD = 115200;
var SETTLE_MS = 160;

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
function makePayload(prefix, length) {
  var alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
  var body = prefix + "|";
  while (body.length < length) body += alphabet.charAt(body.length % alphabet.length);
  return body.substr(0, length);
}

var CASES = [
  { label:"s2_to_s3", senderKey:"SERIAL_A", receiverKey:"SERIAL_B", payload:makePayload("FLUSH_A", 32) },
  { label:"s3_to_s2", senderKey:"SERIAL_B", receiverKey:"SERIAL_A", payload:makePayload("FLUSH_B", 32) }
];

function runCase(index) {
  if (index >= CASES.length) { finish(); return; }
  var c = CASES[index];
  var sender = PORTS[c.senderKey];
  var receiver = PORTS[c.receiverKey];
  var checkPrefix = "uart_flush_" + c.label;
  drain(receiver);
  sender.port.write(c.payload);
  sender.port.flush();
  metric(checkPrefix + "_flush_returned", 1);
  schedule(SETTLE_MS, function() {
    var got = receiver.port.read() || "";
    metric(checkPrefix + "_rx_len", got.length);
    expectEq(checkPrefix + "_rx_len", got.length, c.payload.length);
    expectEq(checkPrefix + "_rx", got, c.payload);
    schedule(80, function() { runCase(index + 1); });
  });
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";
  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "Serial.setup,Serial.write,Serial.flush,Serial.read,Serial.unsetup");
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
  runCase(0);
}

run();
