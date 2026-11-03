#!/usr/bin/env python3
"""Generates design/wireframes.html: grayscale wireframes in real layout coordinates (1440x900 desktop, 390x844 phone),
with numbered pins keyed to the requirement IDs in design/REQUIREMENTS-MAP.md. Run: python3 tools/make_wireframes.py"""
import html, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'design', 'wireframes.html')
S_D, S_M = 0.44, 0.46          # display scale for desktop / mobile frames


def box(x, y, w, h, txt='', cls=''):
    return f'<div class="b {cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">{html.escape(txt)}</div>'


def pin(x, y, n):
    return f'<span class="pin" style="left:{x}px;top:{y}px">{n}</span>'


def frame(w, h, s, inner, caption, legend):
    items = ''.join(f'<li><b>{n}</b> {html.escape(t)} <em>{html.escape(r)}</em></li>' for n, t, r in legend)
    return (f'<figure class="fr"><div class="vp" style="width:{w*s:.0f}px;height:{h*s:.0f}px"><div class="in" style="width:{w}px;height:{h}px;transform:scale({s})">{inner}</div></div>'
            f'<figcaption><h3>{html.escape(caption)}</h3><ol>{items}</ol></figcaption></figure>')


def chrome_d(active=0, cta=True, name='NOVA VALE'):
    ticks = ''.join(box(290 + i * 208, 856, 14, 14, '', 'dot' + (' on' if i <= active else '')) for i in range(5))
    labels = ''.join(box(270 + i * 208, 874, 100, 16, t, 'tiny') for i, t in enumerate(['ARRIVE', 'SOUND', 'SET', 'ROOM', 'TICKET']))
    return (box(0, 0, 1440, 64, '', 'bar') + box(72, 22, 220, 20, 'LISTENING ROOM · ED. 01', 'tiny') + box(600, 22, 240, 20, name if active else 'THU NOV 19 · MONTGOMERY', 'tiny') +
            (box(1212, 10, 156, 44, 'Reserve · $25', 'btn sm') if cta else '') + box(0, 836, 1440, 64, '', 'bar') + box(72, 858, 110, 20, '● CHAPTER', 'tiny') + box(290, 866, 898, 2, '', 'rail') + ticks + labels + box(1290, 852, 80, 36, '8:42 PM', 'tiny r'))


def chrome_m(active=0, cta=True):
    return (box(0, 0, 390, 56, '', 'bar') + box(20, 18, 150, 18, 'LISTENING ROOM', 'tiny') + (box(212, 6, 158, 44, 'Reserve · $25', 'btn sm') if cta else '') +
            box(0, 788, 390, 56, '', 'bar') + box(20, 808, 70, 16, 'ARRIVE', 'tiny') + box(110, 815, 190, 2, '', 'rail') + box(316, 806, 60, 18, '8:42 PM', 'tiny r'))


def ticket(x, y, w, h, locked=True, cta=True, compact=False):
    parts = [box(x, y, w, h, '', 'card'), box(x, y, w, int(h * (.2 if compact else .26)), 'PLATE · motif', 'img'), box(x + 16, y + 10, w - 32, 16, 'HEAD · edition + status dot', 'tiny')]
    cy = y + int(h * (.22 if compact else .30))
    parts += [box(x + 18, cy, w - 36, 16, 'OVERLINE', 'tiny'), box(x + 18, cy + 22, w - 36, 44 if compact else 52, 'DJ NAME', 'big' + (' sm' if compact else ''))]
    cy += 76 if compact else 84
    if not compact:
        parts += [box(x + 18, cy, w - 36, 34, 'tagline', 'tx'), box(x + 18, cy + 44, w - 36, 40, 'DATE · DOORS · SEATS', 'tx'), box(x + 18, cy + 92, w - 36, 36, 'Ticket × qty · fees', 'tx')]
        cy += 136
    else:
        parts += [box(x + 18, cy, w - 36, 38, 'DATE · DOORS · SEATS', 'tx')]
        cy += 48
    parts.append(box(x + 18, cy, w - 36, 60, 'LOCATION ' + ('(blurred, locked)' if locked else '(revealed)'), 'loc' + (' lock' if locked else '')))
    if not locked:
        parts.append(box(x + w / 2 - 50, cy + 70, 100, 100, 'QR', 'img'))
    if cta:
        parts.append(box(x + 18, y + h - 66, w - 36, 48, 'Reserve your seat · $25', 'btn'))
    return ''.join(parts)


F = []
# ───── desktop hero beats
F.append(frame(1440, 900, S_D, chrome_d(0) + box(72, 140, 260, 16, 'FEATURED DJ · NOV 2026', 'tiny') + box(72, 180, 880, 440, 'DJ NAME (display, 2 lines)\nmotif shader runs behind', 'big img') +
               box(72, 650, 470, 60, 'tagline', 'tx') + box(72, 760, 260, 20, 'SCROLL TO ENTER THE ROOM', 'tiny') + pin(330, 130, 1) + pin(880, 170, 2) + pin(560, 640, 3) + pin(1190, 0, 4) + pin(280, 826, 5),
               'Beat 1 · Arrive (0 to 12%)', [(1, 'Eyebrow names the month and the format', 'P2'), (2, 'Name is the star: display face, letters rise through a mask', 'B2, B8'), (3, 'One-line promise of the sound', 'P3'),
                                             (4, 'Persistent top-bar button for people who already decided', 'P8, B1'), (5, 'Chapter ticks double as navigation and progress', 'B1')]))
F.append(frame(1440, 900, S_D, chrome_d(1) + box(72, 330, 200, 16, 'THE SOUND', 'tiny') + box(72, 360, 780, 230, 'STATEMENT\nwords brighten as you scroll\n(scroll-scrubbed opacity)', 'big') +
               box(930, 300, 438, 220, 'GLASS PANEL\nSound · Tempo · Mood', 'card') + pin(60, 350, 1) + pin(860, 360, 2) + pin(1380, 300, 3),
               'Beat 2 · Sound (12 to 34%)', [(1, 'The name hands off to the bar so the title never competes', 'B2'), (2, 'One sentence sets the vibe; reading speed is the scroll speed', 'P3, P5'), (3, 'Facts on glass so any motif stays legible', 'B8')]))
F.append(frame(1440, 900, S_D, chrome_d(2) + box(72, 210, 600, 16, 'THE SET · ONE ARC, NO SKIPS', 'tiny') + ''.join(box(72, 250 + i * 82, 640, 68, f'{t}  ·  slot {i+1}', 'tx row') for i, t in enumerate(['8:00', '8:45', '9:30', '10:15', '10:45'])) +
               box(850, 280, 520, 340, 'ENERGY ARC\n(path draws with scroll,\nhead follows the clock)', 'card img') + pin(60, 240, 1) + pin(720, 300, 2) + pin(1380, 270, 3),
               'Beat 3 · Set (34 to 58%)', [(1, 'The set is shown as one arc, not a track list', 'P3, P4'), (2, 'Rows light up as the playhead passes their time', 'B1'), (3, 'Energy curve is edited in one array per month', 'B3')]))
F.append(frame(1440, 900, S_D, chrome_d(3) + box(72, 285, 120, 16, 'THE ROOM', 'tiny') + ''.join(box(72 + i * 250, 320, 230, 190, ['60\nseats', '0\ndance floors', '1\nDJ'][i], 'big') for i in range(3)) +
               box(72, 540, 720, 50, 'chips: Light snacks · Drinks · Seated + standing · Phones down', 'tx') + box(72, 610, 720, 28, '🔒 Address released to ticket holders at checkout. No exceptions.', 'tx') + ticket(930, 170, 438, 600, True, True) +
               pin(60, 310, 1) + pin(60, 535, 2) + pin(60, 605, 3) + pin(1380, 170, 4),
               'Beat 4 · Room (58 to 82%)', [(1, '"0 dance floors" says "not a club" in three words', 'P5, P6'), (2, 'Snacks and drinks stated plainly', 'P7'), (3, 'Secrecy stated before the ticket appears', 'P9'), (4, 'Ticket rises in from below (3D) while the room beat is still readable', 'B1, B5')]))
F.append(frame(1440, 900, S_D, chrome_d(4, cta=False) + box(72, 235, 100, 16, 'YOUR SEAT', 'tiny') + box(72, 265, 520, 190, 'CLOSING LINE\nSixty seats. One night.\nReserve to unlock the address.', 'big') +
               box(72, 490, 520, 100, '— Advance only, no door sales\n— Address unlocks at checkout\n— Light snacks and drinks', 'tx') + ticket(930, 140, 438, 640, True, True) + pin(60, 260, 1) + pin(60, 485, 2) + pin(1380, 140, 3) + pin(1190, 0, 4),
               'Beat 5 · Ticket (82 to 100%)', [(1, 'The closing line repeats the three facts that matter', 'P8, P9'), (2, 'Assurance list, not a paragraph', 'P7'), (3, 'The ONLY filled button on screen is in the ticket', 'Emphasis, Hick'), (4, 'The top-bar button hides here so there is one primary action', 'Hick')]))
# ───── mobile beats
M = []
M.append(frame(390, 844, S_M, chrome_m(0) + box(20, 250, 200, 14, 'FEATURED DJ · NOV 2026', 'tiny') + box(20, 280, 350, 280, 'DJ NAME\n(2 lines, fits width)', 'big img') + box(20, 580, 300, 50, 'tagline', 'tx') + pin(8, 270, 1),
               'Phone · Arrive', [(1, 'Name centered vertically; no overlap with the bar (fixed from audit)', 'Balance')]))
M.append(frame(390, 844, S_M, chrome_m(1) + box(20, 210, 120, 14, 'THE SOUND', 'tiny') + box(20, 240, 350, 190, 'STATEMENT\n(scrubbed)', 'big') + box(20, 450, 350, 150, 'GLASS PANEL\nSound · Tempo · Mood', 'card') + pin(8, 235, 1),
               'Phone · Sound', [(1, 'Panel fades in with its rows (no empty box)', 'Aesthetic-usability')]))
M.append(frame(390, 844, S_M, chrome_m(2) + box(20, 80, 200, 14, 'THE SET', 'tiny') + box(20, 106, 350, 190, 'ENERGY ARC', 'card img') + ''.join(box(20, 312 + i * 62, 350, 52, t, 'tx row') for i, t in enumerate(['8:00 Doors', '8:45 Opening', '9:30 Featured', '10:15 Soft landing', '10:45 Last record'])) + pin(8, 100, 1),
               'Phone · Set', [(1, 'Arc stacks above the list; axis labels render at 12px or larger', 'Scale')]))
M.append(frame(390, 844, S_M, chrome_m(3) + box(20, 220, 100, 14, 'THE ROOM', 'tiny') + ''.join(box(20 + i * 120, 250, 108, 120, ['60\nseats', '0\ndance\nfloors', '1\nDJ'][i], 'big sm') for i in range(3)) + box(20, 390, 350, 80, 'chips', 'tx') + pin(8, 245, 1),
               'Phone · Room', [(1, 'Ticket waits until this beat has left, so nothing overlaps', 'Hierarchy')]))
M.append(frame(390, 844, S_M, chrome_m(4, cta=False) + box(20, 90, 350, 150, 'CLOSING LINE', 'big') + ticket(20, 300, 350, 470, True, True, True) + pin(8, 295, 1),
               'Phone · Ticket', [(1, 'Ticket sits in the thumb zone; the CTA is 48px tall and full width', "Fitts")]))
# ───── pay page
PD1 = (box(0, 0, 1440, 64, '', 'bar') + box(72, 22, 200, 20, 'LISTENING ROOM · ED. 01', 'tiny') + box(1180, 22, 190, 20, '← DJ NAME', 'tiny r') + box(0, 64, 1440, 34, 'DEMO CHECKOUT · NOTHING IS CHARGED', 'btn') +
       box(90, 150, 520, 120, 'Your seat for DJ NAME', 'big') + box(90, 290, 520, 520, '', 'card') + box(110, 310, 150, 50, '− 2 +  seats', 'tx') + box(110, 380, 480, 60, 'Name on the card', 'tx row') + box(110, 460, 480, 60, 'Email for your ticket', 'tx row') +
       box(110, 540, 480, 100, 'Ticket × 2   $50\nFees   $0\nTotal   $50', 'tx') + box(110, 660, 480, 52, 'Complete reservation', 'btn') + ticket(890, 150, 460, 620, True, False) + pin(80, 150, 1) + pin(100, 300, 2) + pin(100, 650, 3) + pin(1360, 150, 4))
PD2 = (box(0, 0, 1440, 64, '', 'bar') + box(72, 22, 200, 20, 'LISTENING ROOM · ED. 01', 'tiny') + box(90, 150, 520, 120, 'You\'re in, Jordan.', 'big') + box(90, 290, 520, 70, 'Your card is on the right. Address unlocked.', 'tx') +
       box(90, 380, 250, 52, 'Save card (PNG)', 'btn') + box(360, 380, 250, 52, 'Add to calendar', 'btn sm') + box(90, 450, 520, 52, 'Share (no address)', 'btn sm') + ticket(890, 80, 460, 700, False, False) + pin(80, 150, 1) + pin(80, 380, 2) + pin(1360, 380, 3))
F2 = [frame(1440, 900, S_D, PD1, 'Pay · step 1 (reserve)', [(1, 'Same display face and motif as the hero: unity', 'B5'), (2, 'Seats stepper, name, email only: three fields', 'Hick, Miller'), (3, 'Demo banner is honest: no card is collected', 'Integrity'), (4, 'The card is already visible, locked, and fills in as you type', 'B5, Doherty')]),
      frame(1440, 900, S_D, PD2, 'Pay · step 2 (card unlocked)', [(1, 'Confirmation uses the first name', 'Peak-End'), (2, 'Export and calendar are the next actions; share excludes the address', 'P9'), (3, 'Location decrypts in place, status dot turns green, QR appears', 'P9, B5')])]
PM = frame(390, 844, S_M, box(0, 0, 390, 56, '', 'bar') + box(20, 18, 150, 18, 'LISTENING ROOM', 'tiny') + box(0, 56, 390, 34, 'DEMO CHECKOUT', 'btn') + ticket(20, 110, 350, 330, True, False, True) + box(20, 460, 350, 90, 'Your seat for DJ NAME', 'big') + box(20, 560, 350, 240, 'form: seats · name · email · Reserve', 'card') + pin(8, 105, 1),
           'Phone · Pay', [(1, 'Card first (compact), form below; on confirm the card scrolls into view', 'Zeigarnik')])
# ───── anatomy
ANAT = frame(520, 700, .8, ticket(30, 20, 460, 660, False, True) + ''.join(pin(8, y, n) for n, y in [(1, 24), (2, 140), (3, 225), (4, 255), (5, 330), (6, 410), (7, 470), (8, 570), (9, 560), (10, 640)]),
             'Ticket anatomy (identical every week)', [(1, 'Plate: the skin\'s motif, live or frozen', 'B3'), (2, 'Head: edition and status dot (amber, then green)', 'B5'), (3, 'Overline in accent', ''), (4, 'Title in the display face', 'B3'), (5, 'Meta: date, doors, seats', 'P6, P8'),
                                                       (6, 'Lines: ticket × qty, fees, total', 'P8'), (7, 'Location: blurred and locked until payment, then decrypts', 'P9'), (8, 'QR appears on confirm', ''), (9, 'Perforation separates the card from the stub', ''), (10, 'Foot: CTA on the hero, holder / reference / admit on the pay page', 'B4')])
# ───── funnel map
FUN = [('0–12%', 'Arrive', 'Who is it?', 'Name, month, promise', 'Awareness'), ('12–34%', 'Sound', 'What will it sound like?', 'Statement, tempo, mood', 'Interest'), ('34–58%', 'Set', 'What happens that night?', 'The arc, the order, the clock', 'Desire'),
       ('58–82%', 'Room', 'Is this my kind of room?', '60 seats, no dance floor, snacks, secret address', 'Trust'), ('82–100%', 'Ticket', 'How do I get in?', 'One ticket, one button', 'Action')]
fun = ''.join(f'<li style="flex:{[12,22,24,24,18][i]}"><b>{a}</b><h4>{b}</h4><p class="q">“{c}”</p><p>{d}</p><span>{e}</span></li>' for i, (a, b, c, d, e) in enumerate(FUN))

CSS = """
:root{--g1:#f5f5f4;--g2:#e5e5e3;--g3:#cfcfcc;--g4:#9a9a96;--g5:#555;--g6:#1c1c1b}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 system-ui,Arial,sans-serif;background:#fafaf9;color:var(--g6);padding:clamp(20px,4vw,56px)}
h1{margin:0 0 4px;font-size:clamp(1.6rem,3vw,2.4rem)}h2{margin:48px 0 6px;font-size:1.3rem}p.lede{margin:0 0 18px;color:var(--g5);max-width:70ch}
.funnel{display:flex;gap:0;list-style:none;padding:0;margin:18px 0 0;border:2px solid var(--g6)}.funnel li{padding:14px 14px 16px;border-right:2px solid var(--g6);background:repeating-linear-gradient(135deg,#fff,#fff 10px,var(--g1) 10px,var(--g1) 20px)}.funnel li:last-child{border:0}
.funnel b{font:700 11px/1 ui-monospace,monospace;letter-spacing:.1em;color:var(--g5)}.funnel h4{margin:6px 0 4px;font-size:1.2rem}.funnel p{margin:0 0 6px;font-size:.88rem;color:var(--g5)}.funnel .q{color:var(--g6);font-style:italic}.funnel span{display:inline-block;padding:2px 8px;border:1.5px solid var(--g6);border-radius:99px;font:700 10px/1.6 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;background:#fff}
.row{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}.fr{margin:0;max-width:640px}.fr .vp{overflow:hidden;border:2px solid var(--g6);background:#fff;position:relative}.fr .in{position:relative;transform-origin:0 0}
.fr figcaption{margin-top:10px;max-width:620px}.fr h3{margin:0 0 6px;font-size:1rem}.fr ol{margin:0;padding:0;list-style:none;display:grid;gap:3px;font-size:.84rem;color:var(--g5)}.fr li b{display:inline-flex;width:18px;height:18px;margin-right:6px;border-radius:50%;background:var(--g6);color:#fff;font-size:11px;align-items:center;justify-content:center}.fr li em{font:600 10.5px ui-monospace,monospace;color:var(--g4);margin-left:4px}
.mrow .fr{max-width:200px}.mrow .fr figcaption{max-width:200px}
.b{position:absolute;border:1.5px dashed var(--g4);padding:6px 10px;font:600 13px/1.25 ui-monospace,monospace;color:var(--g5);white-space:pre-line;overflow:hidden;display:flex;align-items:center;background:rgba(255,255,255,.6)}
.b.bar{background:var(--g1);border-color:var(--g3)}.b.big{font:800 36px/1.05 system-ui;color:var(--g6);border-color:var(--g5);justify-content:flex-start}.b.big.sm{font-size:22px}.b.tiny{font-size:11px;border:0;background:none;padding:0}.b.r{justify-content:flex-end}
.b.btn{background:var(--g6);color:#fff;border:0;border-radius:99px;justify-content:center;font-size:14px}.b.btn.sm{font-size:12px}.b.img{background:repeating-linear-gradient(45deg,var(--g2),var(--g2) 8px,var(--g1) 8px,var(--g1) 16px)}.b.card{background:var(--g1);border:2px solid var(--g5);border-radius:18px;align-items:flex-start}
.b.tx{border-color:var(--g3);font-weight:500}.b.row{border-radius:8px}.b.loc{border:2px solid var(--g5);border-radius:12px}.b.lock{background:repeating-linear-gradient(90deg,var(--g2),var(--g2) 4px,#fff 4px,#fff 8px)}
.b.dot{width:14px!important;height:14px!important;border-radius:50%;padding:0;background:#fff;border:2px solid var(--g5)}.b.dot.on{background:var(--g6)}.b.rail{height:2px!important;background:var(--g4);border:0;padding:0}
.pin{position:absolute;z-index:5;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:#d93025;color:#fff;font:700 15px/26px system-ui;text-align:center;box-shadow:0 0 0 3px #fff}
.note{margin-top:30px;padding:16px 20px;border:2px solid var(--g6);background:#fff;max-width:900px}.note h3{margin:0 0 6px}
@media(max-width:700px){.funnel{flex-direction:column}.funnel li{border-right:0;border-bottom:2px solid var(--g6)}.fr{max-width:100%}}
"""
page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Listening Room · Wireframes</title><style>{CSS}</style></head><body>
<h1>Listening Room · wireframes</h1>
<p class="lede">Real layout coordinates (1440×900 desktop, 390×844 phone) drawn in grayscale. Red pins map to the requirement IDs in <b>REQUIREMENTS-MAP.md</b> (P = the community post, B = the brief). One pinned hero, five beats, then a separate pay page that carries the same skin.</p>
<h2>The funnel: one scroll, five questions</h2>
<p class="lede">Each beat answers the next question a visitor has, in the order they ask it. The scrubber at the bottom is the evening itself, so scroll depth and time-of-night are the same thing.</p>
<ol class="funnel">{fun}</ol>
<h2>Desktop · hero beats</h2><div class="row">{''.join(F)}</div>
<h2>Phone · hero beats (390 × 844)</h2><div class="row mrow">{''.join(M)}</div>
<h2>Pay page and customer card</h2><div class="row">{''.join(F2)}{PM}</div>
<h2>Ticket anatomy</h2><div class="row">{ANAT}</div>
<div class="note"><h3>Reading the wireframes</h3><p>Dashed boxes are content blocks; striped boxes are art (the skin's motif); filled pills are buttons. The only filled button visible in any frame at a time is the primary action: the top-bar button until the last beat, then the ticket button.</p></div>
</body></html>"""
with open(OUT, 'w') as f:
    f.write(page)
print('wrote', os.path.abspath(OUT), len(page), 'bytes')
