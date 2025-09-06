#!/usr/bin/env python3
import json, sys, os, re

if len(sys.argv) < 3:
    print("Usage: explode_json.py input.json output_dir [--field fieldname]")
    sys.exit(1)

input_file = sys.argv[1]
output_dir = sys.argv[2]
field = "knowledge_piece_name"

if len(sys.argv) >= 5 and sys.argv[3] == "--field":
    field = sys.argv[4]

os.makedirs(output_dir, exist_ok=True)

with open(input_file, "r", encoding="utf-8") as f:
    data = json.load(f)

if not isinstance(data, list):
    print("Input JSON must be an array of objects.")
    sys.exit(1)

for obj in data:
    if field not in obj:
        print(f"Skipping object without field {field}")
        continue
    name = str(obj[field])
    # sanitize filename
    safe_name = re.sub(r'[\\/:"*?<>|]+', "_", name)
    out_path = os.path.join(output_dir, safe_name + ".json")
    with open(out_path, "w", encoding="utf-8") as out:
        json.dump(obj, out, indent=2, ensure_ascii=False)

print(f"Exploded {len(data)} objects into {output_dir}/")
