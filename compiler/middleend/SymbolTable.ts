import * as AST from "../common/AST";

export type SymbolKind =
  | "Variable"
  | "Function"
  | "Struct"
  | "TypeAlias"
  | "Parameter";

export interface Symbol {
  name: string;
  kind: SymbolKind;
  type?: AST.TypeNode; // The type of the symbol (e.g., variable type, function return type)
  declaration: AST.ASTNode; // The AST node where it was declared
}

export class SymbolTable {
  private symbols: Map<string, Symbol> = new Map();
  private parent?: SymbolTable;

  constructor(parent?: SymbolTable) {
    this.parent = parent;
  }

  public define(symbol: Symbol): void {
    this.symbols.set(symbol.name, symbol);
  }

  public resolve(name: string): Symbol | undefined {
    const symbol = this.symbols.get(name);
    if (symbol) return symbol;
    if (this.parent) return this.parent.resolve(name);
    return undefined;
  }

  public enterScope(): SymbolTable {
    return new SymbolTable(this);
  }

  public exitScope(): SymbolTable {
    return this.parent || this;
  }

  public getParent(): SymbolTable | undefined {
    return this.parent;
  }
}
