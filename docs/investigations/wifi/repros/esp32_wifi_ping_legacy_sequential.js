// Repeated, strictly sequential Wifi.ping() sessions for the legacy ESP32 and
// ESP-IDF 4 backends. Each session ends with the backend's sixth callback.
echo(false);

var wifi = require("Wifi");
var roundsRequired = 28;
var round = 0;
var callbackCount = 0;
var callbacksTotal = 0;
var structurallyValid = true;
var firstHeap = ESP32.getState().freeHeap;
var lowestHeap = firstHeap;
var finalHeap = firstHeap;
var deadline;

function recordHeap() {
  finalHeap = ESP32.getState().freeHeap;
  if (finalHeap < lowestHeap) lowestHeap = finalHeap;
}

function finish(ok, reason) {
  clearTimeout(deadline);
  recordHeap();
  print("METRIC rounds_completed=" + round);
  print("METRIC callbacks_total=" + callbacksTotal);
  print("METRIC first_free_heap=" + firstHeap);
  print("METRIC lowest_free_heap=" + lowestHeap);
  print("METRIC final_free_heap=" + finalHeap);
  print("METRIC final_heap_delta=" + (finalHeap - firstHeap));
  print((ok ? "PASS " : "FAIL ") + reason);
  print("DONE=" + (ok ? "PASS" : "FAIL"));
}

function onResult(result) {
  callbackCount++;
  callbacksTotal++;
  if (!result || result.seqNo !== callbackCount) structurallyValid = false;
  if (callbackCount < 6) return;
  if (callbackCount > 6 || result.totalCount !== 5) {
    finish(false, "invalid_terminal_callback");
    return;
  }
  round++;
  recordHeap();
  print("INFO round_completed=" + round);
  if (round === roundsRequired) {
    finish(structurallyValid && finalHeap >= firstHeap - 2048,
           "legacy_sequential_soak");
    return;
  }
  setTimeout(startSession, 100);
}

function startSession() {
  callbackCount = 0;
  try {
    wifi.ping("127.0.0.1", onResult);
  } catch (error) {
    finish(false, "round_exception " + error);
  }
}

print("TEST=esp32_wifi_ping_legacy_sequential");
print("BOARD=" + process.env.BOARD);
print("VERSION=" + process.version);
print("GIT_COMMIT=" + process.env.GIT_COMMIT);
print("INFO rounds_required=" + roundsRequired);
deadline = setTimeout(function () {
  finish(false, "overall_timeout");
}, 240000);
startSession();
