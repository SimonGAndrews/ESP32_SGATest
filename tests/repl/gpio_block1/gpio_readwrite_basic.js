// GPIO block 1 basic read/write functional test
// Covers: pinMode, digitalWrite, digitalRead

var TEST_NAME = "gpio_readwrite_basic";
var TARGET = "AUTO";
var TIMEOUT_MS = 1000;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    GPIO_LOOP_A_OUT : "D32",
    GPIO_LOOP_A_IN  : "D33",
    GPIO_LOOP_B_OUT : "D25",
    GPIO_LOOP_B_IN  : "D26"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_BASELINE_GPIO",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D1=a2-b2 SEL_D2=a2-b2 SEL_D3=a2-b2 SEL_D4=a2-b2 J10=open SEL_D08=open SEL_D0=open",
    GPIO_LOOP_A_OUT : "D1",
    GPIO_LOOP_A_IN  : "D2",
    GPIO_LOOP_B_OUT : "D3",
    GPIO_LOOP_B_IN  : "D4"
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

function resolvePins(cfg) {
  if (!cfg) return null;

  var resolved = {
    GPIO_LOOP_A_OUT : resolvePin(cfg.GPIO_LOOP_A_OUT),
    GPIO_LOOP_A_IN  : resolvePin(cfg.GPIO_LOOP_A_IN),
    GPIO_LOOP_B_OUT : resolvePin(cfg.GPIO_LOOP_B_OUT),
    GPIO_LOOP_B_IN  : resolvePin(cfg.GPIO_LOOP_B_IN)
  };

  if (!resolved.GPIO_LOOP_A_OUT || !resolved.GPIO_LOOP_A_IN ||
      !resolved.GPIO_LOOP_B_OUT || !resolved.GPIO_LOOP_B_IN) {
    return null;
  }

  return resolved;
}

var CFG = resolveCfg();
var PINS = resolvePins(CFG);
var done = false;
var timeoutId;
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

function expectEq(name, actual, expected) {
  if (actual === expected) {
    pass(name, "got=" + actual + " expected=" + expected);
  } else {
    fail(name, "got=" + actual + " expected=" + expected);
  }
}

function safeCall(fn) {
  try {
    fn();
  } catch (e) {
    // Cleanup should not block completion reporting.
  }
}

function cleanup() {
  if (!PINS) return;

  safeCall(function() { digitalWrite(PINS.GPIO_LOOP_A_OUT, 0); });
  safeCall(function() { digitalWrite(PINS.GPIO_LOOP_B_OUT, 0); });

  safeCall(function() { pinMode(PINS.GPIO_LOOP_A_OUT, "input"); });
  safeCall(function() { pinMode(PINS.GPIO_LOOP_A_IN, "input"); });
  safeCall(function() { pinMode(PINS.GPIO_LOOP_B_OUT, "input"); });
  safeCall(function() { pinMode(PINS.GPIO_LOOP_B_IN, "input"); });
}

function finish() {
  if (done) return;
  done = true;

  if (timeoutId) clearTimeout(timeoutId);

  cleanup();

  metric("checks_total", checksTotal);
  metric("checks_passed", checksPassed);
  metric("checks_failed", checksFailed);
  if (CFG) metric("loop_pairs_tested", 2);

  echo(true);
  print("DONE=" + TEST_NAME);
}

function checkLoop(prefix, outPin, inPin) {
  pinMode(outPin, "output");
  pinMode(inPin, "input");

  digitalWrite(outPin, 0);
  expectEq(prefix + "_low", digitalRead(inPin), 0);

  digitalWrite(outPin, 1);
  expectEq(prefix + "_high", digitalRead(inPin), 1);

  digitalWrite(outPin, 0);
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";

  echo(false);
  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "pinMode,digitalWrite,digitalRead");

  if (!CFG) {
    fail("config_resolve", "target=" + TARGET + " board=" + boardId);
    finish();
    return;
  }

  if (!PINS) {
    fail("pin_resolve", "target=" + CFG.name);
    finish();
    return;
  }

  info("harness", CFG.harnessName);
  info("mode", CFG.mode);
  info("console", CFG.consoleInfo);
  info("selectors", CFG.selectorInfo);

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  checkLoop("gpio_loop_a", PINS.GPIO_LOOP_A_OUT, PINS.GPIO_LOOP_A_IN);
  checkLoop("gpio_loop_b", PINS.GPIO_LOOP_B_OUT, PINS.GPIO_LOOP_B_IN);

  finish();
}

run();
