import { escapeHtml } from "@/lib/email/render";
import { textColorOn, type FormDesign } from "@/lib/forms";

// A string for inside <script>: JSON makes it a safe JS string, and "<" cannot close the script tag.
const jsString = (s: string) => JSON.stringify(s).replace(/</g, "\\u003c");

export type EmbedOptions = {
  styled: boolean;
  listId?: string;
};

/**
 * The HTML a customer pastes into their website.
 * Without JavaScript it is a plain form: the browser posts it, and Mailflow shows a thank-you page.
 * With JavaScript it stays on the page and shows the success message and reward in place.
 * Every text from the design is escaped: it ends up on someone else's website.
 */
export function buildEmbedSnippet(
  appUrl: string,
  publicKey: string,
  design: FormDesign,
  opts: EmbedOptions
) {
  const e = escapeHtml;
  const id = `mailflow-${publicKey.slice(-6).replace(/[^a-z0-9]/gi, "").toLowerCase() || "form"}`;
  const nameInput =
    design.nameField === "off"
      ? ""
      : `\n  <input type="text" name="name" placeholder="Your name" autocomplete="name"${design.nameField === "required" ? " required" : ""}>`;

  const badgeHtml = design.badgeText
    ? `\n  <span class="mf-badge">${e(design.badgeText)}</span>`
    : "";

  let displayStyle = "";
  if (design.display === "popup") {
    displayStyle = `
  #${id}-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 99999; align-items: center; justify-content: center; padding: 16px; }
  #${id}-overlay.mf-open { display: flex; }
  #${id} { position: relative; width: 100%; max-width: 420px; background: #fff; border-radius: 16px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
  #${id} .mf-close { position: absolute; top: 12px; right: 12px; border: 0; background: transparent; font-size: 18px; cursor: pointer; color: #888; }`;
  } else if (design.display === "slide_in") {
    displayStyle = `
  #${id} { position: fixed; bottom: 20px; right: 20px; z-index: 99999; max-width: 360px; background: #fff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.12); }
  #${id} .mf-close { position: absolute; top: 10px; right: 10px; border: 0; background: transparent; font-size: 16px; cursor: pointer; color: #888; }`;
  } else {
    displayStyle = `
  #${id} { max-width: 420px; background: #fff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }`;
  }

  const style = opts.styled
    ? `<style>
  ${displayStyle}
  #${id} { font-family: system-ui, -apple-system, sans-serif; display: grid; gap: 10px; box-sizing: border-box; }
  #${id} * { box-sizing: border-box; }
  #${id} .mf-badge { display: inline-block; justify-self: center; background: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; }
  #${id} .mf-title { margin: 0; font-size: 18px; font-weight: 700; text-align: center; color: #18181b; }
  #${id} .mf-text { margin: 0; font-size: 13px; color: #52525b; text-align: center; line-height: 1.4; }
  #${id} input[type="text"], #${id} input[type="email"] { width: 100%; padding: 10px 12px; border: 1px solid #d4d4d8; border-radius: 8px; font-size: 14px; outline: none; }
  #${id} input:focus { border-color: #18181b; ring: 2px solid #e4e4e7; }
  #${id} button[type="submit"] { width: 100%; padding: 10px 16px; border: 0; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
    background: ${design.color}; color: ${textColorOn(design.color)}; transition: opacity 0.15s ease; }
  #${id} button[type="submit"]:disabled { opacity: .6; cursor: not-allowed; }
  #${id} .mf-msg { margin: 0; font-size: 14px; font-weight: 500; text-align: center; color: #15803d; }
  #${id} .mf-reward { margin-top: 8px; padding: 12px; background: #f4f4f5; border-radius: 8px; text-align: center; }
  #${id} .mf-code { font-family: monospace; font-size: 15px; font-weight: 700; background: #fff; padding: 4px 8px; border: 1px dashed #a1a1aa; border-radius: 6px; display: inline-block; margin-top: 6px; }
  #${id} .mf-reward-btn { display: inline-block; margin-top: 8px; padding: 8px 14px; background: #18181b; color: #fff; font-size: 12px; font-weight: 600; text-decoration: none; border-radius: 6px; }
</style>
`
    : "";

  const closeButton =
    design.display === "popup" || design.display === "slide_in"
      ? '\n  <button type="button" class="mf-close" aria-label="Close">&times;</button>'
      : "";

  const heading =
    badgeHtml +
    (design.title ? `\n  <p class="mf-title">${e(design.title)}</p>` : "") +
    (design.text ? `\n  <p class="mf-text">${e(design.text)}</p>` : "");

  let rewardHtml = "";
  if (design.incentiveType === "discount_code" && design.incentiveValue) {
    rewardHtml = `<div class="mf-reward"><p style="margin:0;font-size:12px;color:#52525b">Your discount code:</p><span class="mf-code">${e(design.incentiveValue)}</span></div>`;
  } else if (design.incentiveType === "lead_magnet" && design.incentiveValue) {
    rewardHtml = `<div class="mf-reward"><a href="${e(design.incentiveValue)}" target="_blank" rel="noopener" class="mf-reward-btn">Download Free Resource</a></div>`;
  } else if (design.incentiveType === "mystery_discount" && design.incentiveValue) {
    rewardHtml = `<div class="mf-reward"><p style="margin:0;font-size:12px;color:#92400e;font-weight:600">🎉 Mystery Gift Unlocked!</p><span class="mf-code">${e(design.incentiveValue)}</span></div>`;
  }

  const formElement = `<form id="${id}" method="POST" action="${e(appUrl)}/api/v1/subscribe">${closeButton}${heading}
  <input type="hidden" name="key" value="${e(publicKey)}">${nameInput}
  <input type="email" name="email" placeholder="Your email" autocomplete="email" required>
  <input type="text" name="hp_field" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
  <button type="submit">${e(design.button)}</button>
  <div class="mf-msg" role="status"></div>
</form>`;

  const html =
    design.display === "popup"
      ? `${style}<div id="${id}-overlay">${formElement}</div>`
      : `${style}${formElement}`;

  const impressionPing = opts.listId
    ? `  try { fetch(${jsString(appUrl + "/api/v1/forms/" + opts.listId + "/impression")}, { method: "POST", mode: "no-cors" }); } catch(e) {}`
    : "";

  const popupScript =
    design.display === "popup"
      ? `  var overlay = document.getElementById(${jsString(id + "-overlay")});
  setTimeout(function() { if (overlay) overlay.classList.add("mf-open"); }, 4000);
  var close = form.querySelector(".mf-close");
  if (close) { close.addEventListener("click", function() { overlay.classList.remove("mf-open"); }); }
  overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.classList.remove("mf-open"); });`
      : design.display === "slide_in"
      ? `  var close = form.querySelector(".mf-close");
  if (close) { close.addEventListener("click", function() { form.style.display = "none"; }); }`
      : "";

  return `${html}
<script>
(function () {
${impressionPing}
  var form = document.getElementById(${jsString(id)});
  if (!form) return;
  var msg = form.querySelector(".mf-msg");
  var button = form.querySelector("button[type='submit']");
${popupScript}
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var body = {};
    new FormData(form).forEach(function (value, name) { body[name] = value; });
    button.disabled = true;
    fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error) {
          msg.textContent = data.error.message;
        } else {
          msg.innerHTML = "<p>" + ${jsString(design.success)} + "</p>" + ${jsString(rewardHtml)};
          form.reset();
        }
      })
      .catch(function () { msg.textContent = "Something went wrong. Please try again."; })
      .finally(function () { button.disabled = false; });
  });
})();
</script>`;
}
