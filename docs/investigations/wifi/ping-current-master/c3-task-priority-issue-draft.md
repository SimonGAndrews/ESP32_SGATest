# ESP32-C3 `Wifi.ping()` accepts a request but delivers no callbacks

Submitted as [Espruino issue #2792](https://github.com/espruino/Espruino/issues/2792).

### Problem

On the single-core ESP32-C3, `Wifi.ping()` accepts a valid loopback request
but does not execute the supplied callback.

This reproduces on current Espruino `master` after the IPv4 parser correction.
The same firmware source delivers the expected callbacks on the dual-core
classic ESP32.

### Reproduction

```js
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
```

Tested on a Seeed Studio XIAO ESP32-C3 with Espruino `2v29.524`, commit
`fe558e4b3`, and ESP-IDF 5.5.3. No Wi-Fi connection or external network is
required because the target is the local loopback address.

### Observed

```text
PING_CALL=accepted
CALLBACK_COUNT=0
```

The call returns normally, but none of the five results configured for the
native ping session reaches JavaScript.

### Expected

An accepted ping session should run and deliver its five results to the
supplied callback.

### Cause

The ESP32 port runs Espruino's interpreter task at FreeRTOS priority 5.
`ESP_PING_DEFAULT_CONFIG()` creates the ESP-IDF ping task at priority 2. On
the single-core C3, the higher-priority interpreter remains runnable and the
native ping task does not get an opportunity to execute.

As a diagnostic, setting `ping_config.task_prio` to 6 was the only source
change made to the same `fe558e4b3` image. The unchanged reproduction then
delivered all five callbacks:

```text
PING_CALL=accepted
PING_CALLBACK={"totalCount":1,...}
PING_CALLBACK={"totalCount":2,...}
PING_CALLBACK={"totalCount":3,...}
PING_CALLBACK={"totalCount":4,...}
PING_CALLBACK={"totalCount":5,...}
CALLBACK_COUNT=5
```

Priority 6 is the lowest priority above the Espruino interpreter task. This
before-and-after result identifies task starvation as the cause of the C3
failure.

This issue is limited to allowing the native C3 ping task to run. Overlapping
sessions, reset handling and the context used to deliver results to JavaScript
are separate lifecycle concerns.
