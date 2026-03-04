import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DevicesTab from "../tabs/DevicesTab";

const EMPLOYEES = [
  { id: 1, name: "Alice Martin", role: "Engineer" },
  { id: 2, name: "Bob Chen", role: "Designer" },
];

const DEVICES = [
  { id: 1, name: "MacBook Pro 14", type: "Laptop", owner_id: 1 },
  { id: 2, name: "Dell XPS 15", type: "Laptop", owner_id: null },
  { id: 3, name: "LG 27 4K", type: "Display", owner_id: 2 },
];

function renderTab(props = {}) {
  return render(
    <DevicesTab
      devices={DEVICES}
      employees={EMPLOYEES}
      loadingDevices={false}
      fetchDevices={jest.fn()}
      fetchEmployees={jest.fn()}
      onError={jest.fn()}
      onStatusMessage={jest.fn()}
      {...props}
    />,
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  // Default: owner resolution returns Alice for id=1, Bob for id=2
  global.fetch = jest.fn().mockImplementation((url) => {
    if (url.includes("/api/employees/1")) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 1, name: "Alice Martin" }) });
    }
    if (url.includes("/api/employees/2")) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: 2, name: "Bob Chen" }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
  });
});

afterEach(() => {
  delete global.fetch;
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("Rendering", () => {
  test("renders a row for each device", () => {
    renderTab();
    expect(screen.getByText("MacBook Pro 14")).toBeInTheDocument();
    expect(screen.getByText("Dell XPS 15")).toBeInTheDocument();
    expect(screen.getByText("LG 27 4K")).toBeInTheDocument();
  });

  test("shows 'No devices found' when devices list is empty", () => {
    renderTab({ devices: [] });
    expect(screen.getByText("No devices found")).toBeInTheDocument();
  });

  test("shows loading indicator when loadingDevices is true", () => {
    renderTab({ loadingDevices: true });
    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  test("device with owner_id null shows 'Unassigned' in the table", async () => {
    renderTab({ devices: [{ id: 2, name: "Dell XPS 15", type: "Laptop", owner_id: null }] });
    // "Unassigned" also appears in the form's owner <option>, so scope to the table
    await waitFor(() => {
      expect(within(screen.getByRole("table")).getAllByText("Unassigned").length).toBeGreaterThan(0);
    });
  });

  test("owner names are resolved and displayed", async () => {
    renderTab();
    // Alice Martin and Bob Chen appear in owner <select> options (form + filter),
    // so scope the assertion to the device list table where names are resolved via fetch.
    await waitFor(() => {
      const table = screen.getByRole("table");
      expect(within(table).getByText("Alice Martin")).toBeInTheDocument();
      expect(within(table).getByText("Bob Chen")).toBeInTheDocument();
    });
  });

  test("shows 'Create device' heading by default", () => {
    renderTab();
    expect(screen.getByRole("heading", { name: /create device/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------
describe("Filtering", () => {
  test("type filter shows only matching devices", () => {
    renderTab();
    userEvent.selectOptions(screen.getByRole("combobox", { name: /type filter/i }), "Laptop");
    expect(screen.getByText("MacBook Pro 14")).toBeInTheDocument();
    expect(screen.getByText("Dell XPS 15")).toBeInTheDocument();
    expect(screen.queryByText("LG 27 4K")).not.toBeInTheDocument();
  });

  test("owner filter shows only devices belonging to selected owner", () => {
    renderTab();
    userEvent.selectOptions(screen.getByRole("combobox", { name: /owner filter/i }), "1");
    expect(screen.getByText("MacBook Pro 14")).toBeInTheDocument();
    expect(screen.queryByText("Dell XPS 15")).not.toBeInTheDocument();
    expect(screen.queryByText("LG 27 4K")).not.toBeInTheDocument();
  });

  test("search filters by name", () => {
    renderTab();
    userEvent.type(screen.getByPlaceholderText(/search name \/ type/i), "macbook");
    expect(screen.getByText("MacBook Pro 14")).toBeInTheDocument();
    expect(screen.queryByText("Dell XPS 15")).not.toBeInTheDocument();
  });

  test("search filters by type", () => {
    renderTab();
    userEvent.type(screen.getByPlaceholderText(/search name \/ type/i), "display");
    expect(screen.getByText("LG 27 4K")).toBeInTheDocument();
    expect(screen.queryByText("MacBook Pro 14")).not.toBeInTheDocument();
  });

  test("owner select dropdown lists all employees", () => {
    renderTab();
    expect(screen.getAllByRole("option", { name: "Alice Martin" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option", { name: "Bob Chen" }).length).toBeGreaterThan(0);
  });

  test("deviceTypeFilter is initialised from localStorage", () => {
    localStorage.setItem("fleet_device_type_filter", "Display");
    renderTab();
    expect(screen.queryByText("MacBook Pro 14")).not.toBeInTheDocument();
    expect(screen.getByText("LG 27 4K")).toBeInTheDocument();
  });

  test("deviceOwnerFilter is initialised from localStorage", () => {
    localStorage.setItem("fleet_device_owner_filter", "2");
    renderTab();
    expect(screen.getByText("LG 27 4K")).toBeInTheDocument();
    expect(screen.queryByText("MacBook Pro 14")).not.toBeInTheDocument();
  });

  test("filter changes are persisted to localStorage", () => {
    renderTab();
    userEvent.selectOptions(screen.getByRole("combobox", { name: /type filter/i }), "Display");
    expect(localStorage.getItem("fleet_device_type_filter")).toBe("Display");
  });
});

// ---------------------------------------------------------------------------
// Create form
// ---------------------------------------------------------------------------
describe("Create form", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 5, name: "Magic Keyboard", type: "Peripheral", owner_id: null }),
    });
  });

  test("submitting calls POST /api/devices", async () => {
    const fetchDevices = jest.fn().mockResolvedValue();
    renderTab({ fetchDevices });
    userEvent.type(screen.getByPlaceholderText("MacBook Pro"), "Magic Keyboard");
    userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/devices",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  test("after successful create, calls fetchDevices and fetchEmployees", async () => {
    const fetchDevices = jest.fn().mockResolvedValue();
    const fetchEmployees = jest.fn().mockResolvedValue();
    renderTab({ fetchDevices, fetchEmployees });
    userEvent.type(screen.getByPlaceholderText("MacBook Pro"), "Magic Keyboard");
    userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(fetchDevices).toHaveBeenCalled();
      expect(fetchEmployees).toHaveBeenCalled();
    });
  });

  test("after successful create, calls onStatusMessage('Device created')", async () => {
    const onStatusMessage = jest.fn();
    renderTab({ onStatusMessage });
    userEvent.type(screen.getByPlaceholderText("MacBook Pro"), "Magic Keyboard");
    userEvent.click(screen.getByRole("button", { name: /^create$/i }));

    await waitFor(() => {
      expect(onStatusMessage).toHaveBeenCalledWith("Device created");
    });
  });
});

// ---------------------------------------------------------------------------
// Edit flow
// ---------------------------------------------------------------------------
describe("Edit flow", () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, name: "MacBook Updated", type: "Laptop", owner_id: null }),
    });
  });

  test("clicking Edit populates the form with device data", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    expect(screen.getByPlaceholderText("MacBook Pro").value).toBe("MacBook Pro 14");
  });

  test("heading changes to 'Edit device' when in edit mode", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    expect(screen.getByRole("heading", { name: /edit device/i })).toBeInTheDocument();
  });

  test("submitting in edit mode sends PUT to /api/devices/:id", async () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]); // device 1
    userEvent.click(screen.getByRole("button", { name: /^update$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/devices/1",
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  test("successful update calls onStatusMessage('Device updated')", async () => {
    const onStatusMessage = jest.fn();
    renderTab({ onStatusMessage });
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /^update$/i }));

    await waitFor(() => {
      expect(onStatusMessage).toHaveBeenCalledWith("Device updated");
    });
  });

  test("Cancel edit resets heading to 'Create device' and clears the form", () => {
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^edit$/i })[0]);
    userEvent.click(screen.getByRole("button", { name: /cancel edit/i }));
    expect(screen.getByRole("heading", { name: /create device/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("MacBook Pro").value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------
describe("Delete", () => {
  afterEach(() => jest.restoreAllMocks());

  test("confirmed delete calls DELETE /api/devices/:id then fetchDevices and fetchEmployees", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    const fetchDevices = jest.fn().mockResolvedValue();
    const fetchEmployees = jest.fn().mockResolvedValue();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    renderTab({ fetchDevices, fetchEmployees });

    userEvent.click(screen.getAllByRole("button", { name: /^delete$/i })[0]); // device 1

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/devices/1",
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(fetchDevices).toHaveBeenCalled();
      expect(fetchEmployees).toHaveBeenCalled();
    });
  });

  test("cancelled delete does not call fetch", () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    global.fetch = jest.fn();
    renderTab();
    userEvent.click(screen.getAllByRole("button", { name: /^delete$/i })[0]);
    expect(global.fetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: "DELETE" }));
  });
});
