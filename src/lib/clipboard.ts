/**
 * Copy text to the clipboard, with a fallback for the cases where the async
 * Clipboard API is unavailable or blocked.
 *
 * `navigator.clipboard` is undefined on insecure origins and rejects in some
 * mobile in-app browsers (the Instagram and Facebook webviews in particular,
 * which is exactly where our share links get opened). Call sites used to fire a
 * "copied" toast unconditionally, so a user could be told the copy worked when
 * nothing landed on their clipboard. Returns false instead of throwing so the
 * caller can show honest copy.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.error("[clipboard] writeText failed, falling back", e);
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch (e) {
    console.error("[clipboard] fallback copy failed", e);
    return false;
  }
}
