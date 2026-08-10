#!/usr/bin/env node

// Dependency-free checker for the Rev-A KiCad s-expression netlist and the
// deliberately small YAML contract schema used in this directory.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const TOOL_VERSION = 1;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

function usage() {
  return `Usage:
  node check-connectivity.mjs [options]

Options:
  --manifest PATH  Contract-set manifest
  --netlist PATH   Complete root KiCad s-expression netlist
  --output PATH    Deterministic JSON written only when every check passes
  --help           Show this help

Defaults are relative to this script's verification directory.`;
}

function parseArguments(argv) {
  const options = {
    manifest: resolve(SCRIPT_DIR, "ReusableHarnessRevA_Connectivity.yaml"),
    netlist: resolve(
      SCRIPT_DIR,
      "generated",
      "Espruino_Harness_RevA_FullHierarchy.net",
    ),
    output: resolve(
      SCRIPT_DIR,
      "baseline",
      "Espruino_Harness_RevA_FullHierarchy_Connectivity.json",
    ),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help" || argument === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (!["--manifest", "--netlist", "--output"].includes(argument)) {
      throw new Error(`Unknown argument: ${argument}\n\n${usage()}`);
    }
    if (index + 1 >= argv.length) {
      throw new Error(`Missing value after ${argument}`);
    }
    options[argument.slice(2)] = resolve(argv[index + 1]);
    index += 1;
  }
  return options;
}

function stripYamlComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if ((character === '"' || character === "'") && line[index - 1] !== "\\") {
      quote = quote === character ? null : quote ?? character;
    }
    if (character === "#" && quote === null) {
      return line.slice(0, index);
    }
  }
  return line;
}

function splitYamlItems(text, separator = ",") {
  const items = [];
  let quote = null;
  let squareDepth = 0;
  let braceDepth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if ((character === '"' || character === "'") && text[index - 1] !== "\\") {
      quote = quote === character ? null : quote ?? character;
    } else if (quote === null) {
      if (character === "[") squareDepth += 1;
      if (character === "]") squareDepth -= 1;
      if (character === "{") braceDepth += 1;
      if (character === "}") braceDepth -= 1;
      if (
        character === separator &&
        squareDepth === 0 &&
        braceDepth === 0
      ) {
        items.push(text.slice(start, index).trim());
        start = index + 1;
      }
    }
  }
  items.push(text.slice(start).trim());
  return items.filter(Boolean);
}

function splitYamlKeyValue(text) {
  let quote = null;
  let squareDepth = 0;
  let braceDepth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if ((character === '"' || character === "'") && text[index - 1] !== "\\") {
      quote = quote === character ? null : quote ?? character;
    } else if (quote === null) {
      if (character === "[") squareDepth += 1;
      if (character === "]") squareDepth -= 1;
      if (character === "{") braceDepth += 1;
      if (character === "}") braceDepth -= 1;
      if (character === ":" && squareDepth === 0 && braceDepth === 0) {
        return [text.slice(0, index).trim(), text.slice(index + 1).trim()];
      }
    }
  }
  throw new Error(`Expected YAML key/value pair: ${text}`);
}

function parseYamlScalar(text) {
  const value = text.trim();
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1).replace(/\\([\\"'])/g, "$1");
  }
  if (value.startsWith("[") && value.endsWith("]")) {
    return splitYamlItems(value.slice(1, -1)).map(parseYamlScalar);
  }
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return null;
  return value;
}

function parseInlineYamlMap(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
    throw new Error(`Expected inline YAML map: ${text}`);
  }
  return Object.fromEntries(
    splitYamlItems(trimmed.slice(1, -1)).map((entry) => {
      const [key, value] = splitYamlKeyValue(entry);
      return [key, parseYamlScalar(value)];
    }),
  );
}

function yamlLines(text) {
  return text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map(stripYamlComment)
    .filter((line) => line.trim().length > 0)
    .map((line) => ({
      indent: line.match(/^\s*/)[0].length,
      text: line.trim(),
    }));
}

function topLevelYamlScalars(lines) {
  const result = {};
  for (const line of lines) {
    if (line.indent !== 0 || !line.text.includes(":")) continue;
    const [key, value] = splitYamlKeyValue(line.text);
    if (value.length > 0) result[key] = parseYamlScalar(value);
  }
  return result;
}

function parseManifest(text) {
  const lines = yamlLines(text);
  const top = topLevelYamlScalars(lines);
  const project = {};
  const contracts = [];
  let section = null;
  let contract = null;

  for (const line of lines) {
    if (line.indent === 0 && line.text.endsWith(":")) {
      section = line.text.slice(0, -1);
      contract = null;
      continue;
    }
    if (section === "project" && line.indent === 2) {
      const [key, value] = splitYamlKeyValue(line.text);
      project[key] = parseYamlScalar(value);
      continue;
    }
    if (section === "contracts" && line.indent === 2 && line.text.startsWith("- ")) {
      const [key, value] = splitYamlKeyValue(line.text.slice(2));
      contract = { [key]: parseYamlScalar(value) };
      contracts.push(contract);
      continue;
    }
    if (section === "contracts" && line.indent === 4 && contract) {
      const [key, value] = splitYamlKeyValue(line.text);
      contract[key] = parseYamlScalar(value);
    }
  }

  if (top.schema_version !== 1 || typeof top.contract_set !== "string") {
    throw new Error("Manifest must declare schema_version: 1 and contract_set");
  }
  if (contracts.length === 0 || contracts.some((item) => !item.id || !item.file)) {
    throw new Error("Manifest must contain contract entries with id and file");
  }
  return {
    schema_version: top.schema_version,
    contract_set: top.contract_set,
    project,
    contracts,
  };
}

function parseContract(text) {
  const lines = yamlLines(text);
  const top = topLevelYamlScalars(lines);
  const assertions = {
    pin_net: [],
    component_value: [],
    forbidden_same_net: [],
  };
  let inAssertions = false;
  let assertionType = null;
  let currentForbidden = null;

  for (const line of lines) {
    if (line.indent === 0) {
      inAssertions = line.text === "assertions:";
      assertionType = null;
      currentForbidden = null;
      continue;
    }
    if (!inAssertions) continue;
    if (line.indent === 2 && line.text.endsWith(":")) {
      assertionType = line.text.slice(0, -1);
      if (!(assertionType in assertions)) {
        throw new Error(`Unsupported assertion type: ${assertionType}`);
      }
      currentForbidden = null;
      continue;
    }
    if (!assertionType) continue;
    if (
      line.indent === 4 &&
      line.text.startsWith("- {") &&
      ["pin_net", "component_value"].includes(assertionType)
    ) {
      assertions[assertionType].push(parseInlineYamlMap(line.text.slice(2)));
      continue;
    }
    if (
      assertionType === "forbidden_same_net" &&
      line.indent === 4 &&
      line.text.startsWith("- ")
    ) {
      const [key, value] = splitYamlKeyValue(line.text.slice(2));
      currentForbidden = { [key]: parseYamlScalar(value) };
      assertions.forbidden_same_net.push(currentForbidden);
      continue;
    }
    if (
      assertionType === "forbidden_same_net" &&
      line.indent === 6 &&
      currentForbidden
    ) {
      const [key, value] = splitYamlKeyValue(line.text);
      currentForbidden[key] = parseYamlScalar(value);
      continue;
    }
    throw new Error(`Unsupported contract YAML near: ${line.text}`);
  }

  if (
    top.schema_version !== 1 ||
    !["block_contract", "system_contract"].includes(top.kind) ||
    typeof top.block_id !== "string"
  ) {
    throw new Error(
      "Contract must declare schema_version: 1, a supported kind and block_id",
    );
  }
  return {
    schema_version: top.schema_version,
    kind: top.kind,
    block_id: top.block_id,
    assertions,
  };
}

function tokenizeSExpression(text) {
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }
    if (text[index] === "(" || text[index] === ")") {
      tokens.push(text[index]);
      index += 1;
      continue;
    }
    if (text[index] === '"') {
      let value = "";
      index += 1;
      while (index < text.length && text[index] !== '"') {
        if (text[index] === "\\" && index + 1 < text.length) {
          index += 1;
        }
        value += text[index];
        index += 1;
      }
      if (index >= text.length) throw new Error("Unterminated netlist string");
      index += 1;
      tokens.push(value);
      continue;
    }
    const start = index;
    while (
      index < text.length &&
      !/\s/.test(text[index]) &&
      text[index] !== "(" &&
      text[index] !== ")"
    ) {
      index += 1;
    }
    tokens.push(text.slice(start, index));
  }
  return tokens;
}

function parseSExpression(text) {
  const tokens = tokenizeSExpression(text);
  let index = 0;

  function parseNode() {
    if (tokens[index] !== "(") {
      const value = tokens[index];
      index += 1;
      return value;
    }
    index += 1;
    const node = [];
    while (index < tokens.length && tokens[index] !== ")") {
      node.push(parseNode());
    }
    if (tokens[index] !== ")") throw new Error("Unbalanced netlist expression");
    index += 1;
    return node;
  }

  const root = parseNode();
  if (index !== tokens.length) throw new Error("Extra data after netlist expression");
  return root;
}

function child(node, name) {
  return node.find((item) => Array.isArray(item) && item[0] === name);
}

function scalar(node, name, required = true) {
  const item = child(node, name);
  if (!item || item.length < 2) {
    if (required) throw new Error(`Missing ${name} in netlist expression`);
    return "";
  }
  return String(item[1]);
}

function stableCompare(left, right) {
  const leftParts = String(left).match(/\d+|\D+/g) ?? [];
  const rightParts = String(right).match(/\d+|\D+/g) ?? [];
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    if (index >= leftParts.length) return -1;
    if (index >= rightParts.length) return 1;
    const leftPart = leftParts[index];
    const rightPart = rightParts[index];
    const leftNumber = /^\d+$/.test(leftPart);
    const rightNumber = /^\d+$/.test(rightPart);
    if (leftNumber && rightNumber) {
      const difference = Number(leftPart) - Number(rightPart);
      if (difference !== 0) return difference;
    } else if (leftPart !== rightPart) {
      return leftPart < rightPart ? -1 : 1;
    }
  }
  return 0;
}

function parseNetlist(text) {
  const root = parseSExpression(text);
  if (!Array.isArray(root) || root[0] !== "export") {
    throw new Error("Expected a KiCad s-expression netlist beginning with export");
  }
  const componentsSection = child(root, "components");
  const netsSection = child(root, "nets");
  if (!componentsSection || !netsSection) {
    throw new Error("Netlist does not contain components and nets sections");
  }

  const components = [];
  const componentByRef = new Map();
  for (const expression of componentsSection.slice(1)) {
    if (!Array.isArray(expression) || expression[0] !== "comp") continue;
    const component = {
      ref: scalar(expression, "ref"),
      value: scalar(expression, "value"),
      footprint: scalar(expression, "footprint", false),
    };
    if (componentByRef.has(component.ref)) {
      throw new Error(`Duplicate component reference in netlist: ${component.ref}`);
    }
    componentByRef.set(component.ref, component);
    components.push(component);
  }

  const nets = [];
  const endpointToNet = new Map();
  for (const expression of netsSection.slice(1)) {
    if (!Array.isArray(expression) || expression[0] !== "net") continue;
    const net = { name: scalar(expression, "name"), nodes: [] };
    for (const item of expression.slice(1)) {
      if (!Array.isArray(item) || item[0] !== "node") continue;
      const node = { ref: scalar(item, "ref"), pin: scalar(item, "pin") };
      const endpoint = `${node.ref}.${node.pin}`;
      if (endpointToNet.has(endpoint)) {
        throw new Error(`Endpoint ${endpoint} occurs on more than one net`);
      }
      endpointToNet.set(endpoint, net.name);
      net.nodes.push(node);
    }
    net.nodes.sort((left, right) =>
      stableCompare(left.ref, right.ref) || stableCompare(left.pin, right.pin),
    );
    nets.push(net);
  }

  components.sort((left, right) => stableCompare(left.ref, right.ref));
  nets.sort((left, right) => stableCompare(left.name, right.name));
  return { components, componentByRef, nets, endpointToNet };
}

function canonicalNetName(name) {
  if (!name.startsWith("/")) return name;
  return name.slice(name.lastIndexOf("/") + 1);
}

function endpoint(ref, pin) {
  return `${ref}.${pin}`;
}

function checkContract(contract, netlist) {
  const failures = [];
  let checks = 0;
  const actualNetsByExpectedName = new Map();

  for (const assertion of contract.assertions.pin_net) {
    checks += 1;
    const key = endpoint(assertion.ref, assertion.pin);
    const actual = netlist.endpointToNet.get(key);
    if (actual === undefined) {
      failures.push(`${key}: endpoint is absent from the netlist`);
    } else if (actual !== assertion.net && canonicalNetName(actual) !== assertion.net) {
      failures.push(`${key}: expected net ${assertion.net}, found ${actual}`);
    } else {
      const actualNets = actualNetsByExpectedName.get(assertion.net) ?? new Set();
      actualNets.add(actual);
      actualNetsByExpectedName.set(assertion.net, actualNets);
    }
  }

  for (const [expected, actualNets] of actualNetsByExpectedName) {
    if (actualNets.size > 1) {
      failures.push(
        `${expected}: expected one electrical net, found ${[...actualNets].sort(stableCompare).join(", ")}`,
      );
    }
  }

  for (const assertion of contract.assertions.component_value) {
    checks += 1;
    const component = netlist.componentByRef.get(assertion.ref);
    if (!component) {
      failures.push(`${assertion.ref}: component is absent from the netlist`);
    } else if (component.value !== String(assertion.value)) {
      failures.push(
        `${assertion.ref}: expected value ${assertion.value}, found ${component.value}`,
      );
    }
  }

  for (const assertion of contract.assertions.forbidden_same_net) {
    checks += 1;
    if (!Array.isArray(assertion.endpoints) || assertion.endpoints.length < 2) {
      failures.push(`${assertion.id}: forbidden_same_net needs at least two endpoints`);
      continue;
    }
    const actualNets = assertion.endpoints.map((item) => netlist.endpointToNet.get(item));
    const missing = assertion.endpoints.filter((_, index) => actualNets[index] === undefined);
    if (missing.length > 0) {
      failures.push(`${assertion.id}: unresolved endpoint(s): ${missing.join(", ")}`);
      continue;
    }
    if (new Set(actualNets).size !== actualNets.length) {
      failures.push(
        `${assertion.id}: forbidden endpoints share a net (${assertion.endpoints.join(", ")})`,
      );
    }
  }

  return {
    id: contract.block_id,
    kind: contract.kind,
    status: failures.length === 0 ? "pass" : "fail",
    checks,
    assertions: {
      pin_net: contract.assertions.pin_net.length,
      component_value: contract.assertions.component_value.length,
      forbidden_same_net: contract.assertions.forbidden_same_net.length,
    },
    failures,
  };
}

function normalizedHash(text) {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const manifestText = await readFile(options.manifest, "utf8");
  const manifest = parseManifest(manifestText);
  const contractDirectory = dirname(options.manifest);
  const loadedContracts = [];

  for (const entry of manifest.contracts) {
    const contractPath = resolve(contractDirectory, entry.file);
    const contractText = await readFile(contractPath, "utf8");
    const contract = parseContract(contractText);
    if (contract.block_id !== entry.id) {
      throw new Error(
        `Manifest id ${entry.id} does not match block_id ${contract.block_id} in ${entry.file}`,
      );
    }
    loadedContracts.push({ entry, contract, text: contractText });
  }

  const netlist = parseNetlist(await readFile(options.netlist, "utf8"));
  const results = loadedContracts.map(({ contract }) =>
    checkContract(contract, netlist),
  );
  const failures = results.flatMap((result) =>
    result.failures.map((failure) => `${result.id}: ${failure}`),
  );

  for (const result of results) {
    console.log(
      `${result.status.toUpperCase()} ${result.id}: ${result.checks} checks ` +
        `(${result.assertions.pin_net} pin/net, ` +
        `${result.assertions.component_value} value, ` +
        `${result.assertions.forbidden_same_net} forbidden-net)`,
    );
  }

  if (failures.length > 0) {
    console.error(`\nConnectivity contract set FAILED with ${failures.length} mismatch(es):`);
    for (const failure of failures) console.error(`- ${failure}`);
    console.error("\nNo baseline output was written.");
    process.exitCode = 1;
    return;
  }

  const connectivityModel = {
    components: netlist.components,
    nets: netlist.nets,
  };
  const report = {
    schema_version: 1,
    contract_set: manifest.contract_set,
    project: manifest.project,
    checker: {
      name: "check-connectivity.mjs",
      version: TOOL_VERSION,
    },
    contract_sources: [
      {
        id: "manifest",
        file: "ReusableHarnessRevA_Connectivity.yaml",
        sha256: normalizedHash(manifestText),
      },
      ...loadedContracts.map(({ entry, text }) => ({
        id: entry.id,
        file: entry.file.replaceAll("\\", "/"),
        sha256: normalizedHash(text),
      })),
    ],
    results: results.map(({ failures: _failures, ...result }) => result),
    connectivity_sha256: normalizedHash(JSON.stringify(connectivityModel)),
    ...connectivityModel,
  };

  await writeFile(options.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `\nConnectivity contract set PASSED: ${results.length} contracts, ` +
      `${results.reduce((total, item) => total + item.checks, 0)} checks.`,
  );
  console.log(`Wrote deterministic baseline: ${options.output}`);
}

main().catch((error) => {
  console.error(`Connectivity checker error: ${error.message}`);
  process.exitCode = 2;
});
