import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('issue_hunter_report.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=== ALL 30 TODO / FIXME OCCURRENCES ===")
for idx, item in enumerate(data['results']['TODO_FIXME'], 1):
    print(f"{idx}. [{item['file']}:{item['line']}]")
    print(f"    Text: {item['line_text']}")
