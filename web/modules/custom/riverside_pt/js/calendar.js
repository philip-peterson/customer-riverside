(function (drupalSettings) {
  document.addEventListener('DOMContentLoaded', function () {
    const el = document.getElementById('riverside-calendar');
    if (!el) return;

    const calendar = new FullCalendar.Calendar(el, {
      initialView: 'timeGridWeek',
      events: drupalSettings.riversidePt.eventsUrl,
    });

    calendar.render();
  });
})(drupalSettings);
