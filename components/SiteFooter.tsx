export default function SiteFooter({ isSample }: { isSample: boolean }) {
  return (
    <footer className="border-t border-[var(--border)] px-5 py-10 text-sm text-[var(--muted)] sm:px-8">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Dữ liệu tổng hợp từ{' '}
          <a
            href="https://github.com/kubernetes/kubernetes/tree/master/CHANGELOG"
            target="_blank"
            rel="noreferrer"
            className="link-underline text-[var(--text)]"
          >
            CHANGELOG chính thức của kubernetes/kubernetes
          </a>
          .
        </p>
        <p className="text-[var(--faint)]">
          {isSample
            ? 'Đang chạy trên dữ liệu mẫu — chưa qua review.'
            : 'Nội dung do LLM tóm tắt — hãy đối chiếu changelog gốc trước khi dựa vào để ra quyết định.'}
        </p>
      </div>
    </footer>
  );
}
