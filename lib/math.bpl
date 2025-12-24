# Math helpers

export [Math];

extern printf(fmt: string, ...) ret int;

/#
# Math Utilities
Provides common mathematical functions for integers and floating-point numbers.
#/
struct Math {
    /#
    # Absolute Value (Int)
    Returns the absolute value of an integer.
    
    ## Arguments
    - `x`: The input integer
    #/
    frame absInt(x: int) ret int {
        if (x < 0) {
            return -x;
        }
        return x;
    }

    /#
    # Absolute Value (Float)
    Returns the absolute value of a float.
    
    ## Arguments
    - `x`: The input float
    #/
    frame absFloat(x: float) ret float {
        if (x < 0.0) {
            return -x;
        }
        return x;
    }

    /#
    # Minimum (Int)
    Returns the smaller of two integers.
    #/
    frame minInt(a: int, b: int) ret int {
        if (a < b) {
            return a;
        }
        return b;
    }

    /#
    # Maximum (Int)
    Returns the larger of two integers.
    #/
    frame maxInt(a: int, b: int) ret int {
        if (a > b) {
            return a;
        }
        return b;
    }

    /#
    # Minimum (Float)
    Returns the smaller of two floats.
    #/
    frame minFloat(a: float, b: float) ret float {
        if (a < b) {
            return a;
        }
        return b;
    }

    /#
    # Maximum (Float)
    Returns the larger of two floats.
    #/
    frame maxFloat(a: float, b: float) ret float {
        if (a > b) {
            return a;
        }
        return b;
    }

    /#
    # Square Root
    Calculates the square root of a float.
    
    ## Throws
    Throws `-1` if input is negative.
    #/
    frame sqrtFloat(x: float) ret float {
        if (x < 0.0) {
            # sqrt of negative
            throw -1;
        }
        if (x == 0.0) {
            return 0.0;
        }
        local guess: float = x / 2.0;
        local i: int = 0;
        loop (i < 20) {
            guess = 0.5 * (guess + (x / guess));
            i = i + 1;
        }
        return guess;
    }
}
