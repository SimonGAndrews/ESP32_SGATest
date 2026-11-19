echo(false);

var callbackCount = 0;

try {
  require("Wifi").ping("127.0.0.1", function (result) {
    callbackCount++;
    print("PING_CALLBACK=" + JSON.stringify(result));
  });
  print("PING_CALL=accepted");
} catch (error) {
  print("PING_CALL=rejected " + error);
}

setTimeout(function () {
  print("CALLBACK_COUNT=" + callbackCount);
}, 7000);
