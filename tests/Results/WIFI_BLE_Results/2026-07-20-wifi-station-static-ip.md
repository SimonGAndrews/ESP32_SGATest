# Wi-Fi Station Static IP

Date: 20 July 2026

## Conclusion

`Wifi.setIP()` did not apply a post-association static station address on
either the classic ESP32 legacy or ESP32-C3 IDF4 build. Both stations first
received `192.168.4.2` by DHCP, called `setIP()` requesting `192.168.4.77`, and
then received `null` through the callback as though the operation had
succeeded. `Wifi.getIP()` nevertheless remained at `.2`, and the target AP
independently observed application traffic originating from `.2`.

This is a shared, longstanding ESP32-port defect rather than a C3-only IDF4
regression. Source inspection at the exact commits reported by both boards
provides a strong explanation: the station path calls the DHCP-server stop
function on the station interface instead of stopping its DHCP client. It then
maps a nonzero `set_ip_info` result to callback `null`, converting the expected
failure into a false success.

The C3 completed ping/UDP/lifecycle processing without a reset, although its
known ping-to-classic-AP timeout repeated. Two classic confirmation runs both
showed the false-success address result and then reset at different later
points. Those resets are additional firmware evidence, but their exact cause
is not assigned by this test.

## Bench And Firmware Preconditions

- both V1 harnesses in `STANDALONE` mode
- both targets powered only through fully connected USB cables
- no external target power
- no `SUP_EVENT_OUT` / `SUP_EVENT_IN` connection
- no third access point or external network endpoint
- target AP used its reset-default `192.168.4.1/24` subnet
- static station address requested after successful DHCP association
- no other REPL, Web IDE or serial monitor attached
- configuration: `tests/WIFI_BLE/standalone_bench_config.json`

| Position | Board | Version | Git commit |
|---|---|---|---|
| `esp32_c3_v1` | `ESP32C3_IDF4` | `2v29.107` | `0af6e1568` |
| `esp32_v1` | `ESP32` | `2v29.97` | `d3d33f4aa` |

## C3 Supervisor Station

Command:

```bash
python3 tools/repl/run_wifi_target_ap_test.py \
  --target-board esp32 \
  --station-address static
```

```text
RUNNER run_id=20260720T183447Z
RUNNER_RESULT=FAIL
```

The overall failure is the required result for the static-address and ping
assertions; association, application traffic, lifecycle events and cleanup
completed normally.

| Check | Observation | Result |
|---|---|---|
| DHCP association | C3 received `192.168.4.2` | pass |
| `setIP()` callback | `null` | callback contract appeared to pass |
| immediate `getIP()` | remained `192.168.4.2`, not requested `.77` | fail |
| retained address after exchange | remained `192.168.4.2` | fail |
| AP-observed UDP source | `192.168.4.2` | independent static-address failure |
| C3 ping to classic AP | five timeouts, zero reply bytes | known directional failure |
| UDP challenge/acknowledgement | matching run-bound payload | pass |
| lifecycle events | associated, connected, disconnected; AP join and leave | pass |
| final cleanup | both station addresses `0.0.0.0`; no recovery reset | pass |

The C3 station recorded eight passing checks and three failures. The classic
target AP recorded six passing checks and no local failures.

## Classic Supervisor Station

Command:

```bash
python3 tools/repl/run_wifi_target_ap_test.py --station-address static
```

Two focused confirmation runs reproduced the same address result.

| Run ID | Stable observations | Later observation |
|---|---|---|
| `20260720T183133Z` | DHCP `.2`; callback `null`; immediate `getIP()` `.2`; ping and UDP passed; AP saw source `.2` | classic aborted after UDP while the first script revision closed its socket; a subsequent boot reported a brownout event |
| `20260720T183319Z` | DHCP `.2`; callback `null`; immediate `getIP()` `.2` | classic task-watchdog reset as the test proceeded to ping; no UDP was sent |

The first attempt at extending the larger general-purpose station role was
discarded because the classic interpreter reported `OUT OF MEMORY` during
script upload, before any association or API call. The final focused role is
about 5.7 KiB and reached `Wifi.setIP()` reliably. The out-of-memory attempt is
runner-development evidence, not a Wi-Fi API failure.

Both completed host cleanup paths returned the classic station address to
`0.0.0.0` without requiring an additional cleanup reset. Because the two
confirmation scripts differed in whether they closed the UDP socket in-role,
and because the later reset points differed, this evidence does not yet assign
the resets specifically to `setIP()`, ping, UDP closure or their interaction.

## API Contract And Source Correlation

The Espruino API documents `setIP(settings, callback)` with `err==null` on
success and a string on failure. Both observed callbacks were therefore
nominal successes, while local and peer evidence proved functional failure.

The exact local source revisions matching the reported firmware commits are:

- legacy: `/home/simon/MaBecker/Espruino_master`, commit `d3d33f4aa`
- C3 IDF4: `/home/simon/MaBecker/Espruino_upstream_idf4`, commit `0af6e1568`

Both contain the same shared worker logic under
`libs/network/esp32/jswrap_esp32_network.c`:

```c
tcpip_adapter_dhcps_stop(TCPIP_ADAPTER_IF_STA);
err = tcpip_adapter_set_ip_info(TCPIP_ADAPTER_IF_STA, &info);
params[0] = err ? jsvNewWithFlags(JSV_NULL) :
                  jsvNewFromString("Failure");
```

Espressif documents that the DHCP client or server must be stopped before
`tcpip_adapter_set_ip_info()`, otherwise it returns
`ESP_ERR_TCPIP_ADAPTER_DHCP_NOT_STOPPED`. It also documents that `dhcps_stop`
is the AP DHCP-server function, while `dhcpc_stop` is the station DHCP-client
function. The inspected code ignores the first call's result and then converts
a nonzero `err` from `set_ip_info` to callback `null`. This matches every
stable observation in the test.

References:

- [Espruino `Wifi.setIP()` API](https://www.espruino.com/Reference#l_Wifi_setIP)
- [Espressif TCP/IP Adapter API](https://docs.espressif.com/projects/esp-idf/en/v3.3/api-reference/network/tcpip_adapter.html)

No Espruino firmware was changed during this test.

## V2 And Runner Significance

The two-board Supervisor Peer approach identified a false-success API result
without an external AP. The host combined four independent evidence sources:

1. callback conformance
2. station-side `getIP()` immediately and after a hold period
3. target-AP observation of the packet's source address
4. run-bound application challenge/acknowledgement

This supports keeping observable function separate from return/callback
conformance in V2 test specifications. The Supervisor station and target AP
roles are both viable, while the host must retain bounded timeouts, boot-log
capture and cleanup because firmware under test can reset before its result
marker.

The classic out-of-memory upload also establishes a practical runner rule:
keep focused target roles small and compose broader coverage in the host
runner rather than continuously enlarging a single on-target script.
