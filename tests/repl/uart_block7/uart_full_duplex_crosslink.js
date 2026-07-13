// UART block 7 full-duplex crosslink functional test
// Covers: Serial.setup, Serial.write, Serial.on("data"), simultaneous RX/TX

echo(false);

var TEST_NAME = "uart_full_duplex_crosslink";
var TARGET = "AUTO";
var TIMEOUT_MS = 4000;
var BAUD = 115200;
var SETTLE_MS = 420;

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
function hashString(text) {
  var hash = 2166136261;
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash >>> 0;
}
function hashAppend(hash, text) {
  for (var i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash >>> 0;
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";
  var payloadA = makePayload("FD_A", 96);
  var payloadB = makePayload("FD_B", 128);
  var rxA = "";
  var rxB = "";
  var callbacksA = 0;
  var callbacksB = 0;
  var maxChunkA = 0;
  var maxChunkB = 0;
  var hashA = 2166136261;
  var hashB = 2166136261;

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", 'Serial.setup,Serial.write,Serial.on("data"),simultaneous_rx_tx');
  if (!CFG) { skip("unsupported_target", "board=" + boardId); finish(); return; }
  if (!PORTS) { fail("port_resolve", "target=" + CFG.name); finish(); return; }
  info("harness", CFG.harnessName);
  info("mode", CFG.mode);
  info("console", CFG.consoleInfo);
  info("selectors", CFG.selectorInfo);
  info("baud", "" + BAUD);
  info("payload_a_len", "" + payloadA.length);
  info("payload_b_len", "" + payloadB.length);
  timeoutId = setTimeout(function() { fail("timeout", "ms=" + TIMEOUT_MS); finish(); }, TIMEOUT_MS);

  try {
    PORTS.SERIAL_A.port.setup(BAUD, {tx:PORTS.SERIAL_A.tx, rx:PORTS.SERIAL_A.rx});
    PORTS.SERIAL_B.port.setup(BAUD, {tx:PORTS.SERIAL_B.tx, rx:PORTS.SERIAL_B.rx});
  } catch (e) {
    fail("serial_setup", "" + e);
    finish();
    return;
  }

  PORTS.SERIAL_A.port.on("data", function(d) {
    callbacksA++;
    rxA += d;
    hashA = hashAppend(hashA, d);
    if (d.length > maxChunkA) maxChunkA = d.length;
  });
  PORTS.SERIAL_B.port.on("data", function(d) {
    callbacksB++;
    rxB += d;
    hashB = hashAppend(hashB, d);
    if (d.length > maxChunkB) maxChunkB = d.length;
  });

  schedule(20, function() {
    PORTS.SERIAL_A.port.write(payloadA);
    PORTS.SERIAL_B.port.write(payloadB);
  });

  schedule(SETTLE_MS, function() {
    metric("uart_full_duplex_a_callbacks", callbacksA);
    metric("uart_full_duplex_b_callbacks", callbacksB);
    metric("uart_full_duplex_a_received_len", rxA.length);
    metric("uart_full_duplex_b_received_len", rxB.length);
    metric("uart_full_duplex_a_max_chunk", maxChunkA);
    metric("uart_full_duplex_b_max_chunk", maxChunkB);
    metric("uart_full_duplex_a_hash", hashA);
    metric("uart_full_duplex_b_hash", hashB);
    expectEq("uart_full_duplex_a_rx_len", rxA.length, payloadB.length);
    expectEq("uart_full_duplex_b_rx_len", rxB.length, payloadA.length);
    expectEq("uart_full_duplex_a_hash", hashA, hashString(payloadB));
    expectEq("uart_full_duplex_b_hash", hashB, hashString(payloadA));
    expectEq("uart_full_duplex_a_rx", rxA, payloadB);
    expectEq("uart_full_duplex_b_rx", rxB, payloadA);
    finish();
  });
}

run();
