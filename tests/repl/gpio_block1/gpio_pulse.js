// GPIO block 1 pulse functional test
// Covers: digitalPulse, setWatch, clearWatch, pinMode, digitalWrite
// Uses non-debounced watches to avoid conflating pulse behavior with the
// separate Core debounce/watch issue investigated elsewhere.

var TEST_NAME = "gpio_pulse";
var TARGET = "AUTO";
var TIMEOUT_MS = 1500;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    PULSE_OUT : "D25",
    PULSE_IN  : "D26"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_BASELINE_GPIO",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D1=a2-b2 SEL_D2=a2-b2 SEL_D3=a2-b2 SEL_D4=a2-b2 J10=open SEL_D08=open SEL_D0=open",
    PULSE_OUT : "D3",
    PULSE_IN  : "D4"
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
    PULSE_OUT : resolvePin(cfg.PULSE_OUT),
    PULSE_IN  : resolvePin(cfg.PULSE_IN)
  };

  if (!resolved.PULSE_OUT || !resolved.PULSE_IN) return null;
  return resolved;
}

var CFG = resolveCfg();
var PINS = resolvePins(CFG);
var done = false;
var timeoutId;
var timerIds = [];
var watchIds = [];
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

function expectJsonEq(name, actual, expected) {
  var actualText = JSON.stringify(actual);
  var expectedText = JSON.stringify(expected);
  if (actualText === expectedText) {
    pass(name, "got=" + actualText + " expected=" + expectedText);
  } else {
    fail(name, "got=" + actualText + " expected=" + expectedText);
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

function addWatch(pin, options, fn) {
  var id = setWatch(fn, pin, options);
  watchIds.push(id);
  return id;
}

function clearAllWatches() {
  while (watchIds.length) {
    var id = watchIds.pop();
    safeCall(function() { clearWatch(id); });
  }
}

function clearAllTimers() {
  while (timerIds.length) {
    var id = timerIds.pop();
    safeCall(function() { clearTimeout(id); });
  }
}

function cleanup() {
  clearAllTimers();
  clearAllWatches();

  if (!PINS) return;

  safeCall(function() { digitalWrite(PINS.PULSE_OUT, 0); });
  safeCall(function() { pinMode(PINS.PULSE_OUT, "input"); });
  safeCall(function() { pinMode(PINS.PULSE_IN, "input"); });
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

function runWritePhase() {
  var writeStates = [];
  var pulseStates = [];
  var pulsePhase = false;
  var watchId;

  pinMode(PINS.PULSE_OUT, "output");
  pinMode(PINS.PULSE_IN, "input");
  digitalWrite(PINS.PULSE_OUT, 0);

  watchId = addWatch(PINS.PULSE_IN, {repeat:true, edge:"both"}, function(e) {
    var state = e.state ? 1 : 0;
    (pulsePhase ? pulseStates : writeStates).push(state);
    // Report the pulse at the point it is observed. This directly proves each
    // transition and avoids relying only on the timing-sensitive later summary.
    if (pulsePhase) info("pulse_edge", state);
  });

  schedule(20, function() { digitalWrite(PINS.PULSE_OUT, 1); });
  schedule(60, function() { digitalWrite(PINS.PULSE_OUT, 0); });

  schedule(140, function() {
    metric("gpio_pulse_write_callbacks", writeStates.length);
    expectJsonEq("gpio_pulse_write_states", writeStates, [1, 0]);
    pulsePhase = true;
  });

  // Schedule the complete pulse check from the initial turn, matching the
  // proven PR #4 reproducer and keeping test sequencing out of the result.
  schedule(180, function() {
    digitalPulse(PINS.PULSE_OUT, 1, [20, 20, 20]);
  });

  schedule(420, function() {
    clearWatch(watchId);
    metric("gpio_pulse_callbacks", pulseStates.length);
    expectJsonEq("gpio_pulse_states", pulseStates, [1, 0, 1, 0]);
    expectEq("gpio_pulse_final_low", digitalRead(PINS.PULSE_IN), 0);
    finish();
  });
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";

  echo(false);
  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "digitalPulse,setWatch,clearWatch,pinMode,digitalWrite");

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

  runWritePhase();
}

run();
