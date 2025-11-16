enum ExpressionType {
  NumberLiteralExpr = "NumberLiteralExpr",
  StringLiteralExpr = "StringLiteralExpr",
  NullLiteralExpr = "NullLiteralExpr",

  IdentifierExpr = "IdentifierExpr",
  BlockExpression = "BlockExpression",

  VariableDeclaration = "VariableDeclaration",
  VariableAssignment = "VariableAssignment",

  BinaryExpression = "BinaryExpression",
  UnaryExpression = "UnaryExpression",

  StructureDeclaration = "StructureDeclaration",

  IfExpression = "IfExpression",
  TernaryExpression = "TernaryExpression",

  LoopExpression = "LoopExpression",
  BreakExpression = "BreakExpression",
  ContinueExpression = "ContinueExpression",

  FunctionDeclaration = "FunctionDeclaration",
  FunctionCall = "FunctionCall",
  ReturnExpression = "ReturnExpression",

  AsmBlockExpression = "AsmBlockExpression",

  Program = "Program",
  EOF = "EOF",
}

export default ExpressionType;
