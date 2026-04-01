export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50/90 py-5 text-center text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-950/90 dark:text-neutral-400">
      <p className="">
        Helper Crossword · {new Date().getFullYear()} · Cursor AI · by <span className="font-bold">JuanVelasco03</span>
      </p>
    </footer>
  );
}
