---
description: 'Instructions for writing Playwright tests in Python'
applyTo: "tests/**/*.py"
---

# Playwright Python Test Generation Instructions

## Code Quality Standards

- **Locators**: Prioritize user-facing, role-based locators (`get_by_role`, `get_by_label`, `get_by_text`) for resilience and accessibility.
- **Assertions**: Use auto-retrying web-first assertions via the `expect` API. Avoid `expect(locator).to_be_visible()` unless specifically testing for visibility changes — more specific assertions are more reliable.
- **Timeouts**: Rely on Playwright's built-in auto-waiting mechanisms. Avoid hard-coded waits or increased default timeouts.
- **Clarity**: Use descriptive test titles (e.g., `def test_navigation_link_works():`) that clearly state intent. Add comments only to explain complex logic.

## Test Structure

- **Imports**: Every test file should begin with `from playwright.sync_api import Page, expect`.
- **Fixtures**: Use the `page: Page` fixture as an argument in test functions.
- **Setup**: Place navigation steps like `page.goto()` at the beginning of each test function. For setup shared across multiple tests, use standard Pytest fixtures.

## File Organization

- **Location**: Store test files in a dedicated `tests/` directory.
- **Naming**: Test files must follow the `test_<feature-or-page>.py` naming convention for Pytest discovery.
- **Scope**: Aim for one test file per major application feature or page.

## Assertion Best Practices

- **Element Counts**: Use `expect(locator).to_have_count()` to assert the number of elements.
- **Text Content**: Use `expect(locator).to_have_text()` for exact matches and `expect(locator).to_contain_text()` for partial matches.
- **Navigation**: Use `expect(page).to_have_url()` to verify the page URL.
- **Assertion Style**: Prefer `expect` over `assert` for more reliable UI tests.

## Example

```python
import re
import pytest
from playwright.sync_api import Page, expect

@pytest.fixture(scope="function", autouse=True)
def before_each_after_each(page: Page):
    # Go to the starting url before each test.
    page.goto("https://playwright.dev/")

def test_main_navigation(page: Page):
    expect(page).to_have_url("https://playwright.dev/")

def test_has_title(page: Page):
    # Expect a title "to contain" a substring.
    expect(page).to_have_title(re.compile("Playwright"))

def test_get_started_link(page: Page):
    page.get_by_role("link", name="Get started").click()

    # Expects page to have a heading with the name of Installation.
    expect(page.get_by_role("heading", name="Installation")).to_be_visible()
```

## Test Execution Strategy

1. **Execution**: Tests are run from the terminal using the `pytest` command.
2. **Debug Failures**: Analyze test failures and identify root causes before adjusting assertions or locators.
3. **Parallel Execution**: Use `pytest-xdist` for parallel test runs when test suite grows.
