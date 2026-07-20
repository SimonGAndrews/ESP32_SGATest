// Supervisor Peer role for the two-board V1 Wi-Fi proofs.
//
// Before uploading, define global.WIFI_TEST_CONFIG with:
//   runId, ssid, password, channel, udpPort
//
// The host starts this role first and waits for PEER_READY. After the target
// finishes, the host calls wifiPeerStop(). No Wi-Fi configuration is saved.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");

  global.WIFI_PEER_STATE = {
    runId : cfg.runId,
    events : [],
    received : [],
    pingResult : null
  };

  function emit(name, value) {
    print(name + "=" + JSON.stringify(value));
  }

  function apDetailsForLog() {
    var details = wifi.getAPDetails();
    if (details.password) details.password = "<redacted>";
    return details;
  }

  function event(name, details) {
    var item = {
      name : name,
      details : details || {},
      time : Date.now()
    };
    global.WIFI_PEER_STATE.events.push(item);
    emit("PEER_EVENT", item);
  }

  wifi.removeAllListeners();
  wifi.on("sta_joined", function (details) {
    event("sta_joined", details);
  });
  wifi.on("sta_left", function (details) {
    event("sta_left", details);
  });

  global.wifiPeerStop = function () {
    var state = global.WIFI_PEER_STATE;
    var server = global.WIFI_PEER_SERVER;
    if (server) {
      try {
        server.close();
      } catch (error) {
        state.closeError = String(error);
      }
      delete global.WIFI_PEER_SERVER;
    }

    emit("PEER_SUMMARY", {
      runId : state.runId,
      events : state.events,
      received : state.received,
      pingResult : state.pingResult,
      apDetails : apDetailsForLog(),
      apIP : wifi.getAPIP()
    });

    wifi.removeAllListeners();
    wifi.disconnect();
    wifi.stopAP();
    setTimeout(function () {
      emit("PEER_DONE", {
        runId : state.runId,
        status : wifi.getStatus(),
        ip : wifi.getIP(),
        time : Date.now()
      });
    }, 500);
  };

  wifi.disconnect();
  wifi.stopAP();
  setTimeout(function () {
      wifi.startAP(cfg.ssid, {
        authMode : "wpa2",
        password : cfg.password,
        channel : cfg.channel
      }, function (error) {
        if (error) {
          emit("PEER_ERROR", {
            phase : "startAP",
            error : String(error)
          });
          return;
        }

        var dgram = require("dgram");
        var server = dgram.createSocket("udp4");
        global.WIFI_PEER_SERVER = server;

        server.bind(cfg.udpPort, function (boundServer) {
          boundServer.on("message", function (message, info) {
            var text = String(message);
            var received = {
              data : text,
              address : info.address,
              port : info.port,
              time : Date.now()
            };
            var state = global.WIFI_PEER_STATE;
            state.received.push(received);
            emit("PEER_RX", received);
            boundServer.send(
              "ACK|" + text,
              info.port,
              info.address
            );
            if (cfg.pingClientOnReceive) {
              wifi.ping(info.address, function (result) {
                var pingResult = {
                  address : info.address,
                  totalCount : result && result.totalCount,
                  totalBytes : result && result.totalBytes,
                  totalTime : result && result.totalTime,
                  respTime : result && result.respTime,
                  timeoutCount : result && result.timeoutCount,
                  bytes : result && result.bytes,
                  error : result && result.error,
                  time : Date.now()
                };
                state.pingResult = pingResult;
                emit("PEER_PING", pingResult);
              });
            }
          });

          emit("PEER_READY", {
            runId : cfg.runId,
            ssid : cfg.ssid,
            channel : cfg.channel,
            udpPort : cfg.udpPort,
            apDetails : apDetailsForLog(),
            apIP : wifi.getAPIP(),
            time : Date.now()
          });
        });
      });
  }, 500);
})();
