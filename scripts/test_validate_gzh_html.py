"""Regression for issue #21; run with unittest discovery or this file directly."""
import subprocess
import sys
import unittest
from pathlib import Path

from validate_gzh_html import validate

WARNING_ID = "[darkmode-no-gradient]"


def fragment(style):
    return f'<section style="{style}"><span leaf="">测试文字</span></section>'


class GradientBackgroundTests(unittest.TestCase):
    def test_background_styles(self):
        cases = [
            ("issue radial", fragment("background:radial-gradient(circle at 30% 0%,#FAFAFA,#FFFFFF)"), 1),
            ("linear", fragment("background:linear-gradient(180deg,transparent 60%,#E4E4E7 60%)"), 1),
            ("background-image", fragment("background-image:linear-gradient(red,blue)"), 1),
            ("conic", fragment("background:conic-gradient(red,blue)"), 1),
            ("repeating linear", fragment("background:repeating-linear-gradient(red,blue)"), 1),
            ("repeating radial", fragment("background:repeating-radial-gradient(red,blue)"), 1),
            ("vendor prefix", fragment("background:-webkit-linear-gradient(red,blue)"), 1),
            ("mixed case", fragment("color:red; BACKGROUND-IMAGE : LINEAR-GRADIENT(red,blue)"), 1),
            ("color fallback", fragment("background:#fff linear-gradient(red,blue)"), 1),
            ("layered image", fragment("background-image:url('photo.png'),linear-gradient(red,blue)"), 1),
            ("image-set", fragment("background-image:image-set(linear-gradient(red,blue) 1x)"), 1),
            ("decorative line", '<section style="height:1px;background:linear-gradient(red,blue)"><span leaf=""><br></span></section>', 1),
            ("solid", fragment("background:#FAFAFA"), 0),
            ("rgba", fragment("background:rgba(5,150,105,0.1)"), 0),
            ("background-color", fragment("background-color:#FAFAFA"), 0),
            ("unrelated property", fragment("border-image:linear-gradient(red,blue) 1"), 0),
            ("background-size", fragment("background-size:cover"), 0),
            ("CSS comment", fragment("background:#fff;/* background:linear-gradient(red,blue) */"), 0),
            ("quoted example", fragment("content:'background:linear-gradient(red,blue)';background:#fff"), 0),
            ("URL filename", fragment("background:url('linear-gradient(red,blue).png')"), 0),
            ("URL with parentheses", fragment("background:url('photo(size)/linear-gradient(red,blue).png')"), 0),
            ("URL with escaped parenthesis", fragment(r"background:url(photo\)linear-gradient\(red,blue\).png)"), 0),
            ("URL plus gradient", fragment("background:url('linear-gradient(red,blue).png'),radial-gradient(red,blue)"), 1),
            ("escaped code", '<section><span leaf="">&lt;section style=&quot;background:linear-gradient(red,blue)&quot;&gt;</span></section>', 0),
            ("HTML comment", '<!-- <section style="background:linear-gradient(red,blue)"> --><span leaf="">示例</span>', 0),
            ("head wrapper", '<head><meta style="background:linear-gradient(red,blue)"></head><span leaf="">正文</span>', 0),
            ("single quoted attribute", "<section style='background:linear-gradient(red,blue)'><span leaf=''>正文</span></section>", 1),
            ("empty style", '<section style><span leaf="">正文</span></section>', 0),
        ]
        for name, source, expected in cases:
            with self.subTest(name=name):
                errors, warnings, leaf_count = validate(source)
                self.assertEqual(errors, [])
                self.assertEqual(leaf_count, 1)
                self.assertEqual(sum(WARNING_ID in w for w in warnings), expected)

    def test_count_and_source_locations(self):
        source = fragment("background:linear-gradient(red,blue)")
        errors, warnings, leaf_count = validate(source + "\n" + source)
        self.assertEqual(errors, [])
        self.assertEqual(leaf_count, 2)
        self.assertEqual(len(warnings), 1)
        self.assertIn("2 处渐变背景", warnings[0])
        self.assertIn("第 1 行 1 列 <section>", warnings[0])
        self.assertIn("第 2 行 1 列 <section>", warnings[0])

    def test_cli_exit_codes(self):
        script = Path(__file__).with_name("validate_gzh_html.py")
        cases = [
            ("warning keeps exit 0", fragment("background:linear-gradient(red,blue)"), 0),
            ("error keeps exit 1", '<div style="background:linear-gradient(red,blue)"><span leaf="">正文</span></div>', 1),
        ]
        for name, source, expected in cases:
            with self.subTest(name=name):
                result = subprocess.run(
                    [sys.executable, str(script), "--stdin"], input=source,
                    text=True, encoding="utf-8", capture_output=True, check=False)
                self.assertEqual(result.returncode, expected, result.stdout)
                self.assertIn(WARNING_ID, result.stdout)


if __name__ == "__main__":
    unittest.main()
