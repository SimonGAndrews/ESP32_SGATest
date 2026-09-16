// Exercise classic ESP32 AP/STA transitions against the controlled peer.
// global.WIFI_TEST_CONFIG must contain runId, ssid, password, peerIP and udpPort.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var finished = false;
  var timeout;

  function pass(name, details) {
    passes++;
    print("PASS " + name + (details ? " " + details : ""));
  }
  function fail(name, details) {
    failures++;
    print("FAIL " + name + (details ? " " + details : ""));
  }
  function info(name, value) {
    print("INFO " + name + "=" + JSON.stringify(value));
  }

  function udp(stage, next) {
    var socket = require("dgram").createSocket("udp4");
    var challenge = cfg.runId + "|" + stage + "|APSTA_LIFECYCLE";
    var expected = "ACK|" + challenge;
    var done = false;
    var udpTimeout = setTimeout(function () {
      if (done) return;
      done = true;
      try { socket.close(); } catch (e) {}
      fail(stage + "_udp", "timeout");
      next();
    }, 5000);
    socket.on("message", function (message, peer) {
      if (done) return;
      done = true;
      clearTimeout(udpTimeout);
      if (String(message) === expected && peer.address === cfg.peerIP)
        pass(stage + "_udp");
      else
        fail(stage + "_udp", "reply=" + JSON.stringify(String(message)));
      try { socket.close(); } catch (e) {}
      next();
    });
    socket.send(challenge, cfg.udpPort, cfg.peerIP);
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    wifi.disconnect();
    wifi.stopAP();
    setTimeout(function () {
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 500);
  }

  function afterStopAP() {
    setTimeout(function () {
      var status = wifi.getStatus();
      var ip = wifi.getIP();
      info("after_stop_ap", { status:status, ip:ip });
      if (status.mode === "STA" && status.station === "connected")
        pass("stop_ap_preserved_station");
      else
        fail("stop_ap_preserved_station", "status=" + JSON.stringify(status));
      if (ip.ip && ip.ip !== "0.0.0.0")
        pass("stop_ap_preserved_ip", "ip=" + ip.ip);
      else
        fail("stop_ap_preserved_ip");
      udp("sta_after_stop_ap", finish);
    }, 1000);
  }

  function connectFromAP() {
    wifi.connect(cfg.ssid, { password:cfg.password }, function (error) {
      var status = wifi.getStatus();
      var ip = wifi.getIP();
      info("ap_to_apsta", { error:error, status:status, ip:ip });
      if (!error) pass("ap_to_apsta_connect_callback");
      else fail("ap_to_apsta_connect_callback", "error=" + JSON.stringify(error));
      if (status.mode === "APSTA" && status.station === "connected")
        pass("ap_to_apsta_mode");
      else
        fail("ap_to_apsta_mode", "status=" + JSON.stringify(status));
      if (ip.ip && ip.ip !== "0.0.0.0") pass("apsta_station_ip", "ip=" + ip.ip);
      else fail("apsta_station_ip");
      // Both ESP32 soft-AP interfaces use 192.168.4.1 by default, so a UDP
      // exchange with the peer is ambiguous until this target's AP is stopped.
      // Association is independently confirmed by the controlled peer's join
      // event; verify end-to-end UDP immediately after the AP-to-STA transition.
      wifi.stopAP(afterStopAP);
    });
  }

  print("TEST=wifi_apsta_transition_lifecycle");
  print("TARGET=" + process.env.BOARD);
  timeout = setTimeout(function () {
    fail("overall_timeout");
    finish();
  }, cfg.overallTimeoutMs || 45000);
  wifi.startAP("TARGET_" + cfg.runId.slice(-6), {
    authMode:"wpa2",
    password:"Target_" + cfg.runId.slice(-6),
    channel:11
  }, function (error) {
    var status = wifi.getStatus();
    info("ap_only", { error:error, status:status, apIP:wifi.getAPIP() });
    // The ESP32 driver can retain an unassociated STA interface alongside AP.
    if (!error && (status.mode === "AP" || status.mode === "APSTA"))
      pass("ap_only_started", "mode=" + status.mode);
    else fail("ap_only_started", "status=" + JSON.stringify(status));
    connectFromAP();
  });
})();
