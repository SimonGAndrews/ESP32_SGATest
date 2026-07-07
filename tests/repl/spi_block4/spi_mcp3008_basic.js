// spi_block4 MCP3008 SPI functional test
// Covers: SPI.setup, SPI.send, analogRead, digitalWrite, analogWrite, pinMode

echo(false);

var TEST_NAME = "spi_mcp3008_basic";
var TARGET = "AUTO";
var TIMEOUT_MS = 3500;
var SETTLE_MS = 150;
var MID_PWM = 0.5;

var CFGS = {
  ESP32_V1 : {
    name : "ESP32_V1",
    boardIds : ["ESP32_IDF4", "ESP32_IDF5", "ESP32"],
    harnessName : "ESP32 DevKitC V4 / ESP32_V1 harness",
    mode : "ESP32_BASELINE_HARDWARE",
    consoleInfo : "UART0 via board USB-UART on D1/D3",
    selectorInfo : "SEL_D33=1-2 SEL_D26=1-2 SEL_D35=I2C_INT JP_UART_LOOP2=open",
    SPI_PORT : "SPI1",
    SPI_MISO : "D19",
    SPI_MOSI : "D23",
    SPI_SCK : "D18",
    SPI_CS_ADC : "D16",
    PWM_OUT : "D27",
    ADC_IN : "D34"
  },
  ESP32_C3 : {
    name : "ESP32_C3",
    boardIds : ["ESP32C3_IDF4", "ESP32C3_IDF5", "ESP32C3"],
    harnessName : "ESP32-C3-DevKitC-02 harness",
    mode : "C3_BUS_SPI_I2C (SPI subset)",
    consoleInfo : "UART0 via board USB-UART on D20/D21",
    selectorInfo : "SEL_D3=a1-b1 D5/D6/D7 fixed SEL_D08=closed(after safe boot) SEL_D0=a2-b2(ADC_IN) J10=open SEL_D10 not flash-CS",
    SPI_PORT : "SPI1",
    SPI_MISO : "D3",
    SPI_MOSI : "D5",
    SPI_SCK : "D6",
    SPI_CS_ADC : "D7",
    PWM_OUT : "D8",
    ADC_IN : "D0"
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
    SPI_PORT : resolvePort(cfg.SPI_PORT),
    SPI_MISO : resolvePin(cfg.SPI_MISO),
    SPI_MOSI : resolvePin(cfg.SPI_MOSI),
    SPI_SCK : resolvePin(cfg.SPI_SCK),
    SPI_CS_ADC : resolvePin(cfg.SPI_CS_ADC),
    PWM_OUT : resolvePin(cfg.PWM_OUT),
    ADC_IN : resolvePin(cfg.ADC_IN)
  };

  if (!resolved.SPI_PORT || !resolved.SPI_MISO || !resolved.SPI_MOSI ||
      !resolved.SPI_SCK || !resolved.SPI_CS_ADC || !resolved.PWM_OUT ||
      !resolved.ADC_IN) {
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
  targetLow : 0,
  targetMid : 0,
  targetHigh : 0,
  spiLow : 0,
  spiMid : 0,
  spiHigh : 0
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
  safeCall(function() { digitalWrite(PINS.PWM_OUT, 0); });
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

function rdMcp3008Average(count) {
  var total = 0;
  for (var i = 0; i < count; i++) total += decodeMcp3008(rdMcp3008Raw());
  return total / count;
}

function runChecks() {
  var spiLowNorm = result.spiLow / 1023.0;
  var spiMidNorm = result.spiMid / 1023.0;
  var spiHighNorm = result.spiHigh / 1023.0;

  expectTrue("spi_mcp3008_target_low", result.targetLow < 0.10, "value=" + result.targetLow);
  expectTrue("spi_mcp3008_target_high", result.targetHigh > 0.90, "value=" + result.targetHigh);
  expectTrue("spi_mcp3008_target_monotonic",
             result.targetLow < result.targetMid && result.targetMid < result.targetHigh,
             "values=" + [result.targetLow, result.targetMid, result.targetHigh].join(","));
  expectTrue("spi_mcp3008_adc_low", result.spiLow < 50, "value=" + result.spiLow);
  expectTrue("spi_mcp3008_adc_high", result.spiHigh > 950, "value=" + result.spiHigh);
  expectTrue("spi_mcp3008_adc_monotonic",
             result.spiLow < result.spiMid && result.spiMid < result.spiHigh,
             "values=" + [result.spiLow, result.spiMid, result.spiHigh].join(","));
  expectTrue("spi_mcp3008_adc_span", (result.spiHigh - result.spiLow) > 900,
             "span=" + (result.spiHigh - result.spiLow));
  expectTrue("spi_mcp3008_low_agree",
             Math.abs(result.targetLow - spiLowNorm) < 0.10,
             "target=" + result.targetLow + " spi=" + spiLowNorm);
  expectTrue("spi_mcp3008_mid_agree",
             Math.abs(result.targetMid - spiMidNorm) < 0.15,
             "target=" + result.targetMid + " spi=" + spiMidNorm);
  expectTrue("spi_mcp3008_high_agree",
             Math.abs(result.targetHigh - spiHighNorm) < 0.10,
             "target=" + result.targetHigh + " spi=" + spiHighNorm);

  finish();
}

function runHighPhase() {
  result.targetHigh = analogRead(PINS.ADC_IN);
  result.spiHigh = rdMcp3008Stable(true);

  metric("spi_mcp3008_target_high", result.targetHigh);
  metric("spi_mcp3008_adc_high", result.spiHigh);

  analogWrite(PINS.PWM_OUT, MID_PWM);
  schedule(SETTLE_MS, runMidPhase);
}

function runMidPhase() {
  result.targetMid = analogRead(PINS.ADC_IN);
  result.spiMid = rdMcp3008Average(5);

  metric("spi_mcp3008_target_mid", result.targetMid);
  metric("spi_mcp3008_adc_mid", result.spiMid);

  runChecks();
}

function runLowPhase() {
  var raw = rdMcp3008Raw();
  metric("spi_mcp3008_reply_len", raw.length);
  expectTrue("spi_mcp3008_reply_len", raw.length === 3, "value=" + raw.length);

  result.targetLow = analogRead(PINS.ADC_IN);
  result.spiLow = rdMcp3008Stable(false);

  metric("spi_mcp3008_target_low", result.targetLow);
  metric("spi_mcp3008_adc_low", result.spiLow);

  digitalWrite(PINS.PWM_OUT, 1);
  schedule(SETTLE_MS, runHighPhase);
}

function run() {
  var boardId = process.env.BOARD || "UNKNOWN";

  print("TEST=" + TEST_NAME);
  print("TARGET=" + (CFG ? CFG.name : "UNRESOLVED"));
  info("board", boardId);
  info("api", "SPI.setup,SPI.send,analogRead,digitalWrite,analogWrite,pinMode");

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
  info("spi_port", CFG.SPI_PORT);
  info("spi_miso", CFG.SPI_MISO);
  info("spi_mosi", CFG.SPI_MOSI);
  info("spi_sck", CFG.SPI_SCK);
  info("spi_cs_adc", CFG.SPI_CS_ADC);
  info("pwm_out", CFG.PWM_OUT);
  info("adc_in", CFG.ADC_IN);
  info("adc_channel", "MCP3008 CH0");

  timeoutId = setTimeout(function() {
    fail("timeout", "ms=" + TIMEOUT_MS);
    finish();
  }, TIMEOUT_MS);

  PINS.SPI_PORT.setup({miso:PINS.SPI_MISO, mosi:PINS.SPI_MOSI, sck:PINS.SPI_SCK});
  pinMode(PINS.ADC_IN, "input");
  pinMode(PINS.PWM_OUT, "output");
  analogWrite(PINS.PWM_OUT, 0);
  digitalWrite(PINS.PWM_OUT, 0);

  schedule(SETTLE_MS, runLowPhase);
}

run();
