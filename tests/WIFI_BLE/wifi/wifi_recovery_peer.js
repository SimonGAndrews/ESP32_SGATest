// Controlled Wi-Fi peer for an AP-loss and explicit-recovery test.
// global.WIFI_TEST_CONFIG must contain runId, ssid, password, channel and udpPort.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");

  global.WIFI_PEER_STATE = {
    runId:cfg.runId,
    events:[],
    received:[],
    pingResult:null
  };

  function emit(name, value) {
    print(name + "=" + JSON.stringify(value));
  }

  function event(name, details) {
    var item = { name:name, details:details || {}, time:Date.now() };
    global.WIFI_PEER_STATE.events.push(item);
    emit("PEER_EVENT", item);
  }

  function apDetailsForLog() {
    var details = wifi.getAPDetails();
    if (details.password) details.password = "<redacted>";
    return details;
  }

  function startAP(marker) {
    wifi.startAP(cfg.ssid, {
      authMode:"wpa2",
      password:cfg.password,
      channel:cfg.channel
    }, function (error) {
      if (error) {
        emit("PEER_ERROR", { phase:marker, error:String(error) });
        return;
      }
      emit(marker, {
        runId:cfg.runId,
        ssid:cfg.ssid,
        channel:cfg.channel,
        udpPort:cfg.udpPort,
        apDetails:apDetailsForLog(),
        apIP:wifi.getAPIP(),
        time:Date.now()
      });
    });
  }

  function dropAndRestoreAP() {
    setTimeout(function () {
      wifi.stopAP(function (error) {
        emit("PEER_AP_STOPPED", { error:error, time:Date.now() });
        setTimeout(function () {
          startAP("PEER_AP_RESTORED");
        }, 8000);
      });
    }, 250);
  }

  wifi.removeAllListeners();
  wifi.on("sta_joined", function (details) { event("sta_joined", details); });
  wifi.on("sta_left", function (details) { event("sta_left", details); });

  global.wifiPeerStop = function () {
    var state = global.WIFI_PEER_STATE;
    emit("PEER_SUMMARY", {
      runId:state.runId,
      events:state.events,
      received:state.received,
      pingResult:null,
      apDetails:apDetailsForLog(),
      apIP:wifi.getAPIP()
    });
    var activeServer = global.WIFI_PEER_SERVER;
    if (activeServer) {
      try { activeServer.close(); }
      catch (error) { state.closeError = String(error); }
      delete global.WIFI_PEER_SERVER;
    }
    wifi.removeAllListeners();
    wifi.disconnect();
    wifi.stopAP();
    setTimeout(function () {
      emit("PEER_DONE", {
        runId:state.runId,
        status:wifi.getStatus(),
        ip:wifi.getIP(),
        time:Date.now()
      });
    }, 500);
  };

  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
    startAP("PEER_READY");
    setTimeout(function () {
      global.WIFI_PEER_SERVER = require("dgram").createSocket("udp4");
      global.WIFI_PEER_SERVER.bind(cfg.udpPort, function (boundServer) {
        boundServer.on("message", function (message, info) {
          var text = String(message);
          var received = {
            data:text,
            address:info.address,
            port:info.port,
            time:Date.now()
          };
          global.WIFI_PEER_STATE.received.push(received);
          emit("PEER_RX", received);
          boundServer.send("ACK|" + text, info.port, info.address);
          if (text.indexOf("|CONTROL_DROP_RESTORE") >= 0)
            dropAndRestoreAP();
        });
      });
    }, 500);
  }, 500);
})();
