// ESP32 Wifi.ping() lifecycle and repeated-session validation.
//
// Before uploading, define global.WIFI_TEST_CONFIG with:
//   runId, ssid, password, peerIP, udpPort, pingRounds
//
// The controlled peer must provide a WPA2 access point, reply to ICMP and
// return "ACK|" plus any received UDP payload.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var finished = false;
  var overallTimeout;
  var sessionTimer;
  var udpTimer;
  var soakRound = 0;
  var soakRounds = cfg.pingRounds || 25;
  var successfulSessions = 0;
  var timeoutSessions = 0;
  var soakFirstFree;
  var soakLowestFree;
  var soakLastFree;
  var unreachableIP = cfg.unreachableIP ||
    cfg.peerIP.replace(/\d+$/, "254");

  function info(name, value) {
    print("INFO " + name + "=" + JSON.stringify(value));
  }

  function pass(name, details) {
    passes++;
    print("PASS " + name + (details ? " " + details : ""));
  }

  function fail(name, details) {
    failures++;
    print("FAIL " + name + (details ? " " + details : ""));
  }

  function metric(name, value) {
    print("METRIC " + name + "=" + value);
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
      jsVarsFree : memory.free
    };
    info("memory", snapshot);
    return snapshot;
  }

  function cleanupAndFinish(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimeout);
    if (sessionTimer) clearTimeout(sessionTimer);
    if (udpTimer) clearTimeout(udpTimer);
    if (global.WIFI_TARGET_SOCKET) {
      try {
        global.WIFI_TARGET_SOCKET.close();
      } catch (error) {
        info("udp_close_error", String(error));
      }
      delete global.WIFI_TARGET_SOCKET;
    }
    wifi.disconnect();
    setTimeout(function () {
      wifi.removeAllListeners();
      memorySnapshot("after_cleanup");
      metric("successful_ping_sessions", successfulSessions);
      metric("timeout_ping_sessions", timeoutSessions);
      metric("successful_ping_callbacks", successfulSessions * 5);
      metric("timeout_ping_callbacks", timeoutSessions * 5);
      metric("checks_passed", passes);
      metric("checks_failed", failures);
      info("finish", {reason:reason, status:wifi.getStatus()});
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 500);
  }

  function runUDPExchange() {
    var dgram = require("dgram");
    var socket = dgram.createSocket("udp4");
    var challenge = cfg.runId + "|PING_LIFECYCLE";
    var expected = "ACK|" + challenge;
    global.WIFI_TARGET_SOCKET = socket;

    socket.on("message", function (message, peer) {
      clearTimeout(udpTimer);
      if (String(message) === expected && peer.address === cfg.peerIP) {
        pass("wifi_udp_after_ping_lifecycle");
      } else {
        fail("wifi_udp_after_ping_lifecycle",
          "reply=" + JSON.stringify(String(message)) +
          " address=" + JSON.stringify(peer.address));
      }
      socket.close();
      delete global.WIFI_TARGET_SOCKET;
      cleanupAndFinish("udp_complete");
    });

    udpTimer = setTimeout(function () {
      fail("wifi_udp_after_ping_lifecycle", "timeout");
      cleanupAndFinish("udp_timeout");
    }, 5000);
    socket.send(challenge, cfg.udpPort, cfg.peerIP);
  }

  function runPingSession(address, expectReplies, label, callback) {
    var callbackCount = 0;
    var valid = true;
    var lastResult;

    sessionTimer = setTimeout(function () {
      fail(label, "callback timeout count=" + callbackCount +
        " last=" + JSON.stringify(lastResult));
      cleanupAndFinish(label + "_timeout");
    }, 9000);

    try {
      wifi.ping(address, function (result) {
        callbackCount++;
        lastResult = result;
        if (!result || result.totalCount !== callbackCount ||
            result.seqNo !== callbackCount || result.error !== 0) {
          valid = false;
        }
        if (expectReplies) {
          if (!(result && result.bytes > 0 && result.timeoutCount === 0)) {
            valid = false;
          }
        } else if (!(result && result.bytes === 0 &&
                     result.timeoutCount === callbackCount)) {
          valid = false;
        }

        if (callbackCount < 5) return;
        clearTimeout(sessionTimer);
        sessionTimer = undefined;
        if (callbackCount === 5 && valid) {
          pass(label, "callbacks=5 final=" + JSON.stringify(result));
        } else {
          fail(label, "callbacks=" + callbackCount +
            " final=" + JSON.stringify(result));
        }
        if (expectReplies) successfulSessions++;
        else timeoutSessions++;
        callback();
      });
    } catch (error) {
      clearTimeout(sessionTimer);
      sessionTimer = undefined;
      fail(label, "exception=" + String(error));
      cleanupAndFinish(label + "_exception");
    }
  }

  function finishSoak() {
    var finalMemory = memorySnapshot("after_ping_soak");
    soakLastFree = finalMemory.nativeFreeHeap;
    metric("ping_soak_first_free_heap", soakFirstFree);
    metric("ping_soak_lowest_free_heap", soakLowestFree);
    metric("ping_soak_last_free_heap", soakLastFree);
    if (soakLastFree >= soakFirstFree - 2048) {
      pass("wifi_ping_soak_no_material_heap_loss",
        "first=" + soakFirstFree + " last=" + soakLastFree);
    } else {
      fail("wifi_ping_soak_no_material_heap_loss",
        "first=" + soakFirstFree + " last=" + soakLastFree);
    }
    if (typeof NRF === "undefined" || NRF.getSecurityStatus().advertising) {
      pass("ble_advertising_after_ping_soak");
    } else {
      fail("ble_advertising_after_ping_soak",
        JSON.stringify(NRF.getSecurityStatus()));
    }
    runUDPExchange();
  }

  function runSoakRound() {
    soakRound++;
    runPingSession(cfg.peerIP, true, "wifi_ping_soak_" + soakRound,
      function () {
        var freeHeap = ESP32.getState().freeHeap;
        if (soakFirstFree === undefined) soakFirstFree = freeHeap;
        if (soakLowestFree === undefined || freeHeap < soakLowestFree) {
          soakLowestFree = freeHeap;
        }
        soakLastFree = freeHeap;
        if (soakRound < soakRounds) {
          runSoakRound();
        } else {
          setTimeout(finishSoak, 250);
        }
      });
  }

  function runRecoverySuccess() {
    runPingSession(cfg.peerIP, true, "wifi_ping_recovery_after_timeout",
      function () {
        runSoakRound();
      });
  }

  function runExpectedTimeout() {
    runPingSession(unreachableIP, false, "wifi_ping_unreachable",
      function () {
        // Starting directly from the final timeout callback verifies that the
        // IDF session is already fully ended and its state has been released.
        runRecoverySuccess();
      });
  }

  function runInitialSuccessAndOverlapCheck() {
    runPingSession(cfg.peerIP, true, "wifi_ping_initial_success",
      function () {
        // Starting directly from the final success callback verifies the same
        // lifecycle guarantee on the successful completion path.
        runExpectedTimeout();
      });
    try {
      wifi.ping(cfg.peerIP, function () {});
      fail("wifi_ping_overlap_rejected", "second call was accepted");
    } catch (error) {
      if (String(error).indexOf("already in progress") >= 0) {
        pass("wifi_ping_overlap_rejected");
      } else {
        fail("wifi_ping_overlap_rejected", String(error));
      }
    }
  }

  function begin() {
    try {
      wifi.ping("not-an-ip", function () {});
      fail("wifi_ping_invalid_address_rejected", "invalid address accepted");
    } catch (error) {
      pass("wifi_ping_invalid_address_rejected");
    }

    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      if (error) {
        fail("wifi_connect", JSON.stringify(error));
        cleanupAndFinish("connect_error");
        return;
      }
      var ip = wifi.getIP();
      if (ip.ip && ip.ip !== "0.0.0.0" && ip.gw === cfg.peerIP) {
        pass("wifi_connected", "ip=" + ip.ip);
      } else {
        fail("wifi_connected", JSON.stringify(ip));
        cleanupAndFinish("bad_ip");
        return;
      }
      if (typeof NRF === "undefined" || NRF.getSecurityStatus().advertising) {
        pass("ble_advertising_before_ping_soak");
      } else {
        fail("ble_advertising_before_ping_soak",
          JSON.stringify(NRF.getSecurityStatus()));
      }
      memorySnapshot("before_ping_lifecycle");
      runInitialSuccessAndOverlapCheck();
    });
  }

  print("TEST=wifi_ping_lifecycle");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  info("run", {
    runId:cfg.runId,
    peerIP:cfg.peerIP,
    unreachableIP:unreachableIP,
    soakRounds:soakRounds
  });
  overallTimeout = setTimeout(function () {
    fail("wifi_ping_lifecycle_overall", "timeout");
    cleanupAndFinish("overall_timeout");
  }, cfg.overallTimeoutMs || 240000);
  wifi.removeAllListeners();
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(begin, 500);
})();
