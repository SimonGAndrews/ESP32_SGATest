// Exercise non-destructive Wifi.setConfig() settings on classic ESP32 IDF3.
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
    print((ok ? "PASS " : "FAIL ") + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
    setTimeout(function () { wifi.disconnect(); }, 250);
  }

  print("TEST=wifi_classic_idf3_setconfig_supported");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  timer = setTimeout(function () { finish(false, "setconfig_timeout"); }, 20000);
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      if (error) {
        finish(false, "connect_error=" + JSON.stringify(error));
        return;
      }
      try {
        wifi.setConfig({phy:"11n", powersave:"ps-poll"});
        var status = wifi.getStatus();
        print("INFO setconfig_status=" + JSON.stringify(status));
        finish(status.powersave === "modem", "setconfig_supported_values");
      } catch (configError) {
        finish(false, "setconfig_exception=" + String(configError));
      }
    });
  }, 750);
}());
