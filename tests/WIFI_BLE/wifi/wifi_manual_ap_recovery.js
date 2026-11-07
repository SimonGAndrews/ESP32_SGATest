// Manual SHED AP outage/restoration test for an IDF5 station candidate.
// The host runner invokes manualWifiReconnect() after the AP is restored.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var disconnectedEvents = 0;
  var initialCallbacks = 0;
  var recoveryCallbacks = 0;
  var recoveryPassed = false;
  var reconnectPending = false;
  var finished = false;

  function snapshot(stage) {
    print("INFO snapshot=" + JSON.stringify({
      stage:stage,
      status:wifi.getStatus(),
      details:wifi.getDetails(),
      ip:wifi.getIP(),
      disconnectedEvents:disconnectedEvents
    }));
  }

  global.manualWifiSummary = function () {
    snapshot("manual_summary");
  };

  global.manualWifiReconnect = function () {
    if (reconnectPending) {
      print("INFO reconnect_already_pending");
      return;
    }
    reconnectPending = true;
    print("INFO reconnect_requested");
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      recoveryCallbacks++;
      reconnectPending = false;
      var ip = wifi.getIP().ip;
      recoveryPassed = !error && ip !== "0.0.0.0";
      print((recoveryPassed ? "PASS " : "FAIL ") +
        "explicit_reconnect error=" + JSON.stringify(error) + " ip=" + ip);
      snapshot("after_reconnect");
      print("READY=FINISH");
    });
  };

  global.manualWifiFinish = function () {
    if (finished) return;
    finished = true;
    var ok = initialCallbacks === 1 && disconnectedEvents >= 1 &&
      recoveryCallbacks === 1 && recoveryPassed;
    print("METRIC initial_connect_callbacks=" + initialCallbacks);
    print("METRIC disconnected_events=" + disconnectedEvents);
    print("METRIC recovery_connect_callbacks=" + recoveryCallbacks);
    print((ok ? "PASS " : "FAIL ") + "manual_ap_recovery");
    print("DONE=" + (ok ? "PASS" : "FAIL"));
  };

  print("TEST=wifi_manual_ap_recovery");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  wifi.removeAllListeners();
  wifi.on("disconnected", function (details) {
    disconnectedEvents++;
    print("INFO disconnected_event=" + JSON.stringify(details));
    snapshot("disconnected");
    print("READY=RESTORE_AP");
  });
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      initialCallbacks++;
      var ip = wifi.getIP().ip;
      var ok = !error && ip !== "0.0.0.0";
      print((ok ? "PASS " : "FAIL ") +
        "initial_connect error=" + JSON.stringify(error) + " ip=" + ip);
      snapshot("initial_connected");
      print("READY=DISABLE_AP");
    });
  }, 750);
}());
