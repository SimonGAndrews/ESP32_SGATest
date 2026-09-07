// ESP32 first receive after UART reconfiguration reproduction.
// Cross-connect D4 -> D36 and D14 -> D35. Use UART0 for the REPL.
echo(false);
print("TEST=esp32_uart_first_receive");

var iteration = 0;
var failures = 0;
var finished = false;
var deadline = setTimeout(function() {
  if (finished) return;
  finished = true;
  Serial2.unsetup();
  Serial3.unsetup();
  print("FAIL timeout iteration=" + iteration);
  print("DONE=esp32_uart_first_receive");
}, 12000);

function next() {
  if (finished) return;
  if (iteration >= 10) {
    finished = true;
    clearTimeout(deadline);
    Serial2.unsetup();
    Serial3.unsetup();
    print((failures ? "FAIL" : "PASS") + " failures=" + failures);
    print("DONE=esp32_uart_first_receive");
    return;
  }
  Serial2.unsetup();
  Serial3.unsetup();
  setTimeout(function() {
    var reverse = iteration & 1;
    var baud = reverse ? 57600 : 115200;
    var sender = reverse ? Serial3 : Serial2;
    var receiver = reverse ? Serial2 : Serial3;
    var payload = "UART_" + iteration;

    Serial2.setup(baud, {tx:D4, rx:D35});
    Serial3.setup(baud, {tx:D14, rx:D36});
    receiver.read();
    sender.write(payload);

    setTimeout(function() {
      var got = receiver.read() || "";
      if (got !== payload) {
        failures++;
        print("FAIL iteration=" + iteration +
              " got=" + JSON.stringify(got) +
              " expected=" + JSON.stringify(payload));
      }
      iteration++;
      setTimeout(next, 80);
    }, 180);
  }, 80);
}

next();
