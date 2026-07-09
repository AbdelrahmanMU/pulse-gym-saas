# PULSE — Arabic Localization Authority
### المرجع الرسمي للغة العربية في المنتج · Head of Product Localization deliverable

| | |
|---|---|
| **Status** | ✅ **ACCEPTED (2026-07-05)** — the official implementation source of truth for Arabic. Amended per the final product-language review (see Amendment log below). No further terminology debates; any change is a versioned, human-approved amendment to this document. |
| **Scope** | The official Arabic product language for all of PULSE. Source language = the frozen English (design authority §D14 + review §5). |
| **Primary market** | Egypt · Secondary: Saudi Arabia, UAE, Kuwait, Jordan |
| **Register** | Modern Standard Arabic written naturally for daily business — the words a gym owner says across the desk, never literal translation, never governmental/academic Arabic |
| **Sources read in full** | `docs/domain/business-rules.md` · `design-system-v1.2.md` · `pulse-component-catalog.md` (incl. §13) · `member-workspace-product-ux-review.md` · `member-workspace-design-authority.md` (§D14 = frozen English source) |
| **Date** | 2026-07-04 · final product-language review + acceptance 2026-07-05 |

> **Rule of authority.** On any Arabic wording question, this document wins. The English §D14
> vocabulary remains the *source*; this document is the *target truth*. Where Arabic deliberately
> deviates from a literal rendering of frozen English (e.g., «تسجيل اشتراك» for "Sell membership"),
> the deviation is ruled here with its reason — implementation follows this document, not the
> dictionary meaning of the English.

> **Amendment log — final product-language review, human-accepted 2026-07-05:**
> **C1** owed money «عليه/عليها N» → **«مستحق N»** (gender-free bill language; the مستحق family) ·
> **C2** strip calm line «✓ مدفوع بالكامل» → **«✓ لا مستحقات»** (strip only; the card keeps مدفوع
> بالكامل) · **C3** Sell membership «اشتراك جديد» → **«تسجيل اشتراك»** · **C4** New plan «باقة
> جديدة» → **«إضافة باقة»** (uniform creation grammar) · **C5** «مستحق/مستحقات» **unbanned** —
> promoted to official money vocabulary; «متبقي» is now time-only · success-message standard set
> (تم/تمت + the button's masdar; generic «بنجاح» banned) · forbidden list expanded (Deliverable 10) ·
> two acceptance additions: **context-sensitive status phrasing** (Deliverable 2 rule 7) and
> **user-created names are never translated** (Deliverable 2 rule 8).

---

## Phase 1 — Understanding check (what this authority is built on)

**Domain understood:** Gym (tenant, absolute isolation) → Branch → Owner/Trainer (permission
bundles, never role-branching) → Member (archived, never erased) → Plan (sellable, snapshot on
sale) → Membership (Active/Frozen/Scheduled/Expired/Cancelled; status alone controls access) →
Payment (immutable ledger, void-never-edit, standing derived: Paid/Partly paid/Unpaid) →
Notification (in-app, Unread→Read→Dismissed). Renewal = new membership, new snapshot. Upgrade =
deferred, no proration. Freeze extends the end date by actual frozen days (resume copy must never
promise the projected date — "estimate" discipline).

**Product philosophy understood:** the Member Workspace is one page — Answer Strip (3 facts + 1
computed action, hard budget, calm state = no button) → Membership Rail (one continuous story:
Next conditional slot, Current expanded, connectors, gaps, severed cancellations, terminus) →
folded Alerts + Member info. Money has exactly two homes (strip L3 aggregate, card Panel 3
detail). Dangerous ≡ terminal → behind one deliberate step; invalid actions are absent, never
disabled. Vocabulary §D14 is FROZEN in English and explicitly feeds this Localization Sprint.

**Design constraints understood:** tokens only, StatusBadge with icon + label (never color
alone), MetricValue for every number, `<time>` for dates, mono tabular numerals, adaptive-first
(one DOM order, reflow only), ≥44px targets, uppercase badge labels (an English-only convention —
see §D8), trailing `…` = opens a confirm (frozen convention, kept in Arabic).

**Contradiction check — result:** no contradiction *between* the five documents. Six
localization-level tensions existed where natural Arabic cannot follow the English convention
literally; each was surfaced, challenged in the final product-language review, and is now
**resolved** (see **§ Rulings** at the end). Nothing was resolved silently.

---

## Deliverable 1 — Arabic Product Vocabulary Authority

One official term per concept. The test applied to every row: *what does a real Egyptian gym
owner/receptionist say out loud at the desk?* — then verified it survives in KSA/UAE/Kuwait/Jordan.

### 1.1 Core nouns

| Concept | Official Arabic | Why this word — and why not the alternatives |
|---|---|---|
| **Gym** | **الجيم** | The word every Egyptian and Gulf gym operator actually says ("صاحب الجيم", "الجيم اللي في الدور التاني"). «النادي» implies a social/sports club with pools and courts; «الصالة الرياضية» is academic Arabic nobody uses at a desk. A loanword that *is* the trade word beats a "correct" word nobody says. *(Ruled R1: accepted.)* |
| **Branch** | **الفرع** | Universal business Arabic in all five markets. No competitor. |
| **Member** | **العضو** (ج: الأعضاء) | Gyms say «عضو» ("عضو جديد", "العضو ده اشتراكه خلص"). «مشترك» is telecom register (a phone-line subscriber); «عميل»/«زبون» is retail register and frames the person as a transaction, not a relationship. عضو + اشتراك is exactly the natural Egyptian pairing. |
| **Membership** | **الاشتراك** (ج: الاشتراكات) | THE trade word — already predicted by the UX review §5 ("اشتراك is the trade word"). «عضوية» is the formal dictionary rendering; desks say «اشتراكه خلص»، «جدد اشتراكك»، never «عضويته انتهت». One noun, everywhere, forever. |
| **Plan** | **الباقة** (ج: الباقات) | The pan-Arab commercial word for a priced offering (telecom normalized it: «باقات»). «خطة» is strategy/consulting register; «برنامج» collides with training programs; «عرض» means a promotion (a future, different concept). |
| **Trainer** | **المدرب** (ج: المدربون) | The correct written register everywhere. Spoken Egypt says «كابتن» — that is a *form of address*, not a label; a future Egyptian-dialect layer may prefix displayed names with «كابتن», but the MSA label is المدرب. *(Ruled R6: parked.)* |
| **Staff** | **فريق العمل** · individual: **موظف** | Warm, business-natural ("الفريق"). «الموظفون» as a title is HR/governmental register; «الستاف» is spoken-only. |
| **Owner** | **المالك** | Role-bundle display name. Spoken Egypt says «صاحب الجيم» — usable in prose/marketing, but the one official label is المالك. |
| **Dashboard** | **الرئيسية** | Operators say «افتح الرئيسية». «لوحة التحكم» means a *control/settings* panel (hosting-cPanel register) and misdescribes a monitoring surface; «لوحة المعلومات» is translated-Arabic. |
| **Reports** | **التقارير** | Standard, natural. |
| **Notifications** (global queue) | **الإشعارات** | Matches the phone-notification concept — which is *correct* here, since this is the app-level queue. |
| **Alerts** (member workspace section) | **التنبيهات** | Preserves the English Alerts↔Notifications split 1:1 (تنبيهات↔إشعارات). A تنبيه is a warning about a fact; an إشعار is an app message. |
| **Payment** | **الدفعة** (ج: الدفعات) | The desk word ("سجّل له دفعة", "دفع دفعتين"). «مدفوعات» is accounting-report register; «معاملة» is banking register. Section title = **الدفعات**. |
| **Settings** | **الإعدادات** | Universal app Arabic. |

### 1.2 Membership lifecycle vocabulary

| Concept | Official Arabic | Why |
|---|---|---|
| Active (membership) | **ساري** | «الاشتراك ساري» is the natural Arabic of a valid subscription (سريان). «نشط» is software register and is *reserved* for the member level (see below); «فعال» is vague. |
| Frozen | **مجمّد** | Gym-universal in Arabic exactly as in English («جمّدله الاشتراك»). |
| Scheduled | **قادم** | Operators think "the *next* one", not "a scheduled one". «مجدول» is calendar/meetings register and would puzzle a receptionist. قادم also matches the rail's Next slot (القادم) — one mental model, one word. |
| Expired | **منتهي** | Natural and unambiguous («اشتراكه منتهي»). |
| Cancelled | **ملغي** | Natural pair with the action إلغاء. |
| Expiring soon (flag) | **ينتهي قريبًا** | Plain statement; no drama. |
| Member — active | **نشط** (badge: «عضو نشط») | Member-level state, deliberately a *different word family* from ساري so the two levels (member vs membership) can never be confused in Arabic — a clarity the English (ACTIVE/ACTIVE) doesn't even have. |
| Member — archived | **مؤرشف** (badge: «عضو مؤرشف») | «الأرشيف» went mainstream via WhatsApp — every operator understands archived-not-deleted, which is precisely ARC-1/ARC-2 semantics. «معطّل»/«موقوف» would wrongly imply punishment or access-blocking. |
| Current / Next / Past membership | **الاشتراك الحالي** / **القادم** / **اشتراكات سابقة** | Direct, desk-natural, 1:1 with the frozen English. |
| Joined the gym | **انضم للجيم** | Relationship word, matches the rail terminus intent. |

### 1.3 Action verbs (see Deliverable 5 for the full operational review)

| Action | Official Arabic | Why |
|---|---|---|
| Sell membership | **تسجيل اشتراك** | Final-review ruling (C3). The desk says «سجّلي له اشتراك»; التسجيل is native gym vocabulary (gyms literally have a تسجيل desk), it obeys the verbal-noun button law, and it is perfectly symmetric with «تسجيل دفعة». «بيع» reads as merchandise at the moment of serving a person; «إنشاء» is database-speak; the first-draft «اشتراك جديد» violated the button grammar (noun phrase, not masdar). The *sale* semantics stay in reports (المبيعات is fine in reporting register). |
| Renew | **تجديد** (full: تجديد الاشتراك) | Exactly what operators say («جدده»). |
| Freeze | **تجميد** | Gym-universal. |
| Resume | **فك التجميد** | Banking-familiar («فك تجميد الحساب») and the perfect mirror of تجميد. Chosen **over** «إلغاء التجميد» to avoid any collision with إلغاء الاشتراك (cancel), and over «استئناف» which is court/parliament register. |
| Record payment | **تسجيل دفعة** | «سجّل له دفعة» is the spoken phrase, and honesty is preserved (the system records money already taken — no processing). |
| Void payment | **شطب الدفعة** | شطب literally means *strike out* — matching both the ledger semantics (correction that stays visible) and the exact visual (struck-through row). «حذف» would lie (nothing is deleted); «إلغاء» collides with cancel; «إبطال» is legal register. Voided row label: **مشطوبة: السبب**. |
| Cancel membership | **إلغاء الاشتراك…** | Terminal, natural. Trailing … kept (opens confirm — frozen convention). |
| Cancel before start | **إلغاء قبل البداية…** | 1:1 with the Next-card action. |
| Assign / Replace trainer | **تعيين مدرب** / **تغيير المدرب** | Natural HR-lite phrasing. |
| Edit member | **تعديل بيانات العضو** | Desk says «عدّل بياناته». |
| Archive member | **أرشفة العضو…** | Pairs with مؤرشف (above). |
| Reactivate member | **استعادة العضو** | "Bring him back" — warmer and clearer than «إلغاء الأرشفة». |
| Suspend staff / Reactivate | **إيقاف الحساب** / **إعادة التفعيل** | Suspend blocks sign-in — إيقاف is honest; the *member* archive deliberately does NOT use إيقاف so the two lifecycles never blur. |
| Change plan (upgrade path) | **تغيير الباقة** | The W-2 confirm-sheet pointer. Upgrade connector: **ترقية**; downgrade connector: **انتقال لباقة أصغر** (mirrors the English ban on "Downgrade" — never «تخفيض»). |
| Show older | **عرض الأقدم** | Rail progressive disclosure. |

---

## Deliverable 2 — Vocabulary Consistency Rules (strict, binding)

1. **One concept, one word — forever.** The dictionary (Deliverable 12) is closed vocabulary.
   A new string reuses these words or the concept doesn't exist yet.
2. **Never mix:**
   - **عضو** vs مشترك / عميل / زبون / مستخدم → Member is **عضو** only.
   - **اشتراك** vs عضوية → Membership is **اشتراك** only. عضوية never appears.
   - **باقة** vs خطة / برنامج / عرض → Plan is **باقة** only.
   - **الجيم** vs نادي / صالة / مركز → the business is **الجيم** only.
   - **دفعة** vs مدفوعات / معاملة / تحصيل → a payment is **دفعة**؛ the section is **الدفعات**.
   - **تنبيهات** (member workspace) vs **إشعارات** (global queue) — two different concepts,
     never swapped, never both for one thing.
   - **ساري** (membership) vs **نشط** (member) — level-locked. A membership is never نشط;
     a member is never ساري.
   - **إلغاء** (cancel membership) vs **شطب** (void payment) vs **أرشفة** (archive member)
     vs **إيقاف** (suspend staff) — four different terminal/corrective verbs for four different
     concepts. Never substitute one for another.
   - **تجميد / فك التجميد** — the only freeze pair. Never إيقاف مؤقت، تعليق، استئناف.
3. **Money words are ONE locked family:** **مستحق N** (owed — strip, rows, chips, summaries) ·
   **لا مستحقات** (nothing owed) · **مدفوع / مدفوع جزئيًا / غير مدفوع** (standing badges).
   **«متبقي» is reserved for TIME only** («متبقي 58 يومًا») — money and time never share a word.
   No other owed-ness vocabulary exists (see Deliverable 7). *(Amended C1/C5.)*
4. **Trailing «…» convention carries over unchanged:** an action ending in … opens a
   confirmation. No … = immediate.
5. **Actor attribution is a bare name** («عمر»)، never «بواسطة عمر» — «بواسطة» is the single
   loudest marker of translated Arabic and is banned (Deliverable 10).
6. **Internal names never surface** (exactly as in English): Answer Strip، Rail، Workspace،
   Timeline، Zone — no Arabic equivalents exist because no user ever sees them.
7. **Context-sensitive status phrasing (the one sanctioned variation — acceptance addition).**
   Rule 1 locks *concepts to word families*, not every context to one literal string: a status
   may phrase differently per UI context **while preserving the same domain meaning**, provided
   every variant is ruled in this document. Canonical cases: standing badge **«مدفوع»** → card
   Panel 3 line **«✓ مدفوع بالكامل — لا مستحقات»** → strip calm **«✓ لا مستحقات»** (one domain
   fact, three subjects: the payment standing, the membership, the member); membership **«ساري»**
   vs member **«نشط»** (one English word ACTIVE, two levels). Variants never cross word families
   and are never improvised at implementation time — a needed new variant is an amendment to this
   document, not a translator's choice.
8. **User-created names are never translated (acceptance addition — hard rule).** Gym name,
   branch names, plan names, member names, trainer/staff names, notes, and every other piece of
   user-entered text render **verbatim as entered** — never translated, transliterated, re-cased,
   or reworded by the system, in any locale, in any direction. They are bidi-isolated inside
   Arabic sentences (Deliverable 8 rule 3). Only PULSE-owned UI strings localize.

---

## Deliverable 3 — Tone of Voice Guide (شخصية المنتج)

**PULSE in Arabic is:** محترف · عملي · ودود · واثق · مختصر. It talks like a sharp gym manager —
someone who respects the operator's time, never lectures, never begs, never panics.

### The seven writing laws

1. **البدء بالفعل أو بالمعلومة، لا بالمجاملة.** No «الرجاء»، «يرجى»، «من فضلك» in operational
   UI. Direct MSA is polite by being clear: «أدخل المبلغ» not «الرجاء إدخال المبلغ».
2. **«قم بـ» ممنوعة منعًا باتًا.** The #1 marker of machine-translated Arabic.
   «قم بإضافة عضو» → **«أضف عضوًا»**. Always the direct verb.
3. **«الخاص بك» ممنوعة.** Use the possessive suffix: «اشتراكك»، «جيمك» — never
   «الاشتراك الخاص بك».
4. **Buttons are verbal nouns (مصدر)، not imperatives.** «تسجيل دفعة»، «تجديد»، «إضافة عضو».
   This is the established Arabic software grammar (تسجيل الدخول، إرسال، حفظ) and reads as the
   *name of the action*. ⚠ This deliberately deviates from the English "imperative, verb-first"
   D14 convention — Arabic imperatives on buttons read as barking at the user.
   Inline/body-text instructions may use the imperative («أضف أول عضو»).
5. **Sentences are short and singular.** One fact per sentence. If a sentence needs «و» twice,
   split it.
6. **Confident, never dramatic.** No exclamation marks in operational copy (one is allowed in a
   first-run empty state at most). Warnings state the fact and the way out — they never scold.
7. **Address the operator directly and simply** (standard unmarked masculine imperative/second
   person — the Arabic software convention used by Apple/Google). Data about *members* respects
   gender where the copy requires it (see Deliverable 7, «عليه/عليها»).

### Register calibration examples

| ❌ Translated / wrong register | ✅ PULSE Arabic |
|---|---|
| قم بإضافة عضو جديد للبدء في إدارة الاشتراكات الخاصة بك | أضف أول عضو وابدأ. |
| يرجى العلم أنه لا توجد اشتراكات حالية لهذا العضو | لا يوجد اشتراك حالي |
| فشلت عملية تحميل البيانات، الرجاء المحاولة لاحقًا | تعذر تحميل البيانات — أعد المحاولة |
| تمت العملية بنجاح! | تم تسجيل الدفعة |
| هل أنت متأكد أنك تريد القيام بإلغاء هذا الاشتراك؟ | إلغاء الاشتراك؟ |

---

## Deliverable 4 — UI Copy Guide (rules per surface category)

| Category | Rule | Canonical examples |
|---|---|---|
| **Buttons** | مصدر (verbal noun) · ≤ 3 words · one primary per screen · trailing … iff confirm opens | «تسجيل دفعة» · «تجديد» · «تسجيل اشتراك» · «إلغاء الاشتراك…» |
| **Page titles** | Bare noun, definite article, no verbs | «الأعضاء» · «الرئيسية» · «التقارير» · member page = the member's name only |
| **Section titles** | Bare noun; count/summary after an em-space dash | «الاشتراك» · «التنبيهات — 1 غير مقروء» · «بيانات العضو» |
| **Cards / rows** | Facts, no prose. Label: value. Numbers via MetricValue (Latin digits, mono) | «1 يوليو · 500 ج.م · نقدًا · عمر» |
| **Badges / status chips** | 1–2 words, no verbs, tone token + icon carries urgency (Arabic has no uppercase — weight does the work, §D8) | «ساري» · «مجمّد» · «مدفوع جزئيًا» · «ينتهي قريبًا» |
| **Dialogs (confirm)** | Title = the action as a question «إلغاء الاشتراك؟» · body = consequence in one sentence + the way out · confirm button repeats the action verb · **safe/dismiss button is always «رجوع»** (never «إلغاء» — reserved for cancel-membership; this kills the إلغاء-vs-إلغاء collision globally) | Title: «إلغاء الاشتراك؟» Body: «سيتوقف هذا الاشتراك نهائيًا ولا يمكن تجديده. إذا عاد العضو، أنشئ اشتراكًا جديدًا.» Buttons: [رجوع] [إلغاء الاشتراك] |
| **Warnings** | Fact + consequence + action. Warning tone token + icon, never color alone | «لا يوجد تجديد قادم — ينتهي خلال 6 أيام [تجديد]» |
| **Errors** | «تعذر + المصدر» formula + one recovery step. Never «فشل»، never blame, never codes | «تعذر حفظ العضو — أعد المحاولة» · retry: «إعادة المحاولة» |
| **Field validation** | State the rule violated, name the fix | «رقم الهاتف مطلوب» · «رقم الهاتف مسجل لعضو آخر» (the INV-3 duplicate-phone case) |
| **Success (Toast)** | **Every action has its own message** — the generic «تمت العملية بنجاح» is banned. Formula: **تم/تمت + the button's exact masdar phrase, definite** (تمت before feminine masdars: إضافة، أرشفة، استعادة، إعادة — «تم إضافة» is the classic translated-Arabic bug). «بنجاح» as a suffix is banned — تم already means it succeeded. The full canonical set: | «تم تسجيل الدفعة» · «تم شطب الدفعة» · «تم تسجيل الاشتراك» · «تم تجديد الاشتراك» · «تم تجميد الاشتراك» · «تم فك التجميد» · «تم إلغاء الاشتراك» · «تمت إضافة العضو» · «تم حفظ التعديلات» · «تمت أرشفة العضو» · «تمت استعادة العضو» · «تم تعيين المدرب» · «تم تغيير المدرب» · «تمت إضافة الباقة» · «تمت إضافة الموظف» · «تم إيقاف الحساب» · «تمت إعادة التفعيل» |
| **Empty states** | Fact + invitation (imperative allowed here) + CTA | «لا يوجد أعضاء بعد — أضف أول عضو.» [إضافة عضو] |
| **No-results states** | Fact + clear-filters offer, no create CTA | «لا نتائج مطابقة» [مسح الفلاتر] |
| **Loading** | Prefer skeletons (no text). If a label is required: «جارٍ التحميل…» — nothing more creative | — |
| **Calm states** | Designed absence, exactly like English: quiet ✓ line or nothing | «✓ مدفوع بالكامل» · calm strip = no button |

---

## Deliverable 5 — Operational Language Review (every action challenged)

Each wording was challenged with: *say it out loud at the desk — does anyone actually say this?*

| Operation | Challenged candidates | Ruling + reason |
|---|---|---|
| Sell membership | بيع اشتراك · إنشاء اشتراك · اشتراك جديد · تسجيل اشتراك | **تسجيل اشتراك** (C3). «بيع» is ledger-speak; «إنشاء» is database-speak; «اشتراك جديد» (first draft) violated the verbal-noun button law. The desk says «سجّلي له اشتراك»; symmetric with «تسجيل دفعة»; toast: «تم تسجيل الاشتراك». The two تسجيل buttons never compete — precedence computes one primary. |
| Renew | تجديد · إعادة اشتراك | **تجديد.** Uncontested — the universal word. Confirm button carries the plan + price: «تجديد — Gold Monthly · 1,200 ج.م» (walkthrough W-2 rule), with the muted line: «باقة مختلفة؟ استخدم «تغيير الباقة» من بطاقة الاشتراك.» and the frozen fact: «يبدأ عند انتهاء الاشتراك الحالي.» |
| Freeze | تجميد · إيقاف مؤقت · تعليق | **تجميد.** The others imply punishment/suspension and blur the staff-suspend concept. Days quick-picks 7/14/30 label: «كم يومًا؟». |
| Resume | فك التجميد · إلغاء التجميد · استئناف | **فك التجميد.** إلغاء collides with cancel; استئناف is courtroom register. Confirm copy (estimate discipline, frozen): «مجمّد منذ 9 أيام — يمتد تاريخ الانتهاء بعدد أيام التجميد الفعلية.» Never shows the projected date as a promise. |
| Record payment | تسجيل دفعة · استلام دفعة · تحصيل | **تسجيل دفعة.** «تحصيل» is debt-collector register (harsh); «استلام» implies a receipt flow that doesn't exist. تسجيل is honest: the money was already taken. |
| Void payment | شطب · حذف · إلغاء · إبطال | **شطب الدفعة.** See D1.3 — matches semantics and the struck-through visual. Reason field: «سبب الشطب» (required). |
| Cancel membership | إلغاء الاشتراك · إنهاء الاشتراك | **إلغاء الاشتراك…** «إنهاء» sounds like natural expiry; cancellation is a deliberate cut and إلغاء says so. |
| Assign trainer | تعيين مدرب · إسناد مدرب | **تعيين مدرب.** «إسناد» is paperwork Arabic. Unassigned state: «لا يوجد مدرب». |
| Archive member | أرشفة · تعطيل · إيقاف · حذف | **أرشفة العضو…** Reversible-and-preserved is exactly what أرشيف means to a WhatsApp-era user. Blocked-archive policy message (surfaced verbatim per D6.1): «لا يمكن أرشفة العضو — لديه اشتراك ساري أو قادم أو مجمّد، أو مبلغ مستحق. أغلق الاشتراك وسوِّ المستحق أولًا.» |
| Suspend staff | إيقاف الحساب · تجميد الحساب · تعطيل | **إيقاف الحساب.** تجميد is reserved for memberships — a hard consistency rule; blurring them would teach operators that a suspended employee "resumes with extension", which is nonsense. |

---

## Deliverable 6 — Member Workspace Language (§D14, localized line by line)

### 6.1 Answer Strip (المثال الكامل)

```
L1  سارة عادل  [عضو نشط]        ·  المدرب عمر · منذ يناير 2026        ⋯
L2  Gold Monthly · ساري · ينتهي 30 أغسطس — متبقي 58 يومًا
L3  ⚠ مستحق 400 ج.م                      |  ✓ لا مستحقات
L4  [ تسجيل دفعة ]                        (calm state = no button)
```

- L2 grammar frozen: `<الباقة> · <الحالة> · <عبارة الحدود>`. Plan names are user data — never
  translated, bidi-isolated (§D8).
- Overflow ⋯ menu: «تعديل بيانات العضو» (only item, v1).

### 6.2 Coverage phrases (frozen Arabic)

| English (frozen source) | Arabic (frozen target) |
|---|---|
| ends Aug 30 — 58 days left | ينتهي 30 أغسطس — متبقي 58 يومًا |
| (last day included) | (شامل آخر يوم) |
| starts Sep 1 | يبدأ 1 سبتمبر |
| Frozen since Jun 20 · resumes ~Jul 4 (estimate) | مجمّد منذ 20 يونيو · يعود 4 يوليو (تقريبًا) |
| planned 14 days · projected end Sep 13 (estimate) | مخطط 14 يومًا · نهاية متوقعة 13 سبتمبر (تقريبًا) |
| end extended 12 days | امتد تاريخ الانتهاء 12 يومًا |
| Frozen Jun 20 → resumed Jul 2 · 12 days | مجمّد 20 يونيو – فُك 2 يوليو · 12 يومًا |
| No membership · 21 days (gap) | بدون اشتراك · 21 يومًا |
| No membership · 21 days and counting (gap-to-now) | بدون اشتراك منذ 21 يومًا |
| NO RENEWAL QUEUED — ends in 6 days | لا يوجد تجديد قادم — ينتهي خلال 6 أيام |
| NO MEMBERSHIP — ended Mar 31 (21 days ago) | بدون اشتراك — انتهى 31 مارس (منذ 21 يومًا) |
| NO MEMBERSHIP — cancelled Feb 8 | بدون اشتراك — أُلغي 8 فبراير |
| No membership yet | لا يوجد اشتراك بعد |
| Starts Sep 1 · SCHEDULED (scheduled-only strip) | يبدأ 1 سبتمبر · Gold Monthly · قادم |
| Joined the gym · Jan 10, 2026 | انضم للجيم · 10 يناير 2026 |
| Cancelled Feb 8 by \<name\> (event row) | أُلغي 8 فبراير — عمر |
| 3rd membership · sold by \<name\> (muted meta) | الاشتراك الثالث · سجّله عمر |

### 6.3 Rail grammar

- **Section heading:** «الاشتراك» (the rail needs no other name — mirrors "Membership").
- **Next slot:** `القادم — Gold Monthly · يبدأ 1 سبتمبر · غير مدفوع 1,200 ج.م` (dashed, collapsed).
- **Collapsed header:** `▸ Gold Monthly · 1 يونيو – 30 أغسطس · [منتهي] · مدفوع ✓`
  · cancelled: `▸ Silver Monthly · 15 يناير – أُلغي · [ملغي] · مستحق 200 ج.م`
- **Connectors (frozen):** «تجديد — 28 يوليو» · «ترقية — من Silver Monthly إلى Gold Monthly» ·
  «انتقال لباقة أصغر — من Gold إلى Silver». **Rule:** connectors use **من/إلى words, never
  arrows** — arrow glyphs are bidi-fragile and direction-ambiguous in RTL (§D8).
- **Date ranges everywhere use «–» (en dash), not «→».**
- **Terminus:** «انضم للجيم · 10 يناير 2026». **Show older:** «عرض الأقدم».
- **Empty rail:** «لا يوجد اشتراك بعد.» [تسجيل اشتراك]

### 6.4 Card panels

- Panel 1 (Coverage): «بدأ 1 يونيو 2026» · «ينتهي 30 أغسطس 2026 (شامل آخر يوم)» ·
  «متبقي 58 يومًا» · price snapshot: «1,200 ج.م · 3 أشهر».
- Panel 2 (Freezes): rows per 6.2.
- Panel 3 (Payments): title «الدفعات» — see Deliverable 7.
- Panel 4 (Actions): [تجديد] [تجميد] / [فك التجميد] · overflow ⋯ → «إلغاء الاشتراك…» ·
  Next card ⋯ → «إلغاء قبل البداية…».

### 6.5 Folded sections

- «التنبيهات — 1 غير مقروء» · empty: «التنبيهات — لا يوجد» · row actions verbatim from the
  global queue: «تحديد كمقروء» · «تجاهل».
- «بيانات العضو — 010-1234-5678 · المدرب عمر» [تعديل بيانات العضو]
  Rows: «المدرب» [عمر ▾] · «التواصل: الهاتف / البريد الإلكتروني» ·
  «التفاصيل: تاريخ الميلاد · النوع · تاريخ الانضمام» ·
  «حالة العضو: [عضو نشط] · أرشفة العضو…»

---

## Deliverable 7 — Financial Language (المال — الدقة قبل كل شيء)

Money copy has exactly three word families. Nothing else is permitted.

| Concept | Official Arabic | Rule / reason |
|---|---|---|
| Owes N (strip L3, rows, chips, summaries) | **⚠ مستحق 400 ج.م** | Final-review ruling (C1). Bill language every Egyptian/Gulf user already pays — «المبلغ المستحق» on every phone/electricity bill — meaning exactly "money that must be paid now", with zero gender logic and zero harshness. Replaces the gender-selected «عليه/عليها» entirely. |
| Nothing owed (strip L3, calm) | **✓ لا مستحقات** | Final-review ruling (C2). The exact negation of the warning state — one visual toggle: مستحق N ⇄ لا مستحقات. True in every member state, including lapsed-with-zero-balance, where «مدفوع بالكامل» would beg "of *what*?". «خالص» is Egypt-only colloquial. |
| Paid E£800 of E£1,200 | **مدفوع 800 من 1,200 ج.م** | Card Panel 3 summary line. |
| Paid in full — no balance due (card Panel 3) | **✓ مدفوع بالكامل — لا مستحقات** | The quiet retired-form line. The card's subject is the membership, so مدفوع بالكامل lives here — the strip's subject is the member, hence its shorter «لا مستحقات» (context rule, Deliverable 2 rule 7). |
| Remaining amount (inside payment summary) | **مستحق** — «مدفوع 800 من 1,200 ج.م · مستحق 400» | One money family, no exceptions (C1). **«متبقي» is reserved for time** («متبقي 58 يومًا») — the money/time collision of the first draft dissolves. |
| (E£100 over) — overpayment | **(زيادة 100 ج.م)** | Informational, never an error — exactly as ruled in D2.3. |
| unpaid E£1,200 (Next-card tag) | **غير مدفوع — 1,200 ج.م** | Renewal money lives on the Next card, never in strip L3 (ruling 0.3 preserved). |
| Standing badges | **مدفوع** · **مدفوع جزئيًا** · **غير مدفوع** | 1:1 with the frozen Paid / Partly paid / Unpaid labels. |
| Record payment | **تسجيل دفعة** | See Deliverable 5. |
| Void payment / voided | **شطب الدفعة…** / **مشطوبة: \<السبب\>** | See Deliverable 5. |
| Payment history (panel) | **الدفعات** | Never «سجل الدفعات» — «سجل» as a title is banned (mirrors the English Ledger/History ban). |
| Quick-fill chip: E£400 — all owed | **400 ج.م — كامل المستحق** | Fills, never submits (W-3). |
| Partial payment | **دفعة جزئية** | Prose contexts only. |
| Ledger row | **1 يوليو · 500 ج.م · نقدًا · عمر** | Date · amount · method · bare actor name. Method words: **نقدًا** · **بطاقة** · **تحويل**. |
| Amount due (form label) | **المبلغ** / snapshot price shown as plain value | «قيمة مستحقة» is banned register. |
| Revenue (reports) | **الإيرادات** | Owner/reporting register — correct audience. |
| Outstanding (report title) | **المبالغ المستحقة** | The مستحق family works in both the desk and reporting registers — one family everywhere (C5: مستحق unbanned and promoted to official vocabulary). |

**Banned money words (everywhere):** فاتورة، فوترة (Billing/Invoice — banned in English too) ·
رصيد (balance — telecom-credit register) · مديونية، متأخرات (debt-collector register) ·
**«متبقي» for money** (time-only word — C1). Money is always exact, always with its currency
mark, always Latin digits, always mono (MetricValue) — no exceptions.

---

## Deliverable 8 — RTL Review (what breaks visually, and the rules that prevent it)

**Length verdict:** Arabic runs ~10–25% *shorter* than English in characters for this product's
copy — no systemic overflow risk. The real RTL risks are directional and typographic, not length:

1. **No uppercase exists in Arabic.** The design system's uppercase badge/eyebrow convention
   cannot carry emphasis. Rule: Arabic badges/eyebrows rely on **weight + tone token + icon**
   (already required by the never-color-alone rule). ⚠ Design-system note for the impl slice:
   12px uppercase eyebrows must render Arabic at the same *size* but verify legibility — Arabic
   at 12px with dots/diacritics is at the floor; the a11y gate re-run covers it.
2. **Arrows are banned in Arabic copy.** `Jun 1 → Aug 30` becomes «1 يونيو – 30 أغسطس» (en
   dash); connectors use «من … إلى …». Arrow glyphs in RTL are direction-ambiguous (does →
   mean "to" or "later"?) and bidi-fragile next to Latin plan names.
3. **Bidi isolation is mandatory** for every user-data slot inside Arabic sentences: plan names
   (often Latin: "Gold Monthly"), member names, emails. Phone numbers additionally force LTR
   (`dir="ltr"`/isolate) — «010-1234-5678» corrupts visually in an RTL run otherwise.
4. **Numbers stay Latin digits** (Deliverable 9) — they form clean LTR runs inside RTL text and
   keep JetBrains Mono tabular alignment working unchanged.
5. **Physical direction flips:** the 3px accent-bar (current card, active nav) sits on the
   **inline-start** edge (right in RTL); chevrons ▸ mirror; the strip's desktop "money+action
   right-aligned" becomes inline-end. Rule for the impl slice: logical properties only
   (`ms-/me-/ps-/pe-/text-start`), never `left/right` classes.
6. **Truncation:** L2 truncates the plan name first (frozen rule) — truncating a Latin token
   inside an RTL line puts the ellipsis mid-sentence visually; the truncated slot must be its
   own isolated inline block. **Arabic labels themselves are never character-truncated** —
   reflow or shorten by rule instead.
7. **Spot-checked worst widths at 375px:** «لا يوجد تجديد قادم — ينتهي خلال 6 أيام» (38 chars vs
   41 English) ✓ fits the warning slot; «400 ج.م — كامل المستحق» (chip, ≈ English width) ✓;
   «مدفوع جزئيًا» (badge, 12 chars vs 11) ✓; sticky bar «تسجيل دفعة» + «تعديل» ✓ well under the
   two-slot budget; collapsed card header at 320px truncates the plan name exactly as English
   does ✓. No wording change required for width anywhere.

---

## Deliverable 9 — Localization Rules (dates · numbers · money · durations)

| Domain | Rule |
|---|---|
| **Digits** | **Latin (Western) digits 0–9 everywhere** — money, dates, counts, phones. Reasons: JetBrains Mono tabular alignment survives unchanged; Egyptian/Gulf banking and business apps (InstaPay, bank apps) set this expectation; single rendering across all five markets. *(Eastern ٠–٩ preference flagged in Open rulings.)* |
| **Dates** | Gregorian only (gym operations are Gregorian in all target markets). Format: `30 أغسطس 2026` — day · month-name · year, no leading zero. **Egyptian/Gulf month names (يناير، فبراير…)** in *all* markets including Jordan — كانون/شباط Levantine names are banned for consistency; يناير is universally understood. Weekdays: السبت، الأحد… Machine value stays in `<time datetime>` (unchanged component contract). |
| **Relative dates** | «منذ 21 يومًا» (ago) · «خلال 6 أيام» (in) — CLDR-pluralized. |
| **Currency** | Symbol **after** the amount with a space: «400 ج.م». Per-currency marks: EGP → **ج.م** · SAR → **ر.س** · AED → **د.إ** · KWD → **د.ك** · JOD → **د.أ**. Thousands separator «,» (Latin); decimals per currency minor units (KWD = 3 — money math already integer-safe by constitution). Whole amounts render without decimals: «1,200 ج.م». |
| **Percentages** | Latin form after the number: «85%» (not «٪»). |
| **Durations / plural rules** | Full CLDR Arabic plural categories are **mandatory** (zero/one/two/few/many/other). Days: يوم واحد · يومان · 3 أيام · 11 يومًا · 100 يوم. Months: شهر · شهران · 3 أشهر · 11 شهرًا. Zero-days-left is a phrase, not a number: «ينتهي اليوم». Lazy «X يوم» for all counts is forbidden — it is the sound of a machine. |
| **Membership periods** | «3 أشهر» · «شهر» · «سنة» — plan duration display. |
| **Never translated (hard rule — Deliverable 2 rule 8)** | The brand **PULSE** · **all user-created names and text, verbatim as entered**: gym name, branch names, plan names, member names, trainer/staff names, notes · email addresses · currency **codes** in settings (EGP, SAR — the settings picker shows code + Arabic name). The system never translates, transliterates, re-cases, or rewords user data, in any locale. |
| **Never abbreviated** | Month names (no «أغسـ») · any Arabic label (no mid-word ellipsis — §D8.6) · status words. The only sanctioned abbreviations in the product are the five currency marks above. |

---

## Deliverable 10 — Forbidden Words (القائمة المحظورة)

Every word below is banned from user-facing Arabic, with the reason. Fitness for the future
i18n lint: these strings failing review = defect.

| ❌ Forbidden | Why |
|---|---|
| عميل، زبون | Retail register; the person is a **عضو** (relationship, not transaction) |
| مشترك (as a noun for the person) | Telecom register; collides confusingly with اشتراك |
| عضوية | Splits the one trade word اشتراك; banned entirely |
| خطة، برنامج (for Plan) | Strategy/training-program registers; the word is **باقة** |
| فترة | "Period" is banned in the English source (§D14); same coinage, same ban |
| فاتورة، فوترة | Billing/Invoice — banned concepts in English; invoice implies paperwork that doesn't exist |
| رصيد | "Balance" — banned in English; also reads as phone credit |
| مديونية، متأخرات | Debt-collector register; the مستحق family covers everything («مستحق/مستحقات» itself is now OFFICIAL vocabulary — C5, removed from this list) |
| متبقي (for money) | Time-only word («متبقي 58 يومًا»); using it for money re-creates the money/time collision C1 dissolved |
| ملف شخصي، بروفايل | "Profile" — banned in English; social-media register |
| سجل (as a visible title) | "Ledger/History as a title" — banned in English |
| حذف (for void/cancel/archive) | Nothing in PULSE is ever deleted; حذف would lie about immutable history |
| بواسطة | The loudest translated-Arabic marker; actor = bare name |
| قم بـ / قومي بـ | Machine-translation filler; use the direct verb |
| الخاص بك / الخاصة بك | Filler; Arabic has possessive suffixes |
| يرجى، الرجاء، من فضلك | Governmental petition register; direct MSA is the product's politeness |
| تخفيض (for downgrade) | "Downgrade" banned in English → «انتقال لباقة أصغر» |
| إيقاف مؤقت، تعليق (for freeze) | Blur the freeze concept and the staff-suspend concept |
| استئناف (for resume) | Courtroom register; the pair is تجميد/فك التجميد |
| نادي، صالة، مركز (for the gym) | One word: الجيم |
| اشتراك تلقائي، تجديد تلقائي | No auto-renewal exists (MSH-1 future); copy must never imply it |
| فشل، خطأ فادح | Alarmist error register; the formula is «تعذر + مصدر» |
| كيان، معرف، ID | Internal vocabulary; ids never render (English §D14 ban mirrored) |
| لوحة التحكم (for Dashboard) | Control-panel register misdescribes a monitoring surface |
| تمت العملية بنجاح · «بنجاح» as a suffix | Generic success is banned — every action has its own «تم/تمت + مصدر» message (Deliverable 4); تم already means it succeeded |
| خاصتك | Same filler family as الخاص بك |
| برجاء | The Egyptian-formal petition variant of الرجاء |
| هل أنت متأكد؟ | Dialog-opener filler; the title IS the action as a question: «إلغاء الاشتراك؟» |
| انقر هنا، اضغط هنا | Link/button filler; the label names the action |
| قيد الانتظار (payment standing) | The standing labels are مدفوع / مدفوع جزئيًا / غير مدفوع only |

---

## Deliverable 11 — Full Product Language Review (screen by screen)

Concept-level review of every surface; exact current English strings get inventoried 1:1 at
implementation against Deliverable 12.

| Screen | Arabic language ruling + notable improvements |
|---|---|
| **Landing** | Marketing register: same vocabulary, slightly warmer, still no يرجى/قم بـ. Value line pattern: «إدارة اشتراكات جيمك — ببساطة.» CTA: «ابدأ الآن». The brand stays PULSE (Latin). |
| **Authentication** | «تسجيل الدخول» · «البريد الإلكتروني» · «كلمة المرور» · error: «بيانات الدخول غير صحيحة» (never reveals which field) · «تسجيل الخروج». Temp-password flow (staff): «كلمة مرور مؤقتة». |
| **Dashboard (الرئيسية)** | KPIs: «اشتراكات سارية» *(improvement: honest about what is counted — the English "Active Members" blurs member/membership levels; Arabic keeps the level-lock)* · «تنتهي خلال 7 أيام» / «خلال 30 يومًا» · «أعضاء جدد هذا الشهر» · «إيرادات هذا الشهر». Operational lists: «تنتهي قريبًا» · «انتهت مؤخرًا» · «مبالغ مستحقة». Quick actions: [إضافة عضو] [تسجيل اشتراك] [تسجيل دفعة]. |
| **Members (الأعضاء)** | List columns: العضو · الحالة · المدرب · الهاتف. FAB/primary: «إضافة عضو». Search placeholder: «ابحث بالاسم أو الهاتف». Empty: «لا يوجد أعضاء بعد — أضف أول عضو.» Duplicate-phone validation: «رقم الهاتف مسجل لعضو آخر». Archived filter: «المؤرشفون». |
| **Member Workspace** | Fully specified in Deliverable 6 — the D14 mirror. |
| **Memberships (الاشتراكات)** | Two-slot list columns: «العضو · الحالي · القادم · المستحق». Primary: [تسجيل اشتراك]. Empty Next slot: «—». Count grammar (load-bearing, per review §4): «12 عضوًا باشتراك حالي» vs «34 اشتراكًا» — the member-grain vs membership-grain wording distinction is preserved in Arabic. «بدون اشتراك» for the no-coverage current slot. |
| **Plans (الباقات)** | «إضافة باقة» (C4 — uniform creation grammar) · fields: «الاسم · السعر · المدة» · sellable: «متاحة» / retired: «موقوفة» — with the rule that a retired plan's copy never implies existing memberships break («الاشتراكات الحالية لا تتأثر»). |
| **Payments (الدفعات)** | List mirrors the ledger row grammar; «شطب…» per row; voided rows «مشطوبة: السبب». Filters: «الكل · مشطوبة». |
| **Notifications (الإشعارات)** | Global queue: «غير مقروء / مقروء» states · «تحديد كمقروء» · «تحديد الكل كمقروء» · «تجاهل» · empty: «لا إشعارات». Expiry alert message pattern: «اشتراك سارة عادل ينتهي خلال 6 أيام». |
| **Reports (التقارير)** | «الإيرادات» · «الاشتراكات» · «المبالغ المستحقة» · «تنتهي قريبًا». Reporting register may use الإيرادات/إجمالي — but never the forbidden list. |
| **Settings (الإعدادات)** | «العملة» · «المنطقة الزمنية» · «التنبيه قبل الانتهاء (أيام)» — the expiring-soon window, described in operator terms, not system terms. |
| **Staff (فريق العمل)** | «إضافة موظف» · roles displayed: «مالك» / «مدرب» · states: «نشط» / «موقوف» · «إيقاف الحساب…» / «إعادة التفعيل» · «آخر دخول». Suspend confirm states the honest caveat: «لن يستطيع تسجيل الدخول بعد الآن.» (JWT-persistence caveat TD-10 is *not* user copy.) |

---

## Deliverable 12 — Canonical Localization Dictionary (القاموس الرسمي)

The single normative glossary. Implementation translates **from this table**, never ad hoc.
(Reasons are abbreviated here — full arguments live in Deliverables 1, 5, 7.)

### Nouns & navigation

| English | Arabic | Reason | Usage notes |
|---|---|---|---|
| Gym | الجيم | The trade word | Never نادي/صالة |
| Branch | الفرع | Universal | |
| Member / Members | عضو / الأعضاء | Desk word; relationship register | Never عميل/مشترك |
| Membership / Memberships | اشتراك / الاشتراكات | THE trade word | Never عضوية |
| Plan / Plans | باقة / الباقات | Commercial standard | Never خطة/برنامج |
| Trainer | المدرب | Written register | «كابتن» = future dialect layer |
| Staff | فريق العمل | Warm business register | Individual: موظف |
| Owner | المالك | Role display | Prose may say صاحب الجيم |
| Dashboard | الرئيسية | What operators call it | Never لوحة التحكم |
| Reports | التقارير | | |
| Notifications | الإشعارات | Global queue | |
| Alerts | التنبيهات | Member-scoped signals | Never swap with إشعارات |
| Payments (section) | الدفعات | Desk plural of دفعة | |
| Payment | دفعة | Desk word | |
| Settings | الإعدادات | | |
| Member info | بيانات العضو | Desk says «بياناته» | Never ملف شخصي |

### Statuses & badges

| English | Arabic | Reason | Usage notes |
|---|---|---|---|
| ACTIVE (membership) | ساري | Natural validity word | Membership-level only |
| FROZEN | مجمّد | Gym-universal | |
| SCHEDULED | قادم | Operator mental model = "next" | Never مجدول |
| EXPIRED | منتهي | | |
| CANCELLED | ملغي | | |
| Expiring soon | ينتهي قريبًا | | |
| ACTIVE member | عضو نشط | Member-level only | Never ساري for a person |
| ARCHIVED member | عضو مؤرشف | WhatsApp-normalized concept | |
| Paid | مدفوع | Standing badge | |
| Partly paid | مدفوع جزئيًا | Standing badge | |
| Unpaid | غير مدفوع | Standing badge | |
| Current / Next / Past | الحالي / القادم / سابقة | | «اشتراكات سابقة» group |
| Active plan / retired plan | متاحة / موقوفة | Sellability, not life state | |
| Staff active / revoked | نشط / موقوف | | |

### Actions (buttons = verbal nouns)

| English | Arabic | Reason | Usage notes |
|---|---|---|---|
| Sell membership | تسجيل اشتراك | Desk phrase («سجّلي له اشتراك»); native gym register; symmetric with تسجيل دفعة | Ruling C3; toast: «تم تسجيل الاشتراك» |
| Renew | تجديد | Universal | Confirm: «تجديد — \<الباقة\> · \<السعر\>» |
| Freeze | تجميد | | Days prompt: «كم يومًا؟» |
| Resume | فك التجميد | Avoids إلغاء collision | Never استئناف |
| Record payment | تسجيل دفعة | Honest (records, not processes) | |
| Void… | شطب… | Strike-out = the exact semantics + visual | Row label: مشطوبة: \<السبب\> |
| Cancel membership… | إلغاء الاشتراك… | Terminal | … = confirm |
| Cancel before start… | إلغاء قبل البداية… | | Next card only |
| Change plan | تغيير الباقة | W-2 pointer | |
| Assign / Replace trainer | تعيين مدرب / تغيير المدرب | | Unassigned: لا يوجد مدرب |
| Edit member | تعديل بيانات العضو | | |
| Archive member… | أرشفة العضو… | Reversible-preserved semantics | |
| Reactivate member | استعادة العضو | Warmer than إلغاء الأرشفة | |
| Add member / Add staff | إضافة عضو / إضافة موظف | | |
| New plan | إضافة باقة | Uniform creation grammar: إضافة عضو/باقة/موظف · تسجيل اشتراك/دفعة | Ruling C4 |
| Suspend account… | إيقاف الحساب… | Staff only | Never تجميد |
| Reactivate (staff) | إعادة التفعيل | | |
| Show older | عرض الأقدم | | |
| Mark read / Mark all read | تحديد كمقروء / تحديد الكل كمقروء | Platform convention | |
| Dismiss | تجاهل | | |
| Retry | إعادة المحاولة | | |
| Back (dialog safe action) | رجوع | Kills the إلغاء collision | ALL confirm dialogs |
| Cancel (plain form) | إلغاء | Standard form-cancel | Forms only, never dialogs |
| Save / Sign in / Sign out | حفظ / تسجيل الدخول / تسجيل الخروج | Platform standard | |
| Search | بحث | Placeholder: «ابحث بالاسم أو الهاتف» | |
| Clear filters | مسح الفلاتر | «فلاتر» accepted loanword | |

### Money & coverage phrases → Deliverables 6.2 and 7 are the normative tables (not restated — one fact, one home).

---

## Deliverable 13 — Localization Implementation Strategy (strategy only — no implementation)

1. **Library:** `next-intl` — the App-Router-native i18n library for Next.js 15 (RSC-compatible,
   ICU MessageFormat built in). One new dependency → **requires human approval** per the
   constitution before the implementation sprint.
2. **Key organization = the feature-slice map.** One namespace per module, mirroring
   `modules/<feature>/`: `common` (shared vocabulary from Deliverable 12) · `nav` · `auth` ·
   `dashboard` · `members` · `memberships` · `payments` · `plans` · `notifications` · `reports` ·
   `settings` · `staff` · `errors`. Keys are **semantic, never English-mirroring**:
   `memberships.status.active`, `payments.owes` — so copy changes never rename keys.
3. **ICU everywhere it matters:** plurals use full CLDR Arabic categories
   (`{days, plural, zero{…} one{…} two{…} few{…} many{…} other{…}}`); the one gender point
   («عليه/عليها») uses `{gender, select, female{عليها} other{عليه}}`.
4. **Locale model:** locale is a **gym setting** (GYM-2 already anticipates per-gym locale),
   defaulting the whole gym's staff; per-user override is a future addition. `<html lang dir>`
   set from the locale; `dir="rtl"` for Arabic.
5. **RTL support:** migrate physical Tailwind classes to logical properties (`ms-/me-/ps-/pe-/
   text-start/end`) — an audit pass over existing components; bidi-isolate all user-data slots;
   force-LTR phone/email; flip chevrons/accent-bars via logical CSS (no per-component hacks).
6. **Typography:** JetBrains Mono has no Arabic — **numbers stay Latin digits so all
   MetricValue/mono behavior survives unchanged** (a load-bearing reason for the digits rule).
   Arabic UI text needs an Arabic-capable font token (evaluate IBM Plex Sans Arabic / Noto Sans
   Arabic) — **a design-token addition = a human-approved design-system change**, same gate as
   any token change.
7. **Source-language hygiene:** English strings extracted to `en` messages first (the current
   hardcoded strings become the `en` catalog, verified against §D14), then `ar` is authored
   **from this document** — never machine-translated.
8. **Quality gate additions:** e2e + axe re-run under `ar`/RTL at 375/1280/dark; a fitness check
   that flags forbidden words (Deliverable 10) in the `ar` catalog; screenshot pass of the §D10
   state matrix in Arabic.
9. **Future languages:** the namespace/key structure is language-count-agnostic; adding French
   or Kurdish later = one new catalog + CLDR plural rules, zero key changes. The *authority
   document* pattern (this file) is repeated per language.

---

## Final self-review (the challenge pass, documented)

Read back three times — as a gym owner, a receptionist, and a branch manager. Changes made
during the pass:

- «استئناف» → **«فك التجميد»** (courtroom → banking-familiar; also kills the إلغاء collision).
- «بيع اشتراك» → «اشتراك جديد» → **«تسجيل اشتراك»** (final review C3: nobody says بيعله اشتراك at
  a desk, and the button law demands a masdar — the middle draft broke its own rule).
- Owed/remaining vocabulary collapsed into **one locked money family** — مستحق for money, متبقي
  for time (final review C1, superseding the first draft's عليه/عليها + متبقي split) — after
  catching myself mixing مستحق/متبقي/مطلوب in early drafts — the exact disease Deliverable 2
  exists to prevent.
- All dialog dismiss buttons unified to **«رجوع»** after simulating the cancel-membership dialog
  and hitting the إلغاء/إلغاء absurdity.
- «قم بـ»، «بواسطة»، «الخاص بك» hunted out of every example — the three loudest markers of
  translated Arabic.
- Arrow glyphs removed from all Arabic copy after the RTL pass (→ became «من/إلى» and «–»).

**Verdict:** every sentence in this document can be read out loud at an Egyptian gym desk
without sounding like software. That was the acceptance test.

---

## Rulings — ALL RESOLVED (final product-language review, human-accepted 2026-07-05)

| # | Question | Ruling |
|---|---|---|
| R1 | **الجيم** vs **النادي** | **الجيم** — accepted as recommended; the trade word in all five markets |
| R2 | Digits: Latin 0–9 vs Eastern ٠–٩ | **Latin 0–9** — accepted; mono/tabular survives, banking-app convention |
| R3 | Owed phrasing | **«مستحق N»** (C1) — supersedes عليه/عليها entirely; no gender logic anywhere in the product |
| R4 | Verbal-noun buttons (deviation from the English verb-first freeze) | **Approved** — exercised throughout; settled |
| R5 | "Sell membership" | **«تسجيل اشتراك»** (C3) — supersedes the first-draft «اشتراك جديد» |
| R6 | «كابتن» dialect layer for trainer names | **Parked** — the MSA authority ships with المدرب only |
| R7 | Arabic font token | Implementation-slice design decision (human-gated token change per the design system) — not a terminology question |

*No open terminology questions remain.*

---

*End of the Arabic Localization Authority. Accepted 2026-07-05 — the official implementation
source of truth for Arabic. No code, no JSON, no project implementation was produced by the
authoring or review tasks. Further terminology changes are versioned, human-approved amendments
to this document.*
