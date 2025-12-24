# Comprehensive example showcasing enum struct variants
# Demonstrates: struct variant construction, pattern matching, and exhaustiveness

enum Shape {
    Circle { radius: float },
    Rectangle { width: float, height: float },
    Triangle { base: float, height: float },
    Point,
}

# Calculate approximate area (simplified for integer return)
frame calculateArea(s: Shape) ret int {
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
frame getShapeName(s: Shape) ret int {
    return match (s) {
        Shape.Circle { radius: r } => 1,
        Shape.Rectangle { width: w, height: h } => 2,
        Shape.Triangle { base: b, height: h } => 3,
        Shape.Point => 4,
    };
}

# Test if shape has dimensions
frame hasDimensions(s: Shape) ret int {
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
    local area1: int = calculateArea(circle);
    local area2: int = calculateArea(rect);
    local area3: int = calculateArea(triangle);
    local area4: int = calculateArea(point);

    # Get shape names
    local name1: int = getShapeName(circle);
    local name2: int = getShapeName(rect);
    local name3: int = getShapeName(triangle);
    local name4: int = getShapeName(point);

    # Check dimensions
    local has_dim1: int = hasDimensions(circle);
    local has_dim2: int = hasDimensions(point);

    # Total: areas (15+20+12+0=47) + names (1+2+3+4=10) + dims (1+0=1) = 58
    return area1 + area2 + area3 + area4 + name1 + name2 + name3 + name4 + has_dim1 + has_dim2;
}
