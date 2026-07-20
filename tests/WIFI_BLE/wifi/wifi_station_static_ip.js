// Focused Wifi.setIP station test for the controlled target-hosted AP.
// WIFI_TEST_CONFIG supplies runId, ssid, password, peerIP, udpPort,
// stationIP and netmask. No configuration is saved.

(function () {
  var c = global.WIFI_TEST_CONFIG;
  var w = require("Wifi");
  var passCount = 0;
  var failCount = 0;
  var events = [];
  var socket;
  var finished = false;
  var overallTimer;
  var pingTimer;
  var udpTimer;

  function info(name, value) {
    print("INFO " + name + "=" + JSON.stringify(value));
  }

  function pass(name, detail) {
    passCount++;
    print("PASS " + name + (detail ? " " + detail : ""));
  }

  function fail(name, detail) {
    failCount++;
    print("FAIL " + name + (detail ? " " + detail : ""));
  }

  function checkIP(name) {
    var ip = w.getIP();
    info(name + "_observed", ip);
    if (
      ip.ip === c.stationIP &&
      ip.gw === c.peerIP &&
      ip.netmask === c.netmask
    ) {
      pass(name, "ip=" + ip.ip);
      return true;
    }
    fail(name, "observed=" + JSON.stringify(ip));
    return false;
  }

  function finish(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    if (pingTimer) clearTimeout(pingTimer);
    if (udpTimer) clearTimeout(udpTimer);
    w.disconnect();
    setTimeout(function () {
      if (events.indexOf("associated") >= 0) pass("wifi_event_associated");
      else fail("wifi_event_associated", "not observed");
      if (events.indexOf("connected") >= 0) pass("wifi_event_connected");
      else fail("wifi_event_connected", "not observed");
      if (events.indexOf("disconnected") >= 0) {
        pass("wifi_event_disconnected");
      } else {
        info("wifi_event_disconnected", { observed : false });
      }
      w.removeAllListeners();
      info("finish", {
        reason : reason,
        events : events,
        status : w.getStatus(),
        ip : w.getIP(),
        time : Date.now()
      });
      print("METRIC checks_passed=" + passCount);
      print("METRIC checks_failed=" + failCount);
      print("DONE=" + (failCount ? "FAIL" : "PASS"));
    }, 500);
  }

  function runUDP() {
    var challenge = c.runId + "|1|ESPRUINO_WIFI_STATIC_IP";
    var expected = "ACK|" + challenge;
    socket = require("dgram").createSocket("udp4");
    global.WIFI_TARGET_SOCKET = socket;
    socket.on("message", function (message, peer) {
      clearTimeout(udpTimer);
      info("udp_reply", {
        data : String(message),
        address : peer.address,
        port : peer.port,
        time : Date.now()
      });
      if (String(message) === expected) pass("wifi_udp_challenge_response");
      else fail("wifi_udp_challenge_response", "unexpected payload");
      if (peer.address === c.peerIP) pass("wifi_udp_peer_address");
      else fail("wifi_udp_peer_address", "observed=" + peer.address);
      setTimeout(function () {
        checkIP("wifi_station_static_ip_retained");
        finish("udp_exchange_complete");
      }, 2500);
    });
    udpTimer = setTimeout(function () {
      fail("wifi_udp_challenge_response", "timeout");
      finish("udp_timeout");
    }, 5000);
    socket.send(challenge, c.udpPort, c.peerIP);
  }

  function runPing() {
    var handled = false;
    var last;
    pingTimer = setTimeout(function () {
      if (handled) return;
      handled = true;
      fail("wifi_ping_peer", "timeout last=" + JSON.stringify(last));
      runUDP();
    }, 6500);
    w.ping(c.peerIP, function (result) {
      if (handled) return;
      last = result;
      info("ping_result", result);
      if (
        (typeof result === "number" && result >= 0) ||
        (result && result.bytes > 0)
      ) {
        handled = true;
        clearTimeout(pingTimer);
        pass("wifi_ping_peer");
        runUDP();
      }
    });
  }

  function applyStaticIP() {
    w.setIP({
      ip : c.stationIP,
      gw : c.peerIP,
      netmask : c.netmask
    }, function (error) {
      info("station_set_ip_callback", {
        error : error,
        ip : w.getIP(),
        time : Date.now()
      });
      if (error === null || error === undefined) {
        pass("wifi_station_set_ip_callback");
      } else {
        fail(
          "wifi_station_set_ip_callback",
          "expected=null observed=" + JSON.stringify(error)
        );
      }
      setTimeout(function () {
        checkIP("wifi_station_static_ip_applied");
        runPing();
      }, 500);
    });
  }

  function connect() {
    w.connect(c.ssid, { password : c.password }, function (error) {
      var ip = w.getIP();
      info("connect_callback", {
        error : error,
        status : w.getStatus(),
        ip : ip,
        time : Date.now()
      });
      if (error) {
        fail("wifi_connect", "error=" + JSON.stringify(error));
        finish("connect_error");
        return;
      }
      pass("wifi_connect");
      if (ip.ip && ip.ip !== "0.0.0.0") {
        pass("wifi_station_dhcp_ip", "ip=" + ip.ip);
      } else {
        fail("wifi_station_dhcp_ip", "observed=" + JSON.stringify(ip));
      }
      applyStaticIP();
    });
  }

  print("TEST=wifi_station_static_ip");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  info("run", {
    runId : c.runId,
    ssid : c.ssid,
    peerIP : c.peerIP,
    stationIP : c.stationIP
  });
  overallTimer = setTimeout(function () {
    fail("wifi_test_overall", "timeout");
    finish("overall_timeout");
  }, 25000);
  w.removeAllListeners();
  w.on("associated", function () { events.push("associated"); });
  w.on("connected", function () { events.push("connected"); });
  w.on("disconnected", function () { events.push("disconnected"); });
  w.disconnect();
  w.stopAP();
  setTimeout(connect, 500);
})();
