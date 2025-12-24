/**
 * SourceManager - Manages source code content for error reporting
 * Useful for virtual files like stdin or eval
 */

export class SourceManager {
  private static sources: Map<string, string> = new Map();

  static setSource(path: string, content: string): void {
    this.sources.set(path, content);
  }

  static getSource(path: string): string | undefined {
    return this.sources.get(path);
  }

  static clear(): void {
    this.sources.clear();
  }
}
