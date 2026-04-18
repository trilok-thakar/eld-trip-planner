"""
ELD Log Sheet Generator - produces SVG representation of FMCSA Driver's Daily Log
Based on the official blank paper log format
"""
from .hos_calculator import DailyLog, HosEvent
from typing import List
import math


# Grid dimensions (matching official log proportions)
GRID_LEFT = 80       # px from left edge to grid start
GRID_TOP = 240       # px from top to grid start
GRID_WIDTH = 820     # total grid width (midnight to midnight)
GRID_HEIGHT = 160    # total height for 4 rows
ROW_HEIGHT = 40      # height per duty status row
TOTAL_WIDTH = 980
TOTAL_HEIGHT = 680

# 24 hours = GRID_WIDTH pixels
HOUR_WIDTH = GRID_WIDTH / 24.0

# Row positions (y offset from GRID_TOP)
ROW_LABELS = ['Off Duty', 'Sleeper\nBerth', 'Driving', 'On Duty\n(Not Driving)']
ROW_KEYS = ['off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving']

STATUS_COLORS = {
    'off_duty': '#94a3b8',
    'sleeper_berth': '#7dd3fc',
    'driving': '#22c55e',
    'on_duty_not_driving': '#f97316',
}

STATUS_STROKE = {
    'off_duty': '#64748b',
    'sleeper_berth': '#0284c7',
    'driving': '#16a34a',
    'on_duty_not_driving': '#ea580c',
}


def time_to_x(hour: float) -> float:
    """Convert hour (0-24) to X pixel position on grid"""
    return GRID_LEFT + (hour / 24.0) * GRID_WIDTH


def row_y(row_index: int) -> float:
    """Get Y position of row center"""
    return GRID_TOP + row_index * ROW_HEIGHT + ROW_HEIGHT / 2


def generate_log_svg(log: DailyLog, date_str: str = "") -> str:
    """Generate a complete SVG for one daily log sheet"""

    totals = log.get_hours_by_type()
    hours = totals

    svg_parts = []

    # SVG header
    svg_parts.append(f'''<svg xmlns="http://www.w3.org/2000/svg" width="{TOTAL_WIDTH}" height="{TOTAL_HEIGHT}" 
         viewBox="0 0 {TOTAL_WIDTH} {TOTAL_HEIGHT}" style="font-family: Arial, sans-serif; background: white;">''')

    # Background
    svg_parts.append(f'<rect width="{TOTAL_WIDTH}" height="{TOTAL_HEIGHT}" fill="white" stroke="#1e3a5f" stroke-width="2"/>')

    # === HEADER ===
    svg_parts.append(_render_header(log, date_str))

    # === GRID AREA ===
    svg_parts.append(_render_grid(log))

    # === STATUS LINES (the actual log drawing) ===
    svg_parts.append(_render_status_lines(log))

    # === TOTAL HOURS ===
    svg_parts.append(_render_totals(log, hours))

    # === REMARKS ===
    svg_parts.append(_render_remarks(log))

    # === RECAP ===
    svg_parts.append(_render_recap(log))

    svg_parts.append('</svg>')

    return '\n'.join(svg_parts)


def _render_header(log: DailyLog, date_str: str) -> str:
    parts = []

    # Title bar
    parts.append(f'''
    <rect x="0" y="0" width="{TOTAL_WIDTH}" height="36" fill="#1e3a5f"/>
    <text x="{TOTAL_WIDTH//2}" y="24" text-anchor="middle" fill="white" font-size="16" font-weight="bold">
        DRIVER&#39;S DAILY LOG (24 Hours) — U.S. DOT / FMCSA
    </text>''')

    # Copy info
    parts.append(f'''
    <text x="650" y="55" font-size="9" fill="#555">ORIGINAL — File at home terminal</text>
    <text x="650" y="67" font-size="9" fill="#555">DUPLICATE — Driver retains for 8 days</text>''')

    # Date
    parts.append(f'''
    <text x="20" y="55" font-size="10" fill="#333" font-weight="bold">Date:</text>
    <text x="60" y="55" font-size="11" fill="#1e3a5f">{date_str or f"Day {log.date_offset + 1}"}</text>
    <line x1="55" y1="57" x2="200" y2="57" stroke="#333" stroke-width="1"/>''')

    # Total miles
    parts.append(f'''
    <text x="210" y="55" font-size="10" fill="#333" font-weight="bold">Total Miles Driving Today:</text>
    <text x="390" y="55" font-size="11" fill="#1e3a5f">{log.total_miles:.0f}</text>
    <line x1="385" y1="57" x2="500" y2="57" stroke="#333" stroke-width="1"/>''')

    # From / To
    parts.append(f'''
    <text x="20" y="78" font-size="10" fill="#333" font-weight="bold">From:</text>
    <text x="60" y="78" font-size="10" fill="#1e3a5f">{log.from_location[:30]}</text>
    <line x1="55" y1="80" x2="260" y2="80" stroke="#333" stroke-width="1"/>
    <text x="270" y="78" font-size="10" fill="#333" font-weight="bold">To:</text>
    <text x="295" y="78" font-size="10" fill="#1e3a5f">{log.to_location[:30]}</text>
    <line x1="290" y1="80" x2="490" y2="80" stroke="#333" stroke-width="1"/>''')

    # Carrier name
    parts.append(f'''
    <text x="20" y="100" font-size="10" fill="#333" font-weight="bold">Carrier:</text>
    <text x="70" y="100" font-size="10" fill="#1e3a5f">{log.carrier}</text>
    <line x1="65" y1="102" x2="400" y2="102" stroke="#333" stroke-width="1"/>''')

    # Vehicle number
    parts.append(f'''
    <text x="500" y="100" font-size="10" fill="#333" font-weight="bold">Vehicle #:</text>
    <text x="560" y="100" font-size="10" fill="#1e3a5f">{log.vehicle_number}</text>
    <line x1="555" y1="102" x2="780" y2="102" stroke="#333" stroke-width="1"/>''')

    # Driver signature line
    parts.append(f'''
    <text x="20" y="122" font-size="10" fill="#333" font-weight="bold">Driver Signature:</text>
    <line x1="115" y1="122" x2="400" y2="122" stroke="#333" stroke-width="1"/>
    <text x="500" y="122" font-size="10" fill="#333" font-weight="bold">Shipping Doc:</text>
    <text x="590" y="122" font-size="10" fill="#1e3a5f">{log.shipping_doc}</text>
    <line x1="585" y1="122" x2="900" y2="122" stroke="#333" stroke-width="1"/>''')

    return '\n'.join(parts)


def _render_grid(log: DailyLog) -> str:
    parts = []
    grid_bottom = GRID_TOP + 4 * ROW_HEIGHT

    # Outer border
    parts.append(f'''
    <rect x="{GRID_LEFT}" y="{GRID_TOP - 20}" width="{GRID_WIDTH}" height="{4 * ROW_HEIGHT + 20}" 
          fill="white" stroke="#1e3a5f" stroke-width="1.5"/>''')

    # Hour header row
    parts.append(f'<rect x="{GRID_LEFT}" y="{GRID_TOP - 20}" width="{GRID_WIDTH}" height="20" fill="#e8eef6"/>')

    # Hour labels and tick marks
    hour_labels = ['Mid-\nnight', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11',
                   'Noon', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', 'Mid-\nnight']

    for h in range(25):
        x = time_to_x(h)
        # Major tick
        parts.append(f'<line x1="{x:.1f}" y1="{GRID_TOP - 20}" x2="{x:.1f}" y2="{grid_bottom}" stroke="#1e3a5f" stroke-width="1"/>')

        # Hour label
        label = hour_labels[h]
        if h < 25:
            parts.append(f'<text x="{x:.1f}" y="{GRID_TOP - 5}" text-anchor="middle" font-size="8" fill="#1e3a5f">{label}</text>')

        # Half-hour ticks
        if h < 24:
            xh = time_to_x(h + 0.5)
            parts.append(f'<line x1="{xh:.1f}" y1="{GRID_TOP - 20}" x2="{xh:.1f}" y2="{grid_bottom}" stroke="#aab" stroke-width="0.5" stroke-dasharray="2,2"/>')

            # Quarter-hour ticks
            for q in [0.25, 0.75]:
                xq = time_to_x(h + q)
                parts.append(f'<line x1="{xq:.1f}" y1="{GRID_TOP}" x2="{xq:.1f}" y2="{grid_bottom}" stroke="#dde" stroke-width="0.3"/>')

    # Row separators and labels
    for i, (label, key) in enumerate(zip(ROW_LABELS, ROW_KEYS)):
        y_top = GRID_TOP + i * ROW_HEIGHT
        y_mid = y_top + ROW_HEIGHT / 2
        y_bot = y_top + ROW_HEIGHT

        # Row background alternating
        bg = '#f8faff' if i % 2 == 0 else '#f0f4fc'
        parts.append(f'<rect x="{GRID_LEFT}" y="{y_top}" width="{GRID_WIDTH}" height="{ROW_HEIGHT}" fill="{bg}" opacity="0.4"/>')

        # Row divider
        parts.append(f'<line x1="{GRID_LEFT}" y1="{y_bot}" x2="{GRID_LEFT + GRID_WIDTH}" y2="{y_bot}" stroke="#1e3a5f" stroke-width="0.8"/>')

        # Row label (left of grid)
        label_lines = label.split('\n')
        for li, ll in enumerate(label_lines):
            dy = y_mid - (len(label_lines) - 1) * 6 + li * 12
            parts.append(f'<text x="{GRID_LEFT - 5}" y="{dy}" text-anchor="end" font-size="9" fill="#1e3a5f" font-weight="bold">{ll}</text>')

        # Row number (1-4)
        parts.append(f'<text x="{GRID_LEFT - 65}" y="{y_mid + 4}" text-anchor="middle" font-size="10" fill="#666">{i+1}.</text>')

    # "REMARKS" label below grid
    remarks_y = grid_bottom + 25
    parts.append(f'<text x="{GRID_LEFT - 5}" y="{remarks_y}" text-anchor="end" font-size="10" fill="#1e3a5f" font-weight="bold">REMARKS</text>')
    parts.append(f'<rect x="{GRID_LEFT}" y="{grid_bottom + 10}" width="{GRID_WIDTH}" height="50" fill="white" stroke="#1e3a5f" stroke-width="1"/>')

    return '\n'.join(parts)


def _render_status_lines(log: DailyLog) -> str:
    """Draw the horizontal duty-status lines on the grid"""
    parts = []

    for event in log.events:
        if event.event_type not in ROW_KEYS:
            continue

        row_idx = ROW_KEYS.index(event.event_type)
        y = GRID_TOP + row_idx * ROW_HEIGHT + ROW_HEIGHT / 2
        y_top = GRID_TOP + row_idx * ROW_HEIGHT + 4
        y_bot = GRID_TOP + row_idx * ROW_HEIGHT + ROW_HEIGHT - 4

        x1 = time_to_x(event.start_time)
        x2 = time_to_x(event.end_time)
        color = STATUS_COLORS[event.event_type]
        stroke = STATUS_STROKE[event.event_type]

        if x2 - x1 < 1:
            continue

        # Filled bar
        parts.append(f'''<rect x="{x1:.1f}" y="{y_top:.1f}" width="{(x2-x1):.1f}" height="{(y_bot-y_top):.1f}" 
              fill="{color}" opacity="0.7" rx="1"/>''')

        # Solid horizontal line (the official ELD line)
        parts.append(f'''<line x1="{x1:.1f}" y1="{y:.1f}" x2="{x2:.1f}" y2="{y:.1f}" 
              stroke="{stroke}" stroke-width="2.5"/>''')

        # Vertical connector at status change
        if event.start_time > 0:
            # Find previous event
            prev_events = [e for e in log.events if e.end_time <= event.start_time + 0.01 and e != event]
            if prev_events:
                prev = max(prev_events, key=lambda e: e.end_time)
                if prev.event_type in ROW_KEYS:
                    prev_row = ROW_KEYS.index(prev.event_type)
                    prev_y = GRID_TOP + prev_row * ROW_HEIGHT + ROW_HEIGHT / 2
                    parts.append(f'''<line x1="{x1:.1f}" y1="{prev_y:.1f}" x2="{x1:.1f}" y2="{y:.1f}" 
                          stroke="#1e3a5f" stroke-width="1.5"/>''')

    return '\n'.join(parts)


def _render_totals(log: DailyLog, hours: dict) -> str:
    parts = []
    total_right_x = GRID_LEFT + GRID_WIDTH + 10
    label_x = total_right_x
    val_x = total_right_x + 55

    parts.append(f'''
    <text x="{label_x + 30}" y="{GRID_TOP - 5}" text-anchor="middle" font-size="9" fill="#1e3a5f" font-weight="bold">Total
Hours</text>''')

    row_keys_totals = ['off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving']
    grand_total = 0

    for i, key in enumerate(row_keys_totals):
        y = GRID_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4
        val = hours.get(key, 0)
        grand_total += val
        parts.append(f'''
    <rect x="{label_x}" y="{GRID_TOP + i * ROW_HEIGHT}" width="70" height="{ROW_HEIGHT}" 
          fill="white" stroke="#1e3a5f" stroke-width="0.8"/>
    <text x="{label_x + 35}" y="{y}" text-anchor="middle" font-size="11" fill="#1e3a5f" font-weight="bold">
        {val:.2f}
    </text>''')

    # Grand total
    gt_y = GRID_TOP + 4 * ROW_HEIGHT
    parts.append(f'''
    <rect x="{label_x}" y="{gt_y}" width="70" height="20" fill="#e8eef6" stroke="#1e3a5f" stroke-width="1"/>
    <text x="{label_x + 35}" y="{gt_y + 14}" text-anchor="middle" font-size="10" fill="#1e3a5f" font-weight="bold">
        ={grand_total:.2f}
    </text>''')

    return '\n'.join(parts)


def _render_remarks(log: DailyLog) -> str:
    parts = []
    grid_bottom = GRID_TOP + 4 * ROW_HEIGHT
    remarks_box_y = grid_bottom + 10
    remarks_box_h = 50

    # Collect status changes for remarks
    changes = []
    prev_type = None
    for event in sorted(log.events, key=lambda e: e.start_time):
        if event.event_type != prev_type:
            if event.location:
                h = int(event.start_time)
                m = int((event.start_time - h) * 60)
                time_str = f"{h:02d}:{m:02d}"
                label_map = {
                    'off_duty': 'Off Duty',
                    'sleeper_berth': 'Sleeper Berth',
                    'driving': 'Driving',
                    'on_duty_not_driving': 'On Duty (Not Driving)'
                }
                changes.append(f"{time_str} - {label_map.get(event.event_type, event.event_type)}: {event.location[:25]}")
            prev_type = event.event_type

    # Render remarks text
    for i, remark in enumerate(changes[:3]):  # max 3 lines
        rx = GRID_LEFT + 5
        ry = remarks_box_y + 14 + i * 14
        parts.append(f'<text x="{rx}" y="{ry}" font-size="8.5" fill="#333">{remark}</text>')

    return '\n'.join(parts)


def _render_recap(log: DailyLog) -> str:
    parts = []
    recap_y = GRID_TOP + 4 * ROW_HEIGHT + 70

    # Recap box
    parts.append(f'''
    <rect x="{GRID_LEFT}" y="{recap_y}" width="{GRID_WIDTH + 70}" height="85" 
          fill="#f8faff" stroke="#1e3a5f" stroke-width="1"/>
    <text x="{GRID_LEFT + 5}" y="{recap_y + 14}" font-size="9" fill="#1e3a5f" font-weight="bold">
        Recap: Complete at end of day
    </text>''')

    # 70hr/8day section
    parts.append(f'''
    <text x="{GRID_LEFT + 5}" y="{recap_y + 30}" font-size="8.5" fill="#333" font-weight="bold">70 Hour / 8 Day Rule</text>
    <text x="{GRID_LEFT + 5}" y="{recap_y + 44}" font-size="8" fill="#555">A. On duty hours today (lines 3 &amp; 4):</text>
    <text x="{GRID_LEFT + 5}" y="{recap_y + 57}" font-size="8" fill="#555">B. Total hours on duty last 7 days:</text>
    <text x="{GRID_LEFT + 5}" y="{recap_y + 70}" font-size="8" fill="#555">C. Total hours available tomorrow (70 hr minus A+B):</text>

    <text x="{GRID_LEFT + 185}" y="{recap_y + 44}" font-size="9" fill="#1e3a5f" font-weight="bold">____</text>
    <text x="{GRID_LEFT + 185}" y="{recap_y + 57}" font-size="9" fill="#1e3a5f" font-weight="bold">____</text>
    <text x="{GRID_LEFT + 185}" y="{recap_y + 70}" font-size="9" fill="#1e3a5f" font-weight="bold">____</text>
    ''')

    # Note about ELD
    parts.append(f'''
    <text x="{GRID_LEFT + 350}" y="{recap_y + 30}" font-size="8" fill="#666" font-style="italic">
        * This log generated by ELD Trip Planner — FMCSA §395.8 compliant
    </text>''')

    return '\n'.join(parts)


def generate_all_logs_svg(daily_logs: List[DailyLog], start_date: str = "2024-01-01") -> List[str]:
    """Generate SVG strings for all daily logs"""
    from datetime import datetime, timedelta
    try:
        base_date = datetime.strptime(start_date, "%Y-%m-%d")
    except:
        base_date = datetime.now()

    svgs = []
    for log in daily_logs:
        date = base_date + timedelta(days=log.date_offset)
        date_str = date.strftime("%m/%d/%Y")
        svg = generate_log_svg(log, date_str)
        svgs.append(svg)

    return svgs
