// Combined connection/disconnection regression for the unchanged ESP32 IDF3 path.
// global.WIFI_TEST_CONFIG must contain ssid, password and absentSSID.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var finished = false;
  var overallTimer;
  var events = {associated:0, connected:0, disconnected:0};
  var validCallbacks = 0;
  var disconnectCallbacks = 0;
  var unavailableCallbacks = 0;
  var cycles = 0;

  function expect(name, condition, details) {
    if (condition) {
      passes++;
      print("PASS " + name + (details ? " " + details : ""));
    } else {
      failures++;
      print("FAIL " + name + (details ? " " + details : ""));
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    wifi.removeAllListeners();
    wifi.disconnect();
    setTimeout(function () {
      print("METRIC valid_connect_callbacks=" + validCallbacks);
      print("METRIC deliberate_disconnect_callbacks=" + disconnectCallbacks);
      print("METRIC unavailable_connect_callbacks=" + unavailableCallbacks);
      print("METRIC associated_events=" + events.associated);
      print("METRIC connected_events=" + events.connected);
      print("METRIC disconnected_events=" + events.disconnected);
      print("METRIC repeated_cycles=" + cycles);
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 750);
  }

  function connectValid(label, next) {
    var callbacks = 0;
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      callbacks++;
      validCallbacks++;
      var ip = wifi.getIP().ip;
      expect(label + "_connected", !error && ip !== "0.0.0.0",
        "error=" + JSON.stringify(error) + " ip=" + ip);
      setTimeout(function () {
        expect(label + "_callback_once", callbacks === 1,
          "count=" + callbacks);
        next();
      }, 500);
    });
  }

  function runCycle() {
    if (cycles === 3) {
      expect("associated_events_observed", events.associated >= 5,
        "count=" + events.associated);
      expect("connected_events_observed", events.connected >= 5,
        "count=" + events.connected);
      expect("disconnected_events_observed", events.disconnected >= 1,
        "count=" + events.disconnected);
      finish();
      return;
    }
    cycles++;
    connectValid("cycle_" + cycles, function () {
      wifi.disconnect(function () { disconnectCallbacks++; });
      setTimeout(runCycle, 1500);
    });
  }

  function runUnavailable() {
    print("INFO stage=unavailable_network");
    wifi.connect(cfg.absentSSID, {password:cfg.password}, function (error) {
      unavailableCallbacks++;
      print("INFO unavailable_callback error=" + JSON.stringify(error));
    });
    setTimeout(function () {
      var status = wifi.getDetails().status;
      expect("unavailable_not_connected", wifi.getIP().ip === "0.0.0.0",
        "status=" + JSON.stringify(status));
      wifi.disconnect(function () { disconnectCallbacks++; });
      setTimeout(function () {
        connectValid("unavailable_recovery", function () {
          wifi.disconnect(function () { disconnectCallbacks++; });
          setTimeout(runCycle, 1500);
        });
      }, 1500);
    }, 15000);
  }

  function begin() {
    connectValid("initial", function () {
      var before = disconnectCallbacks;
      wifi.disconnect(function () { disconnectCallbacks++; });
      setTimeout(function () {
        var count = disconnectCallbacks - before;
        // IDF3 retains its historical disconnect behavior; this regression
        // records its callback multiplicity instead of imposing IDF5 policy.
        expect("deliberate_disconnect_completed", count >= 1 && count <= 2,
          "callbacks=" + count);
        runUnavailable();
      }, 2000);
    });
  }

  print("TEST=wifi_legacy_station_regression");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  wifi.removeAllListeners();
  wifi.on("associated", function () { events.associated++; });
  wifi.on("connected", function () { events.connected++; });
  wifi.on("disconnected", function () { events.disconnected++; });
  wifi.disconnect();
  wifi.stopAP();
  overallTimer = setTimeout(function () {
    expect("overall_timeout", false);
    finish();
  }, 90000);
  setTimeout(begin, 750);
}());
