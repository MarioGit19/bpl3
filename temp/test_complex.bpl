struct Deep {
    frame clone() ret Deep {
        return *this;
    }
    
    frame changeType<U>() ret U[10] {
        local arr: U[10];
        return arr;
    }
}

struct Inner {
    frame clone() ret Deep[10] {
        local arr: Deep[10];
        return arr;
    }
}

struct Obj {
    arr: Inner[10],
}

struct Vec<T> {
    frame new(elements: T[]) ret Vec<T> {
        local v: Vec<T>;
        return v;
    }
    
    frame clone() ret Vec<T> {
        return *this;
    }
    
    frame map<U>(f: Func<U>(T, int)) ret Vec<U> {
        local v: Vec<U>;
        return v;
    }
}

frame mapper<T>(el: T, index: int) ret T {
    return el;
}

frame main() ret void {
    local obj: Obj;
    // Scenario 1
    local temp: int = obj.arr[5].clone()[3].clone().changeType<int>()[5];
    
    // Scenario 2
    Vec<int>.new([1,2,3]).clone().map<int>(mapper<int>);
}
