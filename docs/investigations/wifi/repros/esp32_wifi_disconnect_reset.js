// Reset while a connected station's Wifi.disconnect() operation is active.
// A callback that survives reset records a marker in Storage.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var marker = ".wifi-disconnect-reset-callback";
  var storage = require("Storage");
  var wifi = require("Wifi");
  storage.erase(marker);
  wifi.disconnect(function () {
    setTimeout(function () {
      wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
        if (error) {
          storage.write(marker, "connect_failed:" + JSON.stringify(error));
          return;
        }
        wifi.disconnect(function () {
          storage.write(marker, "disconnect_callback_survived_reset");
        });
        print("INFO reset_disconnect_started=1");
        reset();
      });
    }, 500);
  });
}());
