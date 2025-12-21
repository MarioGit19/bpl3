# HTTP Server Example

This example demonstrates a simple HTTP server written in BPL.
It serves files from the current directory.

## Features

-   Listens on port 8083.
-   Handles GET requests.
-   Prevents directory traversal attacks (`..`).
-   Serves files or returns 404.

## Running

```bash
./run.sh
```

## Testing

```bash
curl http://localhost:8083/test1.txt
```
