// Verify that an active ESP32 IDF5 ping session retains its callback and that
// an overlapping Wifi.ping() call is rejected before a second session starts.
// Loopback requires no Wi-Fi credentials, peer or harness wiring.
echo(false);

(function () {
  var wifi = require("Wifi");
  var firstCount = 0;
  var secondCount = 0;
  var firstAccepted = false;
  var secondRejected = false;

  print("TEST=esp32_wifi_ping_overlap");
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);

  function firstCallback(result) {
    firstCount++;
    print("FIRST_CALLBACK=" + JSON.stringify(result));
  }

  function secondCallback(result) {
    secondCount++;
    print("SECOND_CALLBACK=" + JSON.stringify(result));
  }

  try {
    wifi.ping("127.0.0.1", firstCallback);
    firstAccepted = true;
    print("FIRST_CALL=accepted");
  } catch (error) {
    print("FIRST_CALL=rejected " + error);
  }

  try {
    wifi.ping("127.0.0.1", secondCallback);
    print("SECOND_CALL=accepted");
  } catch (error) {
    secondRejected = true;
    print("SECOND_CALL=rejected " + error);
  }

  setTimeout(function () {
    print("FIRST_COUNT=" + firstCount);
    print("SECOND_COUNT=" + secondCount);
    if (firstAccepted && secondRejected &&
        firstCount === 5 && secondCount === 0) {
      print("DONE=PASS");
    } else {
      print("DONE=FAIL");
    }
  }, 6000);
}());
