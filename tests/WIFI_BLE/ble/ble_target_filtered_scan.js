// Filtered scan for the controlled Supervisor Peer advertisement.
// WIFI_TEST_CONFIG supplies runId, name, serviceUUID and serviceData.

(function () {
  var c = global.WIFI_TEST_CONFIG;
  var passes = 0;
  var failures = 0;
  var finished = false;
  var overallTimer;

  function info(name, value) {
    print("INFO " + name + "=" + JSON.stringify(value));
  }

  function pass(name, detail) {
    passes++;
    print("PASS " + name + (detail ? " " + detail : ""));
  }

  function fail(name, detail) {
    failures++;
    print("FAIL " + name + (detail ? " " + detail : ""));
  }

  function bytes(value) {
    if (value === undefined) return undefined;
    try { return Array.prototype.slice.call(new Uint8Array(value)); }
    catch (error) { return String(value); }
  }

  function record(device) {
    var serviceData = {};
    if (device.serviceData) {
      Object.keys(device.serviceData).forEach(function (uuid) {
        serviceData[uuid] = bytes(device.serviceData[uuid]);
      });
    }
    return {
      id : device.id,
      name : device.name,
      rssi : device.rssi,
      services : device.services,
      serviceData : serviceData
    };
  }

  function finish(reason, observed) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    NRF.setScan();
    print("BLE_SCAN_SUMMARY=" + JSON.stringify({
      runId : c.runId,
      reason : reason,
      apiAddress : NRF.getAddress(),
      observed : observed,
      checksPassed : passes,
      checksFailed : failures
    }));
    NRF.removeAllListeners();
    NRF.disconnect();
    NRF.sleep();
    print("METRIC checks_passed=" + passes);
    print("METRIC checks_failed=" + failures);
    print("DONE=" + (failures ? "FAIL" : "PASS"));
  }

  print("TEST=ble_target_filtered_scan");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  info("run", c);

  NRF.wake();
  overallTimer = setTimeout(function () {
    fail("ble_scan_complete", "overall timeout");
    finish("overall_timeout", []);
  }, 10000);

  NRF.findDevices(function (devices) {
    var observed = devices.map(record);
    info("ble_scan_devices", observed);
    if (observed.length === 1) pass("ble_scan_unique_peer");
    else fail("ble_scan_unique_peer", "count=" + observed.length);

    if (observed.length) {
      var peer = observed[0];
      if (peer.name === c.name) pass("ble_scan_peer_name");
      else fail("ble_scan_peer_name", "observed=" + JSON.stringify(peer.name));
      if (typeof peer.rssi === "number") {
        pass("ble_scan_peer_rssi", "rssi=" + peer.rssi);
        print("METRIC ble_peer_rssi_dbm=" + peer.rssi);
      } else {
        fail("ble_scan_peer_rssi", "observed=" + JSON.stringify(peer.rssi));
      }
      if (peer.id && peer.id !== "de:ad:de:ad:de:ad") {
        pass("ble_scan_peer_radio_id", "id=" + peer.id);
      } else {
        fail("ble_scan_peer_radio_id", "observed=" + JSON.stringify(peer.id));
      }
      if (peer.serviceData[c.serviceUUID] !== undefined &&
          String(peer.serviceData[c.serviceUUID]) === String(c.serviceData)) {
        pass("ble_scan_peer_service_data");
      } else {
        fail("ble_scan_peer_service_data", "observed=" +
          JSON.stringify(peer.serviceData));
      }
    }
    finish("scan_complete", observed);
  }, {
    timeout : 4000,
    active : true,
    filters : [{ name : c.name }]
  });
})();
