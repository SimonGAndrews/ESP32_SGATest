// Analog block 2 basic level functional test
// Covers: pinMode, digitalWrite, analogRead

echo(false);

var TEST_NAME = "analog_read_levels";
var TARGET = "AUTO";
var TIMEOUT_MS = 1500;
var SETTLE_MS = 150;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    ANALOG_OUT : "D27",
    ANALOG_IN  : "D34"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_ANALOG_PWM",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D08=closed(after safe boot) SEL_D0=a2-b2(ADC_IN) J10=open SEL_D10=open SEL_D3/SEL_D4 UART positions not fitted",
    ANALOG_OUT : "D8",
    ANALOG_IN  : "D0"
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
    ANALOG_OUT : resolvePin(cfg.ANALOG_OUT),
    ANALOG_IN  : resolvePin(cfg.ANALOG_IN)
  };

  if (!resolved.ANALOG_OUT || !resolved.ANALOG_IN) return null;
  return resolved;
}

var CFG = resolveCfg();
var PINS = resolvePins(CFG);
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

function expectTrue(name, condition, extra) {
  if (condition) pass(name, extra);
  else fail(name, extra);
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

function cleanup() {
  clearAllTimers();

  if (!PINS) return;

  safeCall(function() { digitalWrite(PINS.ANALOG_OUT, 0); });
  safeCall(function() { pinMode(PINS.ANALOG_OUT, "input"); });
  safeCall(function() { pinMode(PINS.ANALOG_IN, "input"); });
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
  info("api", "pinMode,digitalWrite,analogRead");

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
  info("analog_out", CFG.ANALOG_OUT);
  info("analog_in", CFG.ANALOG_IN);

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  pinMode(PINS.ANALOG_IN, "input");
  pinMode(PINS.ANALOG_OUT, "output");
  digitalWrite(PINS.ANALOG_OUT, 0);

  schedule(SETTLE_MS, function() {
    var low = analogRead(PINS.ANALOG_IN);
    metric("analog_read_low", low);

    digitalWrite(PINS.ANALOG_OUT, 1);
    schedule(SETTLE_MS, function() {
      var high = analogRead(PINS.ANALOG_IN);
      var span = high - low;

      metric("analog_read_high", high);
      metric("analog_read_span", span);

      expectTrue("analog_read_low_floor", low < 0.10, "value=" + low);
      expectTrue("analog_read_high_ceiling", high > 0.90, "value=" + high);
      expectTrue("analog_read_span_useful", span > 0.75, "span=" + span);
      expectTrue("analog_read_order", high > low, "low=" + low + " high=" + high);

      finish();
    });
  });
}

run();
