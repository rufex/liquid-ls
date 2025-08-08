# Language Server for Silverfin Liquid

In this project, we implement a language server for Silverfin Liquid, which is a variant of the Liquid templating language used in Silverfin.
The language server will provide goto definition capabilities, allowing users to navigate to the definitions of variables and functions in their Silverfin Liquid templates.
The language server is implemented in Typescript and uses the Language Server Protocol (LSP) to communicate with clients.
Common clients for this language server include Visual Studio Code and Neovim.
To parse and query liquid files, we make use of a Treesitter parser, which allows us to efficiently traverse the syntax tree of Liquid templates.

# Instructions

ALWAYS write specs for your code, as this will help us ensure the language server works correctly and efficiently.
ALWAYS run your tests before deciding if your code is ready or not. Tests must always pass.
ALWAYS run the linter (`npm run lint`) and formatter (`npm run format`) before completing any task.
STORE tests in the `test` directory, and use the `jest` testing framework to write your tests.
SUMMARIZE any relavant information that can help yourself in future iterations of this project, or help other developers understand the codebase. Store this information in `claude/` directory.
ALWAYS read the documentation you have in `claude/` directory before starting to work on the codebase, as it contains important information about the project and its structure.
DEFINE types following the TypeScript conventions and the official LSP specifications.
ALWAYS write test, run tests, run linter, run formatter, compile typescript before committing or submitting code.

# Extra documentation

The official documentation of the Language Server Protocol (LSP) can be found at https://microsoft.github.io/language-server-protocol/
