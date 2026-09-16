// Cancel an in-flight station request, then prove repeated connections still work.
// global.WIFI_TEST_CONFIG must contain runId, ssid, password, peerIP and udpPort.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var finished = false;
  var unexpectedConnected = 0;
  var cycle = 0;
  var timeout;

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
    clearTimeout(timeout);
    wifi.disconnect();
    setTimeout(function () {
      print("METRIC completed_cycles=" + cycle);
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 500);
  }

  function udp(next) {
    var socket = require("dgram").createSocket("udp4");
    var challenge = cfg.runId + "|cycle_" + cycle + "|CONNECT_CANCEL";
    var expected = "ACK|" + challenge;
    var done = false;
    var udpTimeout = setTimeout(function () {
      if (done) return;
      done = true;
      try { socket.close(); } catch (e) {}
      fail("cycle_" + cycle + "_udp", "timeout");
      next();
    }, 5000);
    socket.on("message", function (message) {
      if (done) return;
      done = true;
      clearTimeout(udpTimeout);
      if (String(message) === expected) pass("cycle_" + cycle + "_udp");
      else fail("cycle_" + cycle + "_udp");
      try { socket.close(); } catch (e) {}
      next();
    });
    socket.send(challenge, cfg.udpPort, cfg.peerIP);
  }

  function runCycle() {
    if (cycle >= 5) {
      finish();
      return;
    }
    cycle++;
    wifi.connect(cfg.ssid, { password:cfg.password }, function (error) {
      var ip = wifi.getIP().ip;
      if (!error && ip && ip !== "0.0.0.0")
        pass("cycle_" + cycle + "_connect", "ip=" + ip);
      else
        fail("cycle_" + cycle + "_connect", "error=" + JSON.stringify(error));
      udp(function () {
        wifi.disconnect();
        setTimeout(runCycle, 500);
      });
    });
  }

  print("TEST=wifi_connect_cancel_lifecycle");
  print("TARGET=" + process.env.BOARD);
  timeout = setTimeout(function () {
    fail("overall_timeout");
    finish();
  }, cfg.overallTimeoutMs || 60000);
  wifi.removeAllListeners();
  wifi.on("connected", function () {
    if (cycle === 0) unexpectedConnected++;
  });
  wifi.connect(cfg.ssid, { password:cfg.password }, function (error) {
    print("INFO cancelled_connect_callback=" + JSON.stringify(error));
  });
  wifi.disconnect();
  setTimeout(function () {
    var ip = wifi.getIP().ip;
    if (ip === "0.0.0.0" && unexpectedConnected === 0)
      pass("cancelled_connect_remained_disconnected");
    else
      fail("cancelled_connect_remained_disconnected", "ip=" + ip);
    runCycle();
  }, 2500);
})();
