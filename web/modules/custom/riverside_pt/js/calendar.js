(function (drupalSettings) {
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('riverside-calendar');
    if (!el) return;

    requestAnimationFrame(function () {
      var selectedDate = null;

      var panel    = document.getElementById('riverside-booking-panel');
      var backdrop = document.getElementById('riverside-booking-backdrop');
      var panelDate  = document.getElementById('riverside-booking-date');
      var panelSlots = document.getElementById('riverside-booking-slots');

      function closePanel() {
        panel.hidden = true;
        backdrop.hidden = true;
      }

      function openPanel() {
        backdrop.hidden = false;
        panel.hidden = false;
      }

      var calendar = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth',
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
        events: drupalSettings.riversidePt.eventsUrl,
        eventDisplay: 'none',
        dayMaxEvents: false,

        datesSet: function () {
          el.querySelectorAll('.fc-daygrid-day.is-selected').forEach(function (d) {
            d.classList.remove('is-selected');
          });
          selectedDate = null;
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
        },

        dayCellClassNames: function (arg) {
          var date = arg.date.toISOString().substring(0, 10);
          if (drupalSettings.riversidePt.holidays[date]) return ['is-holiday'];
        },

        dateClick: function (arg) {
          if (!arg.dayEl.classList.contains('has-availability')) return;

          var dateStr = arg.dateStr;
          var dayEvents = calendar.getEvents().filter(function (e) {
            return e.startStr.startsWith(dateStr);
          });
          if (dayEvents.length === 0) return;

          // Update selected highlight.
          el.querySelectorAll('.fc-daygrid-day.is-selected').forEach(function (d) {
            d.classList.remove('is-selected');
          });
          arg.dayEl.classList.add('is-selected');
          selectedDate = dateStr;

          // Build slot list.
          panelDate.textContent = arg.date.toLocaleDateString(undefined, {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          });
          panelSlots.innerHTML = '';
          dayEvents.sort(function (a, b) { return a.start - b.start; }).forEach(function (event) {
            var startLabel = event.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
            var endLabel   = event.end.toLocaleTimeString(undefined,   { hour: 'numeric', minute: '2-digit' });
            var li = document.createElement('li');
            var a  = document.createElement('a');
            a.href = '#';
            a.textContent = startLabel + ' – ' + endLabel;
            a.addEventListener('click', function (e) {
              e.preventDefault();
              fetch(drupalSettings.riversidePt.storeSlotUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ start: event.startStr, end: event.endStr }),
              }).then(function (res) {
                if (res.ok) {
                  window.location.href = drupalSettings.riversidePt.bookingUrl;
                } else {
                  a.textContent += ' (no longer available)';
                  a.style.pointerEvents = 'none';
                  a.style.opacity = '0.5';
                }
              });
            });
            li.appendChild(a);
            panelSlots.appendChild(li);
          });
          openPanel();
        },
      });

      document.getElementById('riverside-booking-close').addEventListener('click', closePanel);
      backdrop.addEventListener('click', closePanel);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closePanel();
      });

      calendar.render();
    }); // end requestAnimationFrame
  });
})(drupalSettings);
