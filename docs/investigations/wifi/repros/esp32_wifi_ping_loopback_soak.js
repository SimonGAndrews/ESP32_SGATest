// Exercise repeated ESP32 IDF5 Wifi.ping() session creation, result delivery,
// completion handoff and native-heap stability without network credentials.
echo(false);

(function () {
  var wifi = require("Wifi");
  var roundsRequired = 28;
  var roundsCompleted = 0;
  var callbacksTotal = 0;
  var firstFreeHeap;
  var lowestFreeHeap;
  var finalFreeHeap;
  var finished = false;
  var overallTimer;

  function finish(ok, reason) {
    if (finished) return;
    finished = true;
    clearTimeout(overallTimer);
    print("METRIC rounds_completed=" + roundsCompleted);
    print("METRIC callbacks_total=" + callbacksTotal);
    print("METRIC first_free_heap=" + firstFreeHeap);
    print("METRIC lowest_free_heap=" + lowestFreeHeap);
    print("METRIC final_free_heap=" + finalFreeHeap);
    if (firstFreeHeap !== undefined && finalFreeHeap !== undefined) {
      print("METRIC final_heap_delta=" + (finalFreeHeap - firstFreeHeap));
    }
    print((ok ? "PASS " : "FAIL ") + reason);
    print("DONE=" + (ok ? "PASS" : "FAIL"));
  }

  function recordHeap() {
    var freeHeap = ESP32.getState().freeHeap;
    if (firstFreeHeap === undefined) firstFreeHeap = freeHeap;
    if (lowestFreeHeap === undefined || freeHeap < lowestFreeHeap) {
      lowestFreeHeap = freeHeap;
    }
    finalFreeHeap = freeHeap;
  }

  function runRound() {
    var callbackCount = 0;
    var valid = true;

    try {
      wifi.ping("127.0.0.1", function (result) {
        callbackCount++;
        callbacksTotal++;
        if (!result || result.totalCount !== callbackCount ||
            result.seqNo !== callbackCount || result.timeoutCount !== 0 ||
            result.bytes !== 64 || result.error !== 0) {
          valid = false;
        }
        if (callbackCount !== 5) return;

        roundsCompleted++;
        if (!valid) {
          finish(false, "invalid_result_round_" + roundsCompleted);
          return;
        }

        // Starting the next session from the final callback exercises the
        // guarantee that native completion has released session ownership.
        if (roundsCompleted < roundsRequired) {
          setTimeout(function () {
            recordHeap();
            runRound();
          }, 20);
          return;
        }

        setTimeout(function () {
          recordHeap();
          var heapStable = finalFreeHeap >= firstFreeHeap - 2048;
          finish(
            callbacksTotal === roundsRequired * 5 && heapStable,
            heapStable ? "loopback_soak" : "native_heap_loss"
          );
        }, 250);
      });
    } catch (error) {
      finish(false, "round_exception " + error);
    }
  }

  print("TEST=esp32_wifi_ping_loopback_soak");
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);
  print("INFO rounds_required=" + roundsRequired);

  overallTimer = setTimeout(function () {
    finish(false, "overall_timeout");
  }, 100000);
  runRound();
}());
