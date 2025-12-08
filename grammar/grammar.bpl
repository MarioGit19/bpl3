// Literals
StringLiteral = '"' ( '\\' . | [^"\n\r] )* '"';
CharLiteral = "'" ( '\\' . | [^'\n\r] ) "'";
NumberLiteral = 
    '0x' [0-9a-fA-F]+ 
  | '0b' [0-1]+ 
  | '0o' [0-7]+ 
  | [0-9] ('_'? [0-9])* ('.' [0-9] ('_'? [0-9])*)?;
BoolLiteral = 'true' | 'false';
NullLiteral = 'null';
NullptrLiteral = 'nullptr';
Identifier = [a-zA-Z_] [a-zA-Z0-9_]*;

// Comments
SingleLineComment = '#' [^\n\r]* ('\n' | '\r\n')?;
MultiLineComment = '###' ( .* | '\n' )*? '###';

// Types
Type = '*'* Identifier GenericArgs? ArraySuffix*;
GenericArgs = '<' Type (',' Type)* '>';
ArraySuffix = '[' NumberLiteral? ']';
TupleType = '(' Type (',' Type)* ','? ')';

// Declarations
DestructTarget = Identifier (':' Type)?;
DestructTargetList = DestructTarget (',' DestructTarget)* ','?;
DestructuringDeclaration = ('global' | 'local') '(' DestructTargetList ')' '=' Expression ';';

VariableDeclaration = ('global' | 'local') Identifier ':' (Type | TupleType) ('=' Expression)? ';' | DestructuringDeclaration;

// Functions
FunctionDeclaration = ('frame' | 'static') Identifier GenericArgs? '(' ParameterList? ')' ReturnType? Block;
ParameterList = Parameter (',' Parameter)*;
Parameter = Identifier ':' Type;
ReturnType = 'ret' (Type | TupleType);

// Structs
StructDeclaration = 'struct' Identifier GenericArgs? '{' StructMember* '}';
StructMember = (Identifier ':' (Type | TupleType) ',') | FunctionDeclaration;

// Imports/Exports
ImportStatement = 'import' ImportList 'from' StringLiteral ';';
ImportList = ImportItem (',' ImportItem)*;
ImportItem = Identifier | ('[' Identifier ']');
ExportStatement = 'export' ImportItem ';';
ExternDeclaration = 'extern' Identifier '(' ExternParameterList? ')' ReturnType? ';';
ExternParameterList = (Parameter (',' Parameter)* (',' '...')?) | '...';

// Asm block (raw assembler content inside braces)
AsmBlock = 'asm' '{' ( .* | '\n' )*? '}';

// Statements
Statement = VariableDeclaration | FunctionDeclaration | StructDeclaration | ImportStatement | ExportStatement | ExternDeclaration | AsmBlock | LoopStatement | IfStatement | TryStatement | ReturnStatement | ThrowStatement | SwitchStatement | BreakStatement | ContinueStatement | ExpressionStatement;
Block = '{' (Statement | SingleLineComment | MultiLineComment)* '}';
ExpressionStatement = Expression ';';

// Control Flow
LoopStatement = 'loop' Expression? Block;
IfStatement = 'if' Expression Block ElseClause?;
ElseClause = 'else' (IfStatement | Block);
BreakStatement = 'break' ';';
ContinueStatement = 'continue' ';';
TryStatement = 'try' Block CatchClause* CatchOtherClause?;
CatchClause = 'catch' '(' Identifier ':' Type ')' Block;
CatchOtherClause = 'catchOther' Block;
ReturnStatement = 'return' Expression? ';';
ThrowStatement = 'throw' Expression ';';
SwitchStatement = 'switch' Expression '{' SwitchCase* DefaultCase? '}';
SwitchCase = 'case' Expression ':' Block;
DefaultCase = 'default' ':' Block;

// Expressions
Expression = Assignment | Literal | Identifier | ArrayLiteral | StructLiteral | CastExpression | SizeofExpression;

Assignment = Ternary (('=' | '+=' | '-=' | '*=' | '/=' | '%=' | '&=' | '|=' | '^=') Ternary)*;
Ternary = LogicalOr ('?' Ternary ':' Ternary)?;
LogicalOr = LogicalAnd ('||' LogicalAnd)*;
LogicalAnd = BitwiseOr ('&&' BitwiseOr)*;
BitwiseOr = BitwiseXor ('|' BitwiseXor)*;
BitwiseXor = BitwiseAnd ('^' BitwiseAnd)*;
BitwiseAnd = Equality ('&' Equality)*;
Equality = Relational (('==' | '!=') Relational)*;
Relational = Shift (('<' | '<=' | '>' | '>=') Shift)*;
Shift = Additive (('<<' | '>>') Additive)*;
Additive = Multiplicative (('+' | '-') Multiplicative)*;
Multiplicative = Unary (('*' | '/' | '%') Unary)*;
Unary = ('!' | '-' | '~' | '*' | '&' | '++' | '--') Unary | Postfix;
Postfix = Primary ( '[' Expression ']' | '.' Identifier | GenericFunctionCall | '(' (Expression (',' Expression)*)? ')' )*;
GenericFunctionCall = GenericArgs '(' (Expression (',' Expression)*)? ')';
TupleLiteral = '(' Expression (',' Expression)+ ','? ')';

Primary = Literal | TupleLiteral | Identifier | ArrayLiteral | StructLiteral | CastExpression | SizeofExpression | '(' Expression ')';

Literal = StringLiteral | CharLiteral | NumberLiteral | BoolLiteral | NullLiteral | NullptrLiteral;
ArrayLiteral = '[' (Expression (',' Expression)* ','?)? ']';
StructLiteral = '{' (Identifier ':' Expression (',' Identifier ':' Expression)* ','?)? '}';
CastExpression = 'cast' '<' Type '>' '(' Expression ')';
SizeofExpression = 'sizeof' ( '(' Expression ')' | '<' Type '>' '(' ')' );

// Program entry
Program = (Statement | SingleLineComment | MultiLineComment)* EOF;
EOF = '<EOF>';


