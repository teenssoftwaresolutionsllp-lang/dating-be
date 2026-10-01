export type PhoneLoginAction = "login" | "reactivate" | "replace" | "reject";

export const getPhoneLoginAction = (
  status: string,
  deletionScheduledAt: Date | null,
  now: Date,
): PhoneLoginAction => {
  if (status === "active") return "login";
  if (status === "suspended" || status === "banned") return "reject";
  if (status === "deleted") return "replace";
  if (status !== "deactivated") return "reject";
  return deletionScheduledAt && deletionScheduledAt.getTime() > now.getTime()
    ? "reactivate"
    : "replace";
};

export const getDeactivationDeadline = (
  date: Date,
  calendarDays = 30,
): Date => {
  const deadline = new Date(date);
  deadline.setUTCDate(deadline.getUTCDate() + calendarDays);
  return deadline;
};
