// Basic loopback-ping regression for unchanged ESP32 IDF3/IDF4 paths.

(function () {
  var wifi = require("Wifi");
  var callbacks = 0;
  var valid = true;
  var finished = false;
  var timeout;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    print("METRIC ping_callbacks=" + callbacks);
    print((ok ? "PASS " : "FAIL ") + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
  }

  print("TEST=wifi_ping_legacy_smoke");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  timeout = setTimeout(function () {
    finish(false, "legacy_ping_timeout");
  }, 10000);
  try {
    wifi.ping("127.0.0.1", function (result) {
      callbacks++;
      valid = valid && !!result && result.bytes === 64 && result.error === 0;
      if (callbacks === 5) finish(valid, "legacy_ping_smoke");
    });
  } catch (error) {
    finish(false, "legacy_ping_exception=" + String(error));
  }
}());
