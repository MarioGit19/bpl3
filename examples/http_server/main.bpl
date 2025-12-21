extern socket(domain: i32, sock_type: i32, protocol: i32) ret i32;
extern bind(sockfd: i32, addr: *sockaddr_in, addrlen: u32) ret i32;
extern listen(sockfd: i32, backlog: i32) ret i32;
extern accept(sockfd: i32, addr: *sockaddr_in, addrlen: *u32) ret i32;
extern read(fd: i32, buf: *i8, count: u64) ret i64;
extern write(fd: i32, buf: *i8, count: u64) ret i64;
extern close(fd: i32) ret i32;
extern open(pathname: *i8, flags: i32) ret i32;
extern printf(fmt: *i8, ...) ret i32;
extern exit(status: i32) ret void;
extern memset(s: *void, c: i32, n: u64) ret *void;
extern setsockopt(sockfd: i32, level: i32, optname: i32, optval: *void, optlen: u32) ret i32;
extern atoi(s: *i8) ret i32;
extern lseek(fd: i32, offset: i64, whence: i32) ret i64;
extern sprintf(str: *i8, format: *i8, ...) ret i32;
extern strlen(s: *i8) ret u64;

struct sockaddr_in {
    sin_family: i16,
    sin_port: u16,
    sin_addr: u32,
    sin_zero: u64,
}

frame main(argc: i32, argv: **i8) ret i32 {
    local server_fd: i32;
    local new_socket: i32;
    local address: sockaddr_in;
    local addrlen: u32 = 16;
    local buffer: i8[1024];
    local valread: i64;
    local opt: i32 = 1;
    local port: i32 = 8108;

    if (argc > 1) {
        port = atoi(argv[1]);
    }
    printf("Using port: %d\n", port);

    # Create socket
    server_fd = socket(2, 1, 0); # AF_INET, SOCK_STREAM, 0
    if (server_fd < 0) {
        printf("Socket creation failed\n");
        exit(1);
    }
    # Set SO_REUSEADDR
    if (setsockopt(server_fd, 1, 2, cast<*void>(&opt), 4) < 0) {
        printf("Setsockopt failed\n");
        exit(1);
    }
    # Bind
    address.sin_family = 2; # AF_INET
    address.sin_port = htons(cast<u16>(port));
    address.sin_addr = 0; # INADDR_ANY
    address.sin_zero = 0;

    if (bind(server_fd, &address, 16) < 0) {
        printf("Bind failed\n");
        exit(1);
    }
    # Listen
    if (listen(server_fd, 3) < 0) {
        printf("Listen failed\n");
        exit(1);
    }
    printf("Server listening on port %d\n", port);

    loop {
        addrlen = 16;
        new_socket = accept(server_fd, &address, &addrlen);
        if (new_socket < 0) {
            printf("Accept failed\n");
            continue;
        }
        # Clear buffer
        memset(cast<*void>(&buffer[0]), 0, cast<u64>(1024));

        valread = read(new_socket, cast<*i8>(&buffer[0]), cast<u64>(1023));
        if (valread > 0) {
            buffer[valread] = 0;
            printf("Received request:\n%s\n", cast<*i8>(&buffer[0]));
            handle_request(new_socket, cast<*i8>(&buffer[0]));
        }
        close(new_socket);
    }

    return 0;
}

frame handle_request(client_fd: i32, request: *i8) {
    # Check for GET
    if ((request[0] != 'G') || (request[1] != 'E') || (request[2] != 'T') || (request[3] != ' ')) {
        send_404(client_fd);
        return;
    }
    # Extract path
    local path_start: i32 = 4;
    local path_end: i32 = 4;

    loop ((request[path_end] != ' ') && (request[path_end] != 0)) {
        path_end = path_end + 1;
        if (path_end >= 1024) {
            send_404(client_fd);
            return;
        }
    }

    if (request[path_end] == 0) {
        send_404(client_fd);
        return;
    }
    request[path_end] = 0;
    local path: *i8 = &request[path_start];

    printf("Requested path: %s\n", path);

    if (contains_dot_dot(path) != 0) {
        printf("Security violation: .. detected\n");
        send_404(client_fd);
        return;
    }
    if (path[0] == '/') {
        path = &path[1];
    }
    if (path[0] == 0) {
        send_404(client_fd);
        return;
    }
    serve_file(client_fd, path);
}

frame contains_dot_dot(s: *i8) ret i32 {
    local i: i32 = 0;
    loop (s[i] != 0) {
        if ((s[i] == '.') && (s[i + 1] == '.')) {
            return 1;
        }
        i = i + 1;
    }
    return 0;
}

frame serve_file(client_fd: i32, filename: *i8) {
    local file_fd: i32;
    local file_buffer: i8[1024];
    local bytes_read: i64;
    local file_size: i64;
    local header_buffer: i8[256];
    local header_len: i32;

    file_fd = open(filename, 0); # O_RDONLY
    if (file_fd < 0) {
        printf("File not found: %s\n", filename);
        send_404(client_fd);
        return;
    }
    # Get file size
    file_size = lseek(file_fd, 0, 2); # SEEK_END
    lseek(file_fd, 0, 0); # SEEK_SET

    # Format header with Content-Length
    sprintf(cast<*i8>(&header_buffer[0]), "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: %ld\r\n\r\n", file_size);
    header_len = cast<i32>(strlen(cast<*i8>(&header_buffer[0])));

    write(client_fd, cast<*i8>(&header_buffer[0]), cast<u64>(header_len));

    loop {
        bytes_read = read(file_fd, cast<*i8>(&file_buffer[0]), cast<u64>(1024));
        if (bytes_read <= 0) {
            break;
        }
        write(client_fd, cast<*i8>(&file_buffer[0]), cast<u64>(bytes_read));
    }

    close(file_fd);
}

frame send_404(client_fd: i32) {
    local response: *i8 = "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\n404 Not Found";
    write(client_fd, response, cast<u64>(66));
}

frame htons(v: u16) ret u16 {
    return ((v & 0xFF) << 8) | ((v & 0xFF00) >> 8);
}
