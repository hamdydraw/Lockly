// English catalog — the source of truth. Its shape defines `Messages`, so every
// other catalog must provide exactly the same keys (checked by tsc).

export type PluralForms = { other: string } & Partial<
  Record<'zero' | 'one' | 'two' | 'few' | 'many', string>
>;

/** Marks a plural leaf; forms are chosen with Intl.PluralRules. */
const p = (forms: PluralForms): PluralForms => forms;

export const en = {
  app: {
    documentTitle: 'Lockly — Secure Passwords & Files',
    loading: 'Loading…',
  },
  common: {
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    delete: 'Delete',
    create: 'Create',
    move: 'Move',
    moving: 'Moving…',
    close: 'Close',
    download: 'Download',
    preview: 'Preview',
    dismiss: 'Dismiss',
    retry: 'Retry',
    connect: 'Connect',
    connecting: 'Connecting…',
    pleaseWait: 'Please wait…',
    signOut: 'Sign out',
    lockVault: 'Lock vault',
  },
  nav: {
    vault: 'Vault',
    files: 'Files',
    notes: 'Notes',
    settings: 'Settings',
  },
  theme: {
    label: 'Theme',
    system: 'System',
    light: 'Light',
    dark: 'Dark',
  },
  language: {
    label: 'Language',
    description: 'Choose the language Lockly uses on this device.',
  },
  auth: {
    welcomeBack: 'Welcome back.',
    createVault: 'Create your secure vault.',
    email: 'Email',
    password: 'Password',
    loginPassword: 'Login password',
    masterPasswordEncrypts: 'Master password (encrypts your vault)',
    masterPlaceholder: 'At least 10 characters',
    signIn: 'Sign in',
    createAccount: 'Create account',
    noAccount: "Don't have an account? Create one",
    haveAccount: 'Already have an account? Sign in',
  },
  unlock: {
    title: 'Vault locked',
    prompt: 'Enter your master password to unlock.',
    promptWithEmail: 'Enter your master password to unlock, {email}.',
    placeholder: 'Master password',
    unlock: 'Unlock',
    unlocking: 'Unlocking…',
  },
  serverSetup: {
    title: 'Connect to Lockly',
    description:
      'Enter the address of your Lockly server. Your vault lives there, not on this phone.',
    addressLabel: 'Server address',
    willConnect: 'Will connect to {address}',
    insecureWarning:
      'This is a plain {http} address, so your passwords travel over the network unencrypted. Fine on a home network you trust — use {https} for anything reachable from the internet.',
  },
  vault: {
    title: 'Vault',
    addItem: 'Add item',
    searchPlaceholder: 'Search vault…',
    noMatches: 'No matching items.',
    empty: 'Your vault is empty. Add your first item.',
    types: {
      LOGIN: 'Login',
      CARD: 'Card',
      SECURE_NOTE: 'Secure note',
      OTHER: 'Other',
    },
  },
  item: {
    newTitle: 'New item',
    editTitle: 'Edit item',
    title: 'Title',
    titlePlaceholder: 'e.g. My Bank',
    username: 'Username',
    folder: 'Folder',
    folderPlaceholder: 'e.g. Banking',
    url: 'URL',
    password: 'Password',
    notes: 'Notes',
    notesPlaceholder: 'Anything else to remember…',
    reveal: 'Reveal',
    hide: 'Hide',
    copy: 'Copy',
    generate: 'Generate',
    copied: 'Password copied — clears in 20s',
    saved: 'Item saved',
    updated: 'Item updated',
    deleted: 'Item deleted',
  },
  generator: {
    length: 'Length: {count}',
    lower: 'lower',
    upper: 'upper',
    digits: 'digits',
    symbols: 'symbols',
    generate: 'Generate password',
  },
  strength: {
    empty: 'Empty',
    veryWeak: 'Very weak',
    weak: 'Weak',
    fair: 'Fair',
    strong: 'Strong',
    veryStrong: 'Very strong',
  },
  files: {
    title: 'Secure files',
    summary: p({ one: '{count} file · {size}', other: '{count} files · {size}' }),
    folderSummary: '{folder} · {summary}',
    uploadFiles: 'Upload files',
    uploading: p({ one: 'Uploading {count}…', other: 'Uploading {count}…' }),
    allFiles: 'All files',
    noFolder: 'No folder',
    newFolder: 'New folder',
    deleteFolder: 'Delete folder',
    deleteFolderLabel: 'Delete folder {name}',
    dropHere: 'Drop files here or browse',
    dropInto: 'Drop files here to add to “{folder}”',
    dropHint: 'Encrypted · Max {max} MB',
    encrypted: 'Encrypted',
    encryptingOnServer: 'Encrypting on the server… · {size}',
    uploadingPercent: 'Uploading {percent}% · {size}',
    uploadingAria: 'Uploading {name}',
    uploadedToast: '{name} uploaded & encrypted',
    empty: 'No files yet',
    emptyFolder: '“{folder}” is empty',
    emptyHint: 'Upload a file to store it encrypted at rest.',
    emptyFolderHint: 'Upload a file while this folder is selected, or move one here.',
    moveToFolder: 'Move to folder',
    orTypeFolder: 'Or type a folder name',
    folderName: 'Folder name',
    folderNamePlaceholder: 'e.g. Documents',
    newFolderHint:
      'Files you upload while this folder is selected are placed in it. A folder disappears once it has no files.',
    movedTo: 'Moved to {folder}',
    removedFromFolder: 'Removed from folder',
    fileDeleted: 'File deleted',
    deleteFileTitle: 'Delete file?',
    deleteFileBody:
      '{name} ({size}) will be permanently deleted from the server. This cannot be undone.',
    deleteFileConfirm: 'Delete file',
    deleteFolderTitle: 'Delete folder?',
    deleteFolderBody: p({
      one: '“{name}” holds {count} file. Delete them along with the folder, or keep them — kept files stay encrypted and move to {allFiles}.',
      other:
        '“{name}” holds {count} files. Delete them along with the folder, or keep them — kept files stay encrypted and move to {allFiles}.',
    }),
    keepFiles: 'Keep the files',
    deleteFolderConfirm: p({
      one: 'Delete folder & {count} file',
      other: 'Delete folder & {count} files',
    }),
    folderDeletedWithFiles: p({
      one: 'Deleted “{folder}” and {count} file',
      other: 'Deleted “{folder}” and {count} files',
    }),
    folderDeletedKeptFiles: p({
      one: 'Deleted “{folder}”; {count} file is now unfiled',
      other: 'Deleted “{folder}”; {count} files are now unfiled',
    }),
    kinds: {
      excel: 'Excel spreadsheet',
      word: 'Word document',
      pdf: 'PDF document',
      image: 'Image',
      archive: 'Archive',
      text: 'Text file',
      file: 'File',
    },
  },
  notes: {
    title: 'Notes',
    count: p({ one: '{count} note', other: '{count} notes' }),
    newNote: 'New note',
    takeANote: 'Take a note…',
    titlePlaceholder: 'Title',
    bodyPlaceholder: 'Write something worth remembering…',
    addChecklist: 'Add checklist item',
    checklistHint: 'Tip: start a line with “- [ ]” to make it a checkbox.',
    saveHint: 'Ctrl + Enter saves',
    searchPlaceholder: 'Search notes…',
    pinned: 'Pinned',
    others: 'Others',
    pin: 'Pin',
    unpin: 'Unpin',
    copyBody: 'Copy text',
    copied: 'Note text copied',
    color: 'Colour',
    colors: {
      amber: 'Amber',
      rose: 'Rose',
      sky: 'Sky',
      mint: 'Mint',
      lilac: 'Lilac',
      slate: 'Slate',
    },
    untitled: 'Untitled',
    emptyTitle: 'Nothing on the board yet',
    emptyBody:
      'Keep codes, reminders and small secrets one tap away. Notes are encrypted at rest and searchable the moment your vault is unlocked.',
    emptyAction: 'Write your first note',
    noMatches: 'No notes match “{q}”',
    loadFailed: 'Could not load your notes.',
    edited: 'Edited {when}',
    saving: 'Saving…',
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    saveError: 'Not saved — check your connection',
    editNote: 'Edit note',
    openNote: 'Open note: {title}',
    deleteTitle: 'Delete note?',
    deleteBody: '“{title}” will be permanently deleted. This cannot be undone.',
    deleteConfirm: 'Delete note',
    deleted: 'Note deleted',
    created: 'Note added to the board',
    checklistProgress: '{done}/{total}',
    toggleItem: 'Toggle “{text}”',
    done: 'Done',
    discard: 'Discard',
  },
  preview: {
    dialogLabel: 'Preview of {name}',
    position: '{index} of {total}',
    decryptedHere: 'Decrypted in this tab only',
    decrypting: 'Decrypting…',
    rendering: 'Rendering…',
    readingWorkbook: 'Reading workbook…',
    unavailableTitle: 'Preview unavailable',
    loadFailed: 'Could not load this file. Try downloading it instead.',
    previous: 'Previous file',
    next: 'Next file',
    previousHint: 'Previous',
    nextHint: 'Next',
    close: 'Close preview',
    closeHint: 'Close (Esc)',
    openInPdfTitle: 'Open in a PDF app',
    openInPdfBody:
      'This device cannot show PDFs inside Lockly. Open it with another app instead; the decrypted copy is kept in the app cache only.',
    openWith: 'Open with…',
    tooLargeTitle: 'Too large to preview',
    tooLargeBody:
      'Files of this type over {size} are not rendered in the browser. Download it to open locally.',
    sheetUnreadable:
      'This spreadsheet could not be read. It may be password-protected or corrupted.',
    cannotReadSheet: 'Cannot read spreadsheet',
    emptyWorkbook: 'Empty workbook',
    noSheets: 'This file has no sheets.',
    emptySheet: 'This sheet is empty.',
    truncated:
      'Showing the first {rows} rows and {cols} columns. Download the file for the full data.',
  },
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    appearanceDescription: 'Choose how Lockly looks. System follows your device setting.',
    account: 'Account',
    server: 'Server',
    changeServer: 'Change server',
    changeMaster: 'Change master password',
    changeMasterDescription: 'Sets a new master password for unlocking your vault.',
    newMaster: 'New master password',
    updateMaster: 'Update master password',
    updating: 'Updating…',
    masterUpdated: 'Master password updated',
    recoverableWarning:
      "This build uses recoverable (server-side) encryption so a forgotten master password can be reset. For maximum security, a future zero-knowledge mode would remove the server's ability to decrypt — at the cost of recoverability.",
  },
  units: {
    b: 'B',
    kb: 'KB',
    mb: 'MB',
  },
  errors: {
    // Server messages (contracts/error-translation.md) — English copies the server text.
    notAuthenticated: 'Not authenticated',
    sessionExpired: 'Invalid or expired session',
    sessionUserNotFound: 'Session user not found',
    notFound: 'Not found',
    validationFailed: 'Validation failed',
    serverError: 'Internal server error',
    rateLimited: 'Too many attempts — please wait and try again',
    vaultLocked: 'Vault is locked — enter your master password',
    registrationClosed: 'Registration is closed.',
    emailTaken: 'An account with that email already exists',
    invalidCredentials: 'Invalid email or password',
    wrongMasterPassword: 'Incorrect master password',
    noFileUploaded: 'No file uploaded (use form field "file")',
    fileNotFound: 'File not found',
    fileDataNotFound: 'File data not found',
    itemNotFound: 'Item not found',
    noteNotFound: 'Note not found',
    // Client messages from lib/api.ts
    noServer: 'No Lockly server configured',
    unreachable: "Can't reach the Lockly server. Check the address and that it's running.",
    serverResponded: 'Server responded {status}',
    notLockly: 'That address is not a Lockly server',
    uploadFailed: 'Upload failed',
    uploadUnreachable: 'Upload failed: could not reach the server',
    uploadCancelled: 'Upload cancelled',
    uploadTimedOut: 'Upload timed out',
    downloadFailed: 'Download failed',
    loadFileFailed: 'Could not load file',
    // Per-action fallbacks
    saveFailed: 'Save failed',
    deleteFailed: 'Delete failed',
    folderDeleteFailed: 'Could not delete the folder',
    moveFailed: 'Move failed',
    unlockFailed: 'Unlock failed',
    updateFailed: 'Update failed',
    addressUnreachable: "Couldn't reach that address.",
    clipboard: 'Could not access the clipboard',
    fileTooLarge: '{name} is larger than {max} MB',
    generic: 'Something went wrong',
  },
} as const;

type DeepWiden<T> = T extends string ? string : { -readonly [K in keyof T]: DeepWiden<T[K]> };

export type Messages = DeepWiden<typeof en>;

type Join<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;
type Paths<T, P extends string, Want extends 'text' | 'plural'> = {
  [K in keyof T & string]: T[K] extends string
    ? Want extends 'text'
      ? Join<P, K>
      : never
    : T[K] extends { other: string }
      ? Want extends 'plural'
        ? Join<P, K>
        : never
      : Paths<T[K], Join<P, K>, Want>;
}[keyof T & string];

/** Dot path to a plain or {placeholder} string. */
export type MessageKey = Paths<Messages, '', 'text'>;
/** Dot path to a plural leaf. */
export type PluralKey = Paths<Messages, '', 'plural'>;
