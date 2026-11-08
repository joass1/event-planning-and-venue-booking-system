import { request } from "./client.js";
import type { Role } from "./types.js";

/** T2: my notifications, served by the notification service. */

const NOTIFICATION = "/notification/api/v1";

export interface NotificationItem {
  id: string;
  notificationType: string;
  eventId: string;
  eventReference: string;
  relatedReference: string | null;
  message: string;
  occurredAt: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  items: NotificationItem[];
  unreadCount: number;
  nextCursor: string | null;
}

/** Tells the navigation's unread count to refresh after a notification is read. */
export const NOTIFICATIONS_CHANGED = "connectsphere:notifications-changed";
export const announceNotificationsChanged = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));

export function listNotifications(token: string, options: { limit?: number; cursor?: string } = {}) {
  const query = new URLSearchParams();
  if (options.limit) query.set("limit", String(options.limit));
  if (options.cursor) query.set("cursor", options.cursor);
  const suffix = query.size > 0 ? `?${query}` : "";
  return request<NotificationPage>(`${NOTIFICATION}/notifications${suffix}`, { token });
}

export function markNotificationRead(token: string, id: string) {
  return request<NotificationItem & { unreadCount: number }>(`${NOTIFICATION}/notifications/${id}/read`, {
    method: "POST",
    token,
  });
}

export function markAllNotificationsRead(token: string) {
  return request<{ updated: number; unreadCount: number }>(`${NOTIFICATION}/notifications/read-all`, {
    method: "POST",
    token,
  });
}

/** What "Open" needs to know about a notification to choose the page. */
export type NotificationTarget = Pick<NotificationItem, "notificationType" | "eventId" | "relatedReference" | "message">;

/** The hold and booking request references a notice names (HLD-…, BKR-…); a confirmed booking keeps its request's. */
function venueReferencesIn(target: NotificationTarget): string[] {
  const text = `${target.relatedReference ?? ""} ${target.message}`;
  return text.match(/\b(?:HLD|BKR)-\d+\b/g) ?? [];
}

/** A notice to Venue Staff about holds and nothing else: a flagged, released or expiring hold. */
function aboutHoldsOnly(target: NotificationTarget): boolean {
  const references = venueReferencesIn(target);
  return references.length > 0 && references.every((reference) => reference.startsWith("HLD-"));
}

/**
 * Where "Open" goes (T2 AC8): a page the reader's role may open, about what the notice says.
 * Each is a route the role's policies allow (App.tsx), so the route guard never turns the reader
 * away. An event page asks the server again, so if the reader can no longer see the event it
 * shows the refusal and no event data. A role with no page of its own for one event opens its
 * list page instead: Venue Staff their Hold requests or Booking requests, Technical Support their
 * Equipment requests, an attendee My registrations. A notice type this does not know opens the
 * same page as the role's other notices.
 */
export function notificationPathFor(role: Role, target: NotificationTarget): string {
  const event = target.eventId;
  const type = target.notificationType;
  switch (role) {
    case "EVENT_ORGANISER":
      return `/requests/${event}`;
    case "EVENT_COORDINATOR":
      // The event's bookings, holds and requests (L1 to L6), or its equipment lines (O2), else the review.
      if (type.startsWith("venue-booking.")) return `/events/${event}/venue-requests`;
      if (type.startsWith("equipment-request.")) return `/events/${event}/equipment`;
      return `/review/${event}`;
    // D-02: a Lead is told of a request awaiting assignment, a Safety Officer of an event awaiting the check.
    case "EVENT_COORDINATOR_LEAD":
      return `/assignments/${event}`;
    case "SAFETY_OFFICER":
      return `/safety/${event}`;
    case "VENUE_STAFF":
      return aboutHoldsOnly(target) ? "/holds" : "/booking-requests";
    case "TECH_SUPPORT_STAFF":
      return "/equipment/requests";
    case "ATTENDEE":
      // R6: a place opened, and whoever registers first gets it.
      return type === "waitlist.place-opened" ? `/open-events/${event}` : "/my-registrations";
  }
}
