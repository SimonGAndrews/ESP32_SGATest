// Observe callback and public-event counts for one deliberate disconnect.
// global.WIFI_TEST_CONFIG must contain ssid and password. The local runner
// injects these ignored credentials with serial echo disabled.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var connectCallbacks = 0;
  var disconnectCallbacks = 0;
  var disconnectedEvents = 0;
  var finished = false;
  var overallTimer;

  function finish(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    wifi.removeAllListeners();
    print(
      "METRIC deliberate_disconnect=" +
      JSON.stringify({
        connectCallbackCount:connectCallbacks,
        disconnectCallbackCount:disconnectCallbacks,
        disconnectedEventCount:disconnectedEvents,
        status:wifi.getStatus(),
        ip:wifi.getIP(),
        reason:reason
      })
    );
    print("PASS disconnect_counts_observed");
    print("DONE=PASS");
  }

  print("TEST=esp32_wifi_disconnect_connected");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  wifi.removeAllListeners();
  wifi.on("disconnected", function (details) {
    disconnectedEvents++;
    print("INFO disconnected_event=" + JSON.stringify(details));
  });

  overallTimer = setTimeout(function () {
    finish("overall_timeout");
  }, 30000);

  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      connectCallbacks++;
      print("INFO connect_callback=" + JSON.stringify(error));
      if (error || wifi.getIP().ip === "0.0.0.0") {
        finish("connect_failed");
        return;
      }
      setTimeout(function () {
        wifi.disconnect(function () {
          disconnectCallbacks++;
          print("INFO disconnect_callback=" + disconnectCallbacks);
        });
        setTimeout(function () {
          finish("observation_complete");
        }, 3000);
      }, 500);
    });
  }, 750);
}());
