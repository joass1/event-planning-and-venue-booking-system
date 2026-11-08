import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { notificationPathFor } from "../src/api/notifications.js";

/** T2 — reading and managing my notifications in the web app. */

const EVENT_ID = "event-1";
const unread = (id: string, message: string, createdAt: string) => ({
  id,
  notificationType: "event.approved",
  eventId: EVENT_ID,
  eventReference: "EVT-000001",
  relatedReference: null,
  message,
  occurredAt: createdAt,
  createdAt,
  readAt: null as string | null,
});

let store = [
  unread("n-2", "Your event request EVT-000001 “Symposium” has been approved.", "2026-10-04T02:00:00.000Z"),
  unread("n-1", "Clarification is required on your event request EVT-000001 “Symposium”.", "2026-10-04T01:00:00.000Z"),
];
const unreadCount = () => store.filter((n) => !n.readAt).length;

vi.mock("../src/api/notifications.js", async () => {
  const actual = await vi.importActual<typeof import("../src/api/notifications.js")>("../src/api/notifications.js");
  return {
    ...actual,
    listNotifications: vi.fn(async () => ({ items: store.map((n) => ({ ...n })), unreadCount: unreadCount(), nextCursor: null })),
    markNotificationRead: vi.fn(async (_token: string, id: string) => {
      store = store.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? "2026-10-04T03:00:00.000Z" } : n));
      return { ...store.find((n) => n.id === id)!, unreadCount: unreadCount() };
    }),
    markAllNotificationsRead: vi.fn(async () => {
      const updated = unreadCount();
      store = store.map((n) => ({ ...n, readAt: n.readAt ?? "2026-10-04T03:00:00.000Z" }));
      return { updated, unreadCount: 0 };
    }),
  };
});

vi.mock("../src/api/events.js", async () => {
  const actual = await vi.importActual<typeof import("../src/api/events.js")>("../src/api/events.js");
  const pending = () => new Promise(() => undefined);
  return { ...actual, openEvent: vi.fn(pending), listClarifications: vi.fn(pending), listReassignmentProposals: vi.fn(pending) };
});

vi.mock("../src/api/users.js", () => ({ lookupUsers: vi.fn(async () => []) }));

vi.mock("../src/api/changeRequests.js", () => ({ listChangeRequests: vi.fn(async () => ({ items: [] })), listArrangementFlags: vi.fn(async () => ({ flags: [] })), getChangeImpact: vi.fn(async () => ({ impact: { bookings: [], reservations: [], activeRegistrations: 0, flags: [] } })) }));

const { App } = await import("../src/App.js");

function signInAs(role: string) {
  sessionStorage.setItem(
    "connectsphere.session",
    JSON.stringify({ userId: "user-id", email: "user@connectsphere.test", role, token: "token", lastLoginAt: "2026-10-04T01:00:00.000Z" }),
  );
}

beforeEach(() => {
  store = store.map((n) => ({ ...n, readAt: null }));
  signInAs("EVENT_ORGANISER");
  window.location.hash = "#/notifications";
});
afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const items = () => within(screen.getByRole("list", { name: "Notifications" })).getAllByRole("listitem");

/** A notice of the given type about event "e", as the notification service stores it. */
const notice = (notificationType: string, message = "", relatedReference: string | null = null) => ({
  notificationType,
  eventId: "e",
  relatedReference,
  message,
});

describe("notificationPathFor", () => {
  it("T2-T21 opens the organiser's own request for every notice", () => {
    for (const type of ["event.approved", "change-request.approved", "venue-booking.request-approved", "event.safety-decision-recorded"]) {
      expect(notificationPathFor("EVENT_ORGANISER", notice(type))).toBe("/requests/e");
    }
  });

  it("T2-T21 opens the coordinator's venue requests for a venue notice, the equipment request for an equipment notice, and the review otherwise", () => {
    for (const type of ["venue-booking.request-approved", "venue-booking.hold-expiring", "venue-booking.booking-disrupted"]) {
      expect(notificationPathFor("EVENT_COORDINATOR", notice(type, "", "HLD-000002"))).toBe("/events/e/venue-requests");
    }
    expect(notificationPathFor("EVENT_COORDINATOR", notice("equipment-request.line-status-changed"))).toBe("/events/e/equipment");
    for (const type of ["event.coordinator-assigned", "change-request.submitted", "event.safety-decision-recorded"]) {
      expect(notificationPathFor("EVENT_COORDINATOR", notice(type))).toBe("/review/e");
    }
  });

  it("T2-T21 opens the Lead's assignment page and the Safety Officer's review of the event", () => {
    expect(notificationPathFor("EVENT_COORDINATOR_LEAD", notice("event.submitted"))).toBe("/assignments/e");
    expect(notificationPathFor("SAFETY_OFFICER", notice("event.arrangements-confirmed"))).toBe("/safety/e");
  });

  it("T2-T21 opens Venue Staff's Hold requests for a notice about holds only, and their Booking requests otherwise", () => {
    const holdOnly = "Hold HLD-000002 at Lee Kong Chian School of Business Lecture Theatre for EVT-000017 “Launch” needs attention after an approved change: …";
    expect(notificationPathFor("VENUE_STAFF", notice("change-request.arrangements-flagged", holdOnly))).toBe("/holds");
    expect(notificationPathFor("VENUE_STAFF", notice("venue-booking.hold-expiring", "", "HLD-000002"))).toBe("/holds");
    const both = "Hold HLD-000002 at Hall and booking BKR-000004 at Hall for EVT-000017 “Launch” need attention after an approved change. …";
    expect(notificationPathFor("VENUE_STAFF", notice("change-request.arrangements-flagged", both))).toBe("/booking-requests");
    expect(notificationPathFor("VENUE_STAFF", notice("venue-booking.request-submitted", "Booking request BKR-000004 was submitted …", "BKR-000004"))).toBe(
      "/booking-requests",
    );
    expect(notificationPathFor("VENUE_STAFF", notice("event.arrangements-confirmed", "Your venue's booking BKR-000004 …"))).toBe("/booking-requests");
  });

  it("T2-T21 opens Technical Support's Equipment requests for every notice", () => {
    for (const type of ["equipment-request.line-submitted", "change-request.arrangements-flagged", "event.cancelled"]) {
      expect(notificationPathFor("TECH_SUPPORT_STAFF", notice(type))).toBe("/equipment/requests");
    }
  });

  it("T2-T21 opens the event for an attendee offered a waitlist place, and My registrations otherwise", () => {
    expect(notificationPathFor("ATTENDEE", notice("waitlist.place-opened"))).toBe("/open-events/e");
    for (const type of ["registration.confirmed", "registration.cancelled", "waitlist.cancelled"]) {
      expect(notificationPathFor("ATTENDEE", notice(type))).toBe("/my-registrations");
    }
  });

  it("T2-T21 opens the role's own page for a notice type it does not know yet", () => {
    expect(notificationPathFor("VENUE_STAFF", notice("something.new"))).toBe("/booking-requests");
    expect(notificationPathFor("TECH_SUPPORT_STAFF", notice("something.new"))).toBe("/equipment/requests");
    expect(notificationPathFor("ATTENDEE", notice("something.new"))).toBe("/my-registrations");
    expect(notificationPathFor("EVENT_COORDINATOR", notice("something.new"))).toBe("/review/e");
  });
});

describe("opening a notice as each role", () => {
  // The pages opened ask their own APIs; here those calls never answer, so each page stays as it opens.
  const shared = store;
  beforeEach(() => vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined))));
  afterEach(() => {
    vi.unstubAllGlobals();
    store = shared;
  });

  it("T2-T21 every role lands on a page its policies let it open, and stays there", async () => {
    const cases: [role: string, type: string, message: string, relatedReference: string | null, path: string][] = [
      ["EVENT_ORGANISER", "event.approved", "Your event request EVT-000001 has been approved.", null, `/requests/${EVENT_ID}`],
      ["EVENT_COORDINATOR", "change-request.submitted", "A change has been requested for EVT-000001.", null, `/review/${EVENT_ID}`],
      ["EVENT_COORDINATOR", "venue-booking.hold-expiring", "Hold HLD-000002 for EVT-000001 expires …", "HLD-000002", `/events/${EVENT_ID}/venue-requests`],
      ["EVENT_COORDINATOR", "equipment-request.line-status-changed", "Technical Support updated equipment for EVT-000001.", null, `/events/${EVENT_ID}/equipment`],
      ["EVENT_COORDINATOR_LEAD", "event.submitted", "Event request EVT-000001 was submitted.", null, `/assignments/${EVENT_ID}`],
      ["SAFETY_OFFICER", "event.arrangements-confirmed", "EVT-000001 is waiting in your Safety Review queue.", null, `/safety/${EVENT_ID}`],
      ["VENUE_STAFF", "change-request.arrangements-flagged", "Hold HLD-000002 at Hall for EVT-000001 needs attention after an approved change.", null, "/holds"],
      ["VENUE_STAFF", "venue-booking.request-submitted", "Booking request BKR-000004 was submitted for Hall.", "BKR-000004", "/booking-requests"],
      ["TECH_SUPPORT_STAFF", "equipment-request.line-submitted", "New equipment request for EVT-000001.", null, "/equipment/requests"],
      ["ATTENDEE", "waitlist.place-opened", "A place has opened at EVT-000001.", null, `/open-events/${EVENT_ID}`],
      ["ATTENDEE", "registration.confirmed", "Your registration REG-000001 for EVT-000001 is confirmed.", null, "/my-registrations"],
    ];
    for (const [role, notificationType, message, relatedReference, path] of cases) {
      store = [{ ...unread("n-9", message, "2026-10-04T02:00:00.000Z"), notificationType, relatedReference }];
      signInAs(role);
      window.location.hash = "#/notifications";
      render(<App />);
      await screen.findByRole("list", { name: "Notifications" });
      fireEvent.click(within(items()[0]!).getByRole("button", { name: "Open" }));
      await waitFor(() => expect(window.location.hash, `${role} opening ${notificationType}`).toBe(`#${path}`));
      // The route guard sends a role to its start page from a page it may not open: it must not have.
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(window.location.hash, `${role} stays on ${path}`).toBe(`#${path}`);
      expect(screen.queryByText(/has no page for your role/)).toBeNull();
      cleanup();
      sessionStorage.clear();
    }
  });
});

describe("the Notifications screen", () => {
  it("lists my notifications newest first, with the unread count in the navigation", async () => {
    render(<App />);
    await screen.findByRole("list", { name: "Notifications" });
    expect(items().map((li) => li.textContent)).toEqual([
      expect.stringContaining("has been approved"),
      expect.stringContaining("Clarification is required"),
    ]);
    expect(items().every((li) => li.textContent!.includes("Unread"))).toBe(true);
    await waitFor(() => expect(screen.getByRole("link", { name: "Notifications (2)" })).toBeTruthy());
  });

  it("marks one read, and the count drops", async () => {
    render(<App />);
    await screen.findByRole("list", { name: "Notifications" });
    fireEvent.click(within(items()[0]!).getByRole("button", { name: "Mark as read" }));
    await waitFor(() => expect(items()[0]!.textContent).not.toContain("Unread"));
    expect(items()[1]!.textContent).toContain("Unread");
    await waitFor(() => expect(screen.getByRole("link", { name: "Notifications (1)" })).toBeTruthy());
  });

  it("marks all read in one action, and the count goes", async () => {
    render(<App />);
    await screen.findByRole("list", { name: "Notifications" });
    fireEvent.click(screen.getByRole("button", { name: "Mark all as read" }));
    await waitFor(() => expect(items().some((li) => li.textContent!.includes("Unread"))).toBe(false));
    await waitFor(() => expect(screen.getByRole("link", { name: "Notifications" })).toBeTruthy());
  });

  it("opens the related event, marking the notification read", async () => {
    render(<App />);
    await screen.findByRole("list", { name: "Notifications" });
    fireEvent.click(within(items()[0]!).getByRole("button", { name: "Open" }));
    await waitFor(() => expect(window.location.hash).toBe(`#/requests/${EVENT_ID}`));
    expect(store[0]!.readAt).not.toBeNull();
  });

  it("says when there is nothing to show", async () => {
    store = [];
    render(<App />);
    expect(await screen.findByText("You have no notifications.")).toBeTruthy();
  });
});
