// Verify that a callback-less ping still owns the native session, rejects an
// overlapping call, and releases ownership for a later recovery session.
// Loopback requires no Wi-Fi credentials, peer or harness wiring.
echo(false);

(function () {
  var wifi = require("Wifi");
  var overlapRejected = false;
  var overlapCallbackCount = 0;
  var recoveryCallbackCount = 0;
  var finished = false;
  var overallTimer;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    print("METRIC overlap_rejected=" + overlapRejected);
    print("METRIC overlap_callback_count=" + overlapCallbackCount);
    print("METRIC recovery_callback_count=" + recoveryCallbackCount);
    if (ok) print("PASS " + reason);
    else print("FAIL " + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
  }

  print("TEST=esp32_wifi_ping_no_callback_overlap");
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);

  overallTimer = setTimeout(function () {
    finish(false, "overall_timeout");
  }, 14000);

  try {
    wifi.ping("127.0.0.1");
    print("INFO callbackless_ping=accepted");
  } catch (error) {
    finish(false, "callbackless_ping_rejected " + error);
    return;
  }

  try {
    wifi.ping("127.0.0.1", function () {
      overlapCallbackCount++;
    });
    print("INFO overlap_ping=accepted");
  } catch (error) {
    overlapRejected = String(error).indexOf("already in progress") >= 0;
    print("INFO overlap_ping=rejected " + error);
  }

  setTimeout(function () {
    try {
      wifi.ping("127.0.0.1", function (result) {
        recoveryCallbackCount++;
        print("INFO recovery_result=" + JSON.stringify(result));
        if (recoveryCallbackCount === 5) {
          finish(
            overlapRejected && overlapCallbackCount === 0,
            "callbackless_overlap_and_recovery"
          );
        }
      });
      print("INFO recovery_ping=accepted");
    } catch (error) {
      finish(false, "recovery_ping_rejected " + error);
    }
  }, 4000);
}());
