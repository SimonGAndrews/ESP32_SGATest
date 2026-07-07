// Analog block 2 PWM feedback functional test
// Covers: analogWrite, analogRead, pinMode

echo(false);

var TEST_NAME = "analog_pwm_feedback";
var TARGET = "AUTO";
var TIMEOUT_MS = 2500;
var SETTLE_MS = 150;
var PWM_LEVELS = [0.25, 0.5, 0.75];

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    PWM_OUT : "D27",
    ADC_IN  : "D34"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_ANALOG_PWM",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D08=closed(after safe boot) SEL_D0=a2-b2(ADC_IN) J10=open SEL_D10=open SEL_D3/SEL_D4 UART positions not fitted",
    PWM_OUT : "D8",
    ADC_IN  : "D0"
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
    PWM_OUT : resolvePin(cfg.PWM_OUT),
    ADC_IN  : resolvePin(cfg.ADC_IN)
  };

  if (!resolved.PWM_OUT || !resolved.ADC_IN) return null;
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
var readings = [];

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

  safeCall(function() { analogWrite(PINS.PWM_OUT, 0); });
  safeCall(function() { pinMode(PINS.PWM_OUT, "input"); });
  safeCall(function() { pinMode(PINS.ADC_IN, "input"); });
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

function recordLevel(index) {
  if (index >= PWM_LEVELS.length) {
    var v25 = readings[0];
    var v50 = readings[1];
    var v75 = readings[2];

    expectTrue("analog_pwm_monotonic", v25 < v50 && v50 < v75, "values=" + readings.join(","));
    expectTrue("analog_pwm_25_useful", v25 > 0.10 && v25 < 0.45, "value=" + v25);
    expectTrue("analog_pwm_50_useful", v50 > 0.35 && v50 < 0.75, "value=" + v50);
    expectTrue("analog_pwm_75_useful", v75 > 0.55 && v75 < 0.95, "value=" + v75);
    expectTrue("analog_pwm_span_useful", (v75 - v25) > 0.30, "span=" + (v75 - v25));
    finish();
    return;
  }

  var level = PWM_LEVELS[index];
  analogWrite(PINS.PWM_OUT, level);
  schedule(SETTLE_MS, function() {
    var value = analogRead(PINS.ADC_IN);
    readings.push(value);
    metric("analog_pwm_level_" + ((level * 100) | 0), value);
    schedule(0, function() { recordLevel(index + 1); });
  });
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "analogWrite,analogRead,pinMode");

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
  info("pwm_out", CFG.PWM_OUT);
  info("adc_in", CFG.ADC_IN);
  info("pwm_levels", JSON.stringify(PWM_LEVELS));

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  pinMode(PINS.ADC_IN, "input");
  pinMode(PINS.PWM_OUT, "output");
  analogWrite(PINS.PWM_OUT, 0);

  schedule(SETTLE_MS, function() {
    recordLevel(0);
  });
}

run();
