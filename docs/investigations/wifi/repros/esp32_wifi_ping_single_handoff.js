// Minimal single-session ESP32 Wifi.ping() result-handoff probe.
//
// Loopback keeps the test local to the target. A conforming run accepts one
// request, delivers five complete result objects and remains able to execute
// the completion timer.
echo(false);

var wifi = require("Wifi");
var callbackCount = 0;
var invalidCount = 0;
var finished = false;

print("TEST=esp32_wifi_ping_single_handoff");
print("INFO board=" + JSON.stringify(process.env.BOARD));
print("INFO version=" + JSON.stringify(process.version));
print("INFO git_commit=" + JSON.stringify(process.env.GIT_COMMIT));

function finish() {
  if (finished) return;
  finished = true;
  print("METRIC callback_count=" + callbackCount);
  print("METRIC invalid_result_count=" + invalidCount);
  if (callbackCount === 5 && invalidCount === 0) {
    print("PASS single_ping_result_handoff");
    print("DONE=PASS");
  } else {
    print("FAIL single_ping_result_handoff callbacks=" + callbackCount +
      " invalid=" + invalidCount);
    print("DONE=FAIL");
  }
}

try {
  wifi.ping("127.0.0.1", function (result) {
    callbackCount++;
    var valid = result && typeof result === "object" &&
      typeof result.totalCount === "number" &&
      typeof result.totalBytes === "number" &&
      typeof result.totalTime === "number" &&
      typeof result.respTime === "number" &&
      typeof result.seqNo === "number" &&
      typeof result.timeoutCount === "number" &&
      typeof result.bytes === "number" &&
      typeof result.error === "number";
    if (!valid) invalidCount++;
    print("INFO callback=" + JSON.stringify({
      index : callbackCount,
      type : typeof result,
      valid : !!valid,
      result : result
    }));
  });
  print("INFO call=accepted");
} catch (error) {
  invalidCount++;
  print("FAIL single_ping_call exception=" + JSON.stringify(String(error)));
  finish();
}

setTimeout(finish, 7000);
