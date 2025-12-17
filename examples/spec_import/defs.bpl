spec Disposable {
    frame destroy(this: *Self);
}

export [Disposable];

struct User: Disposable {
    name: string,
    frame destroy(this: *User) {
        # destroy
    }
}

export [User];
