-- Additive PMKP schema; this migration leaves existing AUREKA objects untouched.
CREATE TABLE IF NOT EXISTS public."PmkpStandard" (
  id text PRIMARY KEY, code text NOT NULL UNIQUE, title text NOT NULL, description text,
  color text NOT NULL DEFAULT '#10b981', "sortOrder" integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS public."PmkpDocument" (
  id text PRIMARY KEY, "stdCode" text NOT NULL,
  "standardId" text NOT NULL REFERENCES public."PmkpStandard"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "subTopic" text NOT NULL, title text NOT NULL, description text, pic text,
  status text NOT NULL DEFAULT 'todo', progress integer NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  priority text NOT NULL DEFAULT 'Sedang', "dueDate" timestamp(3), "completedAt" timestamp(3),
  "pendukungDocs" text, "adminDocs" text, "regulasiDocs" text, notes text,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS public."PmkpActivity" (
  id text PRIMARY KEY, "documentId" text NOT NULL REFERENCES public."PmkpDocument"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  actor text NOT NULL, action text NOT NULL, "fromValue" text, "toValue" text, message text NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public."PmkpAttachment" (
  id text PRIMARY KEY, "documentId" text NOT NULL REFERENCES public."PmkpDocument"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  filename text NOT NULL, "filePath" text NOT NULL, "fileSize" integer NOT NULL DEFAULT 0,
  "mimeType" text, "uploadedBy" text NOT NULL DEFAULT 'Komite PMKP',
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public."User" (
  id text PRIMARY KEY, name text NOT NULL, username text NOT NULL UNIQUE, "passwordHash" text NOT NULL,
  role text NOT NULL DEFAULT 'user', "mustChangePassword" boolean NOT NULL DEFAULT true, active boolean NOT NULL DEFAULT true,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" timestamp(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "PmkpDocument_standardId_idx" ON public."PmkpDocument"("standardId");
CREATE INDEX IF NOT EXISTS "PmkpActivity_documentId_idx" ON public."PmkpActivity"("documentId");
CREATE INDEX IF NOT EXISTS "PmkpAttachment_documentId_idx" ON public."PmkpAttachment"("documentId");
CREATE INDEX IF NOT EXISTS "User_role_active_idx" ON public."User"(role, active);
ALTER TABLE public."PmkpStandard" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PmkpDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PmkpActivity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PmkpAttachment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PmkpStandard", public."PmkpDocument", public."PmkpActivity", public."PmkpAttachment", public."User" FROM anon, authenticated;
CREATE POLICY pmkp_deny_public_all ON public."PmkpStandard" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY pmkp_deny_public_all ON public."PmkpDocument" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY pmkp_deny_public_all ON public."PmkpActivity" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY pmkp_deny_public_all ON public."PmkpAttachment" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY pmkp_deny_public_all ON public."User" FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
