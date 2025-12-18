# Range - Represents a range of integers with start, end, and step

export [Range];

struct Range {
    start: int,
    end: int,
    step: int,
    ###
        Creates a new range from start (inclusive) to end (exclusive) with step
    ###
    frame new(start: int, end: int, step: int) ret Range {
        local r: Range;
        r.start = start;
        r.end = end;
        r.step = step;
        return r;
    }

    ###
        Creates a range from 0 to end (exclusive) with step 1
    ###
    frame until(end: int) ret Range {
        return Range.new(0, end, 1);
    }

    ###
        Creates a range from start to end (exclusive) with step 1
    ###
    frame between(start: int, end: int) ret Range {
        return Range.new(start, end, 1);
    }

    ###
        Creates a range from start to end (inclusive) with step 1
    ###
    frame betweenInclusive(start: int, end: int) ret Range {
        return Range.new(start, end + 1, 1);
    }

    ###
        Returns the number of elements in the range
    ###
    frame len(this: *Range) ret int {
        if (this.step == 0) {
            return 0;
        }
        if (this.step > 0) {
            if (this.start >= this.end) {
                return 0;
            }
            return (((this.end - this.start) + this.step) - 1) / this.step;
        } else {
            if (this.start <= this.end) {
                return 0;
            }
            return (this.start - this.end - this.step - 1) / -this.step;
        }
    }

    ###
        Checks if a value is contained in the range
    ###
    frame contains(this: *Range, value: int) ret bool {
        if (this.step > 0) {
            if ((value < this.start) || (value >= this.end)) {
                return false;
            }
            local offset: int = value - this.start;
            return (offset % this.step) == 0;
        } else if (this.step < 0) {
            if ((value > this.start) || (value <= this.end)) {
                return false;
            }
            local offset: int = this.start - value;
            return (offset % -this.step) == 0;
        }
        return false;
    }

    ###
        Returns the element at the given index (0-based)
    ###
    frame get(this: *Range, index: int) ret int {
        return this.start + (index * this.step);
    }

    ###
        Creates a reversed range
    ###
    frame reverse(this: *Range) ret Range {
        # Calculate the last element that would be included
        local len: int = this.len();
        if (len == 0) {
            return *this;
        }
        local last: int = this.start + ((len - 1) * this.step);
        return Range.new(last, this.start - this.step, -this.step);
    }

    # Operator overloading: Index access with []
    frame __get__(this: *Range, index: int) ret int {
        return this.get(index);
    }

    # Operator overloading: Equality comparison
    frame __eq__(this: *Range, other: Range) ret bool {
        return (this.start == other.start) && (this.end == other.end) && (this.step == other.step);
    }

    # Operator overloading: Inequality comparison
    frame __ne__(this: *Range, other: Range) ret bool {
        return !this.__eq__(other);
    }
}
