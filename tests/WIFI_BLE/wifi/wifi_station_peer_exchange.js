// Wi-Fi station functional test using the configured Supervisor Peer.
//
// Before uploading, define global.WIFI_TEST_CONFIG with:
//   runId, ssid, password, peerIP, udpPort
//
// This test does not save Wi-Fi configuration. It scans, connects, exchanges
// one run-bound UDP challenge, disconnects and reports structured results.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var events = [];
  var finished = false;
  var overallTimeout;
  var pingTimeout;
  var udpTimeout;

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

  function detailsForLog() {
    var details = wifi.getDetails();
    if (details.password) details.password = "<redacted>";
    return details;
  }

  function rememberEvent(name, details) {
    var item = {
      name : name,
      details : details || {},
      time : Date.now()
    };
    events.push(item);
    info("wifi_event", item);
  }

  function closeTargetSocket() {
    var socket = global.WIFI_TARGET_SOCKET;
    if (socket) {
      try {
        socket.close();
      } catch (error) {
        info("udp_close_error", String(error));
      }
      delete global.WIFI_TARGET_SOCKET;
    }
  }

  function finish(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimeout);
    if (pingTimeout) clearTimeout(pingTimeout);
    if (udpTimeout) clearTimeout(udpTimeout);
    closeTargetSocket();

    pass("wifi_disconnect_requested");
    wifi.disconnect();
    setTimeout(function () {
        var eventNames = events.map(function (item) {
          return item.name;
        });
        if (eventNames.indexOf("associated") >= 0) {
          pass("wifi_event_associated");
        } else {
          fail("wifi_event_associated", "not observed");
        }
        if (eventNames.indexOf("connected") >= 0) {
          pass("wifi_event_connected");
        } else {
          fail("wifi_event_connected", "not observed");
        }
        if (eventNames.indexOf("disconnected") >= 0) {
          pass("wifi_event_disconnected");
        } else {
          info("wifi_event_disconnected", {
            observed : false,
            note : "Supervisor Peer must provide independent leave evidence"
          });
        }

        wifi.removeAllListeners();
        info("finish", {
          reason : reason,
          events : events,
          status : wifi.getStatus(),
          details : detailsForLog(),
          time : Date.now()
        });
        metric("checks_passed", passes);
        metric("checks_failed", failures);
        print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 500);
  }

  function runUDPExchange() {
    var challenge = cfg.runId + "|1|ESPRUINO_WIFI_PEER";
    var expected = "ACK|" + challenge;
    var dgram = require("dgram");
    var socket = dgram.createSocket("udp4");
    global.WIFI_TARGET_SOCKET = socket;

    socket.on("message", function (message, peer) {
      clearTimeout(udpTimeout);
      var text = String(message);
      info("udp_reply", {
        data : text,
        address : peer.address,
        port : peer.port,
        time : Date.now()
      });
      if (text === expected) {
        pass("wifi_udp_challenge_response");
      } else {
        fail(
          "wifi_udp_challenge_response",
          "expected=" + JSON.stringify(expected) +
          " observed=" + JSON.stringify(text)
        );
      }
      if (peer.address === cfg.peerIP) {
        pass("wifi_udp_peer_address", "address=" + peer.address);
      } else {
        fail(
          "wifi_udp_peer_address",
          "expected=" + cfg.peerIP + " observed=" + peer.address
        );
      }
      closeTargetSocket();
      if (cfg.holdAfterExchangeMs) {
        info("post_exchange_hold_ms", cfg.holdAfterExchangeMs);
        setTimeout(function () {
          finish("udp_exchange_complete");
        }, cfg.holdAfterExchangeMs);
      } else {
        finish("udp_exchange_complete");
      }
    });

    udpTimeout = setTimeout(function () {
      fail("wifi_udp_challenge_response", "timeout");
      finish("udp_timeout");
    }, 5000);

    socket.send(challenge, cfg.udpPort, cfg.peerIP);
  }

  function runPing() {
    var pingHandled = false;
    var lastPingResult;
    pingTimeout = setTimeout(function () {
      if (pingHandled) return;
      pingHandled = true;
      fail(
        "wifi_ping_peer",
        "timeout last=" + JSON.stringify(lastPingResult)
      );
      runUDPExchange();
    }, 6500);

    wifi.ping(cfg.peerIP, function (result) {
      if (pingHandled) return;
      var responseTime = typeof result === "number" ? result :
        (result && result.respTime);
      lastPingResult = typeof result === "number" ? { time : result } : {
        totalCount : result && result.totalCount,
        totalBytes : result && result.totalBytes,
        totalTime : result && result.totalTime,
        respTime : responseTime,
        timeoutCount : result && result.timeoutCount,
        bytes : result && result.bytes,
        error : result && result.error
      };
      info("ping_result", lastPingResult);
      if (typeof result === "number" && result >= 0) {
        pingHandled = true;
        clearTimeout(pingTimeout);
        metric("ping_time_ms", result);
        pass("wifi_ping_peer", "time_ms=" + result);
      } else if (
        result &&
        typeof responseTime === "number" &&
        result.bytes > 0
      ) {
        pingHandled = true;
        clearTimeout(pingTimeout);
        metric("ping_time_ms", responseTime);
        pass("wifi_ping_peer", "time_ms=" + responseTime);
      } else {
        return;
      }
      runUDPExchange();
    });
  }

  function connectToPeer() {
    wifi.on("associated", function (details) {
      rememberEvent("associated", details);
    });
    wifi.on("connected", function (details) {
      rememberEvent("connected", details);
    });
    wifi.on("disconnected", function (details) {
      rememberEvent("disconnected", details);
    });

    wifi.connect(cfg.ssid, { password : cfg.password }, function (error) {
      info("connect_callback", {
        error : error,
        status : wifi.getStatus(),
        details : detailsForLog(),
        ip : wifi.getIP(),
        time : Date.now()
      });
      if (error) {
        fail("wifi_connect", "error=" + JSON.stringify(error));
        finish("connect_error");
        return;
      }

      var details = detailsForLog();
      var ip = wifi.getIP();
      if (details.status === "connected") {
        pass("wifi_connect_status", "status=" + details.status);
      } else {
        fail("wifi_connect_status", "status=" + details.status);
      }
      if (ip.ip && ip.ip !== "0.0.0.0") {
        pass("wifi_station_ip", "ip=" + ip.ip);
      } else {
        fail("wifi_station_ip", "ip=" + JSON.stringify(ip.ip));
      }
      if (ip.gw === cfg.peerIP) {
        pass("wifi_station_gateway", "gw=" + ip.gw);
      } else {
        fail(
          "wifi_station_gateway",
          "expected=" + cfg.peerIP + " observed=" + ip.gw
        );
      }
      runPing();
    });
  }

  function scanForPeer() {
    wifi.scan(function (first, second) {
      var error = null;
      var accessPoints;
      // Legacy ESP32 supplies only the AP array; tolerate an error-first form
      // as well so this role remains usable across the two firmware lines.
      if (Array.isArray(first) && second === undefined) {
        accessPoints = first;
      } else {
        error = first;
        accessPoints = second;
      }
      var matches = [];
      if (accessPoints) {
        matches = accessPoints.filter(function (accessPoint) {
          return accessPoint.ssid === cfg.ssid;
        });
      }
      info("scan", {
        error : error,
        count : accessPoints ? accessPoints.length : 0,
        matches : matches,
        time : Date.now()
      });

      if (error) {
        fail("wifi_scan", "error=" + JSON.stringify(error));
        finish("scan_error");
        return;
      }
      if (matches.length === 1) {
        pass("wifi_scan_peer_ssid");
      } else {
        fail("wifi_scan_peer_ssid", "matches=" + matches.length);
        finish("scan_peer_not_unique");
        return;
      }
      if (matches[0].authMode === "wpa2") {
        pass("wifi_scan_peer_auth", "authMode=" + matches[0].authMode);
      } else {
        fail("wifi_scan_peer_auth", "authMode=" + matches[0].authMode);
      }
      metric("scan_peer_rssi_dbm", matches[0].rssi);
      metric("scan_peer_channel", matches[0].channel);
      connectToPeer();
    });
  }

  print("TEST=wifi_station_peer_exchange");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  info("run", {
    runId : cfg.runId,
    ssid : cfg.ssid,
    peerIP : cfg.peerIP,
    udpPort : cfg.udpPort
  });

  overallTimeout = setTimeout(function () {
    fail("wifi_test_overall", "timeout");
    finish("overall_timeout");
  }, 30000);

  wifi.removeAllListeners();
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(scanForPeer, 500);
})();
