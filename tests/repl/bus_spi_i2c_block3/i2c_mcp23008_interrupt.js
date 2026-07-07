// Block 3 MCP23008 I2C interrupt functional test
// Covers: I2C.setup, I2C.writeTo, I2C.readFrom, pinMode, digitalRead

echo(false);

var TEST_NAME = "i2c_mcp23008_interrupt";
var TARGET = "AUTO";
var TIMEOUT_MS = 2500;
var SETTLE_MS = 50;
var MCP23008_ADDR = 0x20;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    I2C_PORT : "I2C1",
    I2C_SDA : "D21",
    I2C_SCL : "D22",
    I2C_INT : "D35"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_I2C",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D1=a1-b1 SEL_D4=a1-b1 SEL_D10=a1-b1 SEL_D2=a1-b1(feedback) SEL_D3 not SPI/UART J10=open SEL_D08=open SEL_D0=open",
    I2C_PORT : "I2C1",
    I2C_SDA : "D1",
    I2C_SCL : "D4",
    I2C_INT : "D10"
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
    I2C_PORT : resolvePort(cfg.I2C_PORT),
    I2C_SDA  : resolvePin(cfg.I2C_SDA),
    I2C_SCL  : resolvePin(cfg.I2C_SCL),
    I2C_INT  : resolvePin(cfg.I2C_INT)
  };

  if (!resolved.I2C_PORT || !resolved.I2C_SDA ||
      !resolved.I2C_SCL || !resolved.I2C_INT) {
    return null;
  }

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
var i2cReady = false;

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
  if (actual === expected) pass(name, "got=" + actual + " expected=" + expected);
  else fail(name, "got=" + actual + " expected=" + expected);
}

function expectMask(name, actual, mask, expectedMasked) {
  var masked = actual & mask;
  if (masked === expectedMasked) {
    pass(name, "got=" + masked + " expected=" + expectedMasked + " raw=" + actual);
  } else {
    fail(name, "got=" + masked + " expected=" + expectedMasked + " raw=" + actual);
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

function rdI2C(reg, n) {
  PINS.I2C_PORT.writeTo(MCP23008_ADDR, reg);
  return PINS.I2C_PORT.readFrom(MCP23008_ADDR, n || 1);
}

function wrI2C(reg, value) {
  PINS.I2C_PORT.writeTo(MCP23008_ADDR, [reg, value]);
}

function cleanup() {
  clearAllTimers();

  if (i2cReady) {
    safeCall(function() { wrI2C(0x0A, 0x00); });
    safeCall(function() { rdI2C(0x08, 1); });
  }

  if (!PINS) return;
  safeCall(function() { pinMode(PINS.I2C_INT, "input"); });
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

function runClearPhase() {
  wrI2C(0x0A, 0x01);
  rdI2C(0x08, 1);

  schedule(SETTLE_MS, function() {
    var intClear = digitalRead(PINS.I2C_INT);
    metric("i2c_mcp23008_int_clear", intClear);
    expectEq("i2c_mcp23008_int_clear", intClear, 1);
    finish();
  });
}

function runAssertPhase() {
  var intAssert = digitalRead(PINS.I2C_INT);
  var intf = rdI2C(0x07, 1)[0];
  var intcap = rdI2C(0x08, 1)[0];

  metric("i2c_mcp23008_int_assert", intAssert);
  metric("i2c_mcp23008_intf", intf);
  metric("i2c_mcp23008_intcap", intcap);

  expectEq("i2c_mcp23008_int_assert", intAssert, 0);
  expectMask("i2c_mcp23008_intf_gp2", intf, 0x04, 0x04);
  expectMask("i2c_mcp23008_intcap_gp2", intcap, 0x04, 0x04);

  schedule(SETTLE_MS, runClearPhase);
}

function runTriggerPhase() {
  wrI2C(0x0A, 0x03);
  schedule(SETTLE_MS, runAssertPhase);
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "I2C.setup,I2C.writeTo,I2C.readFrom,pinMode,digitalRead");

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
  info("i2c_port", CFG.I2C_PORT);
  info("i2c_sda", CFG.I2C_SDA);
  info("i2c_scl", CFG.I2C_SCL);
  info("i2c_int", CFG.I2C_INT);
  info("i2c_addr", "0x20");

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  pinMode(PINS.I2C_INT, "input");

  try {
    PINS.I2C_PORT.setup({scl:PINS.I2C_SCL, sda:PINS.I2C_SDA, bitrate:100000});
    i2cReady = true;
  } catch (e) {
    fail("i2c_setup", "" + e);
    finish();
    return;
  }

  wrI2C(0x00, 0xFC);
  wrI2C(0x06, 0x00);
  wrI2C(0x02, 0x04);
  wrI2C(0x03, 0x00);
  wrI2C(0x04, 0x04);
  wrI2C(0x0A, 0x00);

  schedule(SETTLE_MS, function() {
    var intIdle = digitalRead(PINS.I2C_INT);
    metric("i2c_mcp23008_int_idle", intIdle);
    expectEq("i2c_mcp23008_int_idle", intIdle, 1);
    runTriggerPhase();
  });
}

run();
