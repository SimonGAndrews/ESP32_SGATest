// Phase program for tools/repl/run_wifi_ping_reset_probe.py. The host selects
// PING_RESET_MODE before upload, observes any old callback output after
// reset(), and then proves that a fresh loopback ping can run.
echo(false);

(function () {
  var wifi = require("Wifi");
  var mode = global.PING_RESET_MODE || "active_success";
  var address = mode === "active_timeout" ? "192.0.2.1" : "127.0.0.1";
  var oldCallbackCount = 0;

  print("TEST=esp32_wifi_ping_reset");
  print("RESET_MODE=" + mode);
  print("BOARD=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);

  wifi.ping(address, function (result) {
    oldCallbackCount++;
    print(
      "OLD_CALLBACK=" +
      JSON.stringify({count:oldCallbackCount, mode:mode, result:result})
    );
  });
  print("PING_STARTED=" + mode);

  if (mode === "queued_final") {
    // The ping task runs above the interpreter on C3. Keeping JavaScript busy
    // lets all native loopback results and on_ping_end accumulate before the
    // interpreter can service the generated idle hook.
    var until = getTime() + 4;
    while (getTime() < until) {}
  }

  print("RESET_NOW=" + mode);
  reset();
}());
