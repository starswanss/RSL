export function Footer() {
  return (
    <footer className="border-t border-[color:var(--border)] mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[color:var(--text-dim)]">
        <p>
          <span className="rsl-gradient-text font-bold">Rajsima League (RSL)</span> — ลีกอีสปอร์ตแห่งโรงเรียนราชสีมาวิทยาลัย
        </p>
        <p>© {new Date().getFullYear()} RSL. สงวนลิขสิทธิ์.</p>
      </div>
    </footer>
  );
}
