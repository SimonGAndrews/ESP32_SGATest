// C3 GATT central that holds the connection while its peer performs HTTPS.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wiredConsole = E.getConsole();
  var gatt;
  var completeCharacteristic;
  var timeout;
  var finished = false;
  var passes = 0;
  var failures = 0;
  var observed = {};

  function pass(name, detail) {
    passes++;
    print("PASS " + name + (detail ? " " + detail : ""));
  }

  function fail(name, detail) {
    failures++;
    print("FAIL " + name + (detail ? " " + detail : ""));
  }

  function finish(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    if (gatt) {
      try { gatt.disconnect(); } catch (ignore) {}
    }
    setTimeout(function () {
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("BLE_GATT_HOLD_CLIENT_SUMMARY=" + JSON.stringify({
        runId : cfg.runId,
        reason : reason,
        observed : observed,
        checksPassed : passes,
        checksFailed : failures
      }));
      NRF.sleep();
      print("DONE=" + (failures ? "FAIL" : "PASS"));
      E.setConsole(wiredConsole, {force:false});
    }, 400);
  }

  print("TEST=ble_gatt_hold_client");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  E.setConsole(wiredConsole, {force:true});
  NRF.wake();

  global.bleGattClientComplete = function () {
    if (!completeCharacteristic || !NRF.getSecurityStatus().connected) {
      fail("ble_gatt_connected_after_https", JSON.stringify(NRF.getSecurityStatus()));
      finish("not_connected_after_https");
      return;
    }
    pass("ble_gatt_connected_after_https");
    completeCharacteristic.writeValue(cfg.complete).then(function () {
      observed.complete = cfg.complete;
      pass("ble_gatt_write_after_https", "value=" + cfg.complete);
      finish("post_https_write_complete");
    }).catch(function (error) {
      fail("ble_gatt_write_after_https", "error=" + error);
      finish("post_https_write_error");
    });
  };

  timeout = setTimeout(function () {
    fail("ble_gatt_hold", "timeout");
    finish("overall_timeout");
  }, cfg.overallTimeoutMs || 60000);

  NRF.requestDevice({
    timeout : 7000,
    active : true,
    filters : [{name:cfg.name}]
  }).then(function (device) {
    observed.id = device.id;
    pass("ble_gatt_device_selected", "id=" + device.id);
    return device.gatt.connect();
  }).then(function (connection) {
    gatt = connection;
    pass("ble_gatt_connected_before_https");
    return gatt.getPrimaryService("fff0");
  }).then(function (service) {
    pass("ble_gatt_service_discovered");
    observed.service = service;
    return service.getCharacteristic("fff1");
  }).then(function (characteristic) {
    return characteristic.readValue();
  }).then(function (value) {
    observed.challenge = E.toString(value.buffer);
    if (observed.challenge === cfg.challenge) {
      pass("ble_gatt_read_before_https", "value=" + observed.challenge);
    } else {
      fail("ble_gatt_read_before_https", "value=" + JSON.stringify(observed.challenge));
    }
    return observed.service.getCharacteristic("fff2");
  }).then(function (characteristic) {
    return characteristic.writeValue(cfg.ack);
  }).then(function () {
    observed.ack = cfg.ack;
    pass("ble_gatt_write_before_https", "value=" + cfg.ack);
    return observed.service.getCharacteristic("fff3");
  }).then(function (characteristic) {
    completeCharacteristic = characteristic;
    delete observed.service;
    print("BLE_GATT_CLIENT_HOLD_READY=" + JSON.stringify({
      runId : cfg.runId,
      connected : NRF.getSecurityStatus().connected,
      challenge : observed.challenge,
      ack : observed.ack
    }));
  }).catch(function (error) {
    fail("ble_gatt_setup", "error=" + error);
    finish("setup_error");
  });
}());
