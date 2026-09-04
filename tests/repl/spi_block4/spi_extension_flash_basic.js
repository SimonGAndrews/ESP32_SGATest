// spi_block4 shared SPI flash-extension functional test
// Covers: SPI.setup, SPI.send, digitalWrite, pinMode

echo(false);

var TEST_NAME = "spi_extension_flash_basic";
var TARGET = "AUTO";
var TIMEOUT_MS = 3000;
var SETTLE_MS = 120;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    supported : true,
    SPI_PORT : "SPI1",
    SPI_MISO : "D19",
    SPI_MOSI : "D23",
    SPI_SCK : "D18",
    SPI_CS_ADC : "D16",
    SPI_CS_FLASH : "D17",
    PWM_OUT : "D27",
    EXPECT_FLASH_MFR : "ef"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_SPI_FLASH_EXTENDED",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D3=a1-b1 D5/D6/D7 fixed SEL_D10=a2-b2(flash-CS) SEL_D08=closed(after safe boot) J10=open",
    supported : true,
    SPI_PORT : "SPI1",
    SPI_MISO : "D3",
    SPI_MOSI : "D5",
    SPI_SCK : "D6",
    SPI_CS_ADC : "D7",
    SPI_CS_FLASH : "D10",
    PWM_OUT : "D8",
    EXPECT_FLASH_MFR : "ef"
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
  if (!cfg || !cfg.supported) return {};

  var resolved = {
    SPI_PORT : resolvePort(cfg.SPI_PORT),
    SPI_MISO : resolvePin(cfg.SPI_MISO),
    SPI_MOSI : resolvePin(cfg.SPI_MOSI),
    SPI_SCK : resolvePin(cfg.SPI_SCK),
    SPI_CS_ADC : resolvePin(cfg.SPI_CS_ADC),
    SPI_CS_FLASH : resolvePin(cfg.SPI_CS_FLASH),
    PWM_OUT : resolvePin(cfg.PWM_OUT)
  };

  if (!resolved.SPI_PORT || !resolved.SPI_MISO || !resolved.SPI_MOSI ||
      !resolved.SPI_SCK || !resolved.SPI_CS_ADC || !resolved.SPI_CS_FLASH ||
      !resolved.PWM_OUT) {
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
var result = {
  adcLow : 0,
  adcHigh : 0,
  flashJedecRaw : "",
  flashMfr : "",
  flashType : "",
  flashCap : "",
  flashSr1Raw : "",
  flashSr1 : ""
};

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

function skip(name, extra) {
  print("SKIP " + name + (extra ? " " + extra : ""));
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

  safeCall(function() { digitalWrite(PINS.PWM_OUT, 0); });
  safeCall(function() { pinMode(PINS.PWM_OUT, "input"); });
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

function isHexString(s, len) {
  if (!s || s.length !== len) return false;
  return /^[0-9a-f]+$/.test(s);
}

function rdMcp3008Raw() {
  return PINS.SPI_PORT.send([1, 128, 0], PINS.SPI_CS_ADC);
}

function decodeMcp3008(raw) {
  return ((raw[1] & 3) << 8) | raw[2];
}

function rdMcp3008Stable(pickHigh) {
  var raw = rdMcp3008Raw();
  var best = decodeMcp3008(raw);

  for (var i = 0; i < 4; i++) {
    raw = rdMcp3008Raw();
    var value = decodeMcp3008(raw);
    if (pickHigh ? (value > best) : (value < best)) best = value;
  }

  return best;
}

function runChecks() {
  expectTrue("spi_extension_adc_low", result.adcLow < 50, "value=" + result.adcLow);
  expectTrue("spi_extension_adc_high", result.adcHigh > 950, "value=" + result.adcHigh);
  expectTrue("spi_extension_adc_span", (result.adcHigh - result.adcLow) > 900,
             "span=" + (result.adcHigh - result.adcLow));
  expectTrue("spi_extension_jedec_shape", isHexString(result.flashJedecRaw, 8),
             "raw=" + result.flashJedecRaw);
  expectTrue("spi_extension_mfr_expected", result.flashMfr === CFG.EXPECT_FLASH_MFR,
             "mfr=" + result.flashMfr + " expected=" + CFG.EXPECT_FLASH_MFR);
  expectTrue("spi_extension_type_present", result.flashType !== "00" && result.flashType !== "ff",
             "type=" + result.flashType);
  expectTrue("spi_extension_cap_present", result.flashCap !== "00" && result.flashCap !== "ff",
             "cap=" + result.flashCap);
  expectTrue("spi_extension_sr1_shape", isHexString(result.flashSr1Raw, 4),
             "raw=" + result.flashSr1Raw);
  expectTrue("spi_extension_sr1_readable", result.flashSr1 !== "ff", "sr1=" + result.flashSr1);

  finish();
}

function runHighPhase() {
  result.adcHigh = rdMcp3008Stable(true);
  metric("spi_extension_adc_high", result.adcHigh);
  runChecks();
}

function runFlashPhase() {
  var jedec = PINS.SPI_PORT.send([0x9F, 0, 0, 0], PINS.SPI_CS_FLASH);
  var sr1 = PINS.SPI_PORT.send([0x05, 0], PINS.SPI_CS_FLASH);

  result.flashJedecRaw = bytesToHex(jedec);
  result.flashMfr = hex2(jedec[1]).toLowerCase();
  result.flashType = hex2(jedec[2]).toLowerCase();
  result.flashCap = hex2(jedec[3]).toLowerCase();
  result.flashSr1Raw = bytesToHex(sr1);
  result.flashSr1 = hex2(sr1[1]).toLowerCase();

  metric("spi_extension_jedec_raw", result.flashJedecRaw);
  metric("spi_extension_mfr", result.flashMfr);
  metric("spi_extension_type", result.flashType);
  metric("spi_extension_cap", result.flashCap);
  metric("spi_extension_sr1_raw", result.flashSr1Raw);
  metric("spi_extension_sr1", result.flashSr1);

  digitalWrite(PINS.PWM_OUT, 1);
  schedule(SETTLE_MS, runHighPhase);
}

function runLowPhase() {
  result.adcLow = rdMcp3008Stable(false);
  metric("spi_extension_adc_low", result.adcLow);
  schedule(0, runFlashPhase);
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "SPI.setup,SPI.send,digitalWrite,pinMode");

  if (!CFG) {
    fail("config_resolve", "target=" + TARGET + " board=" + boardId);
    finish();
    return;
  }

  info("harness", CFG.harnessName);
  info("mode", CFG.mode);
  info("console", CFG.consoleInfo);
  info("selectors", CFG.selectorInfo);

  if (!CFG.supported) {
    skip("unsupported_target", "target=" + CFG.name + " reason=" + CFG.skipReason);
    finish();
    return;
  }

  if (!PINS) {
    fail("pin_resolve", "target=" + CFG.name);
    finish();
    return;
  }

  info("spi_port", CFG.SPI_PORT);
  info("spi_miso", CFG.SPI_MISO);
  info("spi_mosi", CFG.SPI_MOSI);
  info("spi_sck", CFG.SPI_SCK);
  info("spi_cs_adc", CFG.SPI_CS_ADC);
  info("spi_cs_flash", CFG.SPI_CS_FLASH);
  info("pwm_out", CFG.PWM_OUT);
  info("expect_flash_mfr", CFG.EXPECT_FLASH_MFR);

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  PINS.SPI_PORT.setup({miso:PINS.SPI_MISO, mosi:PINS.SPI_MOSI, sck:PINS.SPI_SCK});
  pinMode(PINS.PWM_OUT, "output");
  digitalWrite(PINS.PWM_OUT, 0);

  schedule(SETTLE_MS, runLowPhase);
}

run();
