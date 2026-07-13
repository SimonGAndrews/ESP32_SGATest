
Notes copied from V1 block 7 uart testing.

Question - As an aside we are designing the v2 harness and are currently evaluating what gaps we have in out test block capabilities.  so for the uart block on the ESP32_V1  what imporvements could we make.  it seems we need a way to easily test the console.  Any thing else ?

Codex Response - 
Workstream: V1 bench evidence informing V2 architecture.

Yes, the obvious V2 UART gap is console testing. ESP32_V1 deliberately keeps UART0 as the runner/control path, which is sensible for stability, but it means Block 7 mainly proves non-console `Serial2`/`Serial3`. It does not make console ownership, `setConsole()`, REPL relocation, reset/reconnect, or flashing-path conflicts easy to test.

For V2 UART block improvements, I’d consider these.

1. **Separate Control Console From DUT UARTs**

Best improvement: give the harness an independent, always-available control path that is not one of the UARTs under test.

For ESP32-C3 that can be native USB Serial/JTAG while UART0/UART1 are tested. For classic ESP32 this is harder, because UART0 is normally the board USB-UART console/flashing path. V2 could support an external harness controller path using reset/boot plus switchable UART routing so UART0 can be temporarily released for testing, then restored.

This would let us test:

- `Serial1` / UART0 as an ordinary Espruino `Serial`
- `Serial.setConsole()`
- `E.setConsole()`
- REPL movement away from and back to the default console
- console recovery after reset
- console conflict behaviour when a tested UART is also the control UART

2. **Switchable UART Matrix**

V1 has a fixed useful crosslink. V2 would benefit from a small routing matrix or jumper/switch bank that can select:

- UART A TX -> UART B RX
- UART B TX -> UART A RX
- UART0 crosslink mode
- external USB-UART adapter mode
- loopback-to-self mode
- disconnected/open RX mode

This gives more coverage than one fixed crosslink, especially for proving default pins, alternate pins, and ownership conflicts.

3. **Hardware Flow-Control Lines**

Current Block 7 does not prove CTS/RTS style behaviour. Espruino setup exposes `cts`, and docs mention flow control, but ESP32_V1 has no convenient UART handshaking loop.

V2 could add optional routed lines for:

- CTS input stimulus
- RTS/ready output observation if supported or exposed
- GPIO-controlled CTS assertion/deassertion from the harness

Then we can test whether TX pauses/resumes under CTS and whether setup rejects/accepts unsupported combinations cleanly.

4. **Error Injection / Bad Frame Capability**

We currently test mismatched baud as a crude negative case. It proves recovery, but not clean framing/parity event behaviour.

A better V2 provision would be either:

- a second programmable UART source from the harness controller, or
- a small fault-injection path that can force RX low/high or glitch it

That would support tests for:

- framing errors
- parity errors where supported
- break condition / long-low RX
- malformed traffic recovery
- FIFO/error flag behaviour

For ESP32 specifically, `errors:true` is currently rejected, so this may mainly document unsupported behaviour, but the same V2 block could be valuable across other Espruino targets.

5. **External Instrument Connector**

Add a clearly labelled UART test header per side with TX, RX, GND, and maybe CTS/RTS. V1 has some access, but V2 should make this first-class.

Useful for:

- logic analyzer capture
- external USB-UART peer
- baud accuracy checks
- proving electrical direction and idle state
- decoding real waveforms when firmware behaviour is ambiguous

6. **Selectable Level / Protection Strategy**

Most ESP32 testing is 3.3 V, but V2 should make UART voltage assumptions explicit. At minimum: 3.3 V-only labelling and series protection. If V2 targets may include 5 V UART devices later, add level translation or make the block clearly not 5 V tolerant.

7. **Console Recovery / Failsafe Design**

If V2 lets tests move the console, it also needs a guaranteed recovery route:

- hardware reset control
- boot/download control
- default-console restore procedure
- maybe a harness-controlled power cycle
- timeout-based runner recovery expectations

Without that, console tests will be fragile and unpleasant.

My suggested V2 UART capability tiers:

- **Minimum:** keep V1-style bidirectional crosslink, but add cleaner external access and documented selector states.
- **Good:** add switchable routing so UART0/console can be tested without rewiring.
- **Best:** add independent control path plus switchable UART matrix plus optional CTS/error-injection support.

The main V1 lesson is that the fixed `Serial2`/`Serial3` crosslink is excellent for high-confidence non-console API coverage, but it intentionally avoids the awkward class of tests around console ownership. V2 should make that awkward class deliberate and recoverable rather than ad hoc.