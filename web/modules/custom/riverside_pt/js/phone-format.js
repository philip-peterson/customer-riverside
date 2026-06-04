(function () {
  function formatPhone(raw) {
    let d = String(raw || "").replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") {
      // NANP with leading 1: show "1 (xxx) xxx-xxxx"
      const rest = d.slice(1);
      return "1 (" + rest.slice(0, 3) + ") " + rest.slice(3, 6) + "-" + rest.slice(6);
    }
    d = d.slice(0, 10);
    if (d.length === 0) return "";
    if (d.length <= 3) return d;
    if (d.length <= 6) return "(" + d.slice(0, 3) + ") " + d.slice(3);
    return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
  }

  function enhancePhoneInput(input) {
    if (input.dataset.phoneEnhanced) return;
    input.dataset.phoneEnhanced = "true";

    input.addEventListener("input", function () {
      const oldValue = input.value;
      const oldStart = input.selectionStart || 0;

      const formatted = formatPhone(input.value);
      if (oldValue !== formatted) {
        input.value = formatted;

        // Try to keep cursor relative to the digit sequence the user was editing.
        const oldDigitsBefore = (oldValue.slice(0, oldStart).match(/\d/g) || []).length;

        let newPos = 0;
        let digitsSeen = 0;
        for (; newPos < formatted.length; newPos++) {
          if (/\d/.test(formatted[newPos])) {
            digitsSeen++;
          }
          if (digitsSeen >= oldDigitsBefore) {
            newPos++;
            break;
          }
        }
        if (newPos > formatted.length) newPos = formatted.length;

        try {
          input.setSelectionRange(newPos, newPos);
        } catch (_) {}
      }
    });

    // Format any server-provided default value on load (e.g. prefilled from tempstore)
    if (input.value) {
      const f = formatPhone(input.value);
      if (input.value !== f) input.value = f;
    }
  }

  function scan() {
    document.querySelectorAll("input.rpt-phone").forEach(enhancePhoneInput);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
})();
