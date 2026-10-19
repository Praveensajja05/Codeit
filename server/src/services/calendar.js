// A Google Calendar "add event" link. No Google login or OAuth needed:
// the user clicks it, Google Calendar opens with the event filled in, and they press Save.
const toGoogleTime = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export function googleCalendarUrl({ title, start, end, url }) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${toGoogleTime(start)}/${toGoogleTime(end)}`,
    details: `Contest link: ${url}`,
    location: url,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
