// UART block 7 write/print data-shape functional test
// Covers: Serial.setup, Serial.write, Serial.print, Serial.println, Serial.read, Serial.unsetup

echo(false);

var TEST_NAME = "uart_write_print_shapes";
var TARGET = "AUTO";
var TIMEOUT_MS = 5000;
var BAUD = 115200;
var SETTLE_MS = 160;
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

function makeCases() {
  var cases = [
    { label : "write_string", fn : function(p) { p.write("abcXYZ"); }, expected : "abcXYZ" },
    { label : "write_array", fn : function(p) { p.write([65,66,0,67,255]); }, expected : "AB\x00C\xff" },
    { label : "print_number", fn : function(p) { p.print(123); }, expected : "123" },
    { label : "println_string", fn : function(p) { p.println("line"); }, expected : "line\r\n" }
  ];
  if (typeof Uint8Array !== "undefined") {
    cases.splice(2, 0, {
      label : "write_uint8array",
      fn : function(p) { p.write(new Uint8Array([68,69,70,10])); },
      expected : "DEF\n"
    });
  }
  return cases;
}

var CASES = makeCases();

function runCase(index) {
  if (index >= CASES.length) { finish(); return; }
  var c = CASES[index];
  var sender = PORTS.SERIAL_A;
  var receiver = PORTS.SERIAL_B;
  var checkPrefix = "uart_shape_" + c.label;

  drain(receiver);
  c.fn(sender.port);

  schedule(SETTLE_MS, function() {
    var got = receiver.port.read() || "";
    var availableAfter = receiver.port.available();
    metric(checkPrefix + "_rx", JSON.stringify(got));
    metric(checkPrefix + "_available_after", availableAfter);
    expectEq(checkPrefix + "_rx", got, c.expected);
    expectEq(checkPrefix + "_available_after", availableAfter, 0);
    schedule(INTER_CASE_MS, function() { runCase(index + 1); });
  });
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";
  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "Serial.setup,Serial.write,Serial.print,Serial.println,Serial.read,Serial.unsetup");
  if (!CFG) { skip("unsupported_target", "board=" + boardId); finish(); return; }
  if (!PORTS) { fail("port_resolve", "target=" + CFG.name); finish(); return; }
  info("harness", CFG.harnessName);
  info("mode", CFG.mode);
  info("console", CFG.consoleInfo);
  info("selectors", CFG.selectorInfo);
  info("baud", "" + BAUD);
  info("case_count", "" + CASES.length);
  timeoutId = setTimeout(function() { fail("timeout", "ms=" + TIMEOUT_MS); finish(); }, TIMEOUT_MS);
  try {
    PORTS.SERIAL_A.port.setup(BAUD, {tx:PORTS.SERIAL_A.tx, rx:PORTS.SERIAL_A.rx});
    PORTS.SERIAL_B.port.setup(BAUD, {tx:PORTS.SERIAL_B.tx, rx:PORTS.SERIAL_B.rx});
  } catch (e) {
    fail("serial_setup", "" + e);
    finish();
    return;
  }
  drain(PORTS.SERIAL_B);
  runCase(0);
}

run();
