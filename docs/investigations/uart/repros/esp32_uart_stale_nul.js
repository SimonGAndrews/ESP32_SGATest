// ESP32 stale receive-byte reproduction.
// Cross-connect D4 -> D36 and D14 -> D35. Use UART0 for the REPL.
// No final unsetup is performed, so the test stops at the observed symptom.
echo(false);
print("TEST=esp32_uart_stale_nul");

var cases = [
  {baud:115200, reverse:false, text:"UART_0"},
  {baud: 57600, reverse:true,  text:"UART_1"},
  {baud:115200, reverse:false, text:"UART_2"}
];

var index = 0;

function finish(result) {
  echo(true);
  print(result);
  print("DONE=esp32_uart_stale_nul");
}

function runCase() {
  if (index >= cases.length) {
    finish("NOT REPRODUCED");
    return;
  }

  if (index) {
    Serial2.unsetup();
    Serial3.unsetup();
  }

  setTimeout(function() {
    var c = cases[index];
    var sender = c.reverse ? Serial3 : Serial2;
    var receiver = c.reverse ? Serial2 : Serial3;

    Serial2.setup(c.baud, {tx:D4, rx:D35});
    Serial3.setup(c.baud, {tx:D14, rx:D36});

    receiver.read();
    sender.write(c.text);

    setTimeout(function() {
      var got = receiver.read() || "";
      print("CASE=" + index +
            " BAUD=" + c.baud +
            " RECEIVED=" + JSON.stringify(got));

      if (got.indexOf("\0") >= 0) {
        finish("REPRODUCED unsolicited NUL");
        return;
      }

      index++;
      setTimeout(runCase, 80);
    }, 180);
  }, 80);
}

runCase();
