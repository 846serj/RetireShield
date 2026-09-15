import assert from "node:assert/strict";
import test from "node:test";
import { createStoredZip } from "./zip";

test("download-everything ZIP has local, central, and end records", () => {
  const zip = createStoredZip([
    { name: "guide.pdf", data: new Uint8Array([1, 2, 3]) },
    { name: "state.pdf", data: new Uint8Array([4, 5]) },
  ]);
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.ok(Buffer.from(zip).includes(Buffer.from("guide.pdf")));
  assert.ok(Buffer.from(zip).includes(Buffer.from("state.pdf")));
  assert.equal(view.getUint32(zip.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(zip.length - 14, true), 2);
});
