# Time

export [Time];

extern time(ptr: *long) ret long;
extern usleep(usec: int) ret int;

struct Time {
    frame now() ret int {
        local t: long = 0;
        return cast<int>(time(&t));
    }
    frame sleep(ms: int) {
        local usec: int = ms * 1000;
        usleep(usec);
    }
}
