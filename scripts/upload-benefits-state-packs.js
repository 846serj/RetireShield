#!/usr/bin/env node

const { readFile, readdir } = require("node:fs/promises");
const { join } = require("node:path");
const { createClient } = require("@supabase/supabase-js");

const [directory] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.BENEFITS_CHECKLIST_STORAGE_BUCKET || "retire-shield-products";

if (!url || !serviceKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
if (!directory) throw new Error("Usage: npm run benefits:upload-packs -- <state-packs-directory>");

async function main() {
  const names = (await readdir(directory)).filter((name) => /^Benefits-Checklist-State-Pack-[A-Z]{2}\.pdf$/.test(name)).sort();
  if (names.length !== 51) throw new Error(`Found ${names.length} State Packs. Expected 51.`);
  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: bucketInfo, error: bucketError } = await supabase.storage.getBucket(bucket);
  if (bucketError) throw bucketError;
  if (!bucketInfo || bucketInfo.public) throw new Error(`The ${bucket} bucket must exist and be private.`);
  for (const name of names) {
    const bytes = await readFile(join(directory, name));
    if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error(`${name} is not a PDF.`);
    const { error } = await supabase.storage.from(bucket).upload(`benefits-checklist/state-packs/${name}`, bytes, { contentType: "application/pdf", cacheControl: "0", upsert: true });
    if (error) throw error;
    console.log(`Uploaded ${name}`);
  }
  console.log("All 51 State Packs are in private storage. Test one purchase before setting BENEFITS_CHECKLIST_STATE_PACKS_READY=true.");
}

main().catch((error) => { console.error(error.message || error); process.exitCode = 1; });
