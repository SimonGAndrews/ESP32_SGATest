// onewire_block5 shared DS18B20 functional test
// Covers: OneWire.reset, OneWire.search, OneWire.skip,
// OneWire.select, OneWire.write, OneWire.read

echo(false);

var TEST_NAME = "onewire_ds18b20_basic";
var TARGET = "AUTO";
var TIMEOUT_MS = 5000;
var SEARCH_PASSES = 6;
var CONVERT_WAIT_MS = 1000;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    ONEWIRE_DQ : "D13"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_ONEWIRE",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D0=ONEWIRE a1-b1, analog position open; I2C links may remain fitted",
    ONEWIRE_DQ : "D0"
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
    ONEWIRE_DQ : resolvePin(cfg.ONEWIRE_DQ)
  };

  if (!resolved.ONEWIRE_DQ) return null;
  return resolved;
}

var CFG = resolveCfg();
var PINS = resolvePins(CFG);
var OW = null;
var done = false;
var timeoutId;
var checksTotal = 0;
var checksPassed = 0;
var checksFailed = 0;
var scans = [];
var roms = [];
var scratchpads = [];
var temperatures = [];

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

function cleanup() {
  if (!PINS) return;
  safeCall(function() { pinMode(PINS.ONEWIRE_DQ, "input"); });
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

function hex2(n) {
  return ("0" + n.toString(16)).slice(-2);
}

function bytesToHex(a) {
  var s = "";
  for (var i = 0; i < a.length; i++) s += hex2(a[i]);
  return s;
}

function crc8Maxim(data) {
  var crc = 0;
  for (var i = 0; i < data.length; i++) {
    var inbyte = data[i];
    for (var bit = 0; bit < 8; bit++) {
      var mix = (crc ^ inbyte) & 1;
      crc >>= 1;
      if (mix) crc ^= 0x8C;
      inbyte >>= 1;
    }
  }
  return crc & 255;
}

function decodeTempC(scratch) {
  var raw = scratch[0] | (scratch[1] << 8);
  if (raw & 0x8000) raw -= 0x10000;
  return raw / 16.0;
}

function isDs18b20Rom(rom) {
  if (typeof rom !== "string" || rom.length !== 16) return false;
  if (rom.charAt(0) !== "2" || rom.charAt(1) !== "8") return false;
  for (var i = 2; i < rom.length; i++) {
    var c = rom.charCodeAt(i);
    var isDigit = c >= 48 && c <= 57;
    var isLowerHex = c >= 97 && c <= 102;
    if (!isDigit && !isLowerHex) return false;
  }
  return true;
}

function isAllFF(data) {
  for (var i = 0; i < data.length; i++) {
    if (data[i] !== 255) return false;
  }
  return true;
}

function readScratch(rom) {
  OW.reset();
  OW.select(rom);
  OW.write(0xBE);

  var data = [];
  for (var i = 0; i < 9; i++) data.push(OW.read());
  return data;
}

function runChecks() {
  var twoRomScans = 0;
  for (var i = 0; i < scans.length; i++) {
    if (scans[i].length === 2) twoRomScans++;
    metric("onewire_scan_" + i, JSON.stringify(scans[i]));
  }

  metric("onewire_device_count", roms.length);
  metric("onewire_roms", JSON.stringify(roms));

  expectTrue("onewire_device_count", roms.length === 2, "count=" + roms.length);
  expectTrue("onewire_search_stability", twoRomScans === scans.length,
             "two_rom_scans=" + twoRomScans + "/" + scans.length);
  expectTrue("onewire_distinct_roms", roms.length === 2 && roms[0] !== roms[1],
             "roms=" + JSON.stringify(roms));
  expectTrue("onewire_family_codes", roms.length === 2 &&
             isDs18b20Rom(roms[0]) && isDs18b20Rom(roms[1]),
             "roms=" + JSON.stringify(roms));

  for (var idx = 0; idx < scratchpads.length; idx++) {
    var scratch = scratchpads[idx];
    var scratchHex = bytesToHex(scratch);
    var crcOk = scratch.length === 9 && crc8Maxim(scratch.slice(0, 8)) === scratch[8];
    var tempC = decodeTempC(scratch);

    temperatures.push(tempC);

    metric("onewire_scratch_" + idx, scratchHex);
    metric("onewire_temp_c_" + idx, tempC);

    expectTrue("onewire_scratch_len_" + idx, scratch.length === 9, "len=" + scratch.length);
    expectTrue("onewire_scratch_crc_" + idx, crcOk, "hex=" + scratchHex);
    expectTrue("onewire_scratch_data_" + idx, !isAllFF(scratch), "hex=" + scratchHex);
    expectTrue("onewire_temp_plausible_" + idx, tempC > -40 && tempC < 125,
               "temp_c=" + tempC);
  }

  expectTrue("onewire_scratch_count", scratchpads.length === roms.length,
             "scratchpads=" + scratchpads.length + " roms=" + roms.length);
  if (temperatures.length === 2) {
    expectTrue("onewire_temp_pair_usable", true,
               "temps=" + temperatures[0] + "," + temperatures[1]);
  }

  finish();
}

function readScratchpads() {
  for (var i = 0; i < roms.length; i++) {
    scratchpads.push(readScratch(roms[i]));
  }
  runChecks();
}

function startConversion() {
  OW.reset();
  OW.skip();
  OW.write(0x44, 1);
  setTimeout(readScratchpads, CONVERT_WAIT_MS);
}

function runSearches() {
  var resetOk = OW.reset();
  metric("onewire_reset", resetOk);
  expectTrue("onewire_reset", resetOk === true, "value=" + resetOk);

  for (var i = 0; i < SEARCH_PASSES; i++) {
    OW.reset();
    var found = OW.search();
    scans.push(found);
    if (found.length >= roms.length) roms = found;
  }

  startConversion();
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "OneWire.reset,OneWire.search,OneWire.skip,OneWire.select,OneWire.write,OneWire.read");

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
  info("onewire_dq", CFG.ONEWIRE_DQ);
  info("search_passes", SEARCH_PASSES);
  info("convert_wait_ms", CONVERT_WAIT_MS);

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  try {
    OW = new OneWire(PINS.ONEWIRE_DQ);
  } catch (e) {
    fail("onewire_setup", "" + e);
    finish();
    return;
  }

  runSearches();
}

run();
