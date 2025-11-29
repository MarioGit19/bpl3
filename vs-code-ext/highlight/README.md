# BPL Highlight

Syntax highlighting for BPL (Basic Programming Language).

## Features

- Syntax highlighting for `.x` files.
- Support for keywords, types, strings, numbers, comments, and operators.

## Installation

1. Open the `vs-code-ext/highlight` folder in VS Code.
2. Press `F5` to launch the extension in a new Extension Development Host window.
3. Open any `.x` file to see the highlighting in action.

Alternatively, you can package the extension using `vsce package` and install the `.vsix` file.

```
npm install -g @vscode/vsce
cd vs-code-ext/highlight
vsce package
codenpm install -g @vscode/vsce
cd vs-code-ext/highlight
vsce package
```

4. Install the generated `.vsix` file in VS Code by going to the Extensions view, clicking on the three-dot menu, and selecting "Install from VSIX...".
5. Open any `.x` file to see the highlighting in action.
