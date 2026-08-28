// Client-facing knowledge only. Keep credentials and staff-only procedures out.
const readyKnowledge = {
  company: {
    name: "Ready Bartending LLC",
    website: "https://readybartending.com",
    description:
      "Ready Bartending provides mobile bartending, event staffing, bartending experiences, classes/training, and select event add-ons in South Florida.",
  },
  links: {
    home: "https://readybartending.com",
    clientIntake: "https://readybartending.com/intake-form",
    staffingPackages: "https://readybartending.com/rb/event-staffing-packages",
    events: "https://readybartending.com/rb/events",
    scheduling: "https://readybartending.com/rb/client-scheduling",
    rentalsProducts: "https://readybartending.com/rb/rentals-products",
    rentalInquiry: "https://readybartending.com/rb/rental-inquiry",
  },
  staffing: {
    bartenderRatio: "A general planning ratio is 1 bartender per 50 guests.",
    bartenderBaseRate: "$200 for up to 4 hours.",
    serverSupportBaseRate: "$160 for up to 4 hours.",
    bartenderOvertime: "$55 per additional hour.",
    otherStaffOvertime: "$45 per additional hour.",
    note:
      "Final staffing needs and pricing can change based on guest count, service style, venue, event length, menu, setup requirements, and package.",
  },
  booking: {
    deposit: "A 25% deposit is required to book, with a $100 minimum deposit.",
    finalPayment: "Final payment is due 7 days before the event.",
    dateHold:
      "A quote or inquiry does not guarantee a date. The required booking payment must be received to secure services.",
    purchasing:
      "Ready does not purchase event supplies based on an unpaid quote. Required payments must be received before applicable supplies are purchased.",
  },
  services: {
    mobileBartending:
      "Bartending services can be customized based on guest count, hours, location, staffing, menu, and add-ons.",
    eventStaffing: "Ready can provide bartenders and server/support staff for events.",
    mixNSip:
      "Mix N Sip is a guided cocktail-making experience. Exact pricing and availability should be confirmed for the requested date and group size.",
    craftsAndCocktails:
      "Crafts & Cocktails combines a craft activity with a cocktail experience. Exact pricing and availability should be confirmed for the requested date and group size.",
    training:
      "Ready offers bartending-related training/classes. Use the scheduling page for available appointment options.",
    rentals:
      "Some event equipment and add-ons may be available. Availability and pricing depend on the event and date.",
  },
  alcohol: {
    rule:
      "Do not tell a client that alcohol is automatically included. Alcohol arrangements depend on the selected package, event type, venue requirements, and quote.",
    response:
      "Some packages or events may include alcohol arrangements, while others may require the client to provide alcohol. The Ready team should confirm the exact arrangement on the quote.",
  },
  cleanup: {
    note:
      "Standard breakdown expectations depend on the package. Cleanup that extends beyond the included breakdown window may incur additional charges.",
    overtime: "When applicable, cleanup overtime after the first 30 minutes is $100 per hour.",
  },
  assistantRules: {
    neverInvent:
      "If the knowledge does not clearly answer the question, say that the Ready team needs to confirm it.",
    customQuotes:
      "Do not promise a final total from base rates alone. Event quotes can change based on event details.",
    availability:
      "Do not promise that a date is available or reserved unless an approved availability/booking tool confirms it.",
    discounts: "Do not negotiate, create discounts, or change quoted pricing.",
    refunds: "Do not approve or deny refunds. Escalate refund requests to a human.",
    disputes:
      "Escalate complaints, disputes, chargebacks, threats, safety issues, or allegations about staff.",
    paymentSecurity:
      "Never ask a client to send a full card number, CVV, bank password, or other sensitive payment credentials in chat.",
    noLeadCollection:
      "Do not collect personal or event information in chat, and do not claim chat messages will be sent to the Ready team.",
    navigation:
      "Answer first, then provide the most relevant approved link when the client needs to submit information or take action.",
  },
  leadQuestions: [
    "What is the event date?",
    "Approximately how many guests are expected?",
    "What city or venue is the event in?",
    "What type of event is it?",
    "What service are you interested in?",
    "How many service hours do you need?",
  ],
};

export default readyKnowledge;
