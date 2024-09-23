import csv
import json
import argparse
from pathlib import Path

def process_csv(input_file, output_file):
    processed_data = []
    with open(input_file, 'r', newline='', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        for row in reader:
            processed_data.append({
                'Full URL': row['Full URL'],
                'Depth': int(row['Depth']),
                'Is Indexable': row['Is Indexable'].lower() == 'true',
                'pagetype': row['pagetype'],
                'URL Path': row['URL Path']
            })

    with open(output_file, 'w', encoding='utf-8') as jsonfile:
        json.dump(processed_data, jsonfile, indent=2)

    print(f"Processed {input_file} and saved as {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Process CSV file to JSON")
    parser.add_argument("input", help="Input CSV file path")
    parser.add_argument("output", help="Output JSON file path")
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Error: Input file {input_path} does not exist.")
        exit(1)

    process_csv(input_path, output_path)