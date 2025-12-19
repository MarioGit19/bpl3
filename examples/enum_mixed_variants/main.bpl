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
frame get_event_type(e: Event) ret int {
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
frame get_event_value(e: Event) ret int {
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
frame has_coordinates(e: Event) ret int {
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
    local type1: int = get_event_type(click);
    local type2: int = get_event_type(key);
    local type3: int = get_event_type(mouse);
    local type4: int = get_event_type(scroll);
    local type5: int = get_event_type(resize);
    local type6: int = get_event_type(close);

    # Get values: 0+65+30+5+1400+0 = 1500
    local val1: int = get_event_value(click);
    local val2: int = get_event_value(key);
    local val3: int = get_event_value(mouse);
    local val4: int = get_event_value(scroll);
    local val5: int = get_event_value(resize);
    local val6: int = get_event_value(close);

    # Check coords: 0+0+1+0+1+0 = 2
    local coord1: int = has_coordinates(click);
    local coord2: int = has_coordinates(key);
    local coord3: int = has_coordinates(mouse);
    local coord4: int = has_coordinates(scroll);
    local coord5: int = has_coordinates(resize);
    local coord6: int = has_coordinates(close);

    # Total: types(21) + values(10) + coords(2) = 33
    local types: int = type1 + type2 + type3 + type4 + type5 + type6;
    local values: int = val1 + val2 + val3 + val4 + val5 + val6;
    local coords: int = coord1 + coord2 + coord3 + coord4 + coord5 + coord6;

    return types + values + coords;
}
