#!/usr/bin/env node

const { readFile } = require("node:fs/promises");
const { basename } = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const [guidePath, trackerPath, settlementsPath] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.BENEFITS_CHECKLIST_STORAGE_BUCKET || "retire-shield-products";

if (!url || !serviceKey) {
  throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before uploading.");
}
if (!guidePath || !trackerPath || !settlementsPath) {
  throw new Error("Usage: npm run benefits:upload -- <guide.pdf> <tracker.pdf> <settlements.pdf>");
}

const files = [
  [guidePath, "benefits-checklist/The-Benefits-Checklist-2026-2027.pdf"],
  [trackerPath, "benefits-checklist/Benefits-Checklist-Printable-Tracker.pdf"],
  [settlementsPath, "benefits-checklist/Benefits-Checklist-Open-Settlements.pdf"],
];

async function main() {
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket(bucket);
  if (bucketError && !/not found/i.test(bucketError.message)) throw bucketError;
  if (!bucketInfo) {
    const { error } = await supabase.storage.createBucket(bucket, { public: false, fileSizeLimit: 10 * 1024 * 1024 });
    if (error) throw error;
  } else if (bucketInfo.public) {
    throw new Error(`Refusing to upload paid files: Supabase bucket ${bucket} is public.`);
  }

  for (const [localPath, objectPath] of files) {
    const bytes = await readFile(localPath);
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error(`${basename(localPath)} is not a PDF.`);
    const { error } = await supabase.storage.from(bucket).upload(objectPath, bytes, {
      contentType: "application/pdf",
      cacheControl: "0",
      upsert: true,
    });
    if (error) throw error;
    console.log(`Uploaded ${basename(localPath)} -> ${bucket}/${objectPath}`);
  }

  console.log("All three private Benefits Checklist files are ready. Set BENEFITS_CHECKLIST_DOWNLOADS_READY=true only after a Stripe test-mode purchase passes end to end.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});

