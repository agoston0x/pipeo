/**
 * Inline script that runs before React hydrates — sets data-theme to avoid FOUC.
 */
export function ThemeScript() {
  const code = `
(function(){
  try {
    var stored = localStorage.getItem("po-theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "dark");
  }
})();`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
