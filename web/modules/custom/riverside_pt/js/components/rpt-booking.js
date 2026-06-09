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

const EMPTY_FORM = { firstName: "", lastName: "", email: "", phone: "", comments: "" };

function formatPhone(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") {
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
  calWrapper:     "relative",
  noSlotsOverlay: "absolute inset-0 z-10 flex items-center justify-center pt-20 pointer-events-none",

  // ── Success state ──────────────────────────────────────────────────────
  successSection: "mt-8 pt-8 border-t border-pt-blue-200",
  successBox:     "p-8 bg-green-50 border border-green-200 text-green-800",
  successTitle:   "text-2xl font-semibold mb-4",
  successSummary: "flex flex-col gap-1 text-base mb-4",
  successNote:    "text-sm text-green-700",
};

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

function slotLabel(startStr) {
  var d = new Date(startStr);
  var h = d.getHours();
  return (h % 12 || 12) + (h < 12 ? "AM" : "PM") + " PST";
}

function formatAppointmentDate(startStr) {
  var parts = startStr.split("T")[0].split("-");
  var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  var date = d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return date + " at " + slotLabel(startStr);
}

// ── BookingPanel ──────────────────────────────────────────────────────────
// Keyed by service in the parent, so it always mounts fresh for each service.
// service is a prop here — it never changes within an instance's lifetime,
// which means the fetch effect can depend only on dateRange (no stale-service risk).
function BookingPanel({ service, settings }) {
  const [dateRange, setDateRange] = useState(null);
  const [fetchedEvents, setFetchedEvents] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState(null);
  const [noSlotsInMonth, setNoSlotsInMonth] = useState(false);

  const calEl = useRef(null);
  const calRef = useRef(null);
  const initializedRef = useRef(false);
  const autoAdvanceRef = useRef(0);
  const fetchAbortRef = useRef(null);
  // Instance-scoped vars for FullCalendar callbacks (no stale-closure risk via .current).
  const selectedDateRef = useRef(null);
  const selectedDateSlotsRef = useRef([]);
  const currentEventsRef = useRef([]);
  const initDate = useMemo(nextBusinessDay, []);
  const formRef = useRef(null);
  const prevSlotIdRef = useRef(null);
  const successRef = useRef(null);

  function buildEventsUrl() {
    return settings.eventsUrl + "?service=" + service;
  }

  // ── Initialize FullCalendar once ─────────────────────────────────────
  useEffect(function () {
    if (!calEl.current || !window.FullCalendar) return;

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

      datesSet: function (info) {
        calEl.current.querySelectorAll(".fc-daygrid-day.is-selected").forEach(function (d) {
          d.classList.remove("is-selected");
        });
        setSelectedSlotId(null);
        setNoSlotsInMonth(false);
        if (selectedDateRef.current) {
          var dayEl = calEl.current.querySelector(".fc-daygrid-day[data-date=\"" + selectedDateRef.current + "\"]");
          if (dayEl) {
            dayEl.classList.add("is-selected");
            setSlots(selectedDateSlotsRef.current);
          } else {
            setSlots([]);
          }
        } else {
          setSlots([]);
        }
        setDateRange(info.startStr + "/" + info.endStr);
      },

      eventsSet: function (events) {
        calEl.current.querySelectorAll(".fc-daygrid-day.has-availability").forEach(function (d) {
          d.classList.remove("has-availability");
        });
        events.forEach(function (event) {
          var dateStr = event.startStr.substring(0, 10);
          var dayEl = calEl.current.querySelector(".fc-daygrid-day[data-date=\"" + dateStr + "\"]");
          if (dayEl) dayEl.classList.add("has-availability");
        });
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
        var daySlots = currentEventsRef.current
          .filter(function (e) { return e.start.startsWith(arg.dateStr); })
          .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
        selectedDateRef.current = arg.dateStr;
        selectedDateSlotsRef.current = daySlots;
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

  // ── Fetch events when visible range changes ──────────────────────────
  // service is a prop that never changes within this component instance
  // (parent keys us by service), so only dateRange needs to be a dep.
  useEffect(function () {
    if (!dateRange) return;
    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    var controller = new AbortController();
    fetchAbortRef.current = controller;
    var parts = dateRange.split("/");
    var url = buildEventsUrl() + "&start=" + parts[0] + "&end=" + parts[1];
    setFetchLoading(true);
    setFetchedEvents(null);
    fetch(url, { signal: controller.signal })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        currentEventsRef.current = data;
        setFetchedEvents(data);
        setFetchLoading(false);
      })
      .catch(function (err) {
        if (err.name === "AbortError") return;
        currentEventsRef.current = [];
        setFetchedEvents([]);
        setFetchLoading(false);
      });
  }, [dateRange]);

  // ── Push fetched events into FullCalendar; auto-advance or auto-select ─
  useEffect(function () {
    if (fetchedEvents === null) return;
    var cal = calRef.current;
    if (!cal) return;

    cal.removeAllEventSources();

    if (fetchedEvents.length > 0) {
      cal.addEventSource(fetchedEvents);

      if (!initializedRef.current) {
        var dates = [...new Set(fetchedEvents.map(function (e) { return e.start.substring(0, 10); }))].sort();
        var firstDate = dates[0];
        if (firstDate) {
          var firstSlots = fetchedEvents
            .filter(function (e) { return e.start.startsWith(firstDate); })
            .sort(function (a, b) { return a.start < b.start ? -1 : 1; });
          selectedDateRef.current = firstDate;
          selectedDateSlotsRef.current = firstSlots;
          var targetEl = calEl.current.querySelector(".fc-daygrid-day[data-date=\"" + firstDate + "\"]");
          if (targetEl) {
            initializedRef.current = true;
            autoAdvanceRef.current = 0;
            targetEl.classList.add("is-selected");
            setSlots(firstSlots);
          }
        }
      }
    } else if (!initializedRef.current && autoAdvanceRef.current < 12) {
      autoAdvanceRef.current++;
      cal.next();
    } else if (initializedRef.current) {
      setNoSlotsInMonth(true);
    }
  }, [fetchedEvents]);

  useEffect(function () {
    if (selectedSlotId && !prevSlotIdRef.current && formRef.current) {
      window.rptScrollTo(formRef.current, true);
    }
    prevSlotIdRef.current = selectedSlotId;
  }, [selectedSlotId]);

  useEffect(function () {
    if (success && successRef.current) {
      window.rptScrollTo(successRef.current, true);
    }
  }, [success]);

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
        start: slot.start,
        end: slot.end,
        service: service,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        comments: formData.comments,
      }),
    }).then(function (res) {
      if (res.ok) {
        setSubmitting(false);
        setSubmitError(null);
        setConfirmedAppointment({
          start: slot.start,
          service: service,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
        });
        setSuccess(true);
        setSelectedSlotId(null);
        setFormData(EMPTY_FORM);
      } else {
        setSubmitting(false);
        if (res.status === 422) {
          setSubmitError("That slot was just booked. Please choose another time.");
        } else {
          res.json().then(function (data) {
            setSubmitError(data.message || "Something went wrong. Please try again.");
          }).catch(function () {
            setSubmitError("Something went wrong. Please try again.");
          });
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
      ${!success ? html`
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
            <p class="text-xs text-gray-500 mb-3">Select a time on ${(function () {
              var p = slots[0].start.split("T")[0].split("-");
              return parseInt(p[1]) + "/" + parseInt(p[2]) + "/" + p[0];
            })()}:</p>
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

      ${!success && selectedSlot ? html`
        <form ref=${formRef} onSubmit=${handleSubmit} autocomplete="on" class=${CX.formSection}>
          <p class=${CX.formHeading}>Your Details</p>

          <div class=${CX.formGrid}>
            <div>
              <label class=${CX.formLabel} for="first-name">
                First (or given) name <span class=${CX.formRequired}>*</span>
              </label>
              <input
                id="first-name"
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
              <label class=${CX.formLabel} for="last-name">
                Last (or family) name <span class=${CX.formRequired}>*</span>
              </label>
              <input
                id="last-name"
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
              <label class=${CX.formLabel} for="email">
                Email address <span class=${CX.formRequired}>*</span>
              </label>
              <input
                id="email"
                type="email"
                name="email"
                autocomplete="email"
                required
                value=${formData.email}
                onInput=${function (e) { handleFormChange("email", e.target.value); }}
                class=${CX.formInput}
              />
            </div>
            <div class="sm:col-span-2">
              <label class=${CX.formLabel} for="phone">
                Phone number <span class=${CX.formRequired}>*</span>
              </label>
              <input
                id="phone"
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
            <label class=${CX.formLabel} for="comments">
              Comments
            </label>
            <textarea
              id="comments"
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
      ` : null}

      ${success && confirmedAppointment ? html`
        <div ref=${successRef} class=${CX.successSection}>
          <div class=${CX.successBox}>
            <p class=${CX.successTitle}>Request received!</p>
            <div class=${CX.successSummary}>
              <p>${confirmedAppointment.firstName} ${confirmedAppointment.lastName}</p>
              <p>${confirmedAppointment.email}</p>
              <p>${TYPES.find(function (t) { return t.id === confirmedAppointment.service; }).label}</p>
              <p>${formatAppointmentDate(confirmedAppointment.start)}</p>
            </div>
            <p class=${CX.successNote}>We'll contact you shortly to confirm your appointment.</p>
          </div>
        </div>
      ` : null}
    </div>
  `;
}

// ── Booking ───────────────────────────────────────────────────────────────
// Owns service selection and the type selector UI. Keys BookingPanel by
// service so it mounts fresh on every change — no reset effects, no races.
// Starts with null so no service is pre-selected.
function Booking({ settings }) {
  const [service, setService] = useState(null);

  return html`
    <div style="min-height:460px">
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
      ${service ? html`
        <${BookingPanel} key=${service} service=${service} settings=${settings} />
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
