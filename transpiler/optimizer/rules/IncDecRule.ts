import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";

export class IncDecRule implements IOptimizationRule {
  public priority = 60;

  public canApply(lines: string[], index: number): boolean {
    const line = lines[index];
    if (!line) return false;
    // Matches "add reg, 1" or "sub reg, 1"
    return /^\s*(add|sub)\s+[a-z0-9]+,\s*1\s*(;.*)?$/.test(line);
  }

  public apply(lines: string[], index: number): OptimizationResult {
    const line = lines[index]!;
    if (!line) return { newLines: [], skipCount: 1 };

    const match = line.match(/^\s*(add|sub)\s+([a-z0-9]+),\s*1\s*(;.*)?$/);
    if (match) {
      const op = match[1];
      const reg = match[2];
      const comment = match[3] ? match[3] : "";
      const newOp = op === "add" ? "inc" : "dec";
      return {
        newLines: [`    ${newOp} ${reg} ; optimized ${op} 1${comment}`],
        skipCount: 1,
      };
    }
    return { newLines: [line], skipCount: 1 };
  }
}
