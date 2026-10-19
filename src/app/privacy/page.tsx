import type { Metadata } from "next";

// Public page: the Google Play listing for the watch app links here. The facts below describe what the code does today;
// update it in the same change as any change to what is collected or who can see it.
export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư · UII",
  description: "UII thu thập gì, dùng để làm gì, ai nhìn thấy và cách xóa dữ liệu.",
};

const UPDATED = "15/10/2026";
const linkCls = "underline decoration-ember-orange decoration-1 underline-offset-[3px]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-heading text-[24px] leading-[1.2] tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 space-y-3 text-steel">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const contact = process.env.PRIVACY_CONTACT_EMAIL;
  return (
    <main className="mx-auto w-full max-w-[720px] flex-1 px-5 py-12">
      <p className="font-heading text-[13px] tracking-[-0.02em] text-brass">Cập nhật lần cuối: {UPDATED}</p>
      <h1 className="mt-3 font-heading text-[40px] leading-[1.1] tracking-[-0.02em]">Chính sách quyền riêng tư</h1>
      <p className="mt-4 text-steel">
        UII gồm một ứng dụng trên đồng hồ Wear OS và một trang web. Ứng dụng giúp phát hiện té ngã và dấu hiệu bất thường, và báo
        cho người thân mà bạn chọn. Trang này nói rõ dữ liệu nào được thu thập, vì sao, ai nhìn thấy và cách xóa.
      </p>

      <Section title="Không phải thiết bị y tế">
        <p>
          UII chỉ hỗ trợ cảnh báo. Ứng dụng không chẩn đoán, điều trị hay ngăn ngừa bệnh, và có thể bỏ sót hoặc báo nhầm. Không dùng
          UII để thay thế bác sĩ, thuốc hay dịch vụ cấp cứu. Trong tình huống khẩn cấp, hãy gọi 115.
        </p>
      </Section>

      <Section title="Dữ liệu được thu thập">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Từ đồng hồ, sau khi bạn đồng ý và cấp quyền:</strong> nhịp tim, chuyển động (gia tốc, tóm tắt theo cửa sổ vài giây),
            số bước, phần trăm pin. Khi có cảnh báo, kèm khoảng 10 giây chuyển động thô quanh thời điểm đó.
          </li>
          <li>
            <strong>Cảnh báo:</strong> loại (té ngã, co giật, dấu hiệu co giật), thời điểm, cách phát hiện (đồng hồ, thuật toán hay bạn
            bấm tay), độ tin cậy và trạng thái xử lý.
          </li>
          <li>
            <strong>Bạn nhập trên web:</strong> tên, ngày sinh, giới tính, nhóm máu, chiều cao, cân nặng, loại động kinh và ghi chú,
            dị ứng, bệnh nền, bác sĩ, bệnh viện, thuốc và lịch uống thuốc, người liên hệ khẩn cấp.
          </li>
          <li>
            <strong>Tài khoản:</strong> email và tên từ tài khoản Google bạn đăng nhập, các vòng người thân bạn tham gia.
          </li>
          <li>
            <strong>Vị trí:</strong> ứng dụng hiện chưa thu thập vị trí. Nếu thêm tính năng này, trang này và màn hình đồng ý trên
            đồng hồ sẽ được cập nhật trước.
          </li>
        </ul>
      </Section>

      <Section title="Dùng để làm gì">
        <ul className="list-disc space-y-2 pl-5">
          <li>Phát hiện té ngã và dấu hiệu bất thường, rồi báo cho người thân.</li>
          <li>Hiển thị biểu đồ, lịch sử cảnh báo và báo cáo tóm tắt cho bạn và người thân được mời.</li>
          <li>Hiển thị thẻ thông tin y tế trên đồng hồ sau khi một cảnh báo đã được gửi, và trên trang SOS khi có mã QR hợp lệ.</li>
          <li>Nhắc uống thuốc và đồng bộ lịch Google nếu bạn bật.</li>
        </ul>
        <p>Chúng tôi không bán dữ liệu và không dùng dữ liệu của bạn cho quảng cáo.</p>
      </Section>

      <Section title="Ai nhìn thấy dữ liệu">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Người thân trong vòng của bạn:</strong> theo vai trò bạn cấp (chủ, người giám hộ, người xem), họ thấy nhịp tim,
            cảnh báo và thông tin bạn đã nhập.
          </li>
          <li>
            <strong>Bất kỳ ai cầm đồng hồ:</strong> sau khi một cảnh báo được gửi, đồng hồ hiển thị thẻ y tế rút gọn (tên, tuổi, nhóm
            máu, ghi chú, dị ứng, bệnh nền, thuốc, tối đa 3 người liên hệ) không cần mã PIN, để người ở gần có thể giúp bạn.
          </li>
          <li>
            <strong>Người có liên kết hoặc mã QR SOS:</strong> xem thẻ SOS công khai bạn đã tạo; bạn có thể thu hồi bất cứ lúc nào.
          </li>
          <li>
            <strong>Nhà cung cấp hạ tầng:</strong> dữ liệu được lưu trên Supabase; email thông báo gửi qua Gmail; đăng nhập qua Google.
            Báo cáo tóm tắt được tạo bởi một dịch vụ mô hình ngôn ngữ do quản trị hệ thống cấu hình; dữ liệu tổng hợp của bạn được gửi
            tới dịch vụ đó để viết báo cáo.
          </li>
        </ul>
      </Section>

      <Section title="Lưu trữ và xóa">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Hiện chưa có thời hạn tự động xóa cho dữ liệu cảm biến và cảnh báo; chúng được giữ cho tới khi bạn xóa tài khoản.
          </li>
          <li>
            Bạn có thể xuất dữ liệu, thu hồi mọi liên kết SOS và xóa tài khoản tại{" "}
            <a href="/settings" className={linkCls}>
              Cài đặt
            </a>
            . Xóa tài khoản sẽ xóa hồ sơ, cảnh báo, thiết bị và liên kết.
          </li>
          <li>Bạn có thể gỡ đồng hồ khỏi tài khoản trên trang Thiết bị và gỡ ứng dụng bất cứ lúc nào; dữ liệu trên đồng hồ bị xóa khi gỡ.</li>
          <li>Bạn có thể rút lại quyền cảm biến trong Cài đặt của đồng hồ; ứng dụng sẽ ngừng theo dõi.</li>
        </ul>
      </Section>

      <Section title="Liên hệ">
        <p>
          {contact ? (
            <>
              Mọi câu hỏi hoặc yêu cầu về dữ liệu: <a href={`mailto:${contact}`} className={linkCls}>{contact}</a>.
            </>
          ) : (
            "Mọi câu hỏi hoặc yêu cầu về dữ liệu, hãy liên hệ quản trị viên của dịch vụ UII mà bạn đang dùng."
          )}
        </p>
      </Section>
    </main>
  );
}
