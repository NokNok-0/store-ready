// C0 controls except \t (09) and \n (0A), DEL, and C1 controls.
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g;

/** @param {unknown} value */
export function stripControl(value) {
  return String(value).replace(CONTROL, '');
}
