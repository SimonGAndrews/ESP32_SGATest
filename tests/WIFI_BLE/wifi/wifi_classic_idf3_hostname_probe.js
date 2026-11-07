// Isolate classic ESP32 IDF3 hostname getters/setter and callback behavior.
// global.WIFI_TEST_CONFIG must contain ssid and password.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var callbacks = 0;
  var finished = false;
  var timer;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    print("METRIC sethostname_callbacks=" + callbacks);
    print((ok ? "PASS " : "FAIL ") + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
    setTimeout(function () { wifi.disconnect(); }, 250);
  }

  print("TEST=wifi_classic_idf3_hostname_probe");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  timer = setTimeout(function () { finish(false, "hostname_timeout"); }, 20000);
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      if (error) {
        finish(false, "connect_error=" + JSON.stringify(error));
        return;
      }
      var requested = "espruino-idf3-regression";
      wifi.setHostname(requested, function () {
        callbacks++;
      });
      print("INFO setHostname_returned=1");
      var observed = wifi.getHostname();
      setTimeout(function () {
        finish(observed === requested && callbacks === 1,
          "hostname=" + JSON.stringify(observed) +
          " callbacks=" + callbacks);
      }, 1000);
    });
  }, 750);
}());
