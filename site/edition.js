/* EDITION · the only file a promoter edits each month.
   Change the DJ, the set, the copy and the skin; the frame (layout, ticket, scroll funnel) never changes.
   FICTIONAL demo data: Nova Vale and "The Annex Room" are made up. Replace before promoting a real night.
   SECURITY: the venue name and address are deliberately NOT in this file (anything here is public). They live on the server
   and reach a card only after payment and only from T-3h. The demo's stand-in venue is in lr-api-mock.js. */
window.LR_EDITION = {
  slug: 'nova-vale',
  series: { name: 'Listening Room', city: 'Montgomery, AL', edition: '01', month: 'November 2026' },

  dj: {
    name: 'Nova Vale', lines: ['Nova', 'Vale'],
    tagline: 'Slow house and vinyl edits for people who came to listen.',
    tags: ['Deep house', 'Downtempo', 'Vinyl edits'], bpm: '96–118 BPM', mood: 'Warm, patient, low-lit'
  },
  statement: 'One DJ. One room. A set with nowhere to be. Come early, stay late, and hear all of it.',

  event: {
    start: '2026-11-19T20:00:00-06:00', dateLabel: 'Thu, Nov 19', doors: '20:00', end: '23:00',
    capacity: 60, seatsLeft: null, price: 25, fee: 0, maxQty: 4,
    venueArea: 'Blount Cultural Park, Montgomery', release: { unlockLeadMin: 180, doorPhraseLeadMin: 30 },
    venueDecoy: 'Venue name · 000 Street name, Montgomery, AL', venueLockedLabel: 'Address 3h before doors'
  },

  set: [
    { t: '20:00', title: 'Doors', note: 'Warm lights, drinks, light snacks', energy: .10 },
    { t: '20:45', title: 'Opening set', note: 'Slow build, low tempo', energy: .34 },
    { t: '21:30', title: 'Featured set', note: 'Nova’s full set. New picks, long blends.', energy: .78 },
    { t: '22:15', title: 'Soft landing', note: 'Longer tracks, lights up a notch', energy: .50 },
    { t: '22:45', title: 'Last record', note: 'One more, then last call', energy: .14 }
  ],

  room: {
    stats: [{ n: '60', l: 'seats' }, { n: '0', l: 'dance floors' }, { n: '1', l: 'unhurried DJ' }],
    points: ['Light snacks', 'Drinks at the bar', 'Seated and standing room', 'Phones down, volume up'],
    lockNote: 'The address unlocks on your card three hours before doors. No exceptions.'
  },

  closing: {
    headline: 'Sixty seats. One night. Reserve now, the address unlocks 3 hours before doors.',
    assure: ['Advance tickets only, no door sales', 'The address unlocks 3 hours before doors', 'Light snacks and drinks inside'],
    note: 'Advance only · No door sales'
  },

  /* 'pay.html' holds the seats, hands off to Square, then shows the card. See design/SECURE-CARD-FLOW.md. */
  cta: { label: 'Reserve your seat', pay: 'pay.html' },
  /* provider 'square'. mode 'demo' = simulated server in the browser (no real payment). mode 'live' = your Supabase functions at apiBase (see server/README.md; untested against live Square). */
  payment: { provider: 'square', mode: 'demo', apiBase: '' },

  footer: {
    left: 'Demo edition. Fictional artist and venue. No tickets are sold on this page.',
    right: 'Set in Instrument Serif and Manrope.'
  },

  /* THE SKIN: palette (5 tokens), display face, title treatment, motif (spectra | tunnel | sunburst | mercury | spotlight). */
  theme: {
    id: 'quiet-spectra', shader: 'spectra', ease: 'expo.out', grain: .06, seed: 2,
    font: { stack: "'Instrument Serif',Georgia,'Times New Roman',serif", hWeight: 400, hStyle: 'normal' },
    tokens: { bg: '#0b0b0c', surface: '#151517', ink: '#f8f6f1', muted: '#b9b4a8', acc: '#c8a45c', acc2: '#e2c07a', accOn: '#0b0b0c' },
    title: { size: 'clamp(5rem,18vw,20rem)', sizeM: 'clamp(5.4rem,36vw,10.5rem)', lh: .8, track: '-.035em', weight: 400, split: 'chars' }
  }
};
