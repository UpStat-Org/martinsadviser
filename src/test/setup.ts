import "@testing-library/jest-dom";

// jsdom's Blob predates the Blob.arrayBuffer()/text() promise API that every
// browser we target has shipped since 2019. Polyfill it via FileReader so code
// reading uploaded files (src/lib/spreadsheet.ts) is testable.
if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
  const read = <T>(blob: Blob, method: "readAsArrayBuffer" | "readAsText") =>
    new Promise<T>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as T);
      reader.onerror = () => reject(reader.error);
      reader[method](blob);
    });

  Blob.prototype.arrayBuffer = function () { return read<ArrayBuffer>(this, "readAsArrayBuffer"); };
  Blob.prototype.text = function () { return read<string>(this, "readAsText"); };
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
