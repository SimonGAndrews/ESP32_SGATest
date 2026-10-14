# ESP32 IDF5 Current-Master Closeout Log

Date started: 13 October 2026

## Current conclusion

Final closeout testing against current Espruino `master` has started. The
unmodified classic `ESP32_IDF5` image is blocked by a UART startup regression:
the firmware builds and flashes successfully, but its UART0 driver does not
install and the Espruino REPL is unavailable.

The immediate source cause is the 128-byte transmit-buffer argument introduced
by upstream commit `7be3a7d92`. ESP-IDF 5 requires a nonzero UART transmit
buffer to be strictly larger than the target's 128-byte hardware FIFO. A local
256-byte candidate correction restores the classic IDF5 REPL, passes the
initial memory snapshot, completes 100 UART driver lifecycle cycles and passes
all 18 classic V1 cross-UART functional scripts. The combined candidate also
completed clean builds for all seven maintained ESP32 board definitions and
100-cycle UART lifecycle runs on ESP32-C3 and ESP32-S3 IDF5 hardware. The
focused correction was submitted upstream as
[`#2768`](https://github.com/espruino/Espruino/pull/2768) and is awaiting
review; it is not yet part of upstream `master`.

The current-master `Wifi.ping()` failure has also been isolated and corrected
on focused local branches. The original failure was an IPv4 parser return
error. Once that was removed, controlled testing exposed a second IDF5-only
session-lifecycle defect in which an overlapping call replaced the active
callback. The combined candidate now passes the complete controlled ping
lifecycle and 25-session soak on the classic IDF5 target. Family build and
runtime comparisons are complete on classic ESP32, ESP32-C3 and ESP32-S3
IDF5 targets. All three passed the standalone loopback test, the 100-cycle
UART lifecycle control and the full 35-check controlled ping lifecycle.

This document is the active sequence and task record for the final
current-master sanity run. Earlier same-source post-merge results remain in
[`2026-09-05-esp32-post-idf5-merge-same-source-sanity.md`](2026-09-05-esp32-post-idf5-merge-same-source-sanity.md).

## Source and bench provenance

| Item | Value |
|---|---|
| Official repository | `espruino/Espruino` |
| User fork | `SimonGAndrews/Espruino` |
| Local validation branch | `validation/esp32-idf5-final-closeout-2026-10-13` |
| Source base | `92fe2b5cf40ed0d9313ac0c8b9a46347bcb6979c` |
| Local, fork and official `master` at start | identical at `92fe2b5cf` |
| Board definition | `ESP32_IDF5` |
| Target | classic ESP32, ESP32-D0WD-V3 revision 3.1 |
| ESP-IDF | 5.5.3 |
| Build type | `RELEASE=1` |
| Reported version | `2v29.485` |
| Console | UART0 through the board USB-UART adapter |
| Serial path | `/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0` |
| Harness | classic ESP32 V1 |
| Harness mode | UART1/UART2 crosslink |
| Harness selectors | `SEL_D35=UART`, `JP_UART_LOOP2=closed`, `SEL_D33=1-2`, `SEL_D26=1-2` |

The generated configuration was checked before flashing and reported:

```text
PC_BOARD_ID="ESP32_IDF5"
JSH_PIN_COUNT=40
GIT_COMMIT=92fe2b5cf
ESP_HEAP_SIZE=70000
JSVAR_MALLOC
```

The clean build completed successfully. The application image occupied
`0x179b40` bytes and left `0x7a4c0` bytes, or 24%, of the smallest application
partition free.

## Sequence completed

### 1. Repository alignment

The user's fork was synchronised with official Espruino `master`. The local
`master`, `origin/master` and `upstream/master` were then confirmed identical
at `92fe2b5cf`. The closeout validation branch was created directly from that
revision.

The review identified the following significant ESP32 changes since the
previous testing point. Each reference below is in the ancestry of the tested
official `master`:

- modern IDF5 ping:
  [`0b4ff45fa`](https://github.com/espruino/Espruino/commit/0b4ff45faaaa54b9258a4441521489f19110341c);
- hostname corrections:
  [`6fb5cc927`](https://github.com/espruino/Espruino/commit/6fb5cc927d82f2505978e7fe264382faa835ceb0)
  and
  [`1b48b2990`](https://github.com/espruino/Espruino/commit/1b48b299028aa98c1f5ed547e83e40d2c83e060e);
- revised address parsing and formatting:
  [`4947f4ca3`](https://github.com/espruino/Espruino/commit/4947f4ca3ae6507f9c36a8f2b65b6b84499a2051),
  [`736f24269`](https://github.com/espruino/Espruino/commit/736f242692c480d61b3a5359bfa05f2023d99e71)
  and
  [`8637734c2`](https://github.com/espruino/Espruino/commit/8637734c2fceef214f0d8a3589e82e6dae9c37d1);
- Wi-Fi resource cleanup:
  [`93378586b`](https://github.com/espruino/Espruino/commit/93378586b05782327bde1b37890a31a57e22ab1c);
- additional scan handling and options:
  [`ba89989ef`](https://github.com/espruino/Espruino/commit/ba89989ef4d50ff84ba85c9d2b36b43d020b34a1)
  and
  [`d8405eb7b`](https://github.com/espruino/Espruino/commit/d8405eb7ba4493acac8ba257ef4921e6db673ebe);
- `allChannels` connection support:
  [`8a582a34b`](https://github.com/espruino/Espruino/commit/8a582a34b983d2a7c312c3660c318efa0f5a1977);
- WPA3 changes:
  [`a195b28fb`](https://github.com/espruino/Espruino/commit/a195b28fb0b426ea4955c154f2dc8e5af1887f46)
  and
  [`7a83c3d59`](https://github.com/espruino/Espruino/commit/7a83c3d59967234c4829a89a4eb96179670863c1);
- IPv6 experimentation followed by IPv6 being disabled again for reliability:
  [`19a0c6c41`](https://github.com/espruino/Espruino/commit/19a0c6c41c720ce1441a66596441f25043d14aa8),
  [`1b48b2990`](https://github.com/espruino/Espruino/commit/1b48b299028aa98c1f5ed547e83e40d2c83e060e),
  [`981e4b682`](https://github.com/espruino/Espruino/commit/981e4b6829745ab74b4abffba178cb0272509351)
  and
  [`bad3fc7a5`](https://github.com/espruino/Espruino/commit/bad3fc7a56fcf58ea8ea7d45a6f30f89aa0fd92d);
- later classic ESP32 build corrections:
  [`47be6fe40`](https://github.com/espruino/Espruino/commit/47be6fe40a5ff37a5ec59348b754d734cb4a39a6),
  [`c9a6e0c6b`](https://github.com/espruino/Espruino/commit/c9a6e0c6bd2a22c7c2c172993ddd849d2e90d29c)
  and
  [`e73051ad4`](https://github.com/espruino/Espruino/commit/e73051ad4b9380a562da40796626254af1a19d57);
- expanded `ESP32.getState()` information:
  [`b08a2ea1f`](https://github.com/espruino/Espruino/commit/b08a2ea1fa8c67de01142319b0843c7a7b0c4661),
  [`f4e59d424`](https://github.com/espruino/Espruino/commit/f4e59d424268444414b28c7001d6a42d1768b2f6)
  and
  [`2a1f9c584`](https://github.com/espruino/Espruino/commit/2a1f9c5848ad48d7843694d06d370be5b788fee3).

### 2. Memory-probe maintenance

The active memory-measurement scripts were updated to obtain all native heap
fields from the current `ESP32.getState()` API:

- `freeHeap`;
- `minHeap`;
- `largestBlock`.

They retain `process.memory().tx.largest_block` only as a compatibility
fallback for older firmware. JsVar figures continue to come from
`process.memory()`.

Before reflashing, the updated standalone probe passed on the historical
`ESP32_IDF5` image `74409df84`, demonstrating that the compatibility path still
works.

### 3. Unmodified current-master build and flash

The source was provisioned and built with:

```bash
source scripts/provision.sh ESP32_IDF5
make BOARD=ESP32_IDF5 clean
make -j"$(nproc)" BOARD=ESP32_IDF5 RELEASE=1
make BOARD=ESP32_IDF5 RELEASE=1 flash \
  PORT=/dev/serial/by-id/usb-1a86_USB_Serial-if00-port0
```

Build and flash completed, and the bootloader, partition table and application
hashes were verified during flashing.

### 4. UART0 startup failure

The unmodified image did not provide an Espruino prompt. It repeatedly emitted
ESP-IDF errors of this form:

```text
uart_write_bytes(...): uart driver error
uart_read_bytes(...): uart driver error
```

This is a pre-REPL startup failure. It therefore cannot be reproduced by a
JavaScript command on the affected classic image. The minimal reproduction is
to flash unmodified `92fe2b5cf` as `BOARD=ESP32_IDF5`, open UART0 at 115200
baud and reset the board.

## UART transmit-buffer regression

### Source cause

Upstream commit
[`7be3a7d92`](https://github.com/espruino/Espruino/commit/7be3a7d92cb8fd6b51ebb7b2ab3e9b893ff178a5)
changed the shared ESP32 UART driver installation from:

```c
uart_driver_install(uart_num, 1024, 1024, 0, NULL, 0);
```

to:

```c
uart_driver_install(uart_num, 512, 128, 0, NULL, 0);
```

ESP-IDF 5.5.3 documents and enforces the following rule:

```text
RX buffer > UART hardware FIFO length
TX buffer = 0 or TX buffer > UART hardware FIFO length
```

The classic ESP32 hardware FIFO length is 128 bytes, so a nonzero 128-byte TX
buffer is invalid. The release configuration disables assertions; the failed
driver-install result does not terminate startup. Espruino then marks UART0 as
initialised and its polling task repeatedly calls the missing driver.

The change is in shared ESP32-family source. Runtime occurrence is proven here
only for classic `ESP32_IDF5`; legacy, IDF4, C3 and S3 effects must be checked
before deciding the final scope and wording of an upstream correction.

### Local candidate

The current validation branch has one uncommitted firmware change:

```diff
-  err = uart_driver_install(uart_num, 512, 128, 0, NULL, 0);
+  err = uart_driver_install(uart_num, 512, 256, 0, NULL, 0);
```

The 256-byte value preserves the intended reduction from the former
1024-byte buffer while satisfying the ESP-IDF requirement. This is a test
candidate, not yet the accepted upstream fix.

### Initial candidate result

The locally corrected image built, flashed and restored the UART0 REPL. The
updated standalone memory probe then passed with runtime identity
`ESP32_IDF5`, version `2v29.485`, commit field `92fe2b5cf` and these readings:

| Measurement | Result |
|---|---:|
| Native free heap | 67,504 bytes |
| Native minimum heap | 67,156 bytes |
| Largest native free block | 65,536 bytes |
| JsVars total | 2,858 |
| JsVars free | 2,682 |
| JsVar block size | 14 bytes |

The Git commit field does not identify the local source change, so all evidence
from this flashed image must describe it explicitly as the 256-byte candidate.

### Classic UART validation

The focused driver-lifecycle reproducer completed 100 consecutive
`Serial2.setup()` / `Serial2.unsetup()` cycles without an assertion, reboot or
reported failure.

The complete classic V1 UART crosslink set then passed all 18 scripts and all
122 individual checks. Runtime coverage included:

- setup, reconfiguration, connection-state reporting and unsetup;
- `write`, `print`, `println`, `flush`, `available`, `read`, `inject` and
  `pipe` behaviour;
- listener attachment, removal, reattachment and buffered delivery;
- mismatched-baud behaviour followed by recovery;
- simultaneous full-duplex traffic;
- ten alternating setup, transfer and teardown iterations;
- 32-, 64-, 65-, 96-, 128- and 200-byte transfers in both directions.

The length, content and content-hash checks all passed. No failed check,
assertion, reboot or UART driver error was observed. The two 200-byte transfers
were delivered in four JavaScript data callbacks with a maximum 64-byte event
chunk, confirming correct assembly across internal event boundaries.

Commands used:

```bash
python3 -u tools/repl/run_test.py \
  docs/investigations/uart/repros/esp32_uart_driver_lifecycle_family.js \
  --port /dev/serial/by-id/usb-1a86_USB_Serial-if00-port0 --timeout 40

python3 -u tools/repl/run_test.py tests/repl/uart_block7/<script>.js \
  --port /dev/serial/by-id/usb-1a86_USB_Serial-if00-port0 --timeout 20
```

The second command was executed once for each of the 18 scripts listed in
`tests/repl/uart_block7/README.md`, excluding the C3-only lifecycle script.

## Current-master radio regression phase

The controlled radio peer was rebuilt and flashed from the same source base
and local UART candidate as `BOARD=ESP32C3_IDF5`. It reports version
`2v29.485`, commit field `92fe2b5cf`, uses native USB Serial/JTAG for control,
and completed the 100-cycle UART driver-lifecycle reproducer without an
assertion or reset.

The exact two-board identities and current USB positions are recorded in
`tests/WIFI_BLE/current_master_92fe_closeout_bench_config.json`; the bench
configuration verifier passed before paired testing.

### Results obtained so far

| Area | Result | Evidence summary |
|---|---|---|
| State-controlled `Wifi.scan()` after disconnect | Pass | 12 APs returned, configured AP matched once, and no unsolicited connection occurred |
| Station transition lifecycle | Pass | 15 checks covering idle connection, connected scan, reconnect, disconnect, disconnected scan, post-scan connection and UDP |
| Connect cancellation and repeated lifecycle | Pass | Cancellation remained disconnected; five subsequent connect/UDP/disconnect cycles passed |
| AP-only, AP+station and station-only transitions | Pass | AP start, APSTA association, AP stop and retained station UDP passed |
| Wrong-password and unavailable-SSID cases | Pass | Both negative cases remained without an address or peer join/application traffic |
| Saved station restoration | Pass on confirmation run | Configuration restored after hardware reboot; peer saw both joins and restored UDP |
| `Wifi.setAPIP()` correction | Pass | Classic AP applied `192.168.47.1`; callback returned `null`; DHCP and UDP passed |
| `Wifi.setIP()` correction | Pass; associated ping failure isolated separately | Classic station changed from DHCP `.2` to `.77`; callback returned `null`; peer observed UDP sourced from `.77` |
| Repeated GATT service replacement | Pass | Classic and C3 each completed 50 single-service and 50 multi-service replacements without fault |
| Correlated GATT over air | Pass both directions | After 50 replacements, the final service was discovered, read and written in both peripheral/central directions |
| Concurrent BLE GATT plus HTTPS | Pass | Classic completed all 10 checks, C3 central completed all 7 checks, and the host correlated one 200/744-byte HTTPS response while GATT remained connected |
| `Wifi.ping()` lifecycle | Fail on current master; pass on local candidate | Current master rejected a valid IPv4 string; the combined parser/lifecycle candidate passed 35 checks and 28 sessions |
| AP-loss disconnect event | Fail, repeated twice | Peer saw leave/rejoin and UDP recovered, but classic JavaScript did not observe the disconnect event during the controlled outage |
| Filtered BLE discovery | Fail both directions | Advertiser reported active, but `NRF.findDevices()` returned an empty array on classic and C3; connection-oriented GATT discovery passed separately |

The first saved-restoration attempt restored the classic connection but did
not preserve the final native-USB C3 transcript. Its complete confirmation
run passed, so the first result is treated as an evidence-collection failure
rather than a firmware failure.

### Newly exposed `Wifi.ping()` regression

The controlled ping run associated successfully with the C3 AP and obtained
`192.168.4.2`, but the first call to `Wifi.ping("192.168.4.1", ...)` threw:

```text
Error: "192.168.4.1" not a valid IP address
```

Source inspection found that current `stringToIP()` parses the IPv4 value in
the `CONFIG_LWIP_IPV6 == 0` path and then unconditionally returns `false`.
This behaviour was introduced while IPv6 support was disabled after the IDF5
ping-session implementation had been merged. No ICMP request is created, so
the current result does not validate the IDF5 session implementation itself.
The same failure also explains the ping-only failures in the otherwise
successful custom-AP and static-station-address scenarios.

### Candidate correction and validation

The first focused correction makes the non-IPv6 `stringToIP()` path return
the result of lwIP `ip4addr_aton()`. A standalone
`Wifi.ping("127.0.0.1", ...)` test then accepted the call and delivered all
five expected callbacks without requiring an associated network.

The first controlled C3-peer run after only that parser correction exposed a
separate lifecycle defect. A second `Wifi.ping()` call was accepted while the
first session was active, replaced the shared callback and left the original
call with zero callbacks until its JavaScript timeout. The lifecycle
correction therefore:

- retains an active IDF5 ping-session handle and rejects overlap;
- copies native ping results into a fixed five-entry queue rather than
  allocating or manipulating JsVars in the ESP-IDF ping task;
- delivers those results from Espruino's idle processing;
- preserves cumulative attempt, timeout, byte and time fields;
- holds the final result until IDF has signalled session completion, allowing
  a new session to be started safely from the fifth callback; and
- releases the callback and session state on normal completion and on session
  creation/start failure.

The focused firmware branch is `fix/esp32-ping-ipv4-parse`, containing parser
commit `4580d3ac8` and lifecycle commit `5624acb16`. Runtime validation used
the equivalent changes on `validation/esp32-ping-with-uart-prereq`, because
the classic target also requires the separately isolated UART0 prerequisite.
The exact flashed validation image reported:

| Item | Value |
|---|---|
| Board | `ESP32_IDF5` |
| Version | `2v29.488` |
| Commit | `6d1512f79` |
| ESP-IDF | 5.5.3 |
| Controlled peer | `ESP32C3_IDF5` 2v29.485, `92fe2b5cf` |

The final controlled run passed 35/35 checks. It completed one initial
successful session, one five-timeout session, immediate successful recovery,
25 further successful sessions, and 140 total callbacks. The overlap call was
rejected, sequence numbers reset to 1 through 5 for every session, BLE
advertising remained active, and UDP still worked after the ping sequence.
Native free heap was 54,480 bytes after the first soak session, at its lowest
observed soak sample, and after the final soak session, so no progressive
session leak was observed. Both boards then left the test network and the
runner confirmed inactive Wi-Fi state without a recovery reset.

## Classic baseline peripheral phase

The shared classic V1 REPL scripts were run on the same locally corrected
`ESP32_IDF5` image. The GPIO, analogue, I2C register, SPI-flash and basic
OneWire results obtained before the final selector correction are:

| API or device path | Result | Evidence summary |
|---|---|---|
| `digitalWrite()` / `digitalRead()` loopbacks | Pass | Both loopback pairs followed low and high output levels; 4 checks passed |
| `digitalPulse()` observed with `setWatch()` | Pass | The expected four pulse edges and final low level were observed; 3 checks passed |
| Sequential `setWatch()` / `clearWatch()` phases | Pass after test timing correction | Starting the next watch on a fresh event-loop turn passed all 4 checks in three consecutive runs |
| `analogRead()` low/high levels | Pass | `D34` measured 0 and 0.9998 from the `D27` feedback path; 4 checks passed |
| PWM feedback through `analogRead()` | Pass on confirmation run | 25%, 50% and 75% settings produced ordered readings of approximately 0.22, 0.46 and 0.72; 5 checks passed |
| DAC endpoints on `D25` and `D26` | Pass | Both DAC-capable pins produced logic-low and logic-high feedback; 4 checks passed |
| MCP23008 register and GPIO feedback | Pass | Register configuration and independent GP0 feedback passed all 6 checks |
| MCP23008 interrupt output on `D35` | Pass after selector correction | With `SEL_D35=I2C_INT`, assertion, GP2 source/capture and clearing passed all 5 checks |
| Secondary Grove MCP23008 at `0x21` | Pass | External register change/restore and isolation from the onboard `0x20` device passed all 8 checks |
| MCP3008 transfer and PWM-to-GPIO reuse | Fail, reproducible | Low and PWM midpoint transfers worked, but `digitalWrite(D27,1)` did not reclaim the pin after PWM and both local ADC and MCP3008 read zero |
| External W25xxx SPI flash | Pass | JEDEC ID `ef4017`, status register and independent MCP3008 low/high cross-check passed all 9 checks |
| Two-device DS18B20 basic test | Pass | Six stable searches and both addressed scratchpad/temperature reads passed all 15 checks |
| 50-cycle addressed DS18B20 soak | Fail | ROM discovery remained stable, but 10 of 100 scratchpad reads failed CRC, all on the second sensor |
| Mixed DS18B20 plus DS2413 API test | Pass | Six stable three-device searches, two addressed temperature reads and all DS2413 command/status checks passed; 21 checks total |
| DS2413 physical PIO feedback | Pass on final confirmation; intermittent earlier transactions | Final run passed five searches and all PIOA/PIOB feedback combinations; preceding runs exposed missed searches and two `FF/FF` transactions |
| `shiftOut()` observed through `setWatch()` | Test method invalidated by faster implementation | Final data level was correct, but the software observer captured none of the eight now-optimised clock pulses |

The initial sequential-watch script was itself timing-sensitive. It evaluated
one watch phase and created the next watch in the same event-loop turn. A
10 ms hand-off to a new turn removed the incomplete result, after which three
consecutive complete runs passed. The firmware's simpler two-watch lifecycle
also passed without a correction.

The `shiftOut()` observer result follows the September 2026 fast-pin-address
optimisation: all eight clock pulses are emitted synchronously while the ESP32
scheduler is suspended. A JavaScript `setWatch()` callback is no longer a
credible pulse-by-pulse observer at that speed. This is a test-coverage gap,
not by itself proof that the output waveform is wrong.

The reproducible MCP3008 failure is distinct. Current source moved the ESP32
GPIO-matrix reconnection from every `jshPinSetValue()` call into
`jshPinSetState()`. The test manually selected output mode before starting PWM;
the subsequent `digitalWrite()` updated the GPIO level but retained the manual
mode and therefore did not call `jshPinSetState()` to reconnect the ordinary
GPIO output. This is a behavioural change requiring focused upstream review.

The 50-cycle DS18B20 soak completed with 10 failed addressed reads. Observed
corruption included single-bit changes, partial `FF` tails and an all-`FF`
scratchpad. The other sensor completed all 50 reads with valid CRC, so the
known multi-device addressed-read issue remains open on current master.

With the removable DS2413 fitted, the shared mixed-family script passed all
21 checks in one complete run: all six searches found the two DS18B20 devices
and DS2413, both addressed temperature reads were valid, and release/both-low/
release-again DS2413 commands returned the expected confirmation and status.

The physical-feedback runner then exercised PIOA and PIOB independently and
together through `D33` and `D26`. Its final confirmation run passed five of
five searches plus every command, status and physical-level check. The two
preceding runs were intermittent: the DS2413 appeared in 4/5 and 2/5 searches,
one scan returned no devices, and two of 15 DS2413 command transactions
returned `FF/FF`. Across those runs, every successfully acknowledged command
produced the correct physical feedback. This proves the selector and breakout
wiring while adding further evidence to the existing OneWire reliability
defect.

### Concurrent BLE GATT and HTTPS

Run `20261013T140103Z` exercised the classic current-master candidate as a BLE
GATT peripheral, Wi-Fi station and HTTPS client while the C3 current-master
candidate remained connected as its GATT central. The bench host supplied a
temporary TLS endpoint on the same controlled WPA2 network.

The classic obtained `192.168.50.104`, completed all 10 target checks, received
HTTP status 200 and the complete 744-byte response, and accepted a second
run-correlated GATT write after HTTPS. The C3 completed all 7 central checks.
The host observed exactly one request from the classic for the run-specific
path. No reset, assertion, brownout or out-of-memory report occurred.

| Phase | Native free heap | Native minimum heap | Largest native block | JsVars free |
|---|---:|---:|---:|---:|
| Initial script state | 67,584 | 67,412 | 65,536 | 547 |
| BLE connected | 63,764 | 62,548 | 61,440 | 1,992 |
| Wi-Fi connected | 53,988 | 53,516 | 53,248 | 1,878 |
| Immediately before HTTPS | 54,008 | 53,516 | 53,248 | 1,873 |
| HTTPS complete, GATT still connected | 53,756 | 31,224 | 32,768 | 1,789 |
| After Wi-Fi and BLE cleanup | 59,360 | 31,224 | 32,768 | 1,869 |

This confirms on the current source base that the 70 KB native-heap setting
still supports simultaneous connected BLE, WPA2 Wi-Fi and TLS. The initial
547 free JsVars reflect the large test program uploaded through the REPL;
garbage collection recovered substantial JavaScript storage once setup source
and temporary state became reclaimable.

## Active task list

- [x] Submit the focused UART transmit-buffer correction upstream as
  [`#2768`](https://github.com/espruino/Espruino/pull/2768), including the
  no-REPL reproduction and invalid 128-byte-buffer diagnosis.
- [ ] Await upstream review and disposition of PR `#2768`.
- [x] Run the classic V1 UART crosslink suite on the 256-byte candidate with
  `SEL_D35=UART` and `JP_UART_LOOP2=closed`.
- [x] Build and flash `ESP32C3_IDF5` from the same source and complete its
  focused 100-cycle UART lifecycle check.
- [x] Execute the classic baseline peripheral suite in
  `ESP32_BASELINE_HARDWARE` mode, retaining the confirmed failures and
  `shiftOut()` observation gap rather than treating the suite as a clean pass.
- [x] Rerun the MCP23008 interrupt script after moving `SEL_D35` to
  `I2C_INT` and opening `JP_UART_LOOP2`.
- [x] Complete the removable DS2413 mixed-device and physical-feedback tests,
  retaining both the final pass and the preceding intermittent OneWire
  failures.
- [x] Verify the external Grove MCP23008 at `0x21` without altering the
  onboard MCP23008 at `0x20`.
- [ ] Replace or supplement the software-watch `shiftOut()` observer with a
  measurement suitable for the optimised clock rate.
- [ ] Raise or link an upstream report for the PWM-to-ordinary-GPIO reclaim
  regression exposed by the MCP3008 test.
- [ ] Continue the existing OneWire investigation with the new 10/100
  addressed-read CRC evidence.
- [x] Complete the controlled classic-target BLE-plus-HTTPS coexistence test.
- [ ] Raise or link an upstream report and proposed PR for the current-master
  `stringToIP()` / `Wifi.ping()` regression using the focused branch.
- [ ] Investigate the repeatable missing classic station-disconnect event and
  the family-wide empty filtered BLE discovery result.
- [x] Build the candidate for the relevant ESP32 family matrix:
  `ESP32`, `ESP32_IDF4`, `ESP32_IDF5`, `ESP32C3_IDF4`, `ESP32C3_IDF5`,
  `ESP32S3_IDF4` and `ESP32S3_IDF5`.
- [x] Obtain targeted IDF5 runtime evidence on classic ESP32, ESP32-C3 and
  ESP32-S3. Each target completed the standalone five-callback loopback test,
  100 UART lifecycle cycles and the 35-check controlled ping lifecycle.
- [x] Commit the parser and lifecycle corrections on a focused firmware branch
  with no UART prerequisite in its proposed diff.
- [x] Resume and complete the current-master classic `ESP32_IDF5` functional
  sanity suite with the UART0 candidate explicitly documented as a local
  prerequisite.
- [ ] Build and run the same-source classic `BOARD=ESP32` comparison from the
  final selected source revision.
- [x] Preserve board identity, build provenance, selector state, runner
  commands and raw failures in this dated evidence record.

## Current board state

The classic ESP32 V1-harness target, ESP32-C3 and ESP32-S3 are currently
flashed with validation IDF5 images reporting Espruino 2v29.488 at
`6d1512f79`. All three contain the focused parser/lifecycle candidate, the
family idle-hook and task-priority amendments, and the separately isolated
UART prerequisite. The classic UART crosslink was selected for its final
100-cycle UART run. These images must be described as candidate images rather
than unmodified current master because the final family amendments remain
uncommitted at the time of this record.
