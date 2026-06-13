/**
 * EventAttendanceChart Tests
 *
 * Tests for the EventAttendanceChart component covering:
 * - Empty state rendering
 * - Stat card values
 * - Range toggle behaviour
 * - Capacity threshold classes
 * - Ticket-type breakdown
 * - Accessibility attributes
 */

import { render, screen, fireEvent } from "@testing-library/react";
import EventAttendanceChart from "../EventAttendanceChart";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegistration(daysAgo = 0, ticketType = "General") {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return { registeredAt: d.toISOString(), ticketType };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("EventAttendanceChart", () => {
  it("renders empty state when registrations is empty", () => {
    render(<EventAttendanceChart event={{}} registrations={[]} />);
    expect(
      screen.getByText(/No registrations yet/i)
    ).toBeInTheDocument();
  });

  it("shows total registration count in stat card", () => {
    const regs = [makeRegistration(0), makeRegistration(1), makeRegistration(2)];
    render(<EventAttendanceChart event={{ capacity: 100 }} registrations={regs} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows capacity percentage when event.capacity is provided", () => {
    const regs = [makeRegistration(0), makeRegistration(0)];
    render(<EventAttendanceChart event={{ capacity: 4 }} registrations={regs} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  it("renders the 7-day range button as pressed by default", () => {
    const regs = [makeRegistration(0)];
    render(<EventAttendanceChart event={{}} registrations={regs} />);
    const btn7 = screen.getByRole("button", { name: "7d" });
    expect(btn7).toHaveAttribute("aria-pressed", "true");
  });

  it("switches to 30-day range when 30d button is clicked", () => {
    const regs = [makeRegistration(0)];
    render(<EventAttendanceChart event={{}} registrations={regs} />);
    const btn30 = screen.getByRole("button", { name: "30d" });
    fireEvent.click(btn30);
    expect(btn30).toHaveAttribute("aria-pressed", "true");
  });

  it("renders ticket-type breakdown bars when multiple types exist", () => {
    const regs = [
      makeRegistration(0, "General"),
      makeRegistration(0, "VIP"),
      makeRegistration(1, "VIP"),
    ];
    render(<EventAttendanceChart event={{}} registrations={regs} />);
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("shows 'Almost full' warning when capacity >= 90%", () => {
    const regs = Array.from({ length: 9 }, (_, i) => makeRegistration(i));
    render(
      <EventAttendanceChart event={{ capacity: 10 }} registrations={regs} />
    );
    expect(screen.getByText(/Almost full/i)).toBeInTheDocument();
  });

  it("does NOT show 'Almost full' warning below 90% capacity", () => {
    const regs = [makeRegistration(0)];
    render(
      <EventAttendanceChart event={{ capacity: 100 }} registrations={regs} />
    );
    expect(screen.queryByText(/Almost full/i)).not.toBeInTheDocument();
  });

  it("section element has correct aria-label", () => {
    const regs = [makeRegistration(0)];
    render(<EventAttendanceChart event={{}} registrations={regs} />);
    expect(
      screen.getByRole("region", { name: /Attendance analytics/i })
    ).toBeInTheDocument();
  });
});
