// Characterise whether the pre-IDF5 ping backend can complete two strictly
// sequential sessions. The second starts only after the first backend's sixth
// callback, which is its duplicated terminal summary.
echo(false);

var wifi = require("Wifi");
var session = 0;
var callbackCount = 0;
var deadline;

function finish(result) {
  clearTimeout(deadline);
  print("RESULT=" + result);
  print("SESSION=" + session);
  print("CALLBACK_COUNT=" + callbackCount);
  print("DONE=esp32_wifi_ping_legacy_two_sessions");
}

function onResult(result) {
  callbackCount++;
  print("PING_RESULT=" + session + ":" + callbackCount + ":" +
        JSON.stringify(result));
  if (callbackCount !== 6) return;
  if (session === 2) {
    finish("TWO_SESSIONS_COMPLETED");
    return;
  }
  setTimeout(startSession, 100);
}

function startSession() {
  session++;
  callbackCount = 0;
  print("SESSION_START=" + session);
  try {
    wifi.ping("127.0.0.1", onResult);
    print("SESSION_ACCEPTED=" + session);
  } catch (error) {
    finish("SESSION_REJECTED=" + session + ":" + error);
  }
}

print("TEST=esp32_wifi_ping_legacy_two_sessions");
print("BOARD=" + process.env.BOARD);
print("VERSION=" + process.version);
print("GIT_COMMIT=" + process.env.GIT_COMMIT);
deadline = setTimeout(function () {
  finish("TIMEOUT");
}, 30000);
startSession();
