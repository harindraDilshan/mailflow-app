import { escapeHtml } from "@/lib/email/render";
import { textColorOn, type FormDesign } from "@/lib/forms";

// A string for inside <script>: JSON makes it a safe JS string, and "<" cannot close the script tag.
const jsString = (s: string) => JSON.stringify(s).replace(/</g, "\\u003c");

/**
 * The HTML a customer pastes into their website.
 * Without JavaScript it is a plain form: the browser posts it, and Mailflow shows a thank-you page.
 * With JavaScript it stays on the page and shows the success message in place.
 * Every text from the design is escaped: it ends up on someone else's website.
 */
export function buildEmbedSnippet(appUrl: string, publicKey: string, design: FormDesign, opts: { styled: boolean }) {
  const e = escapeHtml;
  const id = `mailflow-${publicKey.slice(-6).replace(/[^a-z0-9]/gi, "").toLowerCase() || "form"}`;
  const nameInput =
    design.nameField === "off"
      ? ""
      : `\n  <input type="text" name="name" placeholder="Your name" autocomplete="name"${design.nameField === "required" ? " required" : ""}>`;

  const style = opts.styled
    ? `<style>
  #${id} { max-width: 420px; font-family: system-ui, sans-serif; display: grid; gap: 8px; }
  #${id} .mf-title { margin: 0; font-size: 18px; font-weight: 600; }
  #${id} .mf-text { margin: 0; font-size: 14px; color: #555; }
  #${id} input { padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; }
  #${id} button { padding: 10px 14px; border: 0; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer;
    background: ${design.color}; color: ${textColorOn(design.color)}; }
  #${id} button:disabled { opacity: .6; }
  #${id} .mf-msg { margin: 0; font-size: 14px; }
</style>
`
    : "";

  const heading =
    (design.title ? `\n  <p class="mf-title">${e(design.title)}</p>` : "") +
    (design.text ? `\n  <p class="mf-text">${e(design.text)}</p>` : "");

  return `${style}<form id="${id}" method="POST" action="${e(appUrl)}/api/v1/subscribe">${heading}
  <input type="hidden" name="key" value="${e(publicKey)}">${nameInput}
  <input type="email" name="email" placeholder="Your email" autocomplete="email" required>
  <input type="text" name="hp_field" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
  <button type="submit">${e(design.button)}</button>
  <p class="mf-msg" role="status"></p>
</form>
<script>
(function () {
  var form = document.getElementById(${jsString(id)});
  var msg = form.querySelector(".mf-msg");
  var button = form.querySelector("button");
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var body = {};
    new FormData(form).forEach(function (value, name) { body[name] = value; });
    button.disabled = true;
    fetch(form.action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        msg.textContent = data.error ? data.error.message : ${jsString(design.success)};
        if (!data.error) form.reset();
      })
      .catch(function () { msg.textContent = "Something went wrong. Please try again."; })
      .finally(function () { button.disabled = false; });
  });
})();
</script>`;
}
