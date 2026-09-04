(function () {
  var c = global.WIFI_TEST_CONFIG;
  var gatt;
  var service;
  var observed = {};
  var failed = 0;
  var passed = 0;
  var wiredConsole = E.getConsole();

  function pass(name, detail) {
    passed++;
    print("PASS " + name + (detail ? " " + detail : ""));
  }

  function fail(name, detail) {
    failed++;
    print("FAIL " + name + (detail ? " " + detail : ""));
  }

  function finish(reason) {
    if (gatt) {
      try { gatt.disconnect(); } catch (ignore) {}
    }
    setTimeout(function () {
      print("METRIC checks_passed=" + passed);
      print("METRIC checks_failed=" + failed);
      print("BLE_GATT_CLIENT_SUMMARY=" + JSON.stringify({
        runId:c.runId,
        reason:reason,
        observed:observed,
        checksPassed:passed,
        checksFailed:failed
      }));
      NRF.sleep();
      print("DONE=" + (failed ? "FAIL" : "PASS"));
      E.setConsole(wiredConsole, {force:false});
    }, 300);
  }

  print("TEST=ble_target_gatt_client");
  print("TARGET=" + process.env.BOARD);
  print("INFO run=" + JSON.stringify(c));
  print("INFO ble_wired_console=" + wiredConsole);
  E.setConsole(wiredConsole, {force:true});
  NRF.wake();

  NRF.requestDevice({
    timeout:5000,
    active:true,
    filters:[{name:c.name}]
  }).then(function (device) {
    observed.id = device.id;
    observed.name = device.name;
    observed.rssi = device.rssi;
    pass("ble_gatt_device_selected", "id=" + device.id);
    return device.gatt.connect();
  }).then(function (connection) {
    gatt = connection;
    pass("ble_gatt_connected");
    return gatt.getPrimaryService("fff0");
  }).then(function (foundService) {
    service = foundService;
    pass("ble_gatt_service_discovered");
    return service.getCharacteristic("fff1");
  }).then(function (characteristic) {
    pass("ble_gatt_read_characteristic_discovered");
    return characteristic.readValue();
  }).then(function (value) {
    observed.challenge = E.toString(value.buffer);
    if (observed.challenge === c.challenge) {
      pass("ble_gatt_challenge_read", "value=" + observed.challenge);
    } else {
      fail("ble_gatt_challenge_read", "value=" + JSON.stringify(observed.challenge));
    }
    return service.getCharacteristic("fff2");
  }).then(function (characteristic) {
    pass("ble_gatt_write_characteristic_discovered");
    return characteristic.writeValue(c.ack);
  }).then(function () {
    observed.ack = c.ack;
    pass("ble_gatt_ack_written", "value=" + c.ack);
    return service.getCharacteristic("fff3");
  }).then(function (characteristic) {
    pass("ble_gatt_complete_characteristic_discovered");
    return characteristic.writeValue(c.complete);
  }).then(function () {
    observed.complete = c.complete;
    pass("ble_gatt_complete_written", "value=" + c.complete);
    finish("transaction_complete");
  }).catch(function (error) {
    fail("ble_gatt_transaction", "error=" + error);
    observed.error = "" + error;
    finish("transaction_error");
  });
}());
