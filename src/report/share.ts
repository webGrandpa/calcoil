/** Hand the report to the phone's share sheet (Mail, Gmail, Outlook…) or fall back to download + mailto. */
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function downloadFile(bytes: Uint8Array, name: string, type = XLSX) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export type ShareOutcome = 'shared' | 'cancelled' | 'mailto';

export async function emailReport(
  bytes: Uint8Array,
  name: string,
  subject: string,
  body: string,
  to: string,
): Promise<ShareOutcome> {
  const file = new File([bytes as BlobPart], name, { type: XLSX });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && nav.share) {
    try {
      await nav.share({ files: [file], title: subject, text: body });
      return 'shared';
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
      // Some browsers refuse files at the last moment; fall through to the mailto route.
    }
  }
  downloadFile(bytes, name);
  const q = `subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = `mailto:${encodeURIComponent(to.trim()).replace(/%40/g, '@').replace(/%2C/gi, ',')}?${q}`;
  return 'mailto';
}
