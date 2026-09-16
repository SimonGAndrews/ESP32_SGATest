// Connect and save the generated controlled-peer STA configuration.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  print("TEST=wifi_restore_prepare");
  print("TARGET=" + process.env.BOARD);
  wifi.connect(cfg.ssid, { password:cfg.password }, function (error) {
    var ip = wifi.getIP();
    if (error || !ip.ip || ip.ip === "0.0.0.0") {
      print("FAIL restore_prepare_connect error=" + JSON.stringify(error));
      print("RESTORE_PREPARED=FAIL");
      return;
    }
    print("PASS restore_prepare_connect ip=" + ip.ip);
    wifi.save();
    print("PASS restore_configuration_saved");
    print("RESTORE_PREPARED=PASS");
  });
})();
