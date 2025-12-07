import { existsSync } from "fs";
import Lexer from "../lexer/lexer";
import TokenType from "../lexer/tokenType";
import { Formatter } from "../transpiler/formatter/Formatter";
import { readFile, saveToFile } from "./file";
import { parseFile } from "./parser";
import { Logger } from "./Logger";

export function formatFiles(
  files: string[],
  write: boolean,
  ignoreUnknown: boolean,
) {
  if (files.length === 0) {
    Logger.error("No input files provided.");
    process.exit(1);
  }

  let changedCount = 0;

  for (const file of files) {
    if (ignoreUnknown && !file.endsWith(".x")) {
      continue;
    }

    if (!existsSync(file)) {
      Logger.error(`File not found: ${file}`);
      continue;
    }

    try {
      const originalContent = readFile(file);

      // Get comments
      const lexer = new Lexer(originalContent);
      const tokens = lexer.tokenize(true);
      const comments = tokens.filter((t) => t.type === TokenType.COMMENT);

      // Parse the file
      const program = parseFile(file);

      // Format the AST
      const formatter = new Formatter("    ", comments, originalContent);
      const formattedContent = formatter.format(program);

      // Check if content changed
      // We trim both to avoid issues with trailing newlines if any
      if (originalContent === formattedContent) {
        if (write) {
          Logger.log(`\x1b[90m${file} - unchanged\x1b[0m`);
        } else {
          // If not writing, we just output the formatted content
          Logger.log(formattedContent);
        }
      } else {
        changedCount++;
        if (write) {
          saveToFile(file, formattedContent);
          Logger.log(`${file} - changed`);
        } else {
          Logger.log(formattedContent);
        }
      }
    } catch (e: any) {
      Logger.error(`Error formatting ${file}: ${e.message}`);
    }
  }

  if (write && changedCount) {
    Logger.log(`Formatting complete. ${changedCount} file(s) were modified.`);
  } else if (write) {
    Logger.log("Formatting complete. No changes made.");
  }
}
