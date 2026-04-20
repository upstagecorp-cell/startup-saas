import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const scanDirs = ["app", "components", "lib", "types", "supabase"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".sql", ".md"]);
const ignoredParts = new Set(["node_modules", ".next", ".git", ".codex-pdf-text"]);
const suspiciousPatterns = [
  { name: "replacement character", pattern: /�/ },
  {
    name: "common Korean mojibake",
    pattern: /(?:吏꾨떒|濡쒓렇|뚯썝媛|鍮꾨|踰덊샇|섍꼍蹂|뺤씤|二쇱꽭|遺덈윭|몄뀡|앹꽦|듬땲|쒗뵆|紐삵|湲곗|댁젣|寃곌낵|≪뀡|쒖옉|泥섎━)/
  },
  { name: "UTF-8 bytes decoded as Latin-1", pattern: /(?:Ã|Â|ì|ë|í|ê|ð|ï¿½)/ }
];

function extensionOf(filePath) {
  const dotIndex = filePath.lastIndexOf(".");
  return dotIndex === -1 ? "" : filePath.slice(dotIndex);
}

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    if (ignoredParts.has(entry)) {
      continue;
    }

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (allowedExtensions.has(extensionOf(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

const findings = [];

for (const dir of scanDirs) {
  const fullDir = join(root, dir);

  try {
    for (const file of walk(fullDir)) {
      const relativePath = relative(root, file);

      if (relativePath === "scripts\\check-mojibake.mjs" || relativePath === "scripts/check-mojibake.mjs") {
        continue;
      }

      const lines = readFileSync(file, "utf8").split(/\r?\n/);

      lines.forEach((line, index) => {
        for (const { name, pattern } of suspiciousPatterns) {
          if (pattern.test(line)) {
            findings.push({
              file: relativePath,
              line: index + 1,
              name,
              text: line.trim().slice(0, 180)
            });
          }
        }
      });
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

if (findings.length) {
  console.error("Mojibake-like text was found:");

  for (const finding of findings) {
    console.error(`${finding.file}:${finding.line} [${finding.name}] ${finding.text}`);
  }

  process.exit(1);
}

console.log("No mojibake-like text found in scanned source files.");
