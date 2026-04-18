"""
FMCSA Hours of Service (HOS) Calculator
Property-carrying driver, 70hrs/8-day rule
"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime, timedelta
import math


@dataclass
class HosEvent:
    event_type: str  # 'off_duty', 'sleeper_berth', 'driving', 'on_duty_not_driving'
    start_time: float  # hours from trip start (midnight day 1)
    end_time: float
    location: str = ""
    notes: str = ""

    @property
    def duration(self):
        return self.end_time - self.start_time


@dataclass
class DailyLog:
    date_offset: int  # day 0, 1, 2...
    events: List[HosEvent] = field(default_factory=list)
    total_miles: float = 0.0
    from_location: str = ""
    to_location: str = ""
    carrier: str = "Driver's Carrier"
    driver_name: str = "Driver"
    vehicle_number: str = "TRK-001"
    shipping_doc: str = ""

    def get_hours_by_type(self):
        totals = {'off_duty': 0, 'sleeper_berth': 0, 'driving': 0, 'on_duty_not_driving': 0}
        for e in self.events:
            if e.event_type in totals:
                totals[e.event_type] += e.duration
        return totals


@dataclass
class Stop:
    stop_type: str  # 'pickup', 'dropoff', 'rest', 'fuel', 'restart_rest', '30min_break'
    location: str
    arrival_time: float  # hours from trip start
    departure_time: float
    notes: str = ""
    lat: float = 0.0
    lng: float = 0.0


@dataclass
class TripPlan:
    total_distance: float = 0.0
    total_drive_time: float = 0.0
    total_trip_time: float = 0.0
    stops: List[Stop] = field(default_factory=list)
    daily_logs: List[DailyLog] = field(default_factory=list)
    route_waypoints: list = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


class HOSCalculator:
    """
    FMCSA HOS rules for property-carrying CMV:
    - 11-hour driving limit per shift
    - 14-hour on-duty window
    - 30-minute break after 8 cumulative driving hours
    - 10-hour off-duty between shifts
    - 70-hour/8-day cycle
    """

    DRIVING_SPEED_MPH = 55  # average speed
    PICKUP_DROPOFF_TIME = 1.0  # hours
    FUEL_STOP_TIME = 0.5  # hours
    FUEL_INTERVAL_MILES = 1000
    MAX_DRIVE_PER_SHIFT = 11.0
    MAX_WINDOW = 14.0
    MIN_OFF_DUTY_BETWEEN_SHIFTS = 10.0
    BREAK_AFTER_DRIVING = 8.0
    BREAK_DURATION = 0.5
    MAX_WEEKLY_HOURS = 70.0

    def calculate_trip(
        self,
        total_distance: float,
        current_location: str,
        pickup_location: str,
        dropoff_location: str,
        current_cycle_used: float,
        waypoints: list = None,
        distance_to_pickup: float = None,
        distance_pickup_to_dropoff: float = None,
    ) -> TripPlan:
        plan = TripPlan()
        plan.total_distance = total_distance
        plan.route_waypoints = waypoints or []

        # Use segment distances if provided, otherwise estimate split
        if distance_to_pickup is not None and distance_pickup_to_dropoff is not None:
            d_to_pickup = distance_to_pickup
            d_pickup_to_dropoff = distance_pickup_to_dropoff
        else:
            # If distances not split, estimate: 30% to pickup, 70% to dropoff
            d_to_pickup = total_distance * 0.3
            d_pickup_to_dropoff = total_distance * 0.7

        # State tracking
        current_time = 0.0  # hours from trip start
        cycle_hours_used = current_cycle_used
        shift_driving = 0.0  # driving this shift
        shift_on_duty_start = 0.0  # when current shift started
        cumulative_driving_since_break = 0.0
        miles_since_fuel = 0.0
        current_day = 0
        current_location_name = current_location

        stops = []
        all_events = []  # (time, duration, event_type, location, notes, day)

        def log_event(etype, start, end, loc, notes=""):
            all_events.append({
                'type': etype,
                'start': start,
                'end': end,
                'location': loc,
                'notes': notes,
                'day': int(start // 24)
            })

        def do_rest(rest_type, duration, loc, notes=""):
            nonlocal current_time, shift_driving, cumulative_driving_since_break
            nonlocal shift_on_duty_start, current_day
            start = current_time
            current_time += duration
            etype = 'off_duty' if rest_type in ('10hr_rest', '34hr_restart') else 'off_duty'
            log_event(etype, start, current_time, loc, notes)
            stops.append(Stop(
                stop_type='rest' if rest_type == '10hr_rest' else 'restart_rest' if rest_type == '34hr_restart' else '30min_break',
                location=loc,
                arrival_time=start,
                departure_time=current_time,
                notes=notes
            ))
            shift_driving = 0.0
            cumulative_driving_since_break = 0.0
            shift_on_duty_start = current_time
            current_day = int(current_time // 24)

        def do_drive(miles, from_loc, to_loc):
            nonlocal current_time, shift_driving, cycle_hours_used
            nonlocal cumulative_driving_since_break, miles_since_fuel
            nonlocal shift_on_duty_start, current_day

            remaining_miles = miles
            segment_start_loc = from_loc

            while remaining_miles > 0:
                # Check 70hr cycle
                cycle_remaining = self.MAX_WEEKLY_HOURS - cycle_hours_used
                if cycle_remaining <= 0:
                    # Need 34hr restart
                    plan.warnings.append(f"70-hour cycle limit reached at {current_time:.1f}h. 34-hour restart required.")
                    do_rest('34hr_restart', 34.0, segment_start_loc, "34-hour restart (70hr cycle reset)")
                    cycle_hours_used = 0.0
                    cycle_remaining = self.MAX_WEEKLY_HOURS
                    continue

                # Check 14hr window
                window_elapsed = current_time - shift_on_duty_start
                window_remaining = self.MAX_WINDOW - window_elapsed
                if window_remaining <= 0:
                    do_rest('10hr_rest', self.MIN_OFF_DUTY_BETWEEN_SHIFTS, segment_start_loc, "10-hour rest (14hr window expired)")
                    continue

                # Check 11hr driving
                drive_remaining_shift = self.MAX_DRIVE_PER_SHIFT - shift_driving
                if drive_remaining_shift <= 0:
                    do_rest('10hr_rest', self.MIN_OFF_DUTY_BETWEEN_SHIFTS, segment_start_loc, "10-hour rest (11hr driving limit)")
                    continue

                # Check 30-min break
                if cumulative_driving_since_break >= self.BREAK_AFTER_DRIVING:
                    break_start = current_time
                    current_time += self.BREAK_DURATION
                    log_event('off_duty', break_start, current_time, segment_start_loc, "30-min break")
                    stops.append(Stop(
                        stop_type='30min_break',
                        location=segment_start_loc,
                        arrival_time=break_start,
                        departure_time=current_time,
                        notes="Required 30-minute rest break"
                    ))
                    cumulative_driving_since_break = 0.0
                    # Don't reset shift_on_duty_start for 30-min break
                    continue

                # Check fuel
                if miles_since_fuel >= self.FUEL_INTERVAL_MILES:
                    fuel_start = current_time
                    current_time += self.FUEL_STOP_TIME
                    cycle_hours_used += self.FUEL_STOP_TIME
                    log_event('on_duty_not_driving', fuel_start, current_time, segment_start_loc, "Fuel stop")
                    stops.append(Stop(
                        stop_type='fuel',
                        location=segment_start_loc,
                        arrival_time=fuel_start,
                        departure_time=current_time,
                        notes="Fuel stop (every 1,000 miles)"
                    ))
                    miles_since_fuel = 0.0
                    continue

                # How far can we drive now?
                max_drive_time = min(
                    drive_remaining_shift,
                    window_remaining,
                    cycle_remaining,
                    self.BREAK_AFTER_DRIVING - cumulative_driving_since_break
                )
                max_drive_time = max(0.01, max_drive_time)

                # How far to next fuel?
                miles_to_fuel = self.FUEL_INTERVAL_MILES - miles_since_fuel
                drive_time_to_fuel = miles_to_fuel / self.DRIVING_SPEED_MPH

                # Actual drive segment
                drive_time = min(max_drive_time, remaining_miles / self.DRIVING_SPEED_MPH, drive_time_to_fuel)
                if drive_time <= 0:
                    drive_time = 0.01

                miles_driven = drive_time * self.DRIVING_SPEED_MPH
                if miles_driven > remaining_miles:
                    miles_driven = remaining_miles
                    drive_time = miles_driven / self.DRIVING_SPEED_MPH

                drive_start = current_time
                current_time += drive_time
                shift_driving += drive_time
                cumulative_driving_since_break += drive_time
                cycle_hours_used += drive_time
                remaining_miles -= miles_driven
                miles_since_fuel += miles_driven
                current_day = int(current_time // 24)

                end_loc = to_loc if remaining_miles <= 0.1 else f"En route to {to_loc}"
                log_event('driving', drive_start, current_time, end_loc, f"Driving ({miles_driven:.0f} mi)")

        # === TRIP EXECUTION ===

        # Start shift
        shift_on_duty_start = current_time

        # Drive to pickup
        do_drive(d_to_pickup, current_location, pickup_location)

        # Pickup stop (1 hour on-duty not driving)
        pickup_start = current_time
        current_time += self.PICKUP_DROPOFF_TIME
        cycle_hours_used += self.PICKUP_DROPOFF_TIME
        log_event('on_duty_not_driving', pickup_start, current_time, pickup_location, "Pickup - loading")
        stops.append(Stop(
            stop_type='pickup',
            location=pickup_location,
            arrival_time=pickup_start,
            departure_time=current_time,
            notes="Pickup (1 hour loading)"
        ))

        # Drive to dropoff
        do_drive(d_pickup_to_dropoff, pickup_location, dropoff_location)

        # Dropoff stop (1 hour on-duty not driving)
        dropoff_start = current_time
        current_time += self.PICKUP_DROPOFF_TIME
        cycle_hours_used += self.PICKUP_DROPOFF_TIME
        log_event('on_duty_not_driving', dropoff_start, current_time, dropoff_location, "Dropoff - unloading")
        stops.append(Stop(
            stop_type='dropoff',
            location=dropoff_location,
            arrival_time=dropoff_start,
            departure_time=current_time,
            notes="Dropoff (1 hour unloading)"
        ))

        plan.stops = stops
        plan.total_drive_time = sum(e['end'] - e['start'] for e in all_events if e['type'] == 'driving')
        plan.total_trip_time = current_time

        # Build daily logs
        plan.daily_logs = self._build_daily_logs(
            all_events, stops, total_distance,
            current_location, dropoff_location,
            int(current_time // 24) + 1
        )

        return plan

    def _build_daily_logs(self, all_events, stops, total_distance, start_loc, end_loc, num_days):
        daily_logs = []

        for day in range(num_days):
            day_start = day * 24.0
            day_end = (day + 1) * 24.0

            day_events_raw = [e for e in all_events if e['start'] < day_end and e['end'] > day_start]

            events = []
            day_miles = 0.0

            for e in day_events_raw:
                # Clip to this day
                start = max(e['start'], day_start) - day_start
                end = min(e['end'], day_end) - day_start
                if end <= start:
                    continue
                events.append(HosEvent(
                    event_type=e['type'],
                    start_time=start,
                    end_time=end,
                    location=e['location'],
                    notes=e['notes']
                ))
                if e['type'] == 'driving':
                    drive_hours = end - start
                    day_miles += drive_hours * self.DRIVING_SPEED_MPH

            # Fill gaps with off-duty
            events = self._fill_gaps(events)
            events.sort(key=lambda x: x.start_time)

            # Determine from/to for this day
            day_stops = [s for s in stops if day_start <= s.arrival_time < day_end]
            from_loc = start_loc if day == 0 else f"Day {day} location"
            to_loc = end_loc if day == num_days - 1 else f"Day {day+1} start"

            dl = DailyLog(
                date_offset=day,
                events=events,
                total_miles=round(day_miles),
                from_location=from_loc,
                to_location=to_loc,
            )
            daily_logs.append(dl)

        return daily_logs

    def _fill_gaps(self, events):
        if not events:
            return [HosEvent('off_duty', 0, 24, '', 'Off duty')]

        events.sort(key=lambda x: x.start_time)
        filled = []

        if events[0].start_time > 0.01:
            filled.append(HosEvent('off_duty', 0, events[0].start_time, '', 'Off duty'))

        for i, e in enumerate(events):
            filled.append(e)
            if i < len(events) - 1:
                gap_start = e.end_time
                gap_end = events[i + 1].start_time
                if gap_end - gap_start > 0.01:
                    filled.append(HosEvent('off_duty', gap_start, gap_end, '', 'Off duty'))

        last = events[-1]
        if last.end_time < 23.99:
            filled.append(HosEvent('off_duty', last.end_time, 24.0, '', 'Off duty'))

        return filled
