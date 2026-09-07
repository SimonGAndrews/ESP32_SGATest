// ESP32 Serial.setup()/unsetup() lifecycle reproduction.
// No external UART wiring is required. Use UART0 for the REPL.
echo(false);
print("TEST=esp32_uart_driver_lifecycle");

var iteration = 0;
var finished = false;
var deadline = setTimeout(function() {
  if (finished) return;
  finished = true;
  Serial2.unsetup();
  print("FAIL timeout iteration=" + iteration);
  print("DONE=esp32_uart_driver_lifecycle");
}, 30000);

function next() {
  if (finished) return;
  if (iteration >= 100) {
    finished = true;
    clearTimeout(deadline);
    Serial2.unsetup();
    print("PASS iterations=" + iteration);
    print("DONE=esp32_uart_driver_lifecycle");
    return;
  }
  Serial2.setup(115200, {tx:D4, rx:D35});
  setTimeout(function() {
    Serial2.unsetup();
    iteration++;
    if (!(iteration % 10)) print("INFO iteration=" + iteration);
    setTimeout(next, 5);
  }, 5);
}

next();
