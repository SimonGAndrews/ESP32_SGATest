// Keep a classic ESP32 GATT connection active during an HTTPS transaction.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var wiredConsole = E.getConsole();
  var request;
  var overallTimeout;
  var wifiTimeout;
  var httpsTimeout;
  var finished = false;
  var httpsComplete = false;
  var ackReceived = "";
  var completeReceived = "";
  var connectionObserved = false;
  var passes = 0;
  var failures = 0;
  var observed = {httpsBytes:0, httpsStatus:null};

  function pass(name, detail) {
    passes++;
    print("PASS " + name + (detail ? " " + detail : ""));
  }

  function fail(name, detail) {
    failures++;
    print("FAIL " + name + (detail ? " " + detail : ""));
  }

  function info(name, value) {
    print("INFO " + name + "=" + JSON.stringify(value));
  }

  function memorySnapshot(phase) {
    var memory = process.memory();
    var state = ESP32.getState();
    var snapshot = {
      phase : phase,
      nativeFreeHeap : state.freeHeap,
      nativeMinimumHeap : state.minHeap,
      largestNativeBlock : memory.tx && memory.tx.largest_block,
      jsVarsTotal : memory.total,
      jsVarsFree : memory.free,
      jsVarsUsed : memory.usage,
      jsVarBlockSize : memory.blocksize
    };
    info("memory", snapshot);
    return snapshot;
  }

  function finish(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimeout);
    if (wifiTimeout) clearTimeout(wifiTimeout);
    if (httpsTimeout) clearTimeout(httpsTimeout);
    if (request) {
      try { request.end(); } catch (ignore) {}
    }
    wifi.removeAllListeners();
    wifi.disconnect();
    NRF.disconnect();
    setTimeout(function () {
      var finalMemory = memorySnapshot("after_cleanup");
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("BLE_HTTPS_TARGET_SUMMARY=" + JSON.stringify({
        runId : cfg.runId,
        reason : reason,
        ackReceived : ackReceived,
        completeReceived : completeReceived,
        httpsComplete : httpsComplete,
        observed : observed,
        finalMemory : finalMemory,
        checksPassed : passes,
        checksFailed : failures
      }));
      NRF.sleep();
      delete global.WIFI_TEST_CONFIG;
      print("DONE=" + (failures ? "FAIL" : "PASS"));
      E.setConsole(wiredConsole, {force:false});
    }, 700);
  }

  function httpsPhaseDone(reason) {
    print("BLE_HTTPS_PHASE_DONE=" + JSON.stringify({
      runId : cfg.runId,
      reason : reason,
      success : httpsComplete,
      status : observed.httpsStatus,
      bytes : observed.httpsBytes,
      bleConnected : NRF.getSecurityStatus().connected
    }));
  }

  function runHTTPS() {
    if (NRF.getSecurityStatus().connected) pass("ble_connected_before_https");
    else fail("ble_connected_before_https", JSON.stringify(NRF.getSecurityStatus()));
    memorySnapshot("before_https");
    httpsTimeout = setTimeout(function () {
      fail("https_request", "timeout");
      httpsPhaseDone("https_timeout");
    }, cfg.httpsTimeoutMs || 25000);
    try {
      request = require("http").get(cfg.httpsURL, function (response) {
        observed.httpsStatus = response.statusCode;
        response.on("data", function (data) {
          observed.httpsBytes += data.length;
        });
        response.on("end", function () {
          clearTimeout(httpsTimeout);
          httpsTimeout = undefined;
          request = undefined;
          if (String(observed.httpsStatus) === String(cfg.expectedStatus)) {
            pass("https_status", "status=" + observed.httpsStatus);
          } else {
            fail(
              "https_status",
              "expected=" + cfg.expectedStatus +
              " observed=" + observed.httpsStatus
            );
          }
          if (observed.httpsBytes >= cfg.minimumBytes) {
            pass("https_response_body", "bytes=" + observed.httpsBytes);
          } else {
            fail(
              "https_response_body",
              "minimum=" + cfg.minimumBytes+
              " observed=" + observed.httpsBytes
            );
          }
          httpsComplete = failures === 0;
          if (NRF.getSecurityStatus().connected) {
            pass("ble_connected_after_https");
          } else {
            fail("ble_connected_after_https", JSON.stringify(NRF.getSecurityStatus()));
            httpsComplete = false;
          }
          memorySnapshot("after_https_response");
          httpsPhaseDone("response_complete");
        });
      });
      request.on("error", function (error) {
        clearTimeout(httpsTimeout);
        httpsTimeout = undefined;
        request = undefined;
        fail("https_request", "error=" + error);
        memorySnapshot("after_https_error");
        httpsPhaseDone("https_error");
      });
    } catch (error) {
      clearTimeout(httpsTimeout);
      httpsTimeout = undefined;
      request = undefined;
      fail("https_request", "exception=" + error);
      memorySnapshot("after_https_exception");
      httpsPhaseDone("https_exception");
    }
  }

  function connectWifi() {
    wifiTimeout = setTimeout(function () {
      fail("wifi_connect", "timeout status=" + JSON.stringify(wifi.getStatus()));
      httpsPhaseDone("wifi_timeout");
    }, cfg.wifiTimeoutMs || 20000);
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      clearTimeout(wifiTimeout);
      wifiTimeout = undefined;
      if (error) {
        fail("wifi_connect", "error=" + JSON.stringify(error));
        httpsPhaseDone("wifi_error");
        return;
      }
      var ip = wifi.getIP();
      if (ip.ip && ip.ip !== "0.0.0.0") {
        pass("wifi_connected", "ip=" + ip.ip);
      } else {
        fail("wifi_connected", "ip=" + JSON.stringify(ip));
      }
      var status = wifi.getStatus();
      if (status.ssid) status.ssid = "<redacted>";
      info("wifi_network", {status:status, ip:ip});
      memorySnapshot("after_wifi_connect");
      runHTTPS();
    });
  }

  print("TEST=ble_https_concurrent_peripheral");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  info("run", {runId:cfg.runId, peerName:cfg.name, httpsURL:cfg.httpsURL});
  E.setConsole(wiredConsole, {force:true});
  wifi.removeAllListeners();
  wifi.disconnect();
  wifi.stopAP();
  NRF.wake();
  NRF.removeAllListeners();
  NRF.on("connect", function (address) {
    if (!connectionObserved) {
      connectionObserved = true;
      pass("ble_gatt_connected", "address=" + address);
      memorySnapshot("after_ble_connect");
    }
  });
  NRF.on("disconnect", function (reason) {
    info("ble_disconnected", reason);
  });
  memorySnapshot("initial");

  NRF.setServices({
    0xFFF0 : {
      0xFFF1 : {
        value : cfg.challenge,
        maxLen : 20,
        readable : true
      },
      0xFFF2 : {
        maxLen : 20,
        writable : true,
        onWrite : function (event) {
          ackReceived = E.toString(event.data);
          if (ackReceived === cfg.ack) {
            pass("ble_gatt_write_before_https", "value=" + ackReceived);
            connectWifi();
          } else {
            fail("ble_gatt_write_before_https", "value=" + JSON.stringify(ackReceived));
            httpsPhaseDone("bad_initial_gatt_write");
          }
        }
      },
      0xFFF3 : {
        maxLen : 20,
        writable : true,
        onWrite : function (event) {
          completeReceived = E.toString(event.data);
          if (completeReceived === cfg.complete) {
            pass("ble_gatt_write_after_https", "value=" + completeReceived);
          } else {
            fail("ble_gatt_write_after_https", "value=" + JSON.stringify(completeReceived));
          }
          if (httpsComplete) pass("gatt_after_successful_https");
          else fail("gatt_after_successful_https", "https_not_successful");
          finish("post_https_gatt_received");
        }
      }
    }
  });
  NRF.setAdvertising({}, {
    name : cfg.name,
    showName : true,
    connectable : true,
    scannable : true,
    interval : 100
  });
  if (NRF.getSecurityStatus().advertising) pass("ble_gatt_advertising");
  else fail("ble_gatt_advertising", JSON.stringify(NRF.getSecurityStatus()));
  print("BLE_HTTPS_TARGET_READY=" + JSON.stringify({
    runId : cfg.runId,
    name : cfg.name,
    challenge : cfg.challenge
  }));

  overallTimeout = setTimeout(function () {
    fail("ble_https_overall", "timeout");
    finish("overall_timeout");
  }, cfg.overallTimeoutMs || 60000);
}());
