import type { Calendar } from "@fullcalendar/core";

declare global {
  interface RiversidePtSettings {
    eventsUrl: string;
    storeSlotUrl: string;
    bookingUrl?: string;
    holidays: Record<string, boolean>;
    scrollTo?: string;
  }

  interface RiversidePtEvent {
    id: number | string;
    title?: string;
    start: string;
    end: string;
    startStr?: string;
  }

  interface ConfirmedAppointment {
    start: string;
    service: string;
    firstName: string;
    lastName: string;
    email: string;
  }

  // FullCalendar is loaded as a UMD global. The Calendar constructor accepts
  // any options object because plugin-specific options (e.g. dateClick from
  // @fullcalendar/interaction) are not reflected in @fullcalendar/core types.
  namespace FullCalendar {
    const Calendar: new (el: HTMLElement, options?: Record<string, any>) => Calendar;
  }

  interface Window {
    FullCalendar?: typeof FullCalendar;
    rptScrollTo: (el: Element, animate?: boolean) => void;
    drupalSettings?: {
      riversidePt?: RiversidePtSettings;
    };
  }
}
