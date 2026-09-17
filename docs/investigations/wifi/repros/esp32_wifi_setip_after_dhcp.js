// Minimal post-DHCP Wifi.setIP() functional and callback-contract reproduction.
// Before execution, replace the network-specific values in the config below.
// staticIP must be an unused address on the selected local network.

echo(false);

(function () {
  var config = {
    ssid : "REPLACE_WITH_LOCAL_SSID",
    password : "REPLACE_WITH_LOCAL_PASSWORD",
    staticIP : "192.168.1.240",
    gateway : "192.168.1.1",
    netmask : "255.255.255.0"
  };
  var wifi = require("Wifi");

  function finish(result) {
    print("DONE=" + result);
    wifi.disconnect();
  }

  print("TEST=esp32_wifi_setip_after_dhcp");
  print("TARGET=" + process.env.BOARD);

  if (config.ssid.indexOf("REPLACE_") === 0 ||
      config.password.indexOf("REPLACE_") === 0) {
    print("INFO configurationRequired=true");
    print("DONE=SKIP");
    return;
  }

  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(config.ssid, { password : config.password }, function (error) {
      if (error) {
        print("INFO connectError=" + JSON.stringify(error));
        finish("FAIL");
        return;
      }

      print("INFO dhcpAddress=" + JSON.stringify(wifi.getIP()));
      wifi.setIP({
        ip : config.staticIP,
        gw : config.gateway,
        netmask : config.netmask
      }, function (setError) {
        setTimeout(function () {
          var observed = wifi.getIP();
          var applied = observed.ip === config.staticIP &&
            observed.gw === config.gateway &&
            observed.netmask === config.netmask;
          var callbackPassed = setError === null || setError === undefined;

          print("INFO callbackError=" + JSON.stringify(setError));
          print("INFO requested=" + JSON.stringify({
            ip : config.staticIP,
            gw : config.gateway,
            netmask : config.netmask
          }));
          print("INFO observed=" + JSON.stringify(observed));
          print("INFO addressApplied=" + applied);
          print("INFO callbackPassed=" + callbackPassed);
          finish(applied && callbackPassed ? "PASS" : "FAIL");
        }, 500);
      });
    });
  }, 500);
}());
