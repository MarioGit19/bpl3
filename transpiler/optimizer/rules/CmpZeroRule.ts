import type { IOptimizationRule, OptimizationResult } from "../OptimizerRule";

export class CmpZeroRule implements IOptimizationRule {
  public priority = 55;

  public canApply(lines: string[], index: number): boolean {
    const line = lines[index]!;
    // Matches "cmp reg, 0"
    return /^\s*cmp\s+[a-z0-9]+,\s*0\s*(;.*)?$/.test(line);
  }

  public apply(lines: string[], index: number): OptimizationResult {
    const line = lines[index]!;
    const match = line.match(/^\s*cmp\s+([a-z0-9]+),\s*0\s*(;.*)?$/);
    if (match) {
      const reg = match[1];
      const comment = match[2] ? match[2] : "";
      return {
        newLines: [`    test ${reg}, ${reg} ; optimized cmp 0${comment}`],
        skipCount: 1,
      };
    }
    return { newLines: [line], skipCount: 1 };
  }
}
