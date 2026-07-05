// UART block 6 RX burst functional test
// Covers: Serial.setup, Serial.write, Serial.on("data"), Serial.read, Serial.available, Serial.unsetup

echo(false);

var TEST_NAME = "uart_rx_burst_s3_to_s2";
var TARGET = "AUTO";
var TIMEOUT_MS = 5000;
var BAUD = 115200;
var CASE_LENGTHS = [32, 64, 65, 96];
var DIRECTION = {
  senderKey : "SERIAL_B",
  receiverKey : "SERIAL_A",
  label : "s3_to_s2"
};

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

function resolvePin(pinName) {
  try {
    return eval(pinName);
  } catch (e) {
    return null;
  }
}

function resolvePort(portName) {
  try {
    return eval(portName);
  } catch (e) {
    return null;
  }
}

function resolvePins(cfg) {
  if (!cfg) return null;

  var resolved = {
    SERIAL_A : {
      tx : resolvePin(cfg.SERIAL_A.tx),
      rx : resolvePin(cfg.SERIAL_A.rx),
      port : resolvePort(cfg.SERIAL_A.name),
      name : cfg.SERIAL_A.name
    },
    SERIAL_B : {
      tx : resolvePin(cfg.SERIAL_B.tx),
      rx : resolvePin(cfg.SERIAL_B.rx),
      port : resolvePort(cfg.SERIAL_B.name),
      name : cfg.SERIAL_B.name
    }
  };

  if (!resolved.SERIAL_A.tx || !resolved.SERIAL_A.rx ||
      !resolved.SERIAL_A.port ||
      !resolved.SERIAL_B.tx || !resolved.SERIAL_B.rx ||
      !resolved.SERIAL_B.port) {
    return null;
  }

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

function info(key, value) {
  print("INFO " + key + "=" + value);
}

function metric(key, value) {
  print("METRIC " + key + "=" + value);
}

function pass(name, extra) {
  checksTotal++;
  checksPassed++;
  print("PASS " + name + (extra ? " " + extra : ""));
}

function fail(name, extra) {
  checksTotal++;
  checksFailed++;
  print("FAIL " + name + (extra ? " " + extra : ""));
}

function skip(reason, extra) {
  print("SKIP " + reason + (extra ? " " + extra : ""));
}

function expectEq(name, actual, expected) {
  if (actual === expected) {
    pass(name, "got=" + actual + " expected=" + expected);
  } else {
    fail(name, "got=" + actual + " expected=" + expected);
  }
}

function expectTextMarkerEq(name, actual, expected) {
  if (actual === expected) {
    pass(name, "got=" + JSON.stringify(actual));
  } else {
    fail(name, "got=" + JSON.stringify(actual) + " expected=" + JSON.stringify(expected));
  }
}

function safeCall(fn) {
  try {
    fn();
  } catch (e) {
    // Cleanup should not block completion reporting.
  }
}

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
  while (body.length < length) {
    body += alphabet.charAt(body.length % alphabet.length);
  }
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

function updateHeadTail(state, text) {
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    if (state.head.length < 16) state.head += ch;
    state.tail += ch;
    if (state.tail.length > 16) state.tail = state.tail.substr(state.tail.length - 16);
  }
}

function runBurstCase(index, sender, receiver, label, doneFn) {
  if (index >= CASE_LENGTHS.length) {
    doneFn();
    return;
  }

  var length = CASE_LENGTHS[index];
  var payload = makePayload(label + "_" + length, length);
  var expectedHash = hashString(payload);
  var receivedLength = 0;
  var receivedHash = 2166136261;
  var markers = { head : "", tail : "" };
  var callbackCount = 0;
  var maxChunk = 0;
  var checkName = "uart_rx_" + label + "_len_" + length;

  safeCall(function() { sender.port.removeAllListeners("data"); });
  safeCall(function() { receiver.port.removeAllListeners("data"); });

  receiver.port.on("data", function(d) {
    callbackCount++;
    receivedLength += d.length;
    receivedHash = hashAppend(receivedHash, d);
    updateHeadTail(markers, d);
    if (d.length > maxChunk) maxChunk = d.length;
  });

  schedule(10, function() {
    sender.port.write(payload);
  });

  schedule(260, function() {
    safeCall(function() { receiver.port.removeAllListeners("data"); });
    metric(checkName + "_callbacks", callbackCount);
    metric(checkName + "_received_len", receivedLength);
    metric(checkName + "_max_chunk", maxChunk);
    metric(checkName + "_hash", receivedHash);
    metric(checkName + "_head", JSON.stringify(markers.head));
    metric(checkName + "_tail", JSON.stringify(markers.tail));
    expectEq(checkName + "_length", receivedLength, payload.length);
    expectEq(checkName + "_hash", receivedHash, expectedHash);
    expectTextMarkerEq(checkName + "_head", markers.head, payload.substr(0, 16));
    expectTextMarkerEq(checkName + "_tail", markers.tail, payload.substr(-16));
    schedule(0, function() {
      runBurstCase(index + 1, sender, receiver, label, doneFn);
    });
  });
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";
  var sender = PORTS && PORTS[DIRECTION.senderKey];
  var receiver = PORTS && PORTS[DIRECTION.receiverKey];

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", 'Serial.setup,Serial.write,Serial.on("data"),Serial.read,Serial.available,Serial.unsetup');

  if (!CFG) {
    skip("unsupported_target", "board=" + boardId);
    finish();
    return;
  }

  if (!PORTS || !sender || !receiver) {
    fail("port_resolve", "target=" + CFG.name);
    finish();
    return;
  }

  info("harness", CFG.harnessName);
  info("mode", CFG.mode);
  info("console", CFG.consoleInfo);
  info("selectors", CFG.selectorInfo);
  info("baud", "" + BAUD);
  info("lengths", JSON.stringify(CASE_LENGTHS));
  info("direction", DIRECTION.label);
  info("sender", sender.name + " tx=" + CFG[DIRECTION.senderKey].tx + " rx=" + CFG[DIRECTION.senderKey].rx);
  info("receiver", receiver.name + " tx=" + CFG[DIRECTION.receiverKey].tx + " rx=" + CFG[DIRECTION.receiverKey].rx);

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  try {
    PORTS.SERIAL_A.port.setup(BAUD, {tx:PORTS.SERIAL_A.tx, rx:PORTS.SERIAL_A.rx});
    PORTS.SERIAL_B.port.setup(BAUD, {tx:PORTS.SERIAL_B.tx, rx:PORTS.SERIAL_B.rx});
  } catch (e) {
    fail("serial_setup", "" + e);
    finish();
    return;
  }

  metric("uart_rx_burst_case_count", CASE_LENGTHS.length);

  runBurstCase(0, sender, receiver, DIRECTION.label, function() {
    finish();
  });
}

run();
