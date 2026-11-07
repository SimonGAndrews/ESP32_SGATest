// Start a connection, then reset the JavaScript runtime before completion.
// A callback that survives reset records an error marker in Storage.
echo(false);

(function () {
  var marker = ".wifi-connect-reset-callback";
  var storage = require("Storage");
  storage.erase(marker);
  require("Wifi").connect(
    "XFSM-NO-SUCH-AP-RESET",
    {password:"not-a-real-password"},
    function (error) {
      storage.write(marker, JSON.stringify(error));
    }
  );
  print("INFO reset_connect_started=1");
  setTimeout(function () {
    print("INFO reset_connect_resetting=1");
    reset();
  }, 250);
}());
