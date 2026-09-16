(function () {
  var c = global.WIFI_TEST_CONFIG;
  var events = [];
  var written = "";
  var completed = "";
  var failed = 0;
  var wiredConsole = E.getConsole();

  function pass(name, detail) {
    print("PASS " + name + (detail ? " " + detail : ""));
  }

  function fail(name, detail) {
    failed++;
    print("FAIL " + name + (detail ? " " + detail : ""));
  }

  function text(data) {
    return E.toString(data);
  }

  function servicesFor(challenge) {
    return {
      0xFFF0 : {
        0xFFF1 : {
          value : challenge,
          maxLen : 20,
          readable : true
        },
        0xFFF2 : {
          maxLen : 20,
          writable : true,
          onWrite : function (evt) {
            written = text(evt.data);
            events.push({event:"write", value:written});
            print("BLE_GATT_WRITE=" + JSON.stringify({
              runId:c.runId,
              value:written
            }));
          }
        },
        0xFFF3 : {
          maxLen : 20,
          writable : true,
          onWrite : function (evt) {
            completed = text(evt.data);
            events.push({event:"complete", value:completed});
            print("BLE_GATT_COMPLETE=" + JSON.stringify({
              runId:c.runId,
              value:completed
            }));
          }
        }
      }
    };
  }

  function beginAdvertising() {
    NRF.setAdvertising({}, {
      name:c.name,
      showName:true,
      connectable:true,
      scannable:true,
      interval:100
    });

    var initial = NRF.getSecurityStatus();
    if (initial.advertising) pass("ble_gatt_peer_advertising");
    else fail("ble_gatt_peer_advertising", JSON.stringify(initial));

    print("BLE_GATT_PEER_READY=" + JSON.stringify({
      runId:c.runId,
      name:c.name,
      challenge:c.challenge,
      expectedAck:c.ack,
      serviceReplacements:c.serviceReplacements || 0,
      security:initial
    }));
  }

  function replaceServices(iteration) {
    var replacementLimit = c.serviceReplacements || 0;
    var finalReplacement = iteration === replacementLimit;
    var challenge = finalReplacement
      ? c.challenge
      : c.challenge + "-" + iteration;

    NRF.setServices(servicesFor(challenge));
    print("BLE_GATT_REPLACEMENT=" + JSON.stringify({
      runId:c.runId,
      iteration:iteration,
      final:finalReplacement,
      challenge:challenge
    }));

    if (finalReplacement) {
      setTimeout(beginAdvertising, c.serviceReplacementDelayMs || 500);
    } else {
      setTimeout(function () {
        replaceServices(iteration + 1);
      }, c.serviceReplacementDelayMs || 500);
    }
  }

  print("TEST=ble_supervisor_gatt_peer");
  print("TARGET=" + process.env.BOARD);
  print("INFO run=" + JSON.stringify(c));
  print("INFO ble_wired_console=" + wiredConsole);

  E.setConsole(wiredConsole, {force:true});
  NRF.wake();
  NRF.removeAllListeners();
  NRF.on("connect", function (address) {
    events.push({event:"connect", address:address});
    print("INFO ble_peer_connected=" + address);
  });
  NRF.on("disconnect", function (reason) {
    events.push({event:"disconnect", reason:reason});
    print("INFO ble_peer_disconnected=" + reason);
  });

  if (c.serviceReplacements) replaceServices(1);
  else {
    NRF.setServices(servicesFor(c.challenge));
    beginAdvertising();
  }

  global.bleGattPeerStop = function () {
    var security = NRF.getSecurityStatus();
    if (written === c.ack) pass("ble_gatt_peer_received_ack");
    else fail("ble_gatt_peer_received_ack", "value=" + JSON.stringify(written));
    if (completed === c.complete) pass("ble_gatt_peer_received_complete");
    else fail("ble_gatt_peer_received_complete", "value=" + JSON.stringify(completed));
    if (!security.connected) pass("ble_gatt_peer_disconnected");
    else fail("ble_gatt_peer_disconnected", JSON.stringify(security));
    print("BLE_GATT_PEER_SUMMARY=" + JSON.stringify({
      runId:c.runId,
      written:written,
      expectedAck:c.ack,
      completed:completed,
      expectedComplete:c.complete,
      serviceReplacements:c.serviceReplacements || 0,
      security:security,
      events:events,
      checksFailed:failed
    }));
    NRF.disconnect();
    NRF.sleep();
    print("DONE=" + (failed ? "FAIL" : "PASS"));
    E.setConsole(wiredConsole, {force:false});
  };
}());
