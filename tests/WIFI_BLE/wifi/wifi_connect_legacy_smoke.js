// Basic station regression for unchanged ESP32 IDF3/IDF4 connection paths.
// global.WIFI_TEST_CONFIG must contain ssid and password.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var callbackCount = 0;
  var finished = false;
  var timeout;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    print("METRIC connect_callback_count=" + callbackCount);
    print((ok ? "PASS " : "FAIL ") + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
    setTimeout(function () { wifi.disconnect(); }, 100);
  }

  print("TEST=wifi_connect_legacy_smoke");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  wifi.removeAllListeners();
  wifi.disconnect();
  wifi.stopAP();
  timeout = setTimeout(function () {
    finish(false, "legacy_connect_timeout");
  }, 30000);
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      callbackCount++;
      var ip = wifi.getIP().ip;
      if (!error && ip && ip !== "0.0.0.0")
        setTimeout(function () {
          finish(callbackCount === 1, "legacy_connect_smoke");
        }, 500);
      else
        finish(false, "legacy_connect_error=" + JSON.stringify(error));
    });
  }, 750);
}());
