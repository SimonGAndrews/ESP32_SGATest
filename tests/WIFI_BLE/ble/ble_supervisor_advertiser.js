// Controlled BLE advertiser for the Supervisor Peer proof.
// WIFI_TEST_CONFIG supplies runId, name, serviceUUID and serviceData.

(function () {
  var c = global.WIFI_TEST_CONFIG;
  var events = [];
  var failures = 0;

  function info(name, value) {
    print("INFO " + name + "=" + JSON.stringify(value));
  }

  function pass(name) {
    print("PASS " + name);
  }

  function fail(name, detail) {
    failures++;
    print("FAIL " + name + (detail ? " " + detail : ""));
  }

  function remember(name, value) {
    var event = { name : name, value : value, time : Date.now() };
    events.push(event);
    info("ble_peer_event", event);
  }

  global.bleSupervisorStop = function () {
    var security = NRF.getSecurityStatus();
    if (!security.connected) pass("ble_peer_not_connected");
    else fail("ble_peer_not_connected", "observed=" + JSON.stringify(security));
    print("BLE_PEER_SUMMARY=" + JSON.stringify({
      runId : c.runId,
      name : c.name,
      apiAddress : NRF.getAddress(),
      security : security,
      events : events,
      checksFailed : failures
    }));
    NRF.removeAllListeners();
    NRF.disconnect();
    NRF.sleep();
    setTimeout(function () {
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 300);
  };

  print("TEST=ble_supervisor_advertiser");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  info("run", c);

  NRF.wake();
  NRF.removeAllListeners();
  NRF.on("connect", function (address) { remember("connect", address); });
  NRF.on("disconnect", function (reason) { remember("disconnect", reason); });

  // Use a numeric 16-bit UUID key, matching the documented Espruino form.
  NRF.setAdvertising({ 0xFFF0 : c.serviceData }, {
    name : c.name,
    showName : true,
    connectable : true,
    scannable : true,
    interval : 100
  });

  setTimeout(function () {
    pass("ble_peer_advertising_configured");
    print("BLE_PEER_READY=" + JSON.stringify({
      runId : c.runId,
      name : c.name,
      serviceUUID : c.serviceUUID,
      serviceData : c.serviceData,
      apiAddress : NRF.getAddress(),
      security : NRF.getSecurityStatus(),
      time : Date.now()
    }));
  }, 500);
})();
