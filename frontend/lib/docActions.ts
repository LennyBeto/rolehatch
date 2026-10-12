// frontend/lib/docActions.ts
// Every action receives `authorized`: a promise that resolves once the server has spent the
// download, and rejects if the user is locked or the check failed. An action must never hand
// the document to the user before `authorized` resolves.
export type Authorized = Promise<void>;

/** Opens the print dialog and resolves when it closes (printed or cancelled). */
export async function printDocument(authorized: Authorized): Promise<void> {
  await authorized;
  await new Promise<void>((resolve) => {
    let fallback: number | undefined;
    const finish = () => {
      window.removeEventListener("afterprint", finish);
      if (fallback !== undefined) window.clearTimeout(fallback);
      resolve();
    };
    window.addEventListener("afterprint", finish);
    fallback = window.setTimeout(finish, 120_000); // safety net if a browser never fires afterprint
    window.print();
  });
}

/** Copies text to the clipboard; throws if every method is blocked. */
export async function copyText(text: string, authorized: Authorized): Promise<void> {
  // Start the clipboard write inside the click gesture and let its data resolve after the
  // server check: this is the pattern Safari needs, and Chrome/Firefox accept it too.
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    const blob = authorized.then(() => new Blob([text], { type: "text/plain" }));
    blob.catch(() => {});
    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return;
    } catch {
      await authorized; // not authorized: rethrow the real reason (locked / network)
      // authorized, but the browser refused this write: fall through to the legacy paths
    }
  }

  await authorized;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      /* fall through to the textarea method */
    }
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  if (!ok) throw new Error("Copy failed");
}

/** Saves a Blob as a file (the object URL is revoked late so the download isn't cut off by navigation). */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Saves text as a .txt file. */
export async function downloadTextFile(filename: string, text: string, authorized: Authorized): Promise<void> {
  await authorized;
  saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), filename);
}