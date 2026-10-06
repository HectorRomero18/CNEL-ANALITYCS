import argparse
import json
from pathlib import Path
from typing import Any

from sqlalchemy import inspect

from app.db.session import engine_cloud


def inspect_external_schema() -> dict[str, list[dict[str, Any]]]:
    """Return table and column metadata without reading table data."""
    with engine_cloud.connect() as connection:
        inspector = inspect(connection)
        schema: dict[str, list[dict[str, Any]]] = {}

        for table_name in inspector.get_table_names():
            columns = inspector.get_columns(table_name)
            schema[table_name] = [
                {
                    "name": column["name"],
                    "type": str(column["type"]),
                    "nullable": column["nullable"],
                }
                for column in columns
            ]

    return schema


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Inspect table and column metadata in the external CNEL database."
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Write the JSON catalog to this file instead of standard output.",
    )
    args = parser.parse_args()
    catalog = json.dumps(inspect_external_schema(), ensure_ascii=False, indent=2)

    if args.output:
        args.output.write_text(catalog + "\n", encoding="utf-8")
        print(f"Schema catalog written to {args.output}")
    else:
        print(catalog)


if __name__ == "__main__":
    main()
