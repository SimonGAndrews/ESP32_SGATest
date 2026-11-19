// Verify that "localhost" is parsed as loopback and delivers the normal five
// Wifi.ping() callbacks on the classic ESP32 target.
echo(false);

(function () {
  var callbackCount = 0;
  var valid = true;
  var finished = false;
  var overallTimer;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    print("CALLBACK_COUNT=" + callbackCount);
    print("RESULT=" + (ok ? "PASS" : "FAIL") + " " + reason);
    print("DONE=esp32_wifi_ping_localhost_callback");
  }

  print("TEST=esp32_wifi_ping_localhost_callback");
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);

  overallTimer = setTimeout(function () {
    finish(false, "callback_timeout");
  }, 7000);

  try {
    require("Wifi").ping("localhost", function (result) {
      callbackCount++;
      print("PING_CALLBACK=" + JSON.stringify(result));
      if (!result || result.totalCount !== callbackCount ||
          result.seqNo !== callbackCount || result.timeoutCount !== 0 ||
          result.bytes !== 64 || result.error !== 0) {
        valid = false;
      }
      if (callbackCount === 5) {
        finish(valid, valid ? "five_callbacks" : "invalid_result");
      }
    });
    print("LOCALHOST_CALL=accepted");
  } catch (error) {
    print("LOCALHOST_CALL=rejected " + error);
    finish(false, "call_rejected");
  }
}());
