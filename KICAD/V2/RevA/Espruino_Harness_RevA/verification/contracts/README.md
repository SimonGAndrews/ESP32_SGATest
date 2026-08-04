# Connectivity contracts

Each YAML file records the independently reviewed, machine-checkable
connectivity intent for one circuit block. The files are loaded through
`../ReusableHarnessRevA_Connectivity.yaml`; they are not standalone
manufacturing baselines.

A block contract is authored from its requirements, selected component data
sheets, circuit analysis and visual review. The KiCad netlist is then compared
with that contract. Do not populate a contract by copying the netlist.

Create a contract only when its block analysis contains real reviewed intent.
Planned blocks remain in the design baseline register; they do not need empty
YAML placeholders.

Keep the YAML limited to assertions the checker can evaluate:

- important component pin to expected net
- operationally significant component value or fitted/DNP state
- critical connector contact to net
- forbidden direct connection
- exact net membership only where an unexpected member would be dangerous

Explanations, status, review-image links, calculations and open issues belong
in the human-readable design baseline. Add a `SYS01` contract only when the
first genuine cross-block rule is reviewed.
