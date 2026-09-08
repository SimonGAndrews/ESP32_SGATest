// ESP32-family Serial.setup()/unsetup() lifecycle reproduction.
// No external UART wiring is required. Keep the normal console connection.

echo(false);
print("TEST=esp32_uart_driver_lifecycle_family");

var boardId = process.env.BOARD || "UNKNOWN";
var configs = {
  ESP32:        {port:Serial2, tx:D4, rx:D35, pins:"D4/D35"},
  ESP32_IDF4:   {port:Serial2, tx:D4, rx:D35, pins:"D4/D35"},
  ESP32_IDF5:   {port:Serial2, tx:D4, rx:D35, pins:"D4/D35"},
  ESP32C3_IDF4: {port:Serial2, tx:D3, rx:D4,  pins:"D3/D4"},
  ESP32C3_IDF5: {port:Serial2, tx:D3, rx:D4,  pins:"D3/D4"},
  ESP32S3_IDF4: {port:Serial2, tx:D4, rx:D7,  pins:"D4/D7"},
  ESP32S3_IDF5: {port:Serial2, tx:D4, rx:D7,  pins:"D4/D7"}
};
var cfg = configs[boardId];
var iteration = 0;
var finished = false;
var deadline;

function finish(result) {
  if (finished) return;
  finished = true;
  if (deadline) clearTimeout(deadline);
  if (cfg) {
    try { cfg.port.unsetup(); } catch (e) {}
  }
  echo(true);
  print(result);
  print("DONE=esp32_uart_driver_lifecycle_family");
}

function next() {
  if (finished) return;
  if (iteration >= 100) {
    finish("PASS iterations=" + iteration);
    return;
  }
  try {
    cfg.port.setup(115200, {tx:cfg.tx, rx:cfg.rx});
  } catch (e) {
    finish("FAIL setup iteration=" + iteration + " error=" + e);
    return;
  }
  setTimeout(function() {
    try {
      cfg.port.unsetup();
    } catch (e) {
      finish("FAIL unsetup iteration=" + iteration + " error=" + e);
      return;
    }
    iteration++;
    if (!(iteration % 10)) print("INFO iteration=" + iteration);
    setTimeout(next, 5);
  }, 5);
}

print("INFO board=" + boardId);
if (!cfg) {
  finish("FAIL unsupported_board=" + boardId);
} else {
  print("INFO Serial2_tx_rx=" + cfg.pins);
  deadline = setTimeout(function() {
    finish("FAIL timeout iteration=" + iteration);
  }, 30000);
  next();
}
