import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmployeesTab from "../tabs/EmployeesTab";

// Fixtures — two Support employees and one Designer to exercise role filtering
const EMPLOYEES = [
  { id: 1, name: "Alice Martin", role: "Support", device_count: 2 },
  { id: 2, name: "Bob Chen", role: "Designer", device_count: 0 },
  { id: 3, name: "Carol Dupont", role: "Support", device_count: 1 },
];

/**
 * Renders EmployeesTab with the shared EMPLOYEES fixture and any prop overrides.
 * All callbacks default to jest.fn() stubs so tests only need to provide real
 * implementations when asserting on specific callback behaviour.
 *
 * @param {Object} [props={}] - Props to override on top of the defaults.
 * @returns {RenderResult}
 */
function renderTab(props = {}) {
  return render(
    <EmployeesTab
      employees={EMPLOYEES}
      loadingEmployees={false}
      fetchEmployees={jest.fn()}
      fetchDevices={jest.fn()}
      onError={jest.fn()}
      onStatusMessage={jest.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("Rendering", () => {
  test("renders a row for each employee", () => {
    renderTab();
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
    expect(screen.getByText("Carol Dupont")).toBeInTheDocument();
  });

  test("shows device_count per employee", () => {
    renderTab();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  test("shows 'No employees found' when employees is empty", () => {
    renderTab({ employees: [] });
    expect(screen.getByText("No employees found")).toBeInTheDocument();
  });

  test("shows loading indicator when loadingEmployees is true", () => {
    renderTab({ loadingEmployees: true });
    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  test("shows 'Create employee' heading by default", () => {
    renderTab();
    expect(screen.getByRole("heading", { name: /create employee/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------
describe("Filtering", () => {
  test("role filter shows only matching employees", () => {
    renderTab();
    userEvent.selectOptions(screen.getByRole("combobox", { name: /role filter/i }), "Support");
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.getByText("Carol Dupont")).toBeInTheDocument();
    expect(screen.queryByText("Bob Chen")).not.toBeInTheDocument();
  });

  test("role filter dropdown lists all unique roles from employees prop", () => {
    renderTab();
    expect(screen.getByRole("option", { name: "Support" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Designer" })).toBeInTheDocument();
  });

  test("search filters by name", () => {
    renderTab();
    userEvent.type(screen.getByPlaceholderText(/search name \/ role/i), "alice");
    expect(screen.getByText("Alice Martin")).toBeInTheDocument();
    expect(screen.queryByText("Bob Chen")).not.toBeInTheDocument();
    expect(screen.queryByText("Carol Dupont")).not.toBeInTheDocument();
  });

  test("search filters by role", () => {
    renderTab();
    userEvent.type(screen.getByPlaceholderText(/search name \/ role/i), "designer");
    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
    expect(screen.queryByText("Alice Martin")).not.toBeInTheDocument();
  });

  // The role filter is applied first, then the search narrows within that subset.
  test("role filter and search applied simultaneously narrow the results", () => {
    renderTab();
    userEvent.selectOptions(screen.getByRole("combobox", { name: /role filter/i }), "Support");
    userEvent.type(screen.getByPlaceholderText(/search name \/ role/i), "carol");
    expect(screen.getByText("Carol Dupont")).toBeInTheDocument();
    expect(screen.queryByText("Alice Martin")).not.toBeInTheDocument();
    expect(screen.queryByText("Bob Chen")).not.toBeInTheDocument();
  });

  // The select value and visible rows should reflect the stored preference on mount.
  test("roleFilter is initialised from localStorage", () => {
    localStorage.setItem("fleet_role_filter", "Designer");
    renderTab();
    expect(screen.getByRole("combobox", { name: /role filter/i }).value).toBe("Designer");
    expect(screen.queryByText("Alice Martin")).not.toBeInTheDocument();
    expect(screen.getByText("Bob Chen")).toBeInTheDocument();
  });

  test("roleFilter change is persisted to localStorage", () => {
    renderTab();
    userEvent.selectOptions(screen.getByRole("combobox", { name: /role filter/i }), "Designer");
    expect(localStorage.getItem("fleet_role_filter")).toBe("Designer");
  });
});

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------
describe("Create form", () => {
  let fetchEmployees, fetchDevices, onStatusMessage, onError;

  beforeEach(() => {
    fetchEmployees = jest.fn().mockResolvedValue();
    fetchDevices = jest.fn().mockResolvedValue();
    onStatusMessage = jest.fn();
    onError = jest.fn();

    // Default successful POST response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 4, name: "New Employee", role: "PM" }),
    });
  });

  afterEach(() => { delete global.fetch; });

  test("submitting calls POST /api/employees with name and role", async () => {
    renderTab({ fetchEmployees, fetchDevices, onStatusMessage });
    userEvent.type(screen.getByPlaceholderText("Employee name"), "New Employee");
    userEvent.type(screen.getByPlaceholderText("Developer"), "PM");
    userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/employees",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("New Employee"),
        }),
      );
    });
  });

  test("after successful create, calls fetchEmployees and fetchDevices", async () => {
    renderTab({ fetchEmployees, fetchDevices });
    userEvent.type(screen.getByPlaceholderText("Employee name"), "New Employee");
    userEvent.type(screen.getByPlaceholderText("Developer"), "PM");
    userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(fetchEmployees).toHaveBeenCalled();
      expect(fetchDevices).toHaveBeenCalled();
    });
  });

  test("after successful create, calls onStatusMessage('Employee created')", async () => {
    renderTab({ onStatusMessage });
    userEvent.type(screen.getByPlaceholderText("Employee name"), "New Employee");
    userEvent.type(screen.getByPlaceholderText("Developer"), "PM");
    userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(onStatusMessage).toHaveBeenCalledWith("Employee created");
    });
  });

  test("after successful create, form fields are cleared", async () => {
    renderTab();
    const nameInput = screen.getByPlaceholderText("Employee name");
    const roleInput = screen.getByPlaceholderText("Developer");
    userEvent.type(nameInput, "New Employee");
    userEvent.type(roleInput, "PM");
    userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(nameInput.value).toBe("");
      expect(roleInput.value).toBe("");
    });
  });

  // Overrides the default mock with a failing response for this test only.
  test("failed POST calls onError with the server message", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Server error" }),
    });
    renderTab({ onError });
    userEvent.type(screen.getByPlaceholderText("Employee name"), "New Employee");
    userEvent.type(screen.getByPlaceholderText("Developer"), "PM");
    userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringContaining("Server error"));
    });
  });
});

// ---------------------------------------------------------------------------
// Edit flow
// ---------------------------------------------------------------------------
describe("Edit flow", () => {
  beforeEach(() => {
    // Default successful PUT response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "Alice Updated", role: "Ops" }),
    });
  });

  afterEach(() => { delete global.fetch; });

  // The first Edit button corresponds to Alice Martin (id=1).
  test("clicking Edit populates the form with the employee's data", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    expect(screen.getByPlaceholderText("Employee name").value).toBe("Alice Martin");
    expect(screen.getByPlaceholderText("Developer").value).toBe("Support");
  });

  test("heading changes to 'Edit employee' when in edit mode", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    expect(screen.getByRole("heading", { name: /edit employee/i })).toBeInTheDocument();
  });

  // Clicking the first Edit button targets Alice (id=1) — the PUT URL should include her id.
  test("submitting in edit mode sends PUT to /api/employees/:id", async () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /^update$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/employees/1",
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  test("successful update calls onStatusMessage('Employee updated')", async () => {
    const onStatusMessage = jest.fn();
    renderTab({ onStatusMessage });
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /^update$/i }));

    await waitFor(() => {
      expect(onStatusMessage).toHaveBeenCalledWith("Employee updated");
    });
  });

  test("Cancel edit resets heading to 'Create employee' and clears the form", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /cancel edit/i }));

    expect(screen.getByRole("heading", { name: /create employee/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Employee name").value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
describe("Delete", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete global.fetch;
  });

  // The first Delete button corresponds to Alice (id=1).
  test("confirmed delete calls DELETE /api/employees/:id then fetchEmployees", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const fetchEmployees = jest.fn().mockResolvedValue();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    renderTab({ fetchEmployees });

    userEvent.click(screen.getAllByRole("button", { name: /^delete$/i })[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/employees/1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(fetchEmployees).toHaveBeenCalled();
    });
  });

  test("confirmed delete calls onStatusMessage('Employee deleted')", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const onStatusMessage = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    renderTab({ onStatusMessage });
    userEvent.click(screen.getAllByRole("button", { name: /^delete$/i })[0]);

    await waitFor(() => {
      expect(onStatusMessage).toHaveBeenCalledWith("Employee deleted");
    });
  });

  test("cancelled delete does not call fetch", () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    global.fetch = jest.fn();
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^delete$/i })[0]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("failed DELETE calls onError", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const onError = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Cannot delete" }),
    });
    renderTab({ onError });
    userEvent.click(screen.getAllByRole("button", { name: /^delete$/i })[0]);

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.stringContaining("Cannot delete"));
    });
  });
});
