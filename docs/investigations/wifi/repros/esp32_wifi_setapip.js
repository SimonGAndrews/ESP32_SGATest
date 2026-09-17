// Minimal Wifi.setAPIP() functional and callback-contract reproduction.
// No access point, peer board or network credentials are required.

echo(false);

(function () {
  var wifi = require("Wifi");
  var requested = {
    ip : "192.168.47.1",
    gw : "192.168.47.1",
    netmask : "255.255.255.0"
  };

  print("TEST=esp32_wifi_setapip");
  print("TARGET=" + process.env.BOARD);
  wifi.stopAP();

  setTimeout(function () {
    wifi.setAPIP(requested, function (error) {
      var observed = wifi.getAPIP();
      var applied = observed.ip === requested.ip &&
        observed.gw === requested.gw &&
        observed.netmask === requested.netmask;
      var callbackPassed = error === null || error === undefined;

      print("INFO callbackError=" + JSON.stringify(error));
      print("INFO requested=" + JSON.stringify(requested));
      print("INFO observed=" + JSON.stringify(observed));
      print("INFO addressApplied=" + applied);
      print("INFO callbackPassed=" + callbackPassed);
      print("DONE=" + (applied && callbackPassed ? "PASS" : "FAIL"));
    });
  }, 250);
}());
