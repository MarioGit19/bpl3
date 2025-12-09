export enum TokenType {
    // Literals
    Identifier,
    StringLiteral,
    CharLiteral,
    NumberLiteral,
    
    // Keywords
    Global,
    Local,
    Const,
    Type,
    Frame,
    Static,
    Ret,
    Struct,
    Import,
    From,
    Export,
    Extern,
    Asm,
    Loop,
    If,
    Else,
    Break,
    Continue,
    Try,
    Catch,
    CatchOther,
    Return,
    Throw,
    Switch,
    Case,
    Default,
    Cast,
    Sizeof,
    Match,
    Func,
    Null,
    Nullptr,
    True,
    False,

    // Symbols
    LeftBrace, // {
    RightBrace, // }
    LeftParen, // (
    RightParen, // )
    LeftBracket, // [
    RightBracket, // ]
    Comma, // ,
    Colon, // :
    Semicolon, // ;
    Dot, // .
    Ellipsis, // ...
    Question, // ?

    // Operators
    Equal, // =
    PlusEqual, // +=
    MinusEqual, // -=
    StarEqual, // *=
    SlashEqual, // /=
    PercentEqual, // %=
    AmpersandEqual, // &=
    PipeEqual, // |=
    CaretEqual, // ^=
    
    OrOr, // ||
    AndAnd, // &&
    Pipe, // |
    Caret, // ^
    Ampersand, // &
    
    EqualEqual, // ==
    BangEqual, // !=
    Less, // <
    LessEqual, // <=
    Greater, // >
    GreaterEqual, // >=
    
    LessLess, // <<
    GreaterGreater, // >>
    
    Plus, // +
    Minus, // -
    Star, // *
    Slash, // /
    Percent, // %
    
    Bang, // !
    Tilde, // ~
    PlusPlus, // ++
    MinusMinus, // --

    // Special
    EOF,
    Unknown
}
