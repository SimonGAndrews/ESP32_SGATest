// Exercise required station transitions against the controlled Wi-Fi peer.
// global.WIFI_TEST_CONFIG must contain runId, ssid, password, peerIP and udpPort.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var finished = false;
  var associatedEvents = 0;
  var connectedEvents = 0;
  var disconnectedEvents = 0;
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

  function decodeScan(first, second) {
    if (Array.isArray(first) && second === undefined)
      return { error:null, accessPoints:first };
    return { error:first, accessPoints:second || [] };
  }

  function connectedState(name) {
    var status = wifi.getStatus();
    var ip = wifi.getIP();
    info(name + "_state", { status:status, ip:ip });
    if (status.station === "connected" && ip.ip && ip.ip !== "0.0.0.0") {
      pass(name + "_connected", "ip=" + ip.ip);
      return true;
    }
    fail(name + "_connected", "status=" + JSON.stringify(status));
    return false;
  }

  function udp(stage, next) {
    var dgram = require("dgram");
    var socket = dgram.createSocket("udp4");
    var challenge = cfg.runId + "|" + stage + "|WIFI_LIFECYCLE";
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
      var text = String(message);
      if (text === expected && peer.address === cfg.peerIP)
        pass(stage + "_udp", "peer=" + peer.address);
      else
        fail(stage + "_udp", "reply=" + JSON.stringify(text));
      try { socket.close(); } catch (e) {}
      next();
    });
    socket.send(challenge, cfg.udpPort, cfg.peerIP);
  }

  function connect(stage, next) {
    wifi.connect(cfg.ssid, { password:cfg.password }, function (error) {
      info(stage + "_callback", { error:error, status:wifi.getStatus() });
      if (error) {
        fail(stage + "_callback", "error=" + JSON.stringify(error));
        next();
        return;
      }
      pass(stage + "_callback");
      connectedState(stage);
      udp(stage, next);
    });
  }

  function finalConnect() {
    connect("post_scan_connect", finish);
  }

  function scanWhileDisconnected() {
    var connectedBefore = connectedEvents;
    wifi.scan(function (first, second) {
      var scan = decodeScan(first, second);
      var matches = scan.accessPoints.filter(function (ap) {
        return ap.ssid === cfg.ssid;
      });
      info("disconnected_scan", {
        error:scan.error,
        count:scan.accessPoints.length,
        matches:matches.length
      });
      if (!scan.error && matches.length === 1)
        pass("disconnected_scan_peer_visible");
      else
        fail("disconnected_scan_peer_visible");
      setTimeout(function () {
        if (connectedEvents === connectedBefore && wifi.getIP().ip === "0.0.0.0")
          pass("disconnected_scan_did_not_connect");
        else
          fail("disconnected_scan_did_not_connect");
        finalConnect();
      }, 750);
    });
  }

  function explicitDisconnect() {
    var deadline = Date.now() + 5000;
    wifi.disconnect();
    function waitForDisconnect() {
      if (wifi.getIP().ip === "0.0.0.0") {
        pass("explicit_disconnect_no_ip");
        scanWhileDisconnected();
      } else if (Date.now() >= deadline) {
        fail("explicit_disconnect_no_ip", "timeout");
        scanWhileDisconnected();
      } else {
        setTimeout(waitForDisconnect, 200);
      }
    }
    setTimeout(waitForDisconnect, 200);
  }

  function reconnectWhileConnected() {
    connect("connected_reconnect", explicitDisconnect);
  }

  function scanWhileConnected() {
    var ipBefore = wifi.getIP().ip;
    var disconnectedBefore = disconnectedEvents;
    wifi.scan(function (first, second) {
      var scan = decodeScan(first, second);
      var matches = scan.accessPoints.filter(function (ap) {
        return ap.ssid === cfg.ssid;
      });
      info("connected_scan", {
        error:scan.error,
        count:scan.accessPoints.length,
        matches:matches.length
      });
      if (!scan.error && matches.length === 1)
        pass("connected_scan_peer_visible");
      else
        fail("connected_scan_peer_visible");
      setTimeout(function () {
        var ipAfter = wifi.getIP().ip;
        if (ipAfter === ipBefore && disconnectedEvents === disconnectedBefore)
          pass("connected_scan_preserved_connection", "ip=" + ipAfter);
        else
          fail("connected_scan_preserved_connection", "ip=" + ipAfter);
        udp("connected_scan", reconnectWhileConnected);
      }, 750);
    });
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    wifi.disconnect();
    setTimeout(function () {
      info("event_counts", {
        associated:associatedEvents,
        connected:connectedEvents,
        disconnected:disconnectedEvents
      });
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 500);
  }

  print("TEST=wifi_station_transition_lifecycle");
  print("TARGET=" + process.env.BOARD);
  wifi.removeAllListeners();
  wifi.on("associated", function () { associatedEvents++; });
  wifi.on("connected", function () { connectedEvents++; });
  wifi.on("disconnected", function () { disconnectedEvents++; });
  timeout = setTimeout(function () {
    fail("overall_timeout");
    finish();
  }, cfg.overallTimeoutMs || 60000);
  connect("idle_connect", scanWhileConnected);
})();
