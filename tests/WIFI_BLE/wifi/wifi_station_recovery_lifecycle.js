// Verify explicit Wifi.connect() recovery after the controlled AP disappears.
// global.WIFI_TEST_CONFIG must contain runId, ssid, password, peerIP and udpPort.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var disconnected = false;
  var finished = false;
  var overallTimeout;

  function pass(name, details) {
    passes++;
    print("PASS " + name + (details ? " " + details : ""));
  }
  function fail(name, details) {
    failures++;
    print("FAIL " + name + (details ? " " + details : ""));
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimeout);
    wifi.removeAllListeners();
    wifi.disconnect();
    setTimeout(function () {
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 500);
  }

  function udp(stage, payload, next) {
    var socket = require("dgram").createSocket("udp4");
    var challenge = cfg.runId + "|" + payload;
    var done = false;
    var timeout = setTimeout(function () {
      if (done) return;
      done = true;
      try { socket.close(); } catch (e) {}
      fail(stage + "_udp", "timeout");
      next();
    }, 5000);
    socket.on("message", function (message, peer) {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      if (String(message) === "ACK|" + challenge && peer.address === cfg.peerIP)
        pass(stage + "_udp");
      else
        fail(stage + "_udp", "reply=" + JSON.stringify(String(message)));
      try { socket.close(); } catch (e) {}
      next();
    });
    socket.send(challenge, cfg.udpPort, cfg.peerIP);
  }

  function recover() {
    wifi.connect(cfg.ssid, { password:cfg.password }, function (error) {
      var status = wifi.getStatus();
      var ip = wifi.getIP();
      print("INFO recovery=" + JSON.stringify({
        error:error,
        disconnectedSeen:disconnected,
        status:status,
        ip:ip
      }));
      if (disconnected) pass("ap_loss_observed");
      else fail("ap_loss_observed");
      if (!error && status.station === "connected" && ip.ip !== "0.0.0.0")
        pass("explicit_reconnect", "ip=" + ip.ip);
      else
        fail("explicit_reconnect", "error=" + JSON.stringify(error));
      udp("after_restore", "AFTER_RESTORE", finish);
    });
  }

  function requestOutage() {
    udp("outage_control", "CONTROL_DROP_RESTORE", function () {
      // The peer keeps its AP down for eight seconds. Reconnect explicitly
      // after it has restarted, exercising a new request after STA_STOP.
      setTimeout(recover, 12000);
    });
  }

  print("TEST=wifi_station_recovery_lifecycle");
  print("TARGET=" + process.env.BOARD);
  wifi.removeAllListeners();
  wifi.on("disconnected", function () { disconnected = true; });
  overallTimeout = setTimeout(function () {
    fail("overall_timeout");
    finish();
  }, cfg.overallTimeoutMs || 40000);

  wifi.connect(cfg.ssid, { password:cfg.password }, function (error) {
    var status = wifi.getStatus();
    var ip = wifi.getIP();
    if (!error && status.station === "connected" && ip.ip !== "0.0.0.0")
      pass("initial_connect", "ip=" + ip.ip);
    else
      fail("initial_connect", "error=" + JSON.stringify(error));
    udp("before_outage", "BEFORE_OUTAGE", requestOutage);
  });
})();
