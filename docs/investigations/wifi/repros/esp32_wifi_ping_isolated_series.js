// Controlled Web IDE/RAM reproduction for ESP32 Wifi.ping() result handoff.
//
// Each loopback session must finish with five complete result objects before
// the next session is started. The test waits 1.5 seconds between sessions,
// stops at the first anomaly and labels every callback with its run number.
echo(false);

(function () {
  var wifi = require("Wifi");
  var totalRuns = 5;
  var run = 0;
  var callbackCount = 0;
  var runActive = false;
  var stopped = false;
  var watchdog;

  function reproduce(reason) {
    if (stopped) return;

    stopped = true;
    runActive = false;
    clearTimeout(watchdog);

    print("RUN_END=" + JSON.stringify({
      run : run,
      callbackCount : callbackCount,
      status : reason
    }));
    print("RESULT=REPRODUCED");
  }

  function startRun() {
    if (stopped) return;

    run++;
    callbackCount = 0;
    runActive = true;

    print("RUN_START=" + run);

    watchdog = setTimeout(function () {
      if (runActive) {
        reproduce("timeout_waiting_for_five_callbacks");
      }
    }, 7000);

    try {
      wifi.ping("127.0.0.1", function (result) {
        try {
          if (!runActive) {
            print("LATE_CALLBACK=" + JSON.stringify({
              run : run,
              result : result
            }));
            reproduce("callback_after_run_completed");
            return;
          }

          callbackCount++;

          var valid = result &&
            typeof result === "object" &&
            typeof result.totalCount === "number" &&
            typeof result.totalBytes === "number" &&
            typeof result.totalTime === "number" &&
            typeof result.respTime === "number" &&
            typeof result.seqNo === "number" &&
            typeof result.timeoutCount === "number" &&
            typeof result.bytes === "number" &&
            typeof result.error === "number";

          print("CALLBACK=" + JSON.stringify({
            run : run,
            index : callbackCount,
            valid : !!valid,
            result : result
          }));

          if (!valid) {
            reproduce("malformed_callback_result");
            return;
          }

          if (callbackCount > 5) {
            reproduce("more_than_five_callbacks");
            return;
          }

          if (callbackCount === 5) {
            runActive = false;
            clearTimeout(watchdog);

            print("RUN_END=" + JSON.stringify({
              run : run,
              callbackCount : callbackCount,
              status : "complete"
            }));

            if (run === totalRuns) {
              stopped = true;
              print("RESULT=NOT_REPRODUCED_IN_SERIES");
            } else {
              setTimeout(startRun, 1500);
            }
          }
        } catch (error) {
          try {
            print("CALLBACK_EXCEPTION=" + String(error));
          } catch (ignored) {
            print("CALLBACK_EXCEPTION");
          }
          reproduce("callback_processing_exception");
        }
      });
    } catch (error) {
      reproduce("exception: " + String(error));
    }
  }

  print("IDENTITY=" + JSON.stringify({
    board : process.env.BOARD,
    version : process.version,
    commit : process.env.GIT_COMMIT
  }));

  print("HARNESS_VERSION=2");
  print("VALIDATION_READY");
  setTimeout(startRun, 2000);
}());
