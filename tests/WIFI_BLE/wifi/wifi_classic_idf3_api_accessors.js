// Broader API-surface regression for the unchanged classic ESP32 IDF3 backend.
// global.WIFI_TEST_CONFIG must contain ssid and password.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var finished = false;
  var overallTimer;
  var callbacks = {
    status:0,
    details:0,
    ip:0,
    hostname:0
  };

  function pass(name, details) {
    passes++;
    print("PASS " + name + (details ? " " + details : ""));
  }

  function fail(name, details) {
    failures++;
    print("FAIL " + name + (details ? " " + details : ""));
  }

  function expect(name, condition, details) {
    if (condition) pass(name, details);
    else fail(name, details);
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    wifi.removeAllListeners();
    print("INFO legacy_optional_callback_counts=" + JSON.stringify({
      getStatus:callbacks.status,
      getHostname:callbacks.hostname
    }));
    print("METRIC checks_passed=" + passes);
    print("METRIC checks_failed=" + failures);
    print("DONE=" + (failures ? "FAIL" : "PASS"));
    setTimeout(function () { wifi.disconnect(); }, 250);
  }

  function exerciseConnectedAPI() {
    var status = wifi.getStatus(function () { callbacks.status++; });
    var details = wifi.getDetails(function (value) {
      callbacks.details++;
      expect("getDetails_callback", value && value.status === "connected");
    });
    var ip = wifi.getIP(function (error, value) {
      callbacks.ip++;
      expect("getIP_callback", !error && value && value.ip !== "0.0.0.0");
    });
    var originalHostname = wifi.getHostname(function () {
      callbacks.hostname++;
    });

    expect("getStatus_sync", status && status.station === "connected");
    expect("getDetails_sync", details && details.status === "connected");
    expect("getIP_sync", ip && ip.ip !== "0.0.0.0", "ip=" + ip.ip);
    expect("getHostname_sync", typeof originalHostname === "string",
      "hostname=" + JSON.stringify(originalHostname));

    setTimeout(function () {
      expect("getDetails_callback_once", callbacks.details === 1,
        "count=" + callbacks.details);
      expect("getIP_callback_once", callbacks.ip === 1,
        "count=" + callbacks.ip);
      // These optional callbacks are documented by the shared API but the
      // legacy ESP32 backend returns only the synchronous values. Record that
      // established behavior without changing the IDF3 regression verdict.
      print("INFO getStatus_optional_callback_count=" + callbacks.status);
      print("INFO getHostname_optional_callback_count=" + callbacks.hostname);
      try {
        wifi.setSNTP("pool.ntp.org", "GMT0");
        pass("setSNTP_request_accepted");
      } catch (error) {
        fail("setSNTP_request_accepted", String(error));
      }
      finish();
    }, 2500);
  }

  print("TEST=wifi_classic_idf3_api_accessors");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  [
    "disconnect", "stopAP", "connect", "scan", "startAP", "getStatus",
    "setConfig", "getDetails", "getAPDetails", "save", "restore", "getIP",
    "getAPIP", "getHostByName", "getHostname", "setHostname", "setSNTP",
    "setIP", "setAPIP", "ping"
  ].forEach(function (name) {
    expect("api_" + name + "_available", typeof wifi[name] === "function");
  });

  overallTimer = setTimeout(function () {
    fail("overall_timeout");
    finish();
  }, 45000);

  wifi.removeAllListeners();
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      if (error) {
        fail("connect", JSON.stringify(error));
        finish();
        return;
      }
      pass("connect");
      exerciseConnectedAPI();
    });
  }, 750);
}());
