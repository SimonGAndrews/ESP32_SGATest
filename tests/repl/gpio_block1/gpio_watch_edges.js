// GPIO block 1 watch edge functional test
// Covers: setWatch, clearWatch, pinMode, digitalWrite

var TEST_NAME = "gpio_watch_edges";
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

  echo(true);
  print("DONE=" + TEST_NAME);
}

function runLoopAFinalCheck(states) {
  metric("gpio_watch_loop_a_callbacks", states.length);
  expectJsonEq("gpio_watch_loop_a_both_states", states, [1, 0, 1]);
  expectEq("gpio_watch_loop_a_clear", states.length, 3);
  runLoopBRising();
}

function runLoopABoth() {
  var states = [];
  var watchId;

  pinMode(PINS.GPIO_LOOP_A_OUT, "output");
  pinMode(PINS.GPIO_LOOP_A_IN, "input");
  digitalWrite(PINS.GPIO_LOOP_A_OUT, 0);

  watchId = addWatch(PINS.GPIO_LOOP_A_IN, {repeat:true, edge:"both"}, function(e) {
    states.push(e.state ? 1 : 0);
  });

  schedule(10, function() { digitalWrite(PINS.GPIO_LOOP_A_OUT, 1); });
  schedule(30, function() { digitalWrite(PINS.GPIO_LOOP_A_OUT, 0); });
  schedule(50, function() { digitalWrite(PINS.GPIO_LOOP_A_OUT, 1); });
  schedule(80, function() {
    clearWatch(watchId);
  });
  schedule(100, function() { digitalWrite(PINS.GPIO_LOOP_A_OUT, 0); });
  schedule(120, function() { digitalWrite(PINS.GPIO_LOOP_A_OUT, 1); });
  schedule(160, function() { runLoopAFinalCheck(states); });
}

function runLoopBFalling() {
  var states = [];
  var watchId;

  pinMode(PINS.GPIO_LOOP_B_OUT, "output");
  pinMode(PINS.GPIO_LOOP_B_IN, "input");
  digitalWrite(PINS.GPIO_LOOP_B_OUT, 1);

  watchId = addWatch(PINS.GPIO_LOOP_B_IN, {repeat:true, edge:"falling"}, function(e) {
    states.push(e.state ? 1 : 0);
  });

  schedule(10, function() { digitalWrite(PINS.GPIO_LOOP_B_OUT, 0); });
  schedule(30, function() { digitalWrite(PINS.GPIO_LOOP_B_OUT, 1); });
  schedule(50, function() { digitalWrite(PINS.GPIO_LOOP_B_OUT, 0); });
  schedule(80, function() {
    clearWatch(watchId);
    metric("gpio_watch_loop_b_falling_callbacks", states.length);
    expectJsonEq("gpio_watch_loop_b_falling_states", states, [0, 0]);
    finish();
  });
}

function runLoopBRising() {
  var states = [];
  var watchId;

  pinMode(PINS.GPIO_LOOP_B_OUT, "output");
  pinMode(PINS.GPIO_LOOP_B_IN, "input");
  digitalWrite(PINS.GPIO_LOOP_B_OUT, 0);

  watchId = addWatch(PINS.GPIO_LOOP_B_IN, {repeat:true, edge:"rising"}, function(e) {
    states.push(e.state ? 1 : 0);
  });

  schedule(10, function() { digitalWrite(PINS.GPIO_LOOP_B_OUT, 1); });
  schedule(30, function() { digitalWrite(PINS.GPIO_LOOP_B_OUT, 0); });
  schedule(50, function() { digitalWrite(PINS.GPIO_LOOP_B_OUT, 1); });
  schedule(70, function() { digitalWrite(PINS.GPIO_LOOP_B_OUT, 0); });
  schedule(100, function() {
    clearWatch(watchId);
    metric("gpio_watch_loop_b_rising_callbacks", states.length);
    expectJsonEq("gpio_watch_loop_b_rising_states", states, [1, 1]);
    runLoopBFalling();
  });
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";

  echo(false);
  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "setWatch,clearWatch,pinMode,digitalWrite");

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

  runLoopABoth();
}

run();
