/* File Drop viewer — a stand-in for Node's `stream`, swapped in by the alias in
 * vite.config.js.
 *
 * rtf-stream-parser (the email viewer's Outlook RTF → HTML step) defines its
 * classes as `extends stream.Transform`. Vite replaces a Node built-in with an
 * EMPTY module in a browser build, so without this the lazy email chunk throws
 * "Class extends value undefined" the moment it loads — for every email, not
 * just RTF ones. The one entry point we call, `deEncapsulateSync`, drives
 * `_transform`/`_flush` by hand and replaces `push`, so none of the real
 * stream machinery is ever reached and an empty base class is all it needs.
 *
 * If anything else ever imports `stream` in this app it gets this too — it
 * won't work, and this comment is where to look. */

export class Transform {}

export default { Transform };
