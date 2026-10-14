// Minimal ESP32 Wifi.ping() IPv4-string parser reproducer.
// No Wi-Fi credentials, peer, or harness wiring are required because the
// current failure occurs before an ICMP ping session is created.
echo(false);

var wifi = require("Wifi");
var callbackCount = 0;
var finished = false;
var overallTimeout;

print("TEST=esp32_wifi_ping_ipv4_parse");
print("BOARD=" + process.env.BOARD);
print("VERSION=" + process.version);
print("GIT_COMMIT=" + process.env.GIT_COMMIT);

function finish(result) {
  if (finished) return;
  finished = true;
  clearTimeout(overallTimeout);
  print("RESULT=" + result);
  print("CALLBACK_COUNT=" + callbackCount);
  print("DONE=esp32_wifi_ping_ipv4_parse");
}

overallTimeout = setTimeout(function () {
  finish("CALL_ACCEPTED_CALLBACK_TIMEOUT");
}, 7000);

try {
  // Loopback keeps a corrected test local to the target while still proving
  // that a normal dotted-decimal IPv4 string reaches the ping API.
  wifi.ping("127.0.0.1", function (result) {
    callbackCount++;
    print("PING_CALLBACK=" + JSON.stringify(result));
    if (callbackCount === 5) finish("CALL_ACCEPTED");
  });
  print("CALL_ACCEPTED=true");
} catch (error) {
  print("EXCEPTION=" + String(error));
  finish("CALL_REJECTED");
}
