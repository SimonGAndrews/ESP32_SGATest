#!/usr/bin/env python3
"""Focused tests for the IDF5 consolidation POC dry-run analyser."""

import unittest

import idf5_consolidation_transformer as transformer


class ConditionClassificationTests(unittest.TestCase):
    def classify(self, expression: str, kind: str = "if") -> transformer.ConditionResult:
        directive = transformer.Directive(kind, 1, 1, expression, f"#{kind} {expression}")
        return transformer.classify_condition(directive, 5)

    def test_reviewed_pure_forms(self) -> None:
        expected = {
            "ESP_IDF_VERSION_MAJOR >= 5": "true",
            "ESP_IDF_VERSION_MAJOR>=4": "true",
            "ESP_IDF_VERSION_MAJOR < 5": "false",
            "!(ESP_IDF_VERSION_MAJOR >= 4)": "false",
            "ESP_IDF_VERSION_MAJOR == 5": "true",
            "ESP_IDF_VERSION_MAJOR == 4": "false",
            "ESP_IDF_VERSION_MAJOR < 4": "false",
        }
        for expression, value in expected.items():
            with self.subTest(expression=expression):
                result = self.classify(expression)
                self.assertEqual(result.category, "version")
                self.assertEqual(result.value, value)

    def test_reviewed_mixed_forms(self) -> None:
        result = self.classify("ESP_IDF_VERSION_MAJOR >= 5 && CONFIG_LWIP_IPV6")
        self.assertEqual((result.category, result.value, result.remaining), (
            "mixed",
            "residual",
            "CONFIG_LWIP_IPV6",
        ))

        result = self.classify(
            "defined(ESPR_USE_USB_SERIAL_JTAG) && ESP_IDF_VERSION_MAJOR < 5"
        )
        self.assertEqual((result.category, result.value), ("mixed", "false"))

    def test_unknown_form_fails_closed(self) -> None:
        result = self.classify("ESP_IDF_VERSION_MAJOR > 3")
        self.assertEqual(result.category, "unsupported")
        self.assertEqual(result.value, "unknown")


class GroupPlanningTests(unittest.TestCase):
    def parse(self, text: str) -> transformer.FileAnalysis:
        return transformer.parse_source("fixture.c", text, 5)

    def test_complete_chain_selects_first_true_branch(self) -> None:
        analysis = self.parse(
            "#if ESP_IDF_VERSION_MAJOR >= 5\n"
            "idf5();\n"
            "#elif ESP_IDF_VERSION_MAJOR >= 4\n"
            "idf4();\n"
            "#else\n"
            "idf3();\n"
            "#endif\n"
        )
        group = analysis.groups[0]
        self.assertEqual(analysis.diagnostics, [])
        self.assertEqual(group.local_action, "unwrap-selected-branch")
        self.assertEqual(group.selected_branch, 0)

    def test_less_than_chain_selects_else(self) -> None:
        analysis = self.parse(
            "#if ESP_IDF_VERSION_MAJOR < 5\n"
            "legacy();\n"
            "#else\n"
            "idf5();\n"
            "#endif\n"
        )
        group = analysis.groups[0]
        self.assertEqual(group.local_action, "unwrap-selected-branch")
        self.assertEqual(group.selected_branch, 1)

    def test_mixed_condition_is_simplified(self) -> None:
        analysis = self.parse(
            "#if ESP_IDF_VERSION_MAJOR >= 5 && CONFIG_LWIP_IPV6\n"
            "ipv6();\n"
            "#endif\n"
        )
        group = analysis.groups[0]
        self.assertEqual(group.local_action, "simplify-guard")
        self.assertEqual(group.remaining_condition, "CONFIG_LWIP_IPV6")

    def test_nested_group_in_discarded_branch_is_still_accounted_for(self) -> None:
        analysis = self.parse(
            "#if ESP_IDF_VERSION_MAJOR < 5\n"
            "#if ESP_IDF_VERSION_MAJOR == 4\n"
            "idf4();\n"
            "#endif\n"
            "#endif\n"
        )
        outer, inner = analysis.groups
        self.assertEqual(outer.local_action, "remove-group")
        self.assertEqual(inner.local_action, "remove-group")
        self.assertEqual(inner.effective_action, "removed-with-enclosing-branch")

    def test_unknown_expression_and_unbalanced_group_are_diagnostics(self) -> None:
        analysis = self.parse("#if ESP_IDF_VERSION_MAJOR > 3\nbody();\n")
        reasons = [diagnostic.reason for diagnostic in analysis.diagnostics]
        self.assertIn("missing #endif", reasons)
        self.assertIn("expression is not one of the reviewed Appendix 1 forms", reasons)
        self.assertEqual(analysis.groups[0].local_action, "unsupported")


if __name__ == "__main__":
    unittest.main()
