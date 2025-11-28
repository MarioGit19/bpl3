export class CompilerError extends Error {
  constructor(
    public message: string,
    public line: number,
    public hint?: string,
  ) {
    super(message);
    this.name = "CompilerError";
  }
}

export class ErrorReporter {
  static report(error: any) {
    if (error instanceof CompilerError) {
      console.error(`\x1b[31mError:\x1b[0m ${error.message} @ line ${error.line}`);
      if (error.hint) {
        console.error(`\x1b[36mHint:\x1b[0m ${error.hint}`);
      }
    } else {
      console.error(`\x1b[31mUnexpected Error:\x1b[0m ${error.message}`);
      console.error(error.stack);
    }
    process.exit(1);
  }
}
