// After a hardware reboot, prove that saved STA configuration restored a usable link.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var deadline = Date.now() + 15000;
  var finished = false;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    wifi.save("clear");
    wifi.disconnect();
    setTimeout(function () {
      print((ok ? "PASS " : "FAIL ") + reason);
      print("DONE=" + (ok ? "PASS" : "FAIL"));
    }, 500);
  }

  function verifyTraffic() {
    var socket = require("dgram").createSocket("udp4");
    var challenge = cfg.runId + "|restore|RESTORE_LIFECYCLE";
    var expected = "ACK|" + challenge;
    var udpTimeout = setTimeout(function () {
      try { socket.close(); } catch (e) {}
      finish(false, "restored_udp_timeout");
    }, 5000);
    socket.on("message", function (message, peer) {
      clearTimeout(udpTimeout);
      var ok = String(message) === expected && peer.address === cfg.peerIP;
      try { socket.close(); } catch (e) {}
      finish(ok, ok ? "restored_udp_exchange" : "restored_udp_reply_invalid");
    });
    socket.send(challenge, cfg.udpPort, cfg.peerIP);
  }

  function waitForRestore() {
    var status = wifi.getStatus();
    var ip = wifi.getIP();
    if (status.station === "connected" && ip.ip && ip.ip !== "0.0.0.0") {
      print("PASS restored_after_hardware_reboot ip=" + ip.ip);
      verifyTraffic();
    } else if (Date.now() >= deadline) {
      print("INFO restore_timeout_state=" + JSON.stringify({status:status, ip:ip}));
      finish(false, "saved_station_restore_timeout");
    } else {
      setTimeout(waitForRestore, 500);
    }
  }

  print("TEST=wifi_restore_verify");
  print("TARGET=" + process.env.BOARD);
  waitForRestore();
})();
