// Repeatedly replace two custom GATT services, then update both new values.
// Espruino's default Bluetooth UART adds a third registered service.
// No peer or external wiring is required; use a wired console.
(function () {
  var iteration = 0;
  var iterationLimit = 50;

  function servicesFor(value) {
    var services = {};
    services[0xFFF0] = {};
    services[0xFFF0][0xFFF1] = {
      value : "A_SET_" + value,
      maxLen : 20,
      readable : true
    };
    services[0xFFE0] = {};
    services[0xFFE0][0xFFE1] = {
      value : "B_SET_" + value,
      maxLen : 20,
      readable : true
    };
    return services;
  }

  function updatesFor(value) {
    var services = {};
    services[0xFFF0] = {};
    services[0xFFF0][0xFFF1] = { value : "A_UPDATE_" + value };
    services[0xFFE0] = {};
    services[0xFFE0][0xFFE1] = { value : "B_UPDATE_" + value };
    return services;
  }

  function updateAndContinue() {
    NRF.updateServices(updatesFor(iteration));
    print("UPDATED=" + iteration);
    if (iteration < iterationLimit) {
      setTimeout(next, 250);
    } else {
      print("PASS replacements=" + iteration + " updates=" + iteration);
      // Keep the marker split so the direct runner does not mistake echoed
      // source text for completed test output during upload.
      print("DONE" + "=PASS");
    }
  }

  function next() {
    iteration++;
    print("ITERATION=" + iteration);
    NRF.setServices(servicesFor(iteration));
    print("RETURNED=" + iteration);
    setTimeout(updateAndContinue, 250);
  }

  echo(false);
  print("TEST=esp32_gatt_multiservice_lifecycle");
  print("TARGET=" + process.env.BOARD);
  print("VERSION=" + process.version);
  print("GIT_COMMIT=" + process.env.GIT_COMMIT);
  NRF.disconnect();
  setTimeout(next, 500);
}());
