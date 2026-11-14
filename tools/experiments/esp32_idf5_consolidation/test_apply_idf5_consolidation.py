#!/usr/bin/env python3
"""Tests for rendering an accepted IDF5 consolidation plan."""

import unittest

import apply_idf5_consolidation as application
import idf5_consolidation_transformer as analyser


class SourceRendererTests(unittest.TestCase):
    def render(self, source: str) -> str:
        analysis = analyser.parse_source("fixture.c", source, 5)
        self.assertEqual(analysis.diagnostics, [])
        return application.SourceRenderer(analysis).render()

    def test_selects_first_true_arm_and_preserves_source_text(self) -> None:
        source = (
            "before();\n"
            "#if ESP_IDF_VERSION_MAJOR >= 5\n"
            "  idf5();\n"
            "#elif ESP_IDF_VERSION_MAJOR >= 4\n"
            "  idf4();\n"
            "#else\n"
            "  idf3();\n"
            "#endif\n"
            "after();\n"
        )
        self.assertEqual(self.render(source), "before();\n  idf5();\nafter();\n")

    def test_selects_else_arm(self) -> None:
        source = (
            "#if ESP_IDF_VERSION_MAJOR < 5\n"
            "legacy();\n"
            "#else\n"
            "idf5();\n"
            "#endif\n"
        )
        self.assertEqual(self.render(source), "idf5();\n")

    def test_removes_false_group_and_its_nested_group(self) -> None:
        source = (
            "start();\n"
            "#if ESP_IDF_VERSION_MAJOR < 5\n"
            "#if ESP_IDF_VERSION_MAJOR == 4\n"
            "idf4();\n"
            "#else\n"
            "idf3();\n"
            "#endif\n"
            "#endif\n"
            "end();\n"
        )
        self.assertEqual(self.render(source), "start();\nend();\n")

    def test_removes_redundant_blank_line_before_final_removed_group(self) -> None:
        source = (
            "declaration();\n"
            "\n"
            "#if ESP_IDF_VERSION_MAJOR < 5\n"
            "legacy();\n"
            "#endif\n"
        )
        self.assertEqual(self.render(source), "declaration();\n")

    def test_preserves_non_version_parent_and_simplifies_mixed_guard(self) -> None:
        source = (
            "#ifdef USE_NET\n"
            "#if ESP_IDF_VERSION_MAJOR >= 5 && CONFIG_LWIP_IPV6\n"
            "ipv6();\n"
            "#endif\n"
            "#endif\n"
        )
        self.assertEqual(
            self.render(source),
            "#ifdef USE_NET\n#if CONFIG_LWIP_IPV6\nipv6();\n#endif\n#endif\n",
        )

    def test_preserves_crlf_when_simplifying_guard(self) -> None:
        source = (
            "#if ESP_IDF_VERSION_MAJOR >= 5 && CONFIG_LWIP_IPV6\r\n"
            "ipv6();\r\n"
            "#endif\r\n"
        )
        self.assertEqual(
            self.render(source),
            "#if CONFIG_LWIP_IPV6\r\nipv6();\r\n#endif\r\n",
        )


if __name__ == "__main__":
    unittest.main()
