-- ==============================================================
-- supabase_fixes.sql — إصلاحات جانب قاعدة البيانات
-- مشروع: alfaprosys (alamdev)
-- نفّذ هذا الملف مرة واحدة في: Supabase → SQL Editor
-- ==============================================================


-- ──────────────────────────────────────────────────────────────
-- 1) إصلاح تسلسل معرّفات سجل التدقيق (audit_log)
-- ──────────────────────────────────────────────────────────────
-- المشكلة: العدّاد لم يتقدم بعد إدخال الصفوف الأولى، فيبقى يُنتج
-- id = 1 فيصطدم بصف موجود، ويفشل أي إدراج بـ:
--   409 duplicate key value violates unique constraint "audit_log_pkey"
-- (التطبيق يتفاداه حالياً لأنه يرسل المعرف صريحاً، لكن أي إدراج آخر يفشل)
-- ──────────────────────────────────────────────────────────────
SELECT setval(
  pg_get_serial_sequence('public.audit_log', 'id'),
  (SELECT COALESCE(MAX(id), 0) FROM public.audit_log)
);

-- تحقق: يجب أن يُرجع رقماً أكبر من أكبر معرف موجود
SELECT last_value FROM audit_log_id_seq;


-- ──────────────────────────────────────────────────────────────
-- 2) تأمين فهرس فريد لرمز السحب (draw_code)
-- ──────────────────────────────────────────────────────────────
-- التطبيق يولّد الرمز محلياً ويتحقق من تفرده داخل جهاز واحد فقط،
-- فاحتمال التكرار بين كاشيرَين قائم. هذا الفهرس يمنع التكرار على
-- مستوى القاعدة (القيم الفارغة مسموح تعددها في Postgres).
-- ──────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS invoices_draw_code_key
  ON public.invoices (draw_code)
  WHERE draw_code IS NOT NULL;


-- ══════════════════════════════════════════════════════════════
-- 3) ⚠️ تقييد سياسات RLS — راجع قبل التنفيذ
-- ══════════════════════════════════════════════════════════════
-- فحص 13/09/2026 أظهر أن المفتاح العام (anon) يستطيع القراءة
-- والكتابة والتعديل والحذف في الجداول المالية. هذا مقبول أثناء
-- التطوير فقط.
--
-- للتحقّق من السياسات الحالية:
--
--   SELECT tablename, policyname, cmd, roles
--   FROM pg_policies WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- للتقييد بعد ربط نظام مستخدمين، استبدل سياسات الكتابة بشرط دور،
-- مثال:
--
--   DROP POLICY IF EXISTS "anon all on invoices" ON public.invoices;
--   CREATE POLICY "staff write invoices" ON public.invoices
--     FOR ALL TO authenticated
--     USING (true) WITH CHECK (true);
--   CREATE POLICY "anon read invoices" ON public.invoices
--     FOR SELECT TO anon USING (true);
--
-- ملاحظة: صفحة تتبع الطلب (track.html) تعمل بمفتاح anon وتحتاج
-- سياسة SELECT على public.invoices و public.invoice_items.
-- ══════════════════════════════════════════════════════════════

-- تنظيف صفوف الاختبار المؤقتة (إن وُجدت)
DELETE FROM public.audit_log WHERE module = '__rls_test__';
