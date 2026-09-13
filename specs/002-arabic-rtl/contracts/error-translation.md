# Contract: Error Message Translation

**Feature**: [../spec.md](../spec.md) (US4, FR-012, FR-013) | **Research**: [../research.md](../research.md#r7-translating-server-errors-without-server-changes)

The server sends English text in `{ "error": "…" }`; `lib/api.ts` puts it in `ApiError.message`. The
client maps these exact strings to catalog keys. Arabic text below is the initial draft and must pass
native-speaker review (SC-008) before release.

`check-i18n.mjs` fails the build gate if a message in `server/src` or `client/src/lib/api.ts` is added
without a row here being implemented in `errors.ts`.

## Server messages (`server/src`)

| English (exact) | Source | Key | Arabic (draft) |
|---|---|---|---|
| `Not authenticated` | middleware/auth.ts, unlock.ts | `errors.notAuthenticated` | لم يتم تسجيل الدخول |
| `Invalid or expired session` | middleware/auth.ts | `errors.sessionExpired` | انتهت الجلسة أو أنها غير صالحة. سجّل الدخول مجددًا |
| `Session user not found` | routes/auth.ts | `errors.sessionExpired` | (same as above) |
| `Not found` | middleware/error.ts | `errors.notFound` | العنصر غير موجود |
| `Validation failed` | middleware/error.ts | `errors.validationFailed` | البيانات المُدخلة غير صالحة |
| `Internal server error` | middleware/error.ts | `errors.serverError` | حدث خطأ في الخادم. حاول مرة أخرى |
| `Too many attempts — please wait and try again` | middleware/rateLimit.ts | `errors.rateLimited` | محاولات كثيرة جدًا. انتظر قليلًا ثم حاول مرة أخرى |
| `Vault is locked — enter your master password` | middleware/unlock.ts | `errors.vaultLocked` | الخزنة مقفلة. أدخل كلمة المرور الرئيسية |
| `Registration is closed.` | routes/auth.ts | `errors.registrationClosed` | التسجيل مغلق حاليًا |
| `An account with that email already exists` | routes/auth.ts | `errors.emailTaken` | يوجد حساب مسجّل بهذا البريد الإلكتروني |
| `Invalid email or password` | routes/auth.ts | `errors.invalidCredentials` | البريد الإلكتروني أو كلمة المرور غير صحيحة |
| `Incorrect master password` | routes/auth.ts | `errors.wrongMasterPassword` | كلمة المرور الرئيسية غير صحيحة |
| `No file uploaded (use form field "file")` | routes/files.ts | `errors.noFileUploaded` | لم يتم رفع أي ملف |
| `File not found` | routes/files.ts | `errors.fileNotFound` | الملف غير موجود |
| `File data not found` | services/storage.ts | `errors.fileNotFound` | (same) |
| `Item not found` | routes/items.ts | `errors.itemNotFound` | العنصر غير موجود |

Non-JSON error responses fall back to `res.statusText` (e.g. `Payload Too Large`); these are unmapped and
resolve to the call-site fallback key.

## Client messages (`client/src/lib/api.ts`)

| English (exact or pattern) | Key | Arabic (draft) |
|---|---|---|
| `No Lockly server configured` | `errors.noServer` | لم يتم إعداد خادم Lockly |
| `Can't reach the Lockly server. Check the address and that it's running.` | `errors.unreachable` | تعذّر الوصول إلى خادم Lockly. تحقّق من العنوان ومن أن الخادم يعمل |
| `/^Server responded (\d+)$/` → `{status}` | `errors.serverResponded` | استجاب الخادم بالرمز {status} |
| `That address is not a Lockly server` | `errors.notLockly` | هذا العنوان ليس خادم Lockly |
| `Upload failed` | `errors.uploadFailed` | فشل رفع الملف |
| `Upload failed: could not reach the server` | `errors.uploadUnreachable` | فشل الرفع: تعذّر الوصول إلى الخادم |
| `Upload cancelled` | `errors.uploadCancelled` | تم إلغاء الرفع |
| `Upload timed out` | `errors.uploadTimedOut` | انتهت مهلة رفع الملف |
| `Download failed` | `errors.downloadFailed` | فشل تنزيل الملف |
| `Could not load file` | `preview.loadFailed` | تعذّر تحميل الملف |

## Call-site fallbacks (existing English literals → keys)

| Current literal | Location | Key |
|---|---|---|
| `Save failed` | ItemModal | `errors.saveFailed` |
| `Delete failed` | FilesPage | `errors.deleteFailed` |
| `Could not delete the folder` | FilesPage | `errors.folderDeleteFailed` |
| `Move failed` | FilesPage | `errors.moveFailed` |
| `Download failed` | FilesPage, FilePreview | `errors.downloadFailed` |
| `Unlock failed` | UnlockPage | `errors.unlockFailed` |
| `Something went wrong` | AuthPage | `errors.generic` |
| `Update failed` | SettingsPage | `errors.updateFailed` |
| `Couldn't reach that address.` | ServerSetupPage | `errors.addressUnreachable` |
| `Could not access the clipboard` | ItemModal | `errors.clipboard` |
| `{name} is larger than {max} MB` | FilesPage | `errors.fileTooLarge` |
| `Could not load this file. Try downloading it instead.` | FilePreview | `preview.loadFailed` |
| `This spreadsheet could not be read…` | FilePreview | `preview.sheetUnreadable` |

## Implementation notes

- To keep English output byte-identical to the server text, `Session user not found`,
  `File data not found`, and `Could not load file` got their own keys
  (`errors.sessionUserNotFound`, `errors.fileDataNotFound`, `errors.loadFileFailed`) instead of
  sharing `errors.sessionExpired`, `errors.fileNotFound`, and `preview.loadFailed`.
- String params passed to `t()` are wrapped in U+2068/U+2069 (first-strong isolate) so user values
  inside toasts and labels cannot reorder the surrounding sentence; rich params use `<bdi dir="auto">`.

## Behavior

1. `errorText(err, fallback)`:
   - `err` is `ApiError` and `errorKey(err.message)` matches ⇒ `t(match.key, match.params)`.
   - Otherwise ⇒ `t(fallback)`.
2. English output for mapped messages equals today's text (English catalog copies the server strings).
3. Unmapped message in English ⇒ also uses fallback (behavior change: previously raw server text).
   Acceptable because the check script guarantees all current messages are mapped.
