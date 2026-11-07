// Incorrect-credential and recovery regression for classic ESP32 IDF3.
// global.WIFI_TEST_CONFIG must contain ssid, password and wrongPassword.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var wrongCallbacks = 0;
  var recoveryCallbacks = 0;
  var connectedEvents = 0;
  var finished = false;
  var timer;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    wifi.removeAllListeners();
    print("METRIC wrong_password_callbacks=" + wrongCallbacks);
    print("METRIC recovery_callbacks=" + recoveryCallbacks);
    print("METRIC connected_events=" + connectedEvents);
    print((ok ? "PASS " : "FAIL ") + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
    setTimeout(function () { wifi.disconnect(); }, 250);
  }

  print("TEST=wifi_classic_idf3_wrong_password");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  timer = setTimeout(function () {
    finish(false, "wrong_password_overall_timeout");
  }, 60000);
  wifi.removeAllListeners();
  wifi.on("connected", function () { connectedEvents++; });
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    wifi.connect(cfg.ssid, {password:cfg.wrongPassword}, function (error) {
      wrongCallbacks++;
      print("INFO wrong_password_error=" + JSON.stringify(error));
      if (!error || wifi.getIP().ip !== "0.0.0.0") {
        finish(false, "wrong_password_was_not_rejected");
        return;
      }
      wifi.connect(cfg.ssid, {password:cfg.password}, function (recoveryError) {
        recoveryCallbacks++;
        setTimeout(function () {
          var ok = !recoveryError && wifi.getIP().ip !== "0.0.0.0" &&
            wrongCallbacks === 1 && recoveryCallbacks === 1 &&
            connectedEvents === 1;
          finish(ok, "wrong_password_recovery error=" +
            JSON.stringify(recoveryError));
        }, 500);
      });
    });
  }, 750);
}());
