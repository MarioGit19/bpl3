extern malloc(size: u64) ret *u8;
extern free(ptr: *u8);
extern sprintf(str: *u8, format: *u8, ...) ret i32;
extern strlen(s: *u8) ret u64;
extern strcpy(dest: *u8, src: *u8) ret *u8;
extern strcat(dest: *u8, src: *u8) ret *u8;
extern printf(format: *u8, ...) ret i32;
extern fflush(stream: *u8) ret i32;

struct RuntimeStackFrame {
    prev: *RuntimeStackFrame,
    funcName: *u8,
    fileName: *u8,
    line: u32,
}

extern __get_stack_top() ret *RuntimeStackFrame;
extern __print_stack_trace();

frame print_stack_trace() {
    call __print_stack_trace();
}

frame get_stack_trace() ret *u8 {
    local curr: *RuntimeStackFrame = call __get_stack_top();
    local temp: *RuntimeStackFrame = curr;
    local size: u64 = 0;
    size = size + 13; # "Stack trace:\n"

    loop {
        if temp == NULL {
            break;
        }

        size = size + 20;
        size = size + call strlen(temp.funcName);
        size = size + call strlen(temp.fileName);

        temp = temp.prev;
    }

    local buffer: *u8 = call malloc(size + 1);
    if buffer == NULL {
        return NULL;
    }

    buffer[0] = 0; # Initialize as empty string
    call strcat(buffer, "Stack trace:\n");

    temp = curr;
    local line_buf: *u8 = call malloc(1024); # Temp buffer for one line

    loop {
        if temp == NULL {
            break;
        }

        call sprintf(line_buf, "\tat %s (%s:%d)\n", temp.funcName, temp.fileName, temp.line);
        call strcat(buffer, line_buf);

        temp = temp.prev;
    }

    call free(line_buf);
    return buffer;
}

export print_stack_trace;
export get_stack_trace;
