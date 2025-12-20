# BPL Standard Library - Type System Root
# This module defines the root Type struct that all user-defined structs implicitly inherit from.

struct Type {
    # Virtual method to get the name of the type
    # The compiler should generate an override for this in every subclass
    frame getTypeName(this: *Type) ret string {
        return "Type";
    }

    # Virtual method to get string representation
    # Default implementation returns the type name
    frame toString(this: *Type) ret string {
        return this.getTypeName();
    }
}

export [Type];
