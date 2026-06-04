(function (drupalSettings) {
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('riverside-calendar');
    if (!el) return;

    requestAnimationFrame(function () {
      var slotsWrap = document.getElementById('riverside-slots-wrap');
      var slotsGrid = document.getElementById('riverside-booking-slots');

      var selectedDate = null;
      var initialized  = false;
      var currentService = 'diagnostic';

      function buildEventsUrl(service) {
        return drupalSettings.riversidePt.eventsUrl + '?service=' + service;
      }

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

      var initDate = nextBusinessDay();

      function slotLabel(date) {
        var h = date.getHours();
        return (h % 12 || 12) + (h < 12 ? 'AM' : 'PM') + ' PST';
      }

      function renderSlots(dateStr, events) {
        var dayEvents = events
          .filter(function (e) { return e.startStr.startsWith(dateStr); })
          .sort(function (a, b) { return a.start - b.start; });

        if (!slotsWrap || !slotsGrid || dayEvents.length === 0) return;

        slotsGrid.innerHTML = '';
        dayEvents.forEach(function (event, idx) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = slotLabel(event.start);
          btn.className = 'riverside-slot-btn' + (idx === 0 ? ' is-selected' : '');
          btn.addEventListener('click', function () {
            slotsGrid.querySelectorAll('.riverside-slot-btn').forEach(function (b) {
              b.classList.remove('is-selected');
            });
            btn.classList.add('is-selected');
            fetch(drupalSettings.riversidePt.storeSlotUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ start: event.startStr, end: event.endStr, service: currentService }),
            }).then(function (res) {
              if (res.ok) {
                window.location.href = drupalSettings.riversidePt.bookingUrl;
              } else {
                btn.textContent += ' (unavailable)';
                btn.disabled = true;
              }
            });
          });
          slotsGrid.appendChild(btn);
        });

        slotsWrap.hidden = false;
      }

      function selectDay(dateStr, events) {
        el.querySelectorAll('.fc-daygrid-day.is-selected').forEach(function (d) {
          d.classList.remove('is-selected');
        });
        var dayEl = el.querySelector('.fc-daygrid-day[data-date="' + dateStr + '"]');
        if (dayEl) dayEl.classList.add('is-selected');
        selectedDate = dateStr;
        renderSlots(dateStr, events);
      }

      var calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
        initialDate: initDate,
        headerToolbar: { left: 'prev', center: 'title', right: 'next' },
        titleFormat: { year: 'numeric', month: 'long' },
        dayHeaderFormat: { weekday: 'narrow' },
        validRange: function (now) {
          return {
            start: new Date(now.getFullYear(), now.getMonth(), 1),
            end: new Date(now.getFullYear(), now.getMonth() + 7, 1),
          };
        },
        fixedWeekCount: false,
        height: 'auto',
        events: buildEventsUrl(currentService),
        eventDisplay: 'none',
        dayMaxEvents: false,

        datesSet: function () {
          el.querySelectorAll('.fc-daygrid-day.is-selected').forEach(function (d) {
            d.classList.remove('is-selected');
          });
          selectedDate = null;
          if (slotsWrap) slotsWrap.hidden = true;
        },

        eventsSet: function (events) {
          el.querySelectorAll('.fc-daygrid-day.has-availability').forEach(function (d) {
            d.classList.remove('has-availability');
          });
          events.forEach(function (event) {
            var dateStr = event.startStr.substring(0, 10);
            var dayEl = el.querySelector('.fc-daygrid-day[data-date="' + dateStr + '"]');
            if (dayEl) dayEl.classList.add('has-availability');
          });

          if (!initialized) {
            initialized = true;
            var targetEl = el.querySelector('.fc-daygrid-day[data-date="' + initDate + '"]');
            if (targetEl && targetEl.classList.contains('has-availability')) {
              selectDay(initDate, events);
            }
          }
        },

        dayCellClassNames: function (arg) {
          var date = arg.date.toISOString().substring(0, 10);
          if (drupalSettings.riversidePt.holidays[date]) return ['is-holiday'];
        },

        dateClick: function (arg) {
          if (!arg.dayEl.classList.contains('has-availability')) return;
          selectDay(arg.dateStr, calendar.getEvents());
        },
      });

      calendar.render();
    });
  });
})(drupalSettings);
