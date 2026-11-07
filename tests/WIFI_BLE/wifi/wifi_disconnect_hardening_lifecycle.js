// Exercise IDF5 Wifi.disconnect() ownership and exactly-once completion.
// global.WIFI_TEST_CONFIG must contain ssid, password and absentSSID.

(function () {
  var cfg = global.WIFI_TEST_CONFIG;
  var wifi = require("Wifi");
  var passes = 0;
  var failures = 0;
  var finished = false;
  var overallTimer;
  var stage = "startup";
  var stageEvents = 0;

  function pass(name, details) {
    passes++;
    print("PASS " + name + (details ? " " + details : ""));
  }

  function fail(name, details) {
    failures++;
    print("FAIL " + name + (details ? " " + details : ""));
  }

  function expect(name, condition, details) {
    if (condition) pass(name, details);
    else fail(name, details);
  }

  function beginStage(name) {
    stage = name;
    stageEvents = 0;
    print("INFO stage=" + name);
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    wifi.removeAllListeners();
    wifi.disconnect();
    print("METRIC checks_passed=" + passes);
    print("METRIC checks_failed=" + failures);
    print("DONE=" + (failures ? "FAIL" : "PASS"));
  }

  function connectValid(name, next) {
    var callbacks = 0;
    wifi.connect(cfg.ssid, {password:cfg.password}, function (error) {
      callbacks++;
      expect(name + "_connect", !error && wifi.getIP().ip !== "0.0.0.0",
        "error=" + JSON.stringify(error) + " callbacks=" + callbacks);
      setTimeout(function () {
        expect(name + "_connect_callback_once", callbacks === 1,
          "count=" + callbacks);
        next();
      }, 250);
    });
  }

  function runInvalidOverlap() {
    connectValid("invalid_overlap", function () {
      beginStage("invalid_overlap");
      var firstCallbacks = 0;
      var invalidThrew = false;
      wifi.disconnect(function () {
        firstCallbacks++;
      });
      try {
        wifi.disconnect(123);
      } catch (error) {
        invalidThrew = true;
        print("INFO invalid_overlap_error=" + JSON.stringify(String(error)));
      }
      setTimeout(function () {
        expect("invalid_overlap_rejected", invalidThrew);
        expect("invalid_overlap_first_callback_once", firstCallbacks === 1,
          "count=" + firstCallbacks);
        expect("invalid_overlap_event_once", stageEvents === 1,
          "count=" + stageEvents);
        finish();
      }, 2000);
    });
  }

  function runCallbacklessOverlap() {
    connectValid("callbackless_overlap", function () {
      beginStage("callbackless_overlap");
      var secondThrew = false;
      wifi.disconnect();
      try {
        wifi.disconnect(function () {
          fail("callbackless_overlap_second_callback");
        });
      } catch (error) {
        secondThrew = true;
        print("INFO callbackless_overlap_error=" + JSON.stringify(String(error)));
      }
      setTimeout(function () {
        expect("callbackless_overlap_rejected", secondThrew);
        expect("callbackless_overlap_event_once", stageEvents === 1,
          "count=" + stageEvents);
        runInvalidOverlap();
      }, 2000);
    });
  }

  function runCallbackOverlap() {
    connectValid("callback_overlap", function () {
      beginStage("callback_overlap");
      var firstCallbacks = 0;
      var secondCallbacks = 0;
      var secondThrew = false;
      wifi.disconnect(function () {
        firstCallbacks++;
      });
      try {
        wifi.disconnect(function () {
          secondCallbacks++;
        });
      } catch (error) {
        secondThrew = true;
        print("INFO callback_overlap_error=" + JSON.stringify(String(error)));
      }
      setTimeout(function () {
        expect("callback_overlap_rejected", secondThrew);
        expect("callback_overlap_first_callback_once", firstCallbacks === 1,
          "count=" + firstCallbacks);
        expect("callback_overlap_second_callback_absent", secondCallbacks === 0,
          "count=" + secondCallbacks);
        expect("callback_overlap_event_once", stageEvents === 1,
          "count=" + stageEvents);
        runCallbacklessOverlap();
      }, 2000);
    });
  }

  function runCancelConnect() {
    beginStage("cancel_connect");
    var connectCallbacks = 0;
    var connectError;
    var disconnectCallbacks = 0;
    wifi.connect(cfg.absentSSID, {password:cfg.password}, function (error) {
      connectCallbacks++;
      connectError = error;
    });
    setTimeout(function () {
      wifi.disconnect(function () {
        disconnectCallbacks++;
      });
    }, 500);
    setTimeout(function () {
      expect("cancel_connect_callback_once", connectCallbacks === 1,
        "count=" + connectCallbacks);
      expect("cancel_connect_reason", connectError === "Connection cancelled",
        "error=" + JSON.stringify(connectError));
      expect("cancel_disconnect_callback_once", disconnectCallbacks === 1,
        "count=" + disconnectCallbacks);
      expect("cancel_disconnect_event_bounded", stageEvents <= 1,
        "count=" + stageEvents);
      connectValid("cancel_recovery", function () {
        wifi.disconnect();
        setTimeout(runCallbackOverlap, 1000);
      });
    }, 3000);
  }

  function runConnectedDisconnect() {
    connectValid("connected_disconnect", function () {
      beginStage("connected_disconnect");
      var callbacks = 0;
      wifi.disconnect(function () {
        callbacks++;
      });
      setTimeout(function () {
        expect("connected_disconnect_callback_once", callbacks === 1,
          "count=" + callbacks);
        expect("connected_disconnect_event_once", stageEvents === 1,
          "count=" + stageEvents);
        runCancelConnect();
      }, 2000);
    });
  }

  function runIdleDisconnect() {
    beginStage("idle_disconnect");
    var callbacks = 0;
    wifi.disconnect(function () {
      callbacks++;
    });
    setTimeout(function () {
      expect("idle_disconnect_callback_once", callbacks === 1,
        "count=" + callbacks);
      expect("idle_disconnect_no_event", stageEvents === 0,
        "count=" + stageEvents);
      runConnectedDisconnect();
    }, 750);
  }

  print("TEST=wifi_disconnect_hardening_lifecycle");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  wifi.removeAllListeners();
  wifi.on("disconnected", function (details) {
    stageEvents++;
    print("INFO disconnected_event stage=" + stage +
      " details=" + JSON.stringify(details));
  });
  overallTimer = setTimeout(function () {
    fail("overall_timeout", "stage=" + stage);
    finish();
  }, 150000);
  wifi.stopAP();
  setTimeout(runIdleDisconnect, 500);
}());
