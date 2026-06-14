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

interface Window {
  FullCalendar?: any;
  rptScrollTo: (el: Element, animate?: boolean) => void;
  drupalSettings?: {
    riversidePt?: RiversidePtSettings;
  };
}

declare const FullCalendar: any;
