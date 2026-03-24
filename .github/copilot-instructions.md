General Rules
Give me commits at the end of code change keep commit 3 line long and relevant accoridng to the code change
Do NOT add comments in the code under any circumstances.
Do NOT add README files, documentation files, or explanatory text.
Do NOT change existing behavior unless explicitly instructed.
Do NOT introduce breaking changes.
Do NOT duplicate code.
Do NOT add unused files, functions, or exports.
Design & Architecture
Follow Single Responsibility Principle strictly.

One file = one responsibility.
One function = one responsibility.
Follow SOLID principles at all times.

Keep logic modular and decoupled.

Prefer composition over inheritance.

Avoid tight coupling between modules.

Code Structure
Keep files small and focused.

Split large files into multiple files when responsibilities grow.

Group related logic into appropriate modules/folders.

Ensure clear separation between:

Business logic
Data access
External integrations
Utilities/helpers
Naming Conventions
Use clear, descriptive, and consistent naming.
Follow existing project naming patterns exactly.
Avoid abbreviations unless already used in the codebase.
File names, variables, functions, and classes must reflect their responsibility.
Code Quality
Write clean, readable, and predictable code.
Prefer explicit logic over clever shortcuts.
Avoid side effects.
Handle errors gracefully without adding extra logs unless already present.
Do not introduce console logs or debug statements.
Imports & Exports
Remove unused imports.
Export only what is necessary.
Keep import order consistent with the existing codebase.
Constraints
No comments.
No documentation files.
No example usage.
No test files unless explicitly requested.
Final Check Before Output
Code follows Single Responsibility.
SOLID principles are respected.
Naming conventions are consistent.
No comments exist anywhere.
No extra files were added unnecessarily.
