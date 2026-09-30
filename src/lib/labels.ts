export type AlertType = "pre_seizure" | "fall" | "seizure";
export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertStatus = "open" | "acknowledged" | "resolved" | "false_alarm" | "cancelled";
export type CircleRole = "owner" | "guardian" | "viewer";
export type MemberStatus = "invited" | "active" | "removed";

export const alertTypeLabel: Record<AlertType, string> = {
  pre_seizure: "Tiền động kinh",
  fall: "Té ngã",
  seizure: "Cơn co giật",
};

export const alertStatusLabel: Record<AlertStatus, string> = {
  open: "Đang mở",
  acknowledged: "Đã xác nhận",
  resolved: "Đã xử lý",
  false_alarm: "Báo nhầm",
  cancelled: "Đã huỷ",
};

export const severityLabel: Record<AlertSeverity, string> = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nguy kịch",
};

export const circleRoleLabel: Record<CircleRole, string> = {
  owner: "Chủ sở hữu",
  guardian: "Người giám hộ",
  viewer: "Người xem",
};

export const memberStatusLabel: Record<MemberStatus, string> = {
  invited: "Đã mời",
  active: "Đang hoạt động",
  removed: "Đã rời",
};
