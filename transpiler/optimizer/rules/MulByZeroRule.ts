import { IOptimizationRule, OptimizationResult } from "../OptimizerRule";

export class MulByZeroRule implements IOptimizationRule {
  public priority = 60;

  public canApply(lines: string[], index: number): boolean {
    const line = lines[index];
    // Matches "imul reg, 0"
    return /^\s*imul\s+[a-z0-9]+,\s*0\s*(;.*)?$/.test(line);
  }

  public apply(lines: string[], index: number): OptimizationResult {
    const line = lines[index];
    const match = line.match(/^\s*imul\s+([a-z0-9]+),\s*0\s*(;.*)?$/);
    if (match) {
      const reg = match[1];
      const comment = match[2] ? match[2] : "";
      return {
        newLines: [`    xor ${reg}, ${reg} ; optimized imul 0${comment}`],
        skipCount: 1,
      };
    }
    return { newLines: [line], skipCount: 1 };
  }
}
