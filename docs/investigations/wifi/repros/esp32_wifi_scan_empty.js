// Minimal state-normalising ESP32 Wifi.scan() reproducer.
// No access-point credentials or external UART wiring are required.
echo(false);

var wifi = require("Wifi");
var finished = false;
var overallTimeout;

print("TEST=esp32_wifi_scan_empty");
print("BOARD=" + process.env.BOARD);
print("VERSION=" + process.version);
print("GIT_COMMIT=" + process.env.GIT_COMMIT);
print("ESP32_STATE=" + JSON.stringify(ESP32.getState()));
print("STATUS_INITIAL=" + JSON.stringify(wifi.getStatus()));

function finish() {
  if (finished) return;
  finished = true;
  clearTimeout(overallTimeout);
  print("DONE=esp32_wifi_scan_empty");
}

function runTestScan() {
  print("STATUS_BEFORE_TEST_SCAN=" + JSON.stringify(wifi.getStatus()));
  wifi.scan(function (accessPoints) {
    print("TEST_SCAN_COUNT=" + accessPoints.length);
    print("TEST_SCAN_RESULTS=" + JSON.stringify(accessPoints));
    finish();
  });
}

function runPreparationScan() {
  print("STATUS_BEFORE_PREP_SCAN=" + JSON.stringify(wifi.getStatus()));
  wifi.scan(function (accessPoints) {
    print("PREP_SCAN_COUNT=" + accessPoints.length);
    print("PREP_SCAN_RESULTS=" + JSON.stringify(accessPoints));

    // Scan completion makes the current wrapper stop an unassociated,
    // station-only driver. Disconnect as well in case stale credentials caused
    // an unsolicited association, then allow the stop event to settle. The
    // next scan should therefore have to start the station and emit STA_START.
    wifi.disconnect();
    wifi.stopAP();
    setTimeout(runTestScan, 1500);
  });
}

overallTimeout = setTimeout(function () {
  print("FAIL=timeout");
  finish();
}, 30000);

// Remove any active station/AP role before the preparation pass. These calls
// are asynchronous, so leave time for their events and idle cleanup to settle.
wifi.disconnect();
wifi.stopAP();
setTimeout(runPreparationScan, 1500);
