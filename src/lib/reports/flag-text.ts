import type { Flag } from "./rules";

// Fixed wording for rule-based flags. The model never writes or alters these, so urgent guidance cannot be diluted.
export function renderFlag(f: Flag): { title: string; body: string } {
  const d = f.data;
  switch (f.code) {
    case "seizure_cluster":
      return {
        title: "Có chùm cơn co giật",
        body: `Có ${d.seizures} cơn co giật trong kỳ, trong đó có hai cơn cách nhau không quá 24 giờ. Hãy liên hệ bác sĩ điều trị sớm. Gọi 115 nếu một cơn kéo dài trên 5 phút hoặc người bệnh không tỉnh lại.`,
      };
    case "seizure_present":
      return { title: "Có cơn co giật", body: `Có ${d.seizures} cơn co giật trong kỳ. Hãy trao đổi với bác sĩ điều trị ở lần khám tới.` };
    case "alerts_increase":
      return { title: "Số cảnh báo tăng", body: `Số cảnh báo tăng từ ${d.previous} lên ${d.current} so với kỳ trước.` };
    case "night_concentration":
      return { title: "Tập trung về đêm", body: `${d.night}/${d.total} cảnh báo xảy ra ban đêm (22:00–06:00).` };
    case "high_false_alarm":
      return { title: "Nhiều cảnh báo nhầm", body: `${d.false_alarms}/${d.total} cảnh báo là báo nhầm. Có thể kiểm tra lại cách đeo đồng hồ.` };
    case "low_data_coverage":
      return { title: "Thiếu dữ liệu", body: `Đồng hồ chỉ có dữ liệu ${d.days_with_data}/${d.days_total} ngày nên kết luận có thể chưa đầy đủ.` };
    case "no_sensor_data":
      return { title: "Chưa có dữ liệu nhịp tim", body: "Không có dữ liệu nhịp tim từ đồng hồ trong kỳ này." };
  }
}
