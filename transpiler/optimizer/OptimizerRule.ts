export interface OptimizationResult {
  newLines: string[];
  skipCount: number;
}

export interface IOptimizationRule {
  priority: number;
  canApply(lines: string[], index: number): boolean;
  apply(lines: string[], index: number): OptimizationResult;
}
