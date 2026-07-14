$pythonCode = @"
import sys
sys.stdout.reconfigure(encoding="utf-8")
with open("src/lib/llm/promptBuilder.ts", "r", encoding="utf-8") as f:
    lines = f.readlines()

# Lines 62-73 (indices 61-72) are corrupted, replace them
new_block = '''    "3. **\\u26a0\\ufe0f \\u6bb5\\u843d\\u5206\\u9694\\u94c1\\u5f8b\\uff08\\u4e25\\u683c\\u7981\\u6b62\\u5408\\u5e76\\u6bb5\\u843d\\uff09**\\\\n" +
    "   - Markdown \\u4e2d\\u6bcf\\u4e2a\\u7528\\u7a7a\\u884c\\u5206\\u9694\\u7684\\u6bb5\\u843d\\uff0c\\u5fc5\\u987b\\u6e32\\u67d3\\u4e3a\\u72ec\\u7acb\\u7684 <p> \\u6807\\u7b7e\\uff0c\\u7981\\u6b62\\u5c06\\u76f8\\u90bb\\u4e24\\u4e2a\\u6bb5\\u843d\\u5408\\u5e76\\u5230\\u540c\\u4e00\\u4e2a <p> \\u4e2d\\\\n" +
    "   - \\u6b63\\u786e\\u793a\\u4f8b\\uff1a\\\\n" +
    '     <p><span leaf="">\\u7b2c\\u4e00\\u6bb5\\u6587\\u5b57\\u3002</span></p>\\\\n" +
    '     <p><span leaf="">\\u7b2c\\u4e8c\\u6bb5\\u6587\\u5b57\\u3002</span></p>\\\\n" +
    "   - \\u9519\\u8bef\\u793a\\u4f8b\\uff08\\u7981\\u6b62\\uff09\\uff1a\\\\n" +
    '     <p><span leaf="">\\u7b2c\\u4e00\\u6bb5\\u6587\\u5b57\\u3002\\u7b2c\\u4e8c\\u6bb5\\u6587\\u5b57\\u3002</span></p>\\\\n" +
    "   - \\u6bb5\\u843d\\u4e0e\\u6bb5\\u843d\\u4e4b\\u95f4\\u5fc5\\u987b\\u4fdd\\u7559\\u6bb5\\u843d\\u95f4\\u8ddd\\uff0c\\u4e0d\\u80fd\\u901a\\u8fc7 <br> \\u6216\\u79fb\\u9664\\u95f4\\u8ddd\\u6765\\u62fc\\u63a5\\u6bb5\\u843d\\\\n" +
    "   - \\u540c\\u4e00\\u6bb5\\u843d\\u5185\\u7684\\u6362\\u884c\\u7528 <br> \\u5904\\u7406\\uff0c\\u4e0d\\u8981\\u56e0\\u6b64\\u88c2\\u4e3a\\u4e24\\u4e2a <p>\\\\n" +
    "\\\\n" +
    "4. \\u5c01\\u9762\\u4f7f\\u7528\\u4e3b\\u9898\\u5c01\\u9762\\u7ec4\\u4ef6\\uff1b**\\u76ee\\u5f55\\u5fc5\\u987b\\u5b8c\\u6574\\u590d\\u5236\\u4e3b\\u9898\\u5e93\\u4e2d\\u7684\\u76ee\\u5f55/\\u5bfc\\u8bfb\\u7ec4\\u4ef6 HTML\\uff08\\u542b\\u6a2a\\u5411\\u6eda\\u52a8\\u3001\\u5361\\u7247\\u3001emoji \\u7b49\\u5168\\u90e8\\u6837\\u5f0f\\uff09\\uff0c\\u4e25\\u7981\\u81ea\\u521b\\u7eb5\\u5411\\u7eaf\\u6587\\u5b57\\u5217\\u8868**\\uff1b\\u7ae0\\u8282\\u6807\\u9898\\u4f7f\\u7528 chapter-title\\uff1b\\u6b63\\u6587\\u4f7f\\u7528 paragraph\\\\n" +
    "5. \\u76ee\\u5f55\\u7cbe\\u9009 3 \\u4e2a\\u6838\\u5fc3\\u770b\\u70b9\\uff08\\u6311\\u6700\\u91cd\\u8981\\u7684\\u7ae0\\u8282\\uff09\\uff0c\\u4e0d\\u662f\\u5168\\u91cf\\u5217\\u51fa\\\\n" +
    "6. \\u6b63\\u6587\\u6bb5\\u843d\\u6807 1-3 \\u5904\\u4e0b\\u5212\\u7ebf\\uff0c\\u7f16\\u53f7 01/02/03\\u2026\\uff0c\\u672b\\u7ae0 \\u221e\\uff0c\\u82f1\\u6587\\u6807\\u7b7e\\uff0c\\u5168\\u89d2\\u6807\\u70b9" +
'''

lines[61:74] = [new_block]

with open("src/lib/llm/promptBuilder.ts", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed!")
with open("src/lib/llm/promptBuilder.ts", "r", encoding="utf-8") as f:
    content = f.read()
print("Has ?:", "?" in content)
"@

$pythonCode | Out-File -FilePath "fix_script.py" -Encoding UTF8
python fix_script.py
Remove-Item fix_script.py
