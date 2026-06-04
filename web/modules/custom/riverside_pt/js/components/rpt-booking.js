import { h, render } from "https://esm.sh/preact@10";
import { useState, useEffect, useRef, useMemo } from "https://esm.sh/preact@10/hooks";
import { html } from "https://esm.sh/htm@3/preact";

const TYPES = [
  { id: "diagnostic", label: "Diagnostic Assessment", duration: "60 MINS" },
  { id: "sports",     label: "Sports Rehabilitation",  duration: "60 MINS" },
  { id: "surgical",   label: "Surgery Rehabilitation", duration: "60 MINS" },
  { id: "neuro",      label: "Neurological Therapy",   duration: "60 MINS" },
];

const CHECK = html`<svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
  <polyline points="1,5.5 5,9.5 13,1" stroke="white" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const EMPTY_FORM = { firstName: "", lastName: "", phone: "", comments: "" };

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

// All Tailwind class strings live here so the JIT scanner sees complete
// literals in one place rather than spread across template expressions.
const CX = {
  // ── Type selector ──────────────────────────────────────────────────────
  selectorLabel:        "text-xs tracking-widest uppercase text-pt-blue-500 font-semibold mb-5",
  selectorGrid:         "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10",
  typeBtn:              "flex items-center gap-4 p-4 w-full rounded-xl border transition-colors",
  typeBtnActive:        "bg-pt-blue-500 border-pt-blue-500",
  typeBtnInactive:      "bg-white border-pt-blue-200 hover:border-pt-blue-500",
  typeCircle:           "w-8 h-8 rounded-full shrink-0 flex items-center justify-center border",
  typeCircleActive:     "border-white/60",
  typeCircleInactive:   "border-pt-blue-200",
  typeLabel:            "font-serif text-[1.0625rem] font-normal leading-snug",
  typeLabelActive:      "text-white",
  typeLabelInactive:    "text-gray-900",
  typeDuration:         "text-[0.6875rem] tracking-widest font-semibold mt-0.5",
  typeDurationActive:   "text-white/70",
  typeDurationInactive: "text-pt-blue-500",

  // ── Form ───────────────────────────────────────────────────────────────
  formSection:  "mt-8 pt-8 border-t border-pt-blue-200",
  formHeading:  "text-xs tracking-widest uppercase text-pt-blue-500 font-semibold mb-6",
  formGrid:     "grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-5",
  formLabel:    "block text-sm font-medium text-gray-700 mb-1",
  formRequired: "text-red-500",
  formInput:    "w-full border border-pt-blue-200 bg-white px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-pt-blue-500 transition-colors",
  formTextarea: "resize-none w-full border border-pt-blue-200 bg-white px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-pt-blue-500 transition-colors",
  formError:    "text-red-500 text-sm mb-4",
  submitBtn:    "px-[4em] py-[1em] bg-pt-blue-500 text-white text-sm font-medium transition-colors border-2 border-pt-blue-500 hover:bg-pt-blue-600 hover:border-pt-blue-600 disabled:opacity-50",

  // ── Calendar overlay ──────────────────────────────────────────────────
  calWrapper:       "relative",
  noSlotsOverlay:   "absolute inset-0 z-10 flex items-center justify-center pt-20 pointer-events-none",

  // ── Success state ──────────────────────────────────────────────────────
  successSection: "mt-8 pt-8 border-t border-pt-blue-200",
  successBox:     "p-6 bg-green-50 border border-green-200 text-green-800",
  successTitle:   "font-medium",
  successBody:    "text-sm mt-1",
  successLink:    "mt-3 text-sm text-green-700 underline hover:text-green-800",
};

var selectedDate = null;
var selectedDateSlots = [];

function localDateStr(d) {
  return d.getFullYear() + "-" +
    String(d.getMonth() + 1).padStart(2, "0") + "-" +
    String(d.getDate()).padStart(2, "0");
}

function nextBusinessDay() {
  var d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return localDateStr(d);
}

function slotLabel(date) {
  var h = date.getHours();
  return (h % 12 || 12) + (h < 12 ? "AM" : "PM") + " PST";
}

function Booking({ settings }) {
  const [service, setService] = useState("diagnostic");
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [noSlotsInMonth, setNoSlotsInMonth] = useState(false);

  const calEl = useRef(null);
  const calRef = useRef(null);
  const initializedRef = useRef(false);
  const prevServiceRef = useRef(null);
  const autoAdvanceRef = useRef(0);
  const fetchedRef = useRef(false);
  const initDate = useMemo(nextBusinessDay, []);

  function buildEventsUrl(svc) {
    return settings.eventsUrl + "?service=" + svc;
  }

  useEffect(function () {
    if (!calEl.current || !window.FullCalendar) return;

    function markDays(events) {
      calEl.current.querySelectorAll(".fc-daygrid-day.has-availability").forEach(function (d) {
        d.classList.remove("has-availability");
      });
      events.forEach(function (event) {
        var dateStr = event.startStr.substring(0, 10);
        var dayEl = calEl.current.querySelector(".fc-daygrid-day[data-date=\"" + dateStr + "\"]");
        if (dayEl) dayEl.classList.add("has-availability");
      });
    }

    var cal = new FullCalendar.Calendar(calEl.current, {
      initialView: "dayGridMonth",
      initialDate: initDate,
      headerToolbar: { left: "prev", center: "title", right: "next" },
      titleFormat: { year: "numeric", month: "long" },
      dayHeaderFormat: { weekday: "narrow" },
      validRange: function (now) {
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 7, 1),
        };
      },
      fixedWeekCount: false,
      showNonCurrentDates: false,
      height: "auto",
      eventDisplay: "none",
      dayMaxEvents: false,

      loading: function (isLoading) {
        if (!isLoading) fetchedRef.current = true;
      },

      datesSet: function () {
        calEl.current.querySelectorAll(".fc-daygrid-day.is-selected").forEach(function (d) {
          d.classList.remove("is-selected");
        });
        setSelectedSlotId(null);
        setNoSlotsInMonth(false);
        fetchedRef.current = false;
        if (selectedDate) {
          var dayEl = calEl.current.querySelector(".fc-daygrid-day[data-date=\"" + selectedDate + "\"]");
          if (dayEl) {
            dayEl.classList.add("is-selected");
            setSlots(selectedDateSlots);
          } else {
            setSlots([]);
          }
        } else {
          setSlots([]);
        }
      },

      eventsSet: function (events) {
        markDays(events);
        if (!initializedRef.current && fetchedRef.current) {
          fetchedRef.current = false;
          var dates = [...new Set(events.map(function (e) { return e.startStr.substring(0, 10); }))].sort();
          var firstDate = dates[0];
          if (firstDate) {
            initializedRef.current = true;
            autoAdvanceRef.current = 0;
            var firstSlots = events
              .filter(function (e) { return e.startStr.startsWith(firstDate); })
              .sort(function (a, b) { return a.start - b.start; });
            selectedDate = firstDate;
            selectedDateSlots = firstSlots;
            var targetEl = calEl.current.querySelector(".fc-daygrid-day[data-date=\"" + firstDate + "\"]");
            if (targetEl) {
              targetEl.classList.add("is-selected");
              setSlots(firstSlots);
            }
          } else if (autoAdvanceRef.current < 12) {
            autoAdvanceRef.current++;
            cal.next();
          }
        }
        if (initializedRef.current && fetchedRef.current) {
          var viewStart = cal.view.currentStart;
          var viewEnd = cal.view.currentEnd;
          var inView = events.filter(function (e) { return e.start >= viewStart && e.start < viewEnd; });
          setNoSlotsInMonth(inView.length === 0);
        }
      },

      dayCellClassNames: function (arg) {
        var date = arg.date.toISOString().substring(0, 10);
        if (settings.holidays[date]) return ["is-holiday"];
      },

      dateClick: function (arg) {
        if (!arg.dayEl.classList.contains("has-availability")) return;
        calEl.current.querySelectorAll(".fc-daygrid-day.is-selected").forEach(function (d) {
          d.classList.remove("is-selected");
        });
        arg.dayEl.classList.add("is-selected");
        var daySlots = cal.getEvents()
          .filter(function (e) { return e.startStr.startsWith(arg.dateStr); })
          .sort(function (a, b) { return a.start - b.start; });
        selectedDate = arg.dateStr;
        selectedDateSlots = daySlots;
        setSelectedSlotId(null);
        setSubmitError(null);
        setSuccess(false);
        setSlots(daySlots);
      },
    });

    cal.render();
    calRef.current = cal;
    return function () { cal.destroy(); };
  }, []);

  useEffect(function () {
    var cal = calRef.current;
    if (!cal) return;

    var isInitial = prevServiceRef.current === null;
    prevServiceRef.current = service;
    if (!isInitial) {
      initializedRef.current = false;
      autoAdvanceRef.current = 0;
      fetchedRef.current = false;
      selectedDate = null;
      selectedDateSlots = [];
      setSlots([]);
      setSelectedSlotId(null);
      setFormData(EMPTY_FORM);
      setSubmitError(null);
      setSuccess(false);
      setNoSlotsInMonth(false);
      cal.gotoDate(initDate);
    }

    cal.removeAllEventSources();
    cal.addEventSource(buildEventsUrl(service));
  }, [service]);

  function handleSlotClick(slot) {
    setSelectedSlotId(slot.id);
    setSubmitError(null);
    setSuccess(false);
  }

  function handleFormChange(field, value) {
    setFormData(function (prev) { return Object.assign({}, prev, { [field]: value }); });
  }

  function handleSubmit(e) {
    e.preventDefault();
    var slot = slots.find(function (s) { return s.id === selectedSlotId; });
    if (!slot) return;
    setSubmitting(true);
    setSubmitError(null);
    fetch(settings.storeSlotUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start: slot.startStr,
        end: slot.endStr,
        service: service,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        comments: formData.comments,
      }),
    }).then(function (res) {
      if (res.ok) {
        setSubmitting(false);
        setSubmitError(null);
        setSuccess(true);
        setSelectedSlotId(null);
        setFormData(EMPTY_FORM);
      } else {
        setSubmitting(false);
        if (res.status === 422) {
          setSubmitError("That slot was just booked. Please choose another time.");
        } else {
          setSubmitError("Something went wrong. Please try again.");
        }
      }
    }).catch(function () {
      setSubmitting(false);
      setSubmitError("Something went wrong. Please try again.");
    });
  }

  var selectedSlot = slots.find(function (s) { return s.id === selectedSlotId; });

  return html`
    <div>
      <p class=${CX.selectorLabel}>Select Appointment Type</p>
      <div class=${CX.selectorGrid}>
        ${TYPES.map(function (t) {
          var active = service === t.id;
          return html`
            <button
              key=${t.id}
              onClick=${function () { setService(t.id); }}
              style="text-align:left; cursor:pointer;"
              class=${CX.typeBtn + " " + (active ? CX.typeBtnActive : CX.typeBtnInactive)}
            >
              <div class=${CX.typeCircle + " " + (active ? CX.typeCircleActive : CX.typeCircleInactive)}>
                ${active ? CHECK : null}
              </div>
              <div>
                <p class=${CX.typeLabel + " " + (active ? CX.typeLabelActive : CX.typeLabelInactive)}>
                  ${t.label}
                </p>
                <p class=${CX.typeDuration + " " + (active ? CX.typeDurationActive : CX.typeDurationInactive)}>
                  ${t.duration}
                </p>
              </div>
            </button>
          `;
        })}
      </div>

      <div class="riverside-booking-wrap">
        <div class=${CX.calWrapper}>
          <div ref=${calEl} id="riverside-calendar"></div>
          ${noSlotsInMonth ? html`
            <div class=${CX.noSlotsOverlay}>
              <p style="font-size:0.875rem;color:#6b7280;border:1px solid #b8d4dc;background:#fff;padding:0.5rem 1rem;">
                No availability this month
              </p>
            </div>
          ` : null}
        </div>
        ${slots.length > 0 ? html`
          <div id="riverside-slots-wrap">
            <div id="riverside-booking-slots">
              ${slots.map(function (slot) {
                return html`
                  <button
                    key=${slot.id}
                    type="button"
                    onClick=${function () { handleSlotClick(slot); }}
                    class=${"riverside-slot-btn" + (selectedSlotId === slot.id ? " is-selected" : "")}
                  >${slotLabel(slot.start)}</button>
                `;
              })}
            </div>
          </div>
        ` : null}
      </div>

      ${success ? html`
        <div class=${CX.successSection}>
          <div class=${CX.successBox}>
            <p class=${CX.successTitle}>Request received!</p>
            <p class=${CX.successBody}>Thank you. We'll contact you shortly to confirm your appointment.</p>
            <button
              type="button"
              onClick=${function () {
                setSuccess(false);
                setFormData(EMPTY_FORM);
                if (calEl.current) {
                  calEl.current.querySelectorAll(".fc-daygrid-day.is-selected").forEach(function (d) {
                    d.classList.remove("is-selected");
                  });
                }
              }}
              class=${CX.successLink}
            >Book another appointment</button>
          </div>
        </div>
      ` : null}

      ${selectedSlot ? html`
        <form onSubmit=${handleSubmit} autocomplete="on" class=${CX.formSection}>
          <p class=${CX.formHeading}>Your Details</p>

          <div class=${CX.formGrid}>
            <div>
              <label class=${CX.formLabel}>
                First name <span class=${CX.formRequired}>*</span>
              </label>
              <input
                type="text"
                name="first_name"
                autocomplete="given-name"
                required
                value=${formData.firstName}
                onInput=${function (e) { handleFormChange("firstName", e.target.value); }}
                class=${CX.formInput}
              />
            </div>
            <div>
              <label class=${CX.formLabel}>
                Last name <span class=${CX.formRequired}>*</span>
              </label>
              <input
                type="text"
                name="last_name"
                autocomplete="family-name"
                required
                value=${formData.lastName}
                onInput=${function (e) { handleFormChange("lastName", e.target.value); }}
                class=${CX.formInput}
              />
            </div>
            <div class="sm:col-span-2">
              <label class=${CX.formLabel}>
                Phone number <span class=${CX.formRequired}>*</span>
              </label>
              <input
                type="tel"
                name="phone"
                autocomplete="tel"
                required
                value=${formatPhone(formData.phone)}
                onInput=${function (e) {
                  handleFormChange("phone", formatPhone(e.target.value));
                }}
                class=${CX.formInput}
              />
            </div>
          </div>

          <div class="mb-6">
            <label class=${CX.formLabel}>Comments</label>
            <textarea
              rows="4"
              name="comments"
              autocomplete="off"
              value=${formData.comments}
              onInput=${function (e) { handleFormChange("comments", e.target.value); }}
              class=${CX.formTextarea}
            ></textarea>
          </div>

          ${submitError ? html`<p class=${CX.formError}>${submitError}</p>` : null}

          <button type="submit" disabled=${submitting} class=${CX.submitBtn}>
            ${submitting ? "Submitting…" : "Request appointment"}
          </button>
        </form>
      ` : null}
    </div>
  `;
}

class RptBooking extends HTMLElement {
  connectedCallback() {
    render(html`<${Booking} settings=${window.drupalSettings.riversidePt} />`, this);
  }
  disconnectedCallback() {
    render(null, this);
  }
}

customElements.define("rpt-booking", RptBooking);
