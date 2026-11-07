// Exercise IDF3 Wifi.setConfig() with BLE disabled as required by ESP-IDF 3.
// global.WIFI_TEST_CONFIG must contain ssid and password.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var finished = false;
  var timer;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    try { wifi.setConfig({powersave:"ps-poll"}); } catch (e) {}
    wifi.disconnect();
    print((ok ? "PASS " : "FAIL ") + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
  }

  print("TEST=wifi_classic_idf3_setconfig_probe");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  timer = setTimeout(function () { finish(false, "setconfig_timeout"); }, 20000);
  NRF.sleep();
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      if (error) {
        finish(false, "connect_error=" + JSON.stringify(error));
        return;
      }
      wifi.setConfig({powersave:"none"});
      var none = wifi.getStatus().powersave;
      wifi.setConfig({powersave:"ps-poll"});
      var restored = wifi.getStatus().powersave;
      print("INFO powersave_none=" + JSON.stringify(none));
      print("INFO powersave_restored=" + JSON.stringify(restored));
      finish(none === "none" && restored === "modem", "setconfig_powersave");
    });
  }, 750);
}());
