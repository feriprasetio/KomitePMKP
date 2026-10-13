const BUCKET = "pmkp-evidence";

function config() {
  const base = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Konfigurasi Supabase Storage belum tersedia di server.");
  return { base, key };
}

function encodeObjectPath(objectPath: string) {
  const parts = objectPath.split("/");
  if (!objectPath || parts.some((p) => !p || p === "." || p === ".." || p.includes("\0") || p.includes("\\"))) {
    throw new Error("Path objek penyimpanan tidak valid.");
  }
  return parts.map(encodeURIComponent).join("/");
}

function authHeaders(key: string) {
  return { apikey: key, Authorization: "Bearer " + key };
}

export async function uploadPrivateObject(objectPath: string, bytes: Uint8Array, contentType: string) {
  const { base, key } = config();
  const path = encodeObjectPath(objectPath);
  const response = await fetch(base + "/storage/v1/object/" + BUCKET + "/" + path, {
    method: "POST",
    headers: {
      ...authHeaders(key),
      "Content-Type": contentType || "application/octet-stream",
      "x-upsert": "false",
      "cache-control": "3600",
    },
    body: bytes as BodyInit,
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Supabase Storage upload failed", response.status, detail.slice(0, 300));
    throw new Error("Unggah berkas ke penyimpanan privat gagal.");
  }
}

export async function readPrivateObject(objectPath: string) {
  const { base, key } = config();
  const path = encodeObjectPath(objectPath);
  const response = await fetch(base + "/storage/v1/object/authenticated/" + BUCKET + "/" + path, {
    method: "GET",
    headers: authHeaders(key),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("Supabase Storage read failed", response.status);
    throw new Error("Berkas tidak ditemukan atau tidak dapat dibaca.");
  }
  return new Uint8Array(await response.arrayBuffer());
}

export async function deletePrivateObject(objectPath: string) {
  const { base, key } = config();
  const path = encodeObjectPath(objectPath);
  const response = await fetch(base + "/storage/v1/object/" + BUCKET, {
    method: "DELETE",
    headers: { ...authHeaders(key), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [objectPath] }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Supabase Storage delete failed", response.status, detail.slice(0, 300));
    throw new Error("Berkas tidak berhasil dihapus dari penyimpanan.");
  }
}
