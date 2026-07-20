// Negative Wi-Fi station cases using a configured Supervisor Peer.
//
// Before uploading, define global.WIFI_TEST_CONFIG with:
//   caseName, ssid, password, wrongPassword, absentSSID
//
// Supported cases are wrong_password and unavailable_ssid. The host performs
// a chip reboot and re-uploads this role between cases.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var events = [];
  var finished = false;
  var connectCallbackObserved = false;
  var caseTimeout;
  var overallTimeout;

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

  function detailsForLog() {
    var details = wifi.getDetails();
    if (details.password) details.password = "<redacted>";
    return details;
  }

  function snapshot() {
    return {
      status : wifi.getStatus(),
      details : detailsForLog(),
      ip : wifi.getIP(),
      events : events,
      time : Date.now()
    };
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

  function assertNoConnection() {
    var ip = wifi.getIP();
    var connected = events.some(function (item) {
      return item.name === "connected";
    });
    if (ip.ip === "0.0.0.0") {
      pass("wifi_negative_no_ip");
    } else {
      fail("wifi_negative_no_ip", "observed=" + JSON.stringify(ip));
    }
    if (!connected) {
      pass("wifi_negative_no_connected_event");
    } else {
      fail("wifi_negative_no_connected_event", "connected event observed");
    }
  }

  function finish(reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimeout);
    if (caseTimeout) clearTimeout(caseTimeout);
    assertNoConnection();
    info("negative_finish_before_disconnect", {
      caseName : cfg.caseName,
      reason : reason,
      snapshot : snapshot()
    });
    wifi.disconnect();
    setTimeout(function () {
      wifi.removeAllListeners();
      info("negative_finish", {
        caseName : cfg.caseName,
        reason : reason,
        snapshot : snapshot()
      });
      print("METRIC checks_passed=" + passes);
      print("METRIC checks_failed=" + failures);
      print("DONE=" + (failures ? "FAIL" : "PASS"));
    }, 500);
  }

  function decodeScan(first, second) {
    if (Array.isArray(first) && second === undefined) {
      return { error : null, accessPoints : first };
    }
    return { error : first, accessPoints : second || [] };
  }

  function runWrongPassword(accessPoints) {
    var matches = accessPoints.filter(function (accessPoint) {
      return accessPoint.ssid === cfg.ssid;
    });
    if (matches.length === 1 && matches[0].authMode === "wpa2") {
      pass("wifi_wrong_password_peer_visible");
    } else {
      fail(
        "wifi_wrong_password_peer_visible",
        "matches=" + JSON.stringify(matches)
      );
      finish("peer_not_visible");
      return;
    }

    caseTimeout = setTimeout(function () {
      fail("wifi_wrong_password_callback", "timeout");
      finish("wrong_password_timeout");
    }, 15000);

    wifi.connect(cfg.ssid, { password : cfg.wrongPassword }, function (error) {
      connectCallbackObserved = true;
      if (finished) {
        info("wrong_password_late_callback", { error : error });
        return;
      }
      clearTimeout(caseTimeout);
      caseTimeout = undefined;
      info("wrong_password_callback", {
        error : error,
        snapshot : snapshot()
      });
      if (error) {
        pass("wifi_wrong_password_rejected", "error=" + JSON.stringify(error));
      } else {
        fail("wifi_wrong_password_rejected", "callback reported success");
      }
      finish("wrong_password_callback");
    });
  }

  function runUnavailableSSID(accessPoints) {
    var matches = accessPoints.filter(function (accessPoint) {
      return accessPoint.ssid === cfg.absentSSID;
    });
    if (matches.length === 0) {
      pass("wifi_unavailable_ssid_absent_from_scan");
    } else {
      fail(
        "wifi_unavailable_ssid_absent_from_scan",
        "matches=" + JSON.stringify(matches)
      );
      finish("absent_ssid_was_visible");
      return;
    }

    caseTimeout = setTimeout(function () {
      pass("wifi_unavailable_ssid_bounded_timeout");
      info("unavailable_ssid_timeout", snapshot());
      finish("unavailable_ssid_timeout");
    }, 8000);

    wifi.connect(cfg.absentSSID, { password : cfg.password }, function (error) {
      clearTimeout(caseTimeout);
      caseTimeout = undefined;
      info("unavailable_ssid_callback", {
        error : error,
        snapshot : snapshot()
      });
      if (error) {
        pass("wifi_unavailable_ssid_rejected", "error=" + JSON.stringify(error));
      } else {
        fail("wifi_unavailable_ssid_rejected", "callback reported success");
      }
      finish("unavailable_ssid_callback");
    });
  }

  function beginCase() {
    wifi.scan(function (first, second) {
      var scan = decodeScan(first, second);
      info("negative_scan", {
        caseName : cfg.caseName,
        error : scan.error,
        count : scan.accessPoints.length,
        time : Date.now()
      });
      if (scan.error) {
        fail("wifi_negative_scan", "error=" + JSON.stringify(scan.error));
        finish("scan_error");
      } else if (cfg.caseName === "wrong_password") {
        runWrongPassword(scan.accessPoints);
      } else if (cfg.caseName === "unavailable_ssid") {
        runUnavailableSSID(scan.accessPoints);
      } else {
        fail("wifi_negative_case", "unknown=" + JSON.stringify(cfg.caseName));
        finish("unknown_case");
      }
    });
  }

  print("TEST=wifi_station_negative_" + cfg.caseName);
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  info("run", {
    runId : cfg.runId,
    caseName : cfg.caseName,
    peerSSID : cfg.ssid,
    absentSSID : cfg.absentSSID
  });

  overallTimeout = setTimeout(function () {
    fail("wifi_negative_overall", "timeout");
    finish("overall_timeout");
  }, 25000);

  wifi.removeAllListeners();
  wifi.on("associated", function (details) {
    rememberEvent("associated", details);
  });
  wifi.on("connected", function (details) {
    rememberEvent("connected", details);
  });
  wifi.on("disconnected", function (details) {
    rememberEvent("disconnected", details);
    if (
      !finished &&
      cfg.caseName === "wrong_password" &&
      details.msg === "4WAY_HANDSHAKE_TIMEOUT"
    ) {
      clearTimeout(caseTimeout);
      caseTimeout = undefined;
      pass(
        "wifi_wrong_password_rejected_event",
        "reason=" + details.reason + " msg=" + details.msg
      );
      info("wrong_password_callback_observed", connectCallbackObserved);
      finish("wrong_password_disconnected_event");
    }
  });
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(beginCase, 500);
})();
