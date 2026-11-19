// Isolate ESP32 Wifi.ping() IPv4-string validation from result delivery.
// No Wi-Fi credentials, peer or callback are required.
echo(false);

(function () {
  var wifi = require("Wifi");
  var invalidRejected = false;
  var validAccepted = false;

  print("TEST=esp32_wifi_ping_ipv4_validation");
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);

  try {
    wifi.ping("not-an-ip");
    print("INVALID_CALL=accepted");
  } catch (error) {
    invalidRejected = true;
    print("INVALID_CALL=rejected " + error);
  }

  try {
    wifi.ping("127.0.0.1");
    validAccepted = true;
    print("VALID_CALL=accepted");
  } catch (error) {
    print("VALID_CALL=rejected " + error);
  }

  setTimeout(function () {
    print("RESULT=" +
      (invalidRejected && validAccepted ? "PASS" : "FAIL"));
    print("DONE=esp32_wifi_ping_ipv4_validation");
  }, 6500);
}());
