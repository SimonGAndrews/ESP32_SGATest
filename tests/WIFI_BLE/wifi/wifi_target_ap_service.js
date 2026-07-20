// Target-hosted WPA2 AP and UDP service with a configured AP subnet.
//
// Before uploading, define global.WIFI_TEST_CONFIG with:
//   runId, ssid, password, channel, udpPort, apIP, netmask
// Optional configureAPIP=false starts the AP with its reset-default address.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var setupTimeout;

  global.WIFI_TARGET_AP_STATE = {
    runId : cfg.runId,
    events : [],
    received : [],
    setAPIPCallback : undefined
  };

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

  function apDetailsForLog() {
    var details = wifi.getAPDetails();
    if (details.password) details.password = "<redacted>";
    return details;
  }

  function rememberEvent(name, details) {
    var item = {
      name : name,
      details : details || {},
      time : Date.now()
    };
    global.WIFI_TARGET_AP_STATE.events.push(item);
    info("target_ap_event", item);
  }

  function checkAPConfiguration() {
    var details = apDetailsForLog();
    var ip = wifi.getAPIP();
    if (details.ssid === cfg.ssid && details.authMode === "wpa2") {
      pass("wifi_target_ap_details");
    } else {
      fail("wifi_target_ap_details", "observed=" + JSON.stringify(details));
    }
    if (
      ip.ip === cfg.apIP &&
      ip.gw === cfg.apIP &&
      ip.netmask === cfg.netmask
    ) {
      pass("wifi_target_ap_custom_ip");
    } else {
      fail("wifi_target_ap_custom_ip", "observed=" + JSON.stringify(ip));
    }
    return { details : details, ip : ip };
  }

  function startUDPService() {
    var dgram = require("dgram");
    var server = dgram.createSocket("udp4");
    global.WIFI_TARGET_AP_SERVER = server;
    server.bind(cfg.udpPort, function (boundServer) {
      boundServer.on("message", function (message, peer) {
        var text = String(message);
        var received = {
          data : text,
          address : peer.address,
          port : peer.port,
          time : Date.now()
        };
        global.WIFI_TARGET_AP_STATE.received.push(received);
        info("target_ap_rx", received);
        boundServer.send("ACK|" + text, peer.port, peer.address);
      });
      var observed = checkAPConfiguration();
      clearTimeout(setupTimeout);
      print("TARGET_AP_READY=" + JSON.stringify({
        runId : cfg.runId,
        udpPort : cfg.udpPort,
        apDetails : observed.details,
        apIP : observed.ip,
        setAPIPCallback : global.WIFI_TARGET_AP_STATE.setAPIPCallback,
        time : Date.now()
      }));
    });
  }

  function startTargetAP() {
    wifi.startAP(cfg.ssid, {
      authMode : "wpa2",
      password : cfg.password,
      channel : cfg.channel
    }, function (error) {
      info("target_start_ap_callback", { error : error, time : Date.now() });
      if (error) {
        fail("wifi_target_start_ap", "error=" + JSON.stringify(error));
        print("TARGET_AP_ERROR=" + JSON.stringify({
          phase : "startAP",
          error : error
        }));
        return;
      }
      pass("wifi_target_start_ap");
      startUDPService();
    });
  }

  function configureAndStartTargetAP() {
    if (cfg.configureAPIP === false) {
      info("target_set_ap_ip_skipped", {
        reason : "use_reset_default",
        apIP : wifi.getAPIP(),
        time : Date.now()
      });
      startTargetAP();
      return;
    }
    wifi.setAPIP({
      ip : cfg.apIP,
      gw : cfg.apIP,
      netmask : cfg.netmask
    }, function (error) {
      global.WIFI_TARGET_AP_STATE.setAPIPCallback = error;
      info("target_set_ap_ip_callback", {
        error : error,
        apIP : wifi.getAPIP(),
        time : Date.now()
      });
      if (error === null || error === undefined) {
        pass("wifi_target_set_ap_ip_callback");
      } else {
        fail(
          "wifi_target_set_ap_ip_callback",
          "expected=null observed=" + JSON.stringify(error)
        );
      }
      startTargetAP();
    });
  }

  global.wifiTargetAPStop = function () {
    var state = global.WIFI_TARGET_AP_STATE;
    var eventNames = state.events.map(function (item) {
      return item.name;
    });
    if (eventNames.indexOf("sta_joined") >= 0) {
      pass("wifi_target_ap_station_joined");
    } else {
      fail("wifi_target_ap_station_joined", "not observed");
    }
    if (eventNames.indexOf("sta_left") >= 0) {
      pass("wifi_target_ap_station_left");
    } else {
      fail("wifi_target_ap_station_left", "not observed");
    }
    if (
      state.received.length === 1 &&
      state.received[0].data.indexOf(cfg.runId + "|") === 0
    ) {
      pass("wifi_target_ap_received_challenge");
    } else {
      fail(
        "wifi_target_ap_received_challenge",
        "observed=" + JSON.stringify(state.received)
      );
    }

    print("TARGET_AP_SUMMARY=" + JSON.stringify({
      runId : state.runId,
      events : state.events,
      received : state.received,
      setAPIPCallback : state.setAPIPCallback,
      apDetails : apDetailsForLog(),
      apIP : wifi.getAPIP(),
      checksPassed : passes,
      checksFailed : failures
    }));

    if (global.WIFI_TARGET_AP_SERVER) {
      try {
        global.WIFI_TARGET_AP_SERVER.close();
      } catch (error) {
        info("target_ap_close_error", String(error));
      }
      delete global.WIFI_TARGET_AP_SERVER;
    }
    wifi.removeAllListeners();
    wifi.disconnect();
    wifi.stopAP();
    setTimeout(function () {
      info("target_ap_finish", {
        status : wifi.getStatus(),
        ip : wifi.getIP(),
        apIP : wifi.getAPIP(),
        time : Date.now()
      });
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 500);
  };

  print("TEST=wifi_target_ap_service");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  info("run", {
    runId : cfg.runId,
    ssid : cfg.ssid,
    apIP : cfg.apIP,
    netmask : cfg.netmask,
    udpPort : cfg.udpPort
  });

  setupTimeout = setTimeout(function () {
    fail("wifi_target_ap_setup", "timeout");
    print("TARGET_AP_ERROR=" + JSON.stringify({ phase : "setup_timeout" }));
  }, 12000);

  wifi.removeAllListeners();
  wifi.on("sta_joined", function (details) {
    rememberEvent("sta_joined", details);
  });
  wifi.on("sta_left", function (details) {
    rememberEvent("sta_left", details);
  });
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(configureAndStartTargetAP, 500);
})();
