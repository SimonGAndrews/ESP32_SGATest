// Minimal Web IDE/REPL reproduction for overlapping Wifi.connect() calls.
// The synthetic SSIDs avoid any dependency on credentials or an access point.
echo(false);

var wifi = require("Wifi");
var firstCallbackCount = 0;
var secondCallbackCount = 0;

print("TEST=esp32_wifi_connect_overlap_repl");
print("starting connection 1");

wifi.connect(
  "XFSM-NO-SUCH-AP-1",
  {password:"12345678"},
  function (error) {
    firstCallbackCount++;
    print("connection 1 callback:", error);
  }
);

setTimeout(function () {
  print("starting connection 2");

  try {
    wifi.connect(
      "XFSM-NO-SUCH-AP-2",
      {password:"12345678"},
      function (error) {
        secondCallbackCount++;
        print("connection 2 callback:", error);
      }
    );
    print("connection 2 returned normally");
  } catch (error) {
    print("connection 2 threw:", error);
  }
}, 6000);

setTimeout(function () {
  print("FIRST_CALLBACK_COUNT=" + firstCallbackCount);
  print("SECOND_CALLBACK_COUNT=" + secondCallbackCount);
  print("DETAILS=" + JSON.stringify(wifi.getDetails()));
  print("IP=" + JSON.stringify(wifi.getIP()));
  print("DONE=OBSERVED");
  wifi.disconnect();
}, 30000);
