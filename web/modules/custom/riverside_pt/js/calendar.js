(function (drupalSettings) {
  document.addEventListener('DOMContentLoaded', function () {
    const el = document.getElementById('riverside-calendar');
    if (!el) return;

    const calendar = new FullCalendar.Calendar(el, {
      initialView: 'dayGridMonth',
      headerToolbar: { left: 'prev', center: 'title', right: 'next' },
      validRange: function (now) {
        return {
          start: new Date(now.getFullYear(), now.getMonth(), 1),
          end: new Date(now.getFullYear(), now.getMonth() + 7, 1),
        };
      },
      fixedWeekCount: false,
      height: 'auto',
      events: drupalSettings.riversidePt.eventsUrl,
      eventBackgroundColor: '#3b82f6',
      eventBorderColor: '#3b82f6',
      dayMaxEvents: 0,
      moreLinkContent: function (arg) {
        return arg.num + ' slot' + (arg.num !== 1 ? 's' : '');
      },
      dayCellClassNames: function (arg) {
        const date = arg.date.toISOString().substring(0, 10);
        if (drupalSettings.riversidePt.holidays[date]) return ['is-holiday'];
      },
      dayCellDidMount: function (arg) {
        const date = arg.date.toISOString().substring(0, 10);
        const holiday = drupalSettings.riversidePt.holidays[date];
        if (!holiday) return;
        const label = document.createElement('div');
        label.className = 'riverside-holiday-label';
        label.textContent = holiday;
        const dayTop = arg.el.querySelector('.fc-daygrid-day-top');
        if (dayTop) {
          dayTop.insertAdjacentElement('afterend', label);
        } else {
          arg.el.appendChild(label);
        }
      },
      moreLinkClick: function (arg) {
        arg.jsEvent.preventDefault();
        arg.jsEvent.stopPropagation();
        const date = arg.date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        panelDate.textContent = date;
        panelSlots.innerHTML = '';
        arg.allSegs.forEach(function (seg) {
          const li = document.createElement('li');
          const start = seg.event.start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          const end = seg.event.end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          const params = new URLSearchParams({
            start: seg.event.startStr,
            end: seg.event.endStr,
          });
          const a = document.createElement('a');
          a.href = drupalSettings.riversidePt.bookingUrl + '?' + params.toString();
          a.textContent = start + ' – ' + end;
          li.appendChild(a);
          panelSlots.appendChild(li);
        });
        openPanel();
        return false;
      },
    });

    const panel = document.getElementById('riverside-booking-panel');
    const backdrop = document.getElementById('riverside-booking-backdrop');
    const panelDate = document.getElementById('riverside-booking-date');
    const panelSlots = document.getElementById('riverside-booking-slots');

    function closePanel() {
      panel.hidden = true;
      backdrop.hidden = true;
    }

    function openPanel() {
      backdrop.hidden = false;
      panel.hidden = false;
    }

    document.getElementById('riverside-booking-close').addEventListener('click', closePanel);
    backdrop.addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePanel();
    });

    calendar.render();
  });
})(drupalSettings);
