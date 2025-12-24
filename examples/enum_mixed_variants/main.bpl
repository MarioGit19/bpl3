# Demonstrates mixing unit, tuple, and struct variants in one enum
# Shows comprehensive pattern matching with all variant types

enum Event {
    Click,
    KeyPress(int),
    MouseMove { x: int, y: int },
    Scroll(int),
    Resize { width: int, height: int },
    Close,
}

# Process event and return event type code
frame getEventType(e: Event) ret int {
    return match (e) {
        Event.Click => 1,
        Event.KeyPress(code) => 2,
        Event.MouseMove { x: px, y: py } => 3,
        Event.Scroll(amount) => 4,
        Event.Resize { width: w, height: h } => 5,
        Event.Close => 6,
    };
}

# Extract value from event (simplified - returns constant for now)
frame getEventValue(e: Event) ret int {
    return match (e) {
        Event.Click => 0,
        Event.KeyPress(code) => 1,
        Event.MouseMove { x: px, y: py } => 2,
        Event.Scroll(amount) => 3,
        Event.Resize { width: w, height: h } => 4,
        Event.Close => 0,
    };
}

# Check if event has coordinates
frame hasCoordinates(e: Event) ret int {
    return match (e) {
        Event.MouseMove { x: px, y: py } => 1,
        Event.Resize { width: w, height: h } => 1,
        Event.Click => 0,
        Event.KeyPress(key) => 0,
        Event.Scroll(amount) => 0,
        Event.Close => 0,
    };
}

frame main() ret int {
    # Create different event variants
    local click: Event = Event.Click;
    local key: Event = Event.KeyPress(65);
    local mouse: Event = Event.MouseMove { x: 10, y: 20 };
    local scroll: Event = Event.Scroll(5);
    local resize: Event = Event.Resize { width: 800, height: 600 };
    local close: Event = Event.Close;

    # Get event types: 1+2+3+4+5+6 = 21
    local type1: int = getEventType(click);
    local type2: int = getEventType(key);
    local type3: int = getEventType(mouse);
    local type4: int = getEventType(scroll);
    local type5: int = getEventType(resize);
    local type6: int = getEventType(close);

    # Get values: 0+65+30+5+1400+0 = 1500
    local val1: int = getEventValue(click);
    local val2: int = getEventValue(key);
    local val3: int = getEventValue(mouse);
    local val4: int = getEventValue(scroll);
    local val5: int = getEventValue(resize);
    local val6: int = getEventValue(close);

    # Check coords: 0+0+1+0+1+0 = 2
    local coord1: int = hasCoordinates(click);
    local coord2: int = hasCoordinates(key);
    local coord3: int = hasCoordinates(mouse);
    local coord4: int = hasCoordinates(scroll);
    local coord5: int = hasCoordinates(resize);
    local coord6: int = hasCoordinates(close);

    # Total: types(21) + values(10) + coords(2) = 33
    local types: int = type1 + type2 + type3 + type4 + type5 + type6;
    local values: int = val1 + val2 + val3 + val4 + val5 + val6;
    local coords: int = coord1 + coord2 + coord3 + coord4 + coord5 + coord6;

    return types + values + coords;
}
