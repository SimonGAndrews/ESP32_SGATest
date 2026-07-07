// Grove I2C block 8 secondary MCP23008 functional test
// Covers: I2C.setup, I2C.writeTo, I2C.readFrom

echo(false);

var TEST_NAME = "i2c_grove_mcp23008_secondary";
var TARGET = "AUTO";
var TIMEOUT_MS = 2000;
var ONBOARD_ADDR = 0x20;
var EXT_ADDR = 0x21;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    externalInfo : "external Grove MCP23008 fitted at 0x21 on J_Grove_I2C1",
    I2C_PORT : "I2C1",
    I2C_SDA : "D21",
    I2C_SCL : "D22"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_I2C",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D1=a1-b1 SEL_D4=a1-b1 SEL_D10=a1-b1 SEL_D2=a1-b1(feedback if fitted) SEL_D3 not SPI/UART J10=open SEL_D08=open SEL_D0=open",
    externalInfo : "external Grove MCP23008 fitted at 0x21 on Grove I2C connector",
    I2C_PORT : "I2C1",
    I2C_SDA : "D1",
    I2C_SCL : "D4"
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
    I2C_SCL  : resolvePin(cfg.I2C_SCL)
  };

  if (!resolved.I2C_PORT || !resolved.I2C_SDA || !resolved.I2C_SCL) {
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

function rd(addr, reg, n) {
  PINS.I2C_PORT.writeTo(addr, reg);
  return PINS.I2C_PORT.readFrom(addr, n || 1);
}

function wr(addr, reg, value) {
  PINS.I2C_PORT.writeTo(addr, [reg, value]);
}

function cleanup() {
  if (!i2cReady) return;

  safeCall(function() { wr(EXT_ADDR, 0x00, 0xFF); });
  safeCall(function() { wr(EXT_ADDR, 0x05, 0x00); });
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
  var onboardBefore;
  var extIodirBefore;
  var extIoconBefore;
  var extIoconSet;
  var extIodirSet;
  var extIodirRestore;
  var extIoconRestore;
  var onboardAfter;

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "I2C.setup,I2C.writeTo,I2C.readFrom");

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
  info("external", CFG.externalInfo);
  info("i2c_port", CFG.I2C_PORT);
  info("i2c_sda", CFG.I2C_SDA);
  info("i2c_scl", CFG.I2C_SCL);
  info("onboard_addr", "0x20");
  info("ext_addr", "0x21");

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  try {
    PINS.I2C_PORT.setup({scl:PINS.I2C_SCL, sda:PINS.I2C_SDA, bitrate:100000});
    i2cReady = true;
  } catch (e) {
    fail("i2c_setup", "" + e);
    finish();
    return;
  }

  try {
    onboardBefore = rd(ONBOARD_ADDR, 0x00, 1)[0];
    extIodirBefore = rd(EXT_ADDR, 0x00, 1)[0];
    extIoconBefore = rd(EXT_ADDR, 0x05, 1)[0];

    wr(EXT_ADDR, 0x05, 0x20);
    extIoconSet = rd(EXT_ADDR, 0x05, 1)[0];

    wr(EXT_ADDR, 0x00, 0xF0);
    extIodirSet = rd(EXT_ADDR, 0x00, 1)[0];

    wr(EXT_ADDR, 0x00, 0xFF);
    extIodirRestore = rd(EXT_ADDR, 0x00, 1)[0];

    wr(EXT_ADDR, 0x05, 0x00);
    extIoconRestore = rd(EXT_ADDR, 0x05, 1)[0];

    onboardAfter = rd(ONBOARD_ADDR, 0x00, 1)[0];
  } catch (e) {
    fail("i2c_transfer", "" + e);
    finish();
    return;
  }

  metric("onboard_iodir_before", onboardBefore);
  metric("ext_iodir_before", extIodirBefore);
  metric("ext_iocon_before", extIoconBefore);
  metric("ext_iocon_set", extIoconSet);
  metric("ext_iodir_set", extIodirSet);
  metric("ext_iodir_restore", extIodirRestore);
  metric("ext_iocon_restore", extIoconRestore);
  metric("onboard_iodir_after", onboardAfter);

  expectTrue("grove_onboard_iodir_reachable", onboardBefore >= 0 && onboardBefore <= 255, "value=" + onboardBefore);
  expectEq("grove_ext_iodir_before", extIodirBefore, 0xFF);
  expectEq("grove_ext_iocon_before", extIoconBefore, 0x00);
  expectEq("grove_ext_iocon_set", extIoconSet, 0x20);
  expectEq("grove_ext_iodir_set", extIodirSet, 0xF0);
  expectEq("grove_ext_iodir_restore", extIodirRestore, 0xFF);
  expectEq("grove_ext_iocon_restore", extIoconRestore, 0x00);
  expectEq("grove_onboard_unchanged", onboardAfter, onboardBefore);

  finish();
}

run();
