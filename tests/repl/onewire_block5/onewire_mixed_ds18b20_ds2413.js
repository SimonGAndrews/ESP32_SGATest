// onewire_block5 mixed-family functional test for DS18B20 + DS2413
// Covers: OneWire.reset, OneWire.search, OneWire.skip,
// OneWire.select, OneWire.write, OneWire.read

echo(false);

var TEST_NAME = "onewire_mixed_ds18b20_ds2413";
var TARGET = "AUTO";
var TIMEOUT_MS = 6000;
var SEARCH_PASSES = 6;
var CONVERT_WAIT_MS = 1000;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open; DS2413 fitted; D13 restored to harness OneWire bus",
    ONEWIRE_DQ : "D13"
  }
};

var DS2413_STEPS = [
  { name : "release", value : 0xFF, confirm : "aa", status : "0f" },
  { name : "both_low", value : 0xFC, confirm : "aa", status : "f0" },
  { name : "release_again", value : 0xFF, confirm : "aa", status : "0f" }
];

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
var ds18Roms = [];
var ds2413Roms = [];
var scratchpads = [];
var ds2413Results = [];

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

function isFamilyRom(rom, prefix) {
  if (typeof rom !== "string" || rom.length !== 16) return false;
  if (rom.slice(0, 2) !== prefix) return false;
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

function canonicalScan(scan) {
  return scan.slice().sort().join(",");
}

function classifyRoms() {
  ds18Roms = [];
  ds2413Roms = [];
  for (var i = 0; i < roms.length; i++) {
    if (isFamilyRom(roms[i], "28")) ds18Roms.push(roms[i]);
    if (isFamilyRom(roms[i], "3a")) ds2413Roms.push(roms[i]);
  }
}

function readScratch(rom) {
  OW.reset();
  OW.select(rom);
  OW.write(0xBE);

  var data = [];
  for (var i = 0; i < 9; i++) data.push(OW.read());
  return data;
}

function wrDs2413(rom, value) {
  OW.reset();
  OW.select(rom);
  OW.write(0x5A);
  OW.write(value);
  OW.write((~value) & 255);
  var confirm = OW.read();
  var status = OW.read();
  OW.reset();
  return {
    write : hex2(value),
    confirm : hex2(confirm),
    status : hex2(status)
  };
}

function runChecks() {
  var expectedSet = canonicalScan(roms);
  var stableFullScans = 0;

  for (var i = 0; i < scans.length; i++) {
    metric("onewire_scan_" + i, JSON.stringify(scans[i]));
    if (scans[i].length === 3 && canonicalScan(scans[i]) === expectedSet) stableFullScans++;
  }

  metric("onewire_device_count", roms.length);
  metric("onewire_roms", JSON.stringify(roms));
  metric("onewire_ds18_roms", JSON.stringify(ds18Roms));
  metric("onewire_ds2413_roms", JSON.stringify(ds2413Roms));

  expectTrue("onewire_device_count", roms.length === 3, "count=" + roms.length);
  expectTrue("onewire_search_stability", stableFullScans === scans.length,
             "full_mixed_scans=" + stableFullScans + "/" + scans.length);
  expectTrue("onewire_family_mix", ds18Roms.length === 2 && ds2413Roms.length === 1,
             "ds18=" + ds18Roms.length + " ds2413=" + ds2413Roms.length);
  expectTrue("onewire_distinct_roms", roms.length === 3 &&
             roms[0] !== roms[1] && roms[0] !== roms[2] && roms[1] !== roms[2],
             "roms=" + JSON.stringify(roms));

  for (var idx = 0; idx < scratchpads.length; idx++) {
    var scratch = scratchpads[idx];
    var scratchHex = bytesToHex(scratch);
    var crcOk = scratch.length === 9 && crc8Maxim(scratch.slice(0, 8)) === scratch[8];
    var tempC = decodeTempC(scratch);

    metric("onewire_scratch_" + idx, scratchHex);
    metric("onewire_temp_c_" + idx, tempC);

    expectTrue("onewire_scratch_len_" + idx, scratch.length === 9, "len=" + scratch.length);
    expectTrue("onewire_scratch_crc_" + idx, crcOk, "hex=" + scratchHex);
    expectTrue("onewire_scratch_data_" + idx, !isAllFF(scratch), "hex=" + scratchHex);
    expectTrue("onewire_temp_plausible_" + idx, tempC > -40 && tempC < 125,
               "temp_c=" + tempC);
  }

  expectTrue("onewire_scratch_count", scratchpads.length === ds18Roms.length,
             "scratchpads=" + scratchpads.length + " ds18_roms=" + ds18Roms.length);

  expectTrue("ds2413_count", ds2413Results.length === DS2413_STEPS.length,
             "results=" + ds2413Results.length);
  for (var stepIdx = 0; stepIdx < ds2413Results.length; stepIdx++) {
    var expected = DS2413_STEPS[stepIdx];
    var actual = ds2413Results[stepIdx];
    metric("ds2413_step_" + stepIdx, JSON.stringify(actual));
    expectTrue("ds2413_confirm_" + expected.name, actual.confirm === expected.confirm,
               "result=" + JSON.stringify(actual));
    expectTrue("ds2413_status_" + expected.name, actual.status === expected.status,
               "result=" + JSON.stringify(actual));
  }

  finish();
}

function runDs2413Checks() {
  if (ds2413Roms.length === 1) {
    for (var i = 0; i < DS2413_STEPS.length; i++) {
      ds2413Results.push(wrDs2413(ds2413Roms[0], DS2413_STEPS[i].value));
    }
  }
  runChecks();
}

function readScratchpads() {
  if (ds18Roms.length === 2) {
    for (var i = 0; i < ds18Roms.length; i++) {
      scratchpads.push(readScratch(ds18Roms[i]));
    }
  }
  runDs2413Checks();
}

function startConversion() {
  if (ds18Roms.length !== 2) {
    runDs2413Checks();
    return;
  }
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

  classifyRoms();
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
  info("mixed_expectation", "2xDS18B20 + 1xDS2413");

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
