// Serial stream-buffer multi-chunk reproduction.
// Connect D4 (Serial2 TX) directly to D36 (Serial3 RX).
// Deliberately do not attach a Serial3 data listener.
echo(false);
print("TEST=core_stream_buffer_multichunk");

var payload = "";
while (payload.length < 128) payload += "0123456789ABCDEF";
Serial2.setup(115200, {tx:D4, rx:D35});
Serial3.setup(115200, {tx:D14, rx:D36});

setTimeout(function() {
  Serial3.read(); // discard any data present before this test transfer
  Serial2.write(payload);
  setTimeout(function() {
    var got = Serial3.read() || "";
    print((got === payload ? "PASS" : "FAIL") + " received=" + got.length);
    Serial2.unsetup();
    Serial3.unsetup();
    print("DONE=core_stream_buffer_multichunk");
  }, 1500);
}, 300);
