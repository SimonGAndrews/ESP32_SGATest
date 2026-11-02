// Characterise Wifi.disconnect() after a scan-started idle station and while a
// connection attempt is active. No credentials or external peer are needed.
echo(false);

(function () {
  var wifi = require("Wifi");
  var idleDisconnectCallbacks = 0;
  var idleDisconnectEvents = 0;
  var cancelConnectCallbacks = 0;
  var cancelDisconnectCallbacks = 0;
  var cancelDisconnectEvents = 0;
  var overallTimer;

  print("TEST=esp32_wifi_disconnect_idle_and_cancel");
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);

  function finish() {
    clearTimeout(overallTimer);
    wifi.removeAllListeners();
    wifi.disconnect();
    print("PASS disconnect_states_observed");
    print("DONE=PASS");
  }

  function runCancelProbe() {
    wifi.removeAllListeners();
    wifi.on("disconnected", function (details) {
      cancelDisconnectEvents++;
      print("INFO cancel_disconnected_event=" + JSON.stringify(details));
    });

    wifi.connect(
      "ESPRUINO_CANCEL_UNAVAILABLE_" + String(Math.round(getTime() * 1000)),
      {password:"not-a-real-password"},
      function (error) {
        cancelConnectCallbacks++;
        print("INFO cancel_connect_callback=" + JSON.stringify(error));
      }
    );
    wifi.disconnect(function () {
      cancelDisconnectCallbacks++;
      print("INFO cancel_disconnect_callback=" + cancelDisconnectCallbacks);
    });

    setTimeout(function () {
      print(
        "METRIC disconnect_during_connect=" +
        JSON.stringify({
          connectCallbackCount:cancelConnectCallbacks,
          disconnectCallbackCount:cancelDisconnectCallbacks,
          disconnectedEventCount:cancelDisconnectEvents,
          status:wifi.getStatus(),
          ip:wifi.getIP()
        })
      );
      finish();
    }, 6000);
  }

  wifi.removeAllListeners();
  wifi.on("disconnected", function (details) {
    idleDisconnectEvents++;
    print("INFO idle_disconnected_event=" + JSON.stringify(details));
  });

  // scan() starts station mode but does not associate with an AP.
  wifi.scan(function (accessPoints) {
    print("INFO scan_complete_count=" + accessPoints.length);
    print("INFO idle_before_disconnect=" + JSON.stringify(wifi.getStatus()));
    wifi.disconnect(function () {
      idleDisconnectCallbacks++;
      print("INFO idle_disconnect_callback=" + idleDisconnectCallbacks);
    });

    setTimeout(function () {
      print(
        "METRIC disconnect_after_idle_scan=" +
        JSON.stringify({
          disconnectCallbackCount:idleDisconnectCallbacks,
          disconnectedEventCount:idleDisconnectEvents,
          status:wifi.getStatus(),
          ip:wifi.getIP()
        })
      );
      runCancelProbe();
    }, 3000);
  });

  overallTimer = setTimeout(function () {
    print("FAIL overall_timeout");
    print("DONE=FAIL");
  }, 30000);
}());
