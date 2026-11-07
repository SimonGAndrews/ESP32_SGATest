// Exercise successful, failed and repeated IDF5 Wifi.connect() completion.
// global.WIFI_TEST_CONFIG must contain ssid, password, wrongPassword and
// absentSSID. The host runner injects these values without serial echo.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var finished = false;
  var overallTimer;
  var callbackCounts = {};
  var startupHeap = ESP32.getState().freeHeap;
  var firstHeap = 0;
  var lowestHeap = 0;
  var cycles = 0;

  function pass(name, details) {
    passes++;
    print("PASS " + name + (details ? " " + details : ""));
  }

  function fail(name, details) {
    failures++;
    print("FAIL " + name + (details ? " " + details : ""));
  }

  function countCallback(name) {
    callbackCounts[name] = (callbackCounts[name] || 0) + 1;
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    Object.keys(callbackCounts).forEach(function (name) {
      if (callbackCounts[name] === 1) pass(name + "_callback_once");
      else fail(name + "_callback_once", "count=" + callbackCounts[name]);
    });
    var finalHeap = ESP32.getState().freeHeap;
    print("METRIC connect_cycles=" + cycles);
    print("METRIC startup_free_heap=" + startupHeap);
    print("METRIC first_free_heap=" + firstHeap);
    print("METRIC lowest_free_heap=" + lowestHeap);
    print("METRIC final_free_heap=" + finalHeap);
    print("METRIC final_heap_delta=" + (finalHeap - firstHeap));
    if (finalHeap >= firstHeap - 4096) pass("native_heap_no_material_loss");
    else fail("native_heap_no_material_loss", "delta=" + (finalHeap - firstHeap));
    wifi.removeAllListeners();
    wifi.disconnect();
    print("METRIC checks_passed=" + passes);
    print("METRIC checks_failed=" + failures);
    print("DONE=" + (failures ? "FAIL" : "PASS"));
  }

  function connect(name, ssid, password, expectSuccess, next) {
    wifi.connect(ssid, {password:password}, function (error) {
      countCallback(name);
      if (expectSuccess && !error && wifi.getIP().ip !== "0.0.0.0")
        pass(name, "ip=" + wifi.getIP().ip);
      else if (!expectSuccess && error)
        pass(name, "error=" + JSON.stringify(error));
      else
        fail(name, "error=" + JSON.stringify(error) + " ip=" + wifi.getIP().ip);
      setTimeout(next, 500);
    });
  }

  function runSoakCycle() {
    if (cycles >= 10) {
      finish();
      return;
    }
    if (cycles === 0) {
      firstHeap = ESP32.getState().freeHeap;
      lowestHeap = firstHeap;
    }
    cycles++;
    connect("soak_" + cycles, cfg.ssid, cfg.password, true, function () {
      var heap = ESP32.getState().freeHeap;
      if (heap < lowestHeap) lowestHeap = heap;
      wifi.disconnect();
      setTimeout(runSoakCycle, 500);
    });
  }

  function recoveryAfterWrongPassword() {
    connect("wrong_password_recovery", cfg.ssid, cfg.password, true, function () {
      wifi.disconnect();
      setTimeout(runSoakCycle, 750);
    });
  }

  function wrongPassword() {
    connect("wrong_password", cfg.ssid, cfg.wrongPassword, false,
      recoveryAfterWrongPassword);
  }

  function recoveryAfterUnavailable() {
    connect("unavailable_recovery", cfg.ssid, cfg.password, true, function () {
      wifi.disconnect();
      setTimeout(wrongPassword, 750);
    });
  }

  function unavailableNetwork() {
    connect("unavailable_network", cfg.absentSSID, cfg.password, false,
      recoveryAfterUnavailable);
  }

  function reconnectWhileConnected() {
    connect("reconnect_while_connected", cfg.ssid, cfg.password, true,
      function () {
        wifi.disconnect();
        setTimeout(unavailableNetwork, 750);
      });
  }

  function initialConnection() {
    connect("initial_connection", cfg.ssid, cfg.password, true,
      reconnectWhileConnected);
  }

  print("TEST=wifi_connect_hardening_lifecycle");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  overallTimer = setTimeout(function () {
    fail("overall_timeout");
    finish();
  }, 120000);
  wifi.removeAllListeners();
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(initialConnection, 1000);
}());
