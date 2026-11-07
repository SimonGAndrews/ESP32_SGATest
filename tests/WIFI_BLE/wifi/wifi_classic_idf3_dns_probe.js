// Isolate the classic ESP32 IDF3 Wifi.getHostByName() path.
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
    wifi.disconnect();
    print("METRIC dns_callbacks=" + callbacks);
    print((ok ? "PASS " : "FAIL ") + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
  }

  print("TEST=wifi_classic_idf3_dns_probe");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  timer = setTimeout(function () { finish(false, "dns_timeout"); }, 20000);
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      if (error) {
        finish(false, "connect_error=" + JSON.stringify(error));
        return;
      }
      print("INFO phase=getHostByName");
      wifi.getHostByName("127.0.0.1", function (resolved) {
        callbacks++;
        finish(resolved === "127.0.0.1", "dns_result=" + JSON.stringify(resolved));
      });
    });
  }, 750);
}());
