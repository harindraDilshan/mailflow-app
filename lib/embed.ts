export function buildEmbedSnippet(appUrl: string, publicKey: string) {
  return `<form id="exlorian-subscribe" method="POST" action="${appUrl}/api/v1/subscribe">
  <input type="hidden" name="key" value="${publicKey}">
  <input type="text" name="name" placeholder="Your name">
  <input type="email" name="email" placeholder="Your email" required>
  <input type="text" name="hp_field" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
  <button type="submit">Subscribe</button>
  <p id="exlorian-msg" role="status"></p>
</form>
<script>
(function () {
  var f = document.getElementById("exlorian-subscribe");
  var msg = document.getElementById("exlorian-msg");
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var body = {};
    new FormData(f).forEach(function (v, k) { body[k] = v; });
    fetch(f.action, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        msg.textContent = d.error ? d.error.message : d.message;
        if (!d.error) f.reset();
      })
      .catch(function () { msg.textContent = "Something went wrong. Please try again."; });
  });
})();
</script>`;
}