interface RiversidePtSettings {
  eventsUrl: string;
  storeSlotUrl: string;
  bookingUrl: string;
  holidays: Record<string, boolean>;
  scrollTo?: string;
}

interface Window {
  rptScrollTo: (el: Element, animate?: boolean) => void;
  drupalSettings?: {
    riversidePt?: RiversidePtSettings;
  };
}
