# ESP32 IDF5 Consolidation POC Automated Application Audit

**Outcome: PASS.** The accepted Section 7.3 plan was reproduced exactly and its planned source transformation was applied without manual correction.

## Authority and fixed inputs

- Simon authorized progression to Section 7.4 after reviewing the dry-run report in the Codex thread.
- Espruino branch: `poc/esp32-idf5-consolidation`
- Baseline commit: `2f0bc6bc293dede9458ef9d2b23ce76807f6bc94`
- Accepted plan: `docs/investigations/pre_idf5_retirement/ESP_IDF5_consolidation_POC_Dry_Run_Plan.md`
- Accepted plan SHA-256: `3021f37e467ef446c56f6df1ebff6e36006d2b5753b744f529e02b11b8358d96`
- Analysis transformer SHA-256: `8bdd928c444d1d0db797d06907d9c6aff82e298c166652352471878f03c0e3c8`
- Application tool version: `0.1.0`
- Application tool SHA-256: `64a1669f538f572f728626ee0d5df3bd4650274d8d7259016dd92e9841b47e17`
- Application gate: a fresh analysis report matched the accepted plan byte for byte before any source write.

Exact invocation from the harness repository root:

```bash
python3 tools/experiments/esp32_idf5_consolidation/apply_idf5_consolidation.py --repo ../Espruino_master --expected-branch poc/esp32-idf5-consolidation --expected-commit 2f0bc6bc293dede9458ef9d2b23ce76807f6bc94 --major 5 --accepted-plan docs/investigations/pre_idf5_retirement/ESP_IDF5_consolidation_POC_Dry_Run_Plan.md --accepted-plan-sha256 3021f37e467ef446c56f6df1ebff6e36006d2b5753b744f529e02b11b8358d96 --audit-output docs/investigations/pre_idf5_retirement/ESP_IDF5_consolidation_POC_Automated_Application_Audit.md --diff-output docs/investigations/pre_idf5_retirement/ESP_IDF5_consolidation_POC_Automated_Source.diff
```

## Applied result

| Measure | Result |
|---|---:|
| Files changed | 15 |
| Version-dependent groups accounted for | 106 |
| Effective selected branches unwrapped | 87 |
| Effective false groups removed | 12 |
| Effective mixed guards simplified | 2 |
| Nested groups removed with an enclosing branch | 5 |
| Remaining `ESP_IDF_VERSION_MAJOR` occurrences in C/header source | 0 |
| Unchanged makefile definitions | 2 |
| Generated diff size | 55736 bytes |
| Generated diff SHA-256 | `7edf371c0f81ef116c7c44e188dc618f01287eac7cd6e728819cbbc77f687a2e` |
| Manual source corrections | 0 |

## Changed files

| File | Before SHA-256 | After SHA-256 |
|---|---|---|
| `libs/network/esp32/jswrap_esp32_network.c` | `576367a6e8bb92e1538be946bb491e6e4a16f4a65ba82548fdaf1aa54d044be9` | `48c56af79ba7a5ec150ea3b1d733a839aff442b5b1487b38897b395df6999503` |
| `targets/esp32/BLE/esp32_gap_func.c` | `ce00a5f174d886a1bb2c9a56aec007041dff267400375f35ffcea1009425df09` | `e938b92b24f53789f5f5ad7c6f0d5eba36b9b73cfd8211a341ea06a658b247e8` |
| `targets/esp32/esp32_neopixel.c` | `5f5f2845547859e18c288f6942fccb1ac84ea11b4919ff0e6d2a6e5f9c117a67` | `41e00f064e1788584594d767b348f0d4c1e7fa05a807ec8ddb106f77bca86de9` |
| `targets/esp32/jshardware.c` | `026871f4682393feed76808bb986f7e98384420076689c80a55d772be1e82313` | `e209bffe4e52dcf165d91189bdb8348f7fa79a0f93a6fdf3528f150f0dca11ce` |
| `targets/esp32/jshardwareAnalog.c` | `bb3b94713c89d924e29221b825b13679dd7dd5ce87724f35baa69fddd46110e5` | `f4771e57bf2071773a05d06f4561ebf7fb54b0c57820562aa9beb26671c3dde2` |
| `targets/esp32/jshardwareI2c.c` | `5d5aae79d9b08c7e0d6b31b2fbab5e423c131f070bb8bbe6b3fc0a4dffa96d26` | `94cb63622c2e9e0f18386f820bf10ed7e95dfe08b6c030273e7ac909de71f136` |
| `targets/esp32/jshardwarePWM.c` | `36dd830f982ed2016afdbd3f1f68b99edcf30b70463308d4f0bcbd217de8bec9` | `609b4eb83df143c2351967ccd3dc30a0a2671b92547ec2064da0d94c12b6f7af` |
| `targets/esp32/jshardwarePulse.c` | `f84a4537a276e37b4f29b865b202974be7f8fb302670d70c274a9afbcce62081` | `b6a3b8878adfd6225883aabede02fe8a3c553fe3ccc76025cca3b978160760cc` |
| `targets/esp32/jshardwarePulse.h` | `c228fed9278e82b18356769239a9b8e43d02c65ee62b273f9ecedaf60c98171e` | `07b1d0a9d29ce823d4988bacbb4621dddc3f7d6b5c56198c61713d61df665a65` |
| `targets/esp32/jshardwareSpi.c` | `52e389f7965975f628926f1d61abe2b48539b27c6e4cef4e42cc7db5207494c0` | `929e273d4f83d2f2e2c6a061db323778e9c2b777071f2cb092d7f419e785c347` |
| `targets/esp32/jshardwareUart.c` | `f26fe9a63954460019c665ee6fea7184d35d4ed61598933b1a698250c54d6e9c` | `0b73cbc828029a0de33f6b723f9be707eeb853f62bbfd649adb47a9755b0c189` |
| `targets/esp32/jshardwareUart.h` | `25218cd06c41624d7d54411a921f35f3dc161eb49a56d240c59d8145c239f290` | `6037156dbc67a2046e9d63d5e52ae75e24440d4a9a57abcc1a42e16884fa9db5` |
| `targets/esp32/jswrap_esp32.c` | `b3f221c767b0d75acc065809cc3a4b970ee216f0756d28f57839e12e328d8155` | `fbe7ba973ecd3d56cb2b7be3c7e8e105065e7f736d9710f4da061de339a41b42` |
| `targets/esp32/main.c` | `dc9bdac177eeeb3f4c9aff3361711009cc130819234f688c814cda9a70a90e5c` | `c366cbdcad48c4646f7e61e284a13c3024f29e2bd98561ef167d997fd1f7fcef` |
| `targets/esp32/rtosutil.c` | `a24d39eb8c85bc19d1406f2fd7585857be26f70dcab212b25c91149cd97ea79f` | `dbc9040024e5ffd9f7fca6552a11bfe71a9016733c06fc31c06b2b9e605e6e99` |

## Separation boundary

The Espruino worktree contains only the automated output represented by the retained diff. No manual firmware-source edit has been made. Any later correction must follow Section 4.8 and Section 7.5 of the specification.
