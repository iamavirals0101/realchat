import { format, formatDistanceToNow } from "date-fns";

export function fmtTime(date) {
  return format(new Date(date), "hh:mm a");
}

export function fmtAgo(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
