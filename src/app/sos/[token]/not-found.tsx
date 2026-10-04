export default function SosNotFound() {
  return (
    <main className="mx-auto w-full max-w-[640px] flex-1 px-5 py-10">
      <h1 className="font-heading text-[32px] tracking-[-0.02em]">Thẻ không khả dụng</h1>
      <p className="mt-3 text-steel">Mã này không đúng, đã hết hạn hoặc đã bị thu hồi. Nếu đây là tình huống khẩn cấp, hãy gọi 115.</p>
      <a href="tel:115" className="mt-6 inline-block text-lg underline decoration-ember-orange decoration-1 underline-offset-[3px]">
        Gọi 115
      </a>
    </main>
  );
}
