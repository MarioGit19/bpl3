frame array_fill_u64(arr: *u64, len: u64, val: u64) {
    local i: u64 = 0;
    loop {
        if i >= len {
            break;
        }
        arr[i] = val;
        i = i + 1;
    }
}

frame array_copy_u64(dest: *u64, src: *u64, len: u64) {
    local i: u64 = 0;
    loop {
        if i >= len {
            break;
        }
        dest[i] = src[i];
        i = i + 1;
    }
}

frame array_reverse_u64(arr: *u64, len: u64) {
    local i: u64 = 0;
    local j: u64 = len - 1;
    local temp: u64;
    loop {
        if i >= j {
            break;
        }
        temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
        i = i + 1;
        j = j - 1;
    }
}

frame array_find_u64(arr: *u64, len: u64, val: u64) ret i64 {
    local i: u64 = 0;
    loop {
        if i >= len {
            break;
        }
        if arr[i] == val {
            return i;
        }
        i = i + 1;
    }
    return -1;
}

frame array_sum_u64(arr: *u64, len: u64) ret u64 {
    local sum: u64 = 0;
    local i: u64 = 0;
    loop {
        if i >= len {
            break;
        }
        sum = sum + arr[i];
        i = i + 1;
    }
    return sum;
}

export array_fill_u64;
export array_copy_u64;
export array_reverse_u64;
export array_find_u64;
export array_sum_u64;
