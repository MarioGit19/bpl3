frame get_rnd_u64(min: u64, max: u64) ret u64 {
    local rnd : u64 = 0;
    asm {
        rdrand rax;
        mov (rnd), rax;
    }
    # Ensure positive range if interpreted as signed, though u64 should be fine.
    # Just modulo directly.
    return rnd % (max - min) + min;
}

export get_rnd_u64;
