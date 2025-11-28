import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";

export class DeadCodeRule implements IOptimizationRule {
  priority = 100;

  canApply(lines: string[], index: number): boolean {
    const line = lines[index]!.trim();
    // Check for unconditional jump or return
    if (line.startsWith("jmp ") || line === "ret") {
      // Check if next line exists
      if (index + 1 < lines.length) {
        const nextLine = lines[index + 1]!.trim();
        // If next line is not a label (doesn't end with :) and not a section directive
        // Also ignore empty lines or comments if they are separate lines (but lines array usually has code)
        if (
          nextLine &&
          !nextLine.endsWith(":") &&
          !nextLine.startsWith("section ") &&
          !nextLine.startsWith("global ") &&
          !nextLine.startsWith("extern ")
        ) {
          return true;
        }
      }
    }
    return false;
  }

  apply(lines: string[], index: number): OptimizationResult {
    return {
      newLines: [lines[index]!],
      skipCount: 2,
    };
  }
}
