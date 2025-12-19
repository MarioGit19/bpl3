# Comprehensive example showcasing enum struct variants
# Demonstrates: struct variant construction, pattern matching, and exhaustiveness

enum Shape {
    Circle { radius: float },
    Rectangle { width: float, height: float },
    Triangle { base: float, height: float },
    Point,
}

# Calculate approximate area (simplified for integer return)
frame calculate_area(s: Shape) ret int {
    local three: float = 3.0;
    return match (s) {
        Shape.Circle { radius: r } => cast<int>(r * three),
        Shape.Rectangle { width: w, height: h } => cast<int>(w * h),
        Shape.Triangle { base: b, height: h } => cast<int>((b * h) / 2.0),
        Shape.Point => 0,
    };
    # PI * r^2 simplified
    # w * h simplified
    # (b * h) / 2 simplified
}

# Get shape name
frame get_shape_name(s: Shape) ret int {
    return match (s) {
        Shape.Circle { radius: r } => 1,
        Shape.Rectangle { width: w, height: h } => 2,
        Shape.Triangle { base: b, height: h } => 3,
        Shape.Point => 4,
    };
}

# Test if shape has dimensions
frame has_dimensions(s: Shape) ret int {
    return match (s) {
        Shape.Circle { radius: r } => 1,
        Shape.Rectangle { width: w, height: h } => 1,
        Shape.Triangle { base: b, height: h } => 1,
        Shape.Point => 0,
    };
}

frame main() ret int {
    # Create different shape variants
    local circle: Shape = Shape.Circle { radius: 5.0 };
    local rect: Shape = Shape.Rectangle { width: 10.0, height: 2.0 };
    local triangle: Shape = Shape.Triangle { base: 6.0, height: 4.0 };
    local point: Shape = Shape.Point;

    # Calculate areas
    local area1: int = calculate_area(circle);
    local area2: int = calculate_area(rect);
    local area3: int = calculate_area(triangle);
    local area4: int = calculate_area(point);

    # Get shape names
    local name1: int = get_shape_name(circle);
    local name2: int = get_shape_name(rect);
    local name3: int = get_shape_name(triangle);
    local name4: int = get_shape_name(point);

    # Check dimensions
    local has_dim1: int = has_dimensions(circle);
    local has_dim2: int = has_dimensions(point);

    # Total: areas (15+20+12+0=47) + names (1+2+3+4=10) + dims (1+0=1) = 58
    return area1 + area2 + area3 + area4 + name1 + name2 + name3 + name4 + has_dim1 + has_dim2;
}
