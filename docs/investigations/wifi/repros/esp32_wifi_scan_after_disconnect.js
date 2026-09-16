// Reproduce the ESP32 scan/connect conflict after a completed station session.
// A reachable AP is required: the initial connection proves that the radio and
// credentials work, and leaves a valid station configuration in IDF RAM.
// Set global.WIFI_TEST_CONFIG={ssid:"...",password:"..."} before uploading.
echo(false);

var wifi = require("Wifi");
var config = global.WIFI_TEST_CONFIG || {};
var phase = "cleanup";
var connectedEvents = 0;
var finished = false;
var overallTimeout;

print("TEST=esp32_wifi_scan_after_disconnect");
print("TARGET=" + (process.env.BOARD || "UNKNOWN"));

function finish(ok, reason) {
  if (finished) return;
  finished = true;
  clearTimeout(overallTimeout);
  wifi.removeAllListeners();
  print((ok ? "PASS " : "FAIL ") + reason);
  print("DONE=esp32_wifi_scan_after_disconnect");
}

function startScan() {
  // The completed disconnect should have allowed stopWifiIfIdle() to stop the
  // station. Wifi.scan() must therefore restart it and generate STA_START.
  // Unmodified master handles that event by calling esp_wifi_connect() with
  // the retained configuration, even though this operation is only a scan.
  phase = "scan";
  wifi.scan(function (accessPoints) {
    var expectedMatches = accessPoints.filter(function (accessPoint) {
      return accessPoint.ssid === config.ssid;
    }).length;
    print("METRIC scan_count=" + accessPoints.length);
    print("METRIC expected_ap_matches=" + expectedMatches);
    // Also allow time for any connection started by the scan's STA_START event
    // to become visible. A scan must neither return an empty list nor reconnect.
    setTimeout(function () {
      var status = wifi.getStatus();
      print("METRIC connected_events_during_scan=" + connectedEvents);
      if (accessPoints.length === 0)
        finish(false, "scan returned no access points");
      else if (expectedMatches !== 1)
        finish(false, "expected access point count was " + expectedMatches);
      else if (connectedEvents !== 0 || status.station === "connected")
        finish(false, "scan caused an unsolicited station connection");
      else
        finish(true, "scan completed without an unsolicited connection");
    }, 1000);
  });
}

function startConnection() {
  // Establish a known-good connection first. This both validates the test AP
  // and gives the later unsolicited esp_wifi_connect() a usable configuration.
  phase = "connect";
  wifi.connect(config.ssid, {password:config.password}, function (error) {
    if (error) {
      finish(false, "initial Wifi.connect failed");
      return;
    }
    print("PASS initial Wifi.connect completed");
    phase = "connected-settle";
    setTimeout(function () {
      // Disconnecting does not clear IDF's RAM station configuration. Current
      // Espruino also stops the now-idle Wi-Fi driver after the event completes.
      phase = "disconnect";
      wifi.disconnect();
    }, 1000);
  });
}

wifi.removeAllListeners();
wifi.on("connected", function () {
  // A connection event in this phase proves that Wifi.scan() initiated an
  // unsolicited station connection, even if the scan returned AP records.
  if (phase === "scan") connectedEvents++;
});
wifi.on("disconnected", function () {
  if (phase !== "disconnect") return;
  print("PASS station disconnect event completed");
  phase = "settle";
  // Leave time for STA_STOP before asking Wifi.scan() to restart the station.
  setTimeout(startScan, 750);
});

overallTimeout = setTimeout(function () {
  finish(false, "test timed out during " + phase);
}, 30000);

wifi.disconnect();
wifi.stopAP();
setTimeout(startConnection, 1500);
