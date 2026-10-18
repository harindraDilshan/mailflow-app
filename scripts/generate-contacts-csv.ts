import { writeFile } from "node:fs/promises";

const MAX_IMPORT_ROWS = 5000;

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

async function main() {
  const [countArg, outputPath = "contacts.csv"] = process.argv.slice(2);
  const count = Number(countArg ?? 1000);

  if (!Number.isInteger(count) || count < 1 || count > MAX_IMPORT_ROWS) {
    console.error(`Count must be an integer from 1 to ${MAX_IMPORT_ROWS}.`);
    console.error("Usage: npm run generate-csv -- [count] [output.csv]");
    process.exit(1);
  }

  const lines = ["email,name,tags"];
  for (let i = 1; i <= count; i++) {
    const row = [
      `user${String(i).padStart(5, "0")}@example.test`,
      `User ${i}`,
      i % 3 === 0 ? "loadtest, newsletter" : "loadtest",
    ];
    lines.push(row.map(csvCell).join(","));
  }

  await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
  console.log(`Created ${count} contacts in ${outputPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});