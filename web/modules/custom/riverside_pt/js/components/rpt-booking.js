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

const EMPTY_FORM = { lastName: "", phone: "", comments: "" };

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

  const calEl = useRef(null);
  const calRef = useRef(null);
  const initializedRef = useRef(false);
  const prevServiceRef = useRef(null);
  const autoAdvanceRef = useRef(0);
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
      height: "auto",
      eventDisplay: "none",
      dayMaxEvents: false,

      datesSet: function () {
        calEl.current.querySelectorAll(".fc-daygrid-day.is-selected").forEach(function (d) {
          d.classList.remove("is-selected");
        });
        setSlots([]);
        setSelectedSlotId(null);
      },

      eventsSet: function (events) {
        markDays(events);
        if (!initializedRef.current) {
          var dates = [...new Set(events.map(function (e) { return e.startStr.substring(0, 10); }))].sort();
          var firstDate = dates[0];
          if (firstDate) {
            initializedRef.current = true;
            autoAdvanceRef.current = 0;
            var targetEl = calEl.current.querySelector(".fc-daygrid-day[data-date=\"" + firstDate + "\"]");
            if (targetEl) {
              targetEl.classList.add("is-selected");
              setSlots(
                events
                  .filter(function (e) { return e.startStr.startsWith(firstDate); })
                  .sort(function (a, b) { return a.start - b.start; })
              );
            }
          } else if (autoAdvanceRef.current < 12) {
            autoAdvanceRef.current++;
            cal.next();
          }
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
        setSelectedSlotId(null);
        setSubmitError(null);
        setSlots(
          cal.getEvents()
            .filter(function (e) { return e.startStr.startsWith(arg.dateStr); })
            .sort(function (a, b) { return a.start - b.start; })
        );
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
    serviceRef.current = service;

    if (!isInitial) {
      initializedRef.current = false;
      autoAdvanceRef.current = 0;
      setSlots([]);
      setSelectedSlotId(null);
      setFormData(EMPTY_FORM);
      setSubmitError(null);
      cal.gotoDate(initDate);
    }

    cal.removeAllEventSources();
    cal.addEventSource(buildEventsUrl(service));
  }, [service]);

  function handleSlotClick(slot) {
    setSelectedSlotId(slot.id);
    setSubmitError(null);
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
        lastName: formData.lastName,
        phone: formData.phone,
        comments: formData.comments,
      }),
    }).then(function (res) {
      if (res.ok) {
        window.location.href = settings.bookingUrl;
      } else {
        setSubmitting(false);
        setSubmitError("Something went wrong. Please try again.");
      }
    }).catch(function () {
      setSubmitting(false);
      setSubmitError("Something went wrong. Please try again.");
    });
  }

  var selectedSlot = slots.find(function (s) { return s.id === selectedSlotId; });

  var inputClass = "w-full border border-pt-blue-200 bg-white px-3 py-2 text-gray-900 text-sm focus:outline-none focus:border-pt-blue-500 transition-colors";
  var labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return html`
    <div>
      <p class="text-xs tracking-widest uppercase text-pt-blue-500 font-semibold mb-5">Select Appointment Type</p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        ${TYPES.map(function (t) {
          var active = service === t.id;
          return html`
            <button
              key=${t.id}
              onClick=${function () { setService(t.id); }}
              style="text-align:left; cursor:pointer;"
              class=${
                "flex items-center gap-4 p-4 w-full rounded-xl border transition-colors " +
                (active ? "bg-pt-blue-500 border-pt-blue-500" : "bg-white border-pt-blue-200 hover:border-pt-blue-500")
              }
            >
              <div class=${
                "w-8 h-8 rounded-full shrink-0 flex items-center justify-center border " +
                (active ? "border-white/60" : "border-pt-blue-200")
              }>
                ${active ? CHECK : null}
              </div>
              <div>
                <p class=${"font-serif text-[1.0625rem] font-normal leading-snug " + (active ? "text-white" : "text-gray-900")}>
                  ${t.label}
                </p>
                <p class=${"text-[0.6875rem] tracking-widest font-semibold mt-0.5 " + (active ? "text-white/70" : "text-pt-blue-500")}>
                  ${t.duration}
                </p>
              </div>
            </button>
          `;
        })}
      </div>

      <div class="riverside-booking-wrap">
        <div ref=${calEl} id="riverside-calendar"></div>
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

      ${selectedSlot ? html`
        <form
          onSubmit=${handleSubmit}
          class="mt-8 pt-8 border-t border-pt-blue-200"
        >
          <p class="text-xs tracking-widest uppercase text-pt-blue-500 font-semibold mb-6">
            Your Details
          </p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 mb-5">
            <div>
              <label class=${labelClass}>
                Last name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value=${formData.lastName}
                onInput=${function (e) { handleFormChange("lastName", e.target.value); }}
                class=${inputClass}
              />
            </div>
            <div>
              <label class=${labelClass}>
                Phone number <span class="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value=${formData.phone}
                onInput=${function (e) { handleFormChange("phone", e.target.value); }}
                class=${inputClass}
              />
            </div>
          </div>

          <div class="mb-6">
            <label class=${labelClass}>Comments</label>
            <textarea
              rows="4"
              value=${formData.comments}
              onInput=${function (e) { handleFormChange("comments", e.target.value); }}
              class=${"resize-none " + inputClass}
            ></textarea>
          </div>

          ${submitError ? html`<p class="text-red-500 text-sm mb-4">${submitError}</p>` : null}

          <button
            type="submit"
            disabled=${submitting}
            class="px-[4em] py-[1em] bg-pt-blue-500 text-white text-sm font-medium transition-colors border-2 border-pt-blue-500 hover:bg-pt-blue-600 hover:border-pt-blue-600 disabled:opacity-50"
          >
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
