# Enum definitions to be exported

enum Color {
    Red,
    Green,
    Blue,
}

enum Status {
    Ready,
    Busy,
    Error,
}

enum Message {
    Quit,
    Move(int, int),
    Write(string),
}

export [Color];
export [Status];
export [Message];
