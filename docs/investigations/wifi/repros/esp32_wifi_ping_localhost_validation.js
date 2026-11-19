// Verify the Espruino-specific "localhost" IPv4 parsing behaviour used by
// the ESP32 Wifi.ping() wrapper. No callback or network is required.
echo(false);

(function () {
  var accepted = false;

  print("TEST=esp32_wifi_ping_localhost_validation");
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);

  try {
    require("Wifi").ping("localhost");
    accepted = true;
    print("LOCALHOST_CALL=accepted");
  } catch (error) {
    print("LOCALHOST_CALL=rejected " + error);
  }

  setTimeout(function () {
    print("RESULT=" + (accepted ? "PASS" : "FAIL"));
    print("DONE=esp32_wifi_ping_localhost_validation");
  }, 6500);
}());
