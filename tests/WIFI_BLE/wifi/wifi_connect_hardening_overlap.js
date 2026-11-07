// Verify IDF5 Wifi.connect() ownership without depending on an access point.
echo(false);

(function () {
  var wifi = require("Wifi");
  var tag = String(Math.round(getTime() * 1000));
  var prefix = "ESPRUINO_CONNECT_HARDENING_" + tag;
  var passes = 0;
  var failures = 0;
  var finished = false;
  var overallTimer;

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
    clearTimeout(overallTimer);
    wifi.removeAllListeners();
    wifi.disconnect();
    print("METRIC checks_passed=" + passes);
    print("METRIC checks_failed=" + failures);
    print("DONE=" + (failures ? "FAIL" : "PASS"));
  }

  function expectThrow(name, operation, expectedText) {
    try {
      operation();
      fail(name, "call returned normally");
    } catch (error) {
      var text = String(error);
      if (text.indexOf(expectedText) >= 0) pass(name, "error=" + text);
      else fail(name, "unexpected=" + text);
    }
  }

  function callbacklessOwnership() {
    var terminalEvents = 0;
    var followupCallbacks = 0;

    function onDisconnected() {
      terminalEvents++;
      wifi.removeListener("disconnected", onDisconnected);
      setTimeout(function () {
        wifi.connect(
          prefix + "_FOLLOWUP",
          {password:"not-a-real-password"},
          function (error) {
            followupCallbacks++;
            if (error) pass("callbackless_ownership_released");
            else fail("callbackless_ownership_released", "unexpected success");
            setTimeout(function () {
              if (terminalEvents === 1) pass("callbackless_terminal_event_once");
              else fail("callbackless_terminal_event_once", "count=" + terminalEvents);
              if (followupCallbacks === 1) pass("followup_callback_once");
              else fail("followup_callback_once", "count=" + followupCallbacks);
              finish();
            }, 500);
          }
        );
      }, 500);
    }

    wifi.on("disconnected", onDisconnected);
    wifi.connect(
      prefix + "_CALLBACKLESS",
      {password:"not-a-real-password"},
      undefined
    );
    expectThrow(
      "callbackless_request_owns_operation",
      function () {
        wifi.connect(prefix + "_CALLBACKLESS_OVERLAP", {
          password:"not-a-real-password"
        });
      },
      "A connection is already in progress"
    );
    setTimeout(function () {
      wifi.disconnect();
    }, 2000);
  }

  function invalidOverlap() {
    var firstCallbacks = 0;
    var secondCallbacks = 0;
    wifi.connect(
      prefix + "_INVALID_FIRST",
      {password:"not-a-real-password"},
      function (error) {
        firstCallbacks++;
        if (error) pass("invalid_overlap_first_completed");
        else fail("invalid_overlap_first_completed", "unexpected success");
        setTimeout(function () {
          if (firstCallbacks === 1) pass("invalid_overlap_first_callback_once");
          else fail("invalid_overlap_first_callback_once", "count=" + firstCallbacks);
          if (secondCallbacks === 0) pass("invalid_overlap_second_callback_absent");
          else fail("invalid_overlap_second_callback_absent", "count=" + secondCallbacks);
          callbacklessOwnership();
        }, 500);
      }
    );
    expectThrow(
      "invalid_overlap_reports_argument_error",
      function () {
        wifi.connect(
          prefix + "_INVALID_SECOND",
          {password:42},
          function () { secondCallbacks++; }
        );
      },
      "options.password"
    );
  }

  function validOverlap() {
    var firstCallbacks = 0;
    var secondCallbacks = 0;
    wifi.connect(
      prefix + "_VALID_FIRST",
      {password:"not-a-real-password"},
      function (error) {
        firstCallbacks++;
        if (error) pass("valid_overlap_first_completed");
        else fail("valid_overlap_first_completed", "unexpected success");
        setTimeout(function () {
          if (firstCallbacks === 1) pass("valid_overlap_first_callback_once");
          else fail("valid_overlap_first_callback_once", "count=" + firstCallbacks);
          if (secondCallbacks === 0) pass("valid_overlap_second_callback_absent");
          else fail("valid_overlap_second_callback_absent", "count=" + secondCallbacks);
          invalidOverlap();
        }, 500);
      }
    );
    expectThrow(
      "valid_overlap_rejected",
      function () {
        wifi.connect(
          prefix + "_VALID_SECOND",
          {password:"another-not-real-password"},
          function () { secondCallbacks++; }
        );
      },
      "A connection is already in progress"
    );
  }

  print("TEST=wifi_connect_hardening_overlap");
  print("TARGET=" + (process.env.BOARD || "UNKNOWN"));
  overallTimer = setTimeout(function () {
    fail("overall_timeout");
    finish();
  }, 60000);
  wifi.removeAllListeners();
  wifi.disconnect();
  wifi.stopAP();
  setTimeout(validOverlap, 750);
}());
