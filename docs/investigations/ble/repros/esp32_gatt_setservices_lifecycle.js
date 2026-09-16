// Repeatedly replace one small GATT service while no peer is connected.
// No external wiring or second BLE device is required. Use a wired console.
// A healthy run prints the completion marker after 50 returned API calls.
(function () {
  var iteration = 0;
  var iterationLimit = 50;

  function servicesFor(value) {
    var services = {};
    services[0xFFF0] = {};
    services[0xFFF0][0xFFF1] = {
      value : "VALUE_" + value,
      readable : true
    };
    return services;
  }

  function next() {
    iteration++;
    print("ITERATION=" + iteration);
    NRF.setServices(servicesFor(iteration));
    print("RETURNED=" + iteration);

    if (iteration < iterationLimit) {
      setTimeout(next, 500);
    } else {
      print("PASS iterations=" + iteration);
      print("DONE" + "=PASS");
    }
  }

  echo(false);
  print("TEST=esp32_gatt_setservices_lifecycle");
  print("TARGET=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);
  NRF.disconnect();
  setTimeout(next, 500);
}());
