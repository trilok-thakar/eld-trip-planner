import json
import math
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .hos_calculator import HOSCalculator
from .log_generator import generate_all_logs_svg


def geocode_location(location_str: str):
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {'q': location_str, 'format': 'json', 'limit': 1, 'countrycodes': 'us'}
        headers = {'User-Agent': 'ELD-TripPlanner/1.0'}
        resp = requests.get(url, params=params, headers=headers, timeout=10)
        data = resp.json()
        if data:
            return {'lat': float(data[0]['lat']), 'lng': float(data[0]['lon']),
                    'display_name': data[0].get('display_name', location_str)}
    except Exception as e:
        print(f"Geocode error: {e}")
    return None


def get_route_osrm(coords):
    try:
        coords_str = ';'.join([f"{c[0]},{c[1]}" for c in coords])
        url = f"http://router.project-osrm.org/route/v1/driving/{coords_str}"
        params = {'overview': 'simplified', 'geometries': 'geojson', 'steps': 'false'}
        resp = requests.get(url, params=params, timeout=15)
        data = resp.json()
        if data.get('code') == 'Ok' and data.get('routes'):
            route = data['routes'][0]
            distance_miles = route['distance'] * 0.000621371
            duration_hours = route['duration'] / 3600
            waypoints = [{'lat': c[1], 'lng': c[0]} for c in route['geometry']['coordinates']]
            legs = [{'distance_miles': l['distance'] * 0.000621371, 'duration_hours': l['duration'] / 3600}
                    for l in route.get('legs', [])]
            return distance_miles, duration_hours, waypoints, legs
    except Exception as e:
        print(f"OSRM error: {e}")
    return None, None, [], []


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 3958.8
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    return R * 2 * math.asin(math.sqrt(a))


@csrf_exempt
@require_http_methods(["POST"])
def plan_trip(request):
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)

    current_location = body.get('current_location', '').strip()
    pickup_location = body.get('pickup_location', '').strip()
    dropoff_location = body.get('dropoff_location', '').strip()
    current_cycle_used = float(body.get('current_cycle_used', 0))
    start_date = body.get('start_date', '2024-01-01')

    if not all([current_location, pickup_location, dropoff_location]):
        return JsonResponse({'error': 'All location fields are required'}, status=400)
    if not (0 <= current_cycle_used <= 70):
        return JsonResponse({'error': 'Current cycle hours must be between 0 and 70'}, status=400)

    current_geo = geocode_location(current_location)
    pickup_geo = geocode_location(pickup_location)
    dropoff_geo = geocode_location(dropoff_location)

    if not current_geo:
        return JsonResponse({'error': f'Could not geocode: {current_location}'}, status=400)
    if not pickup_geo:
        return JsonResponse({'error': f'Could not geocode: {pickup_location}'}, status=400)
    if not dropoff_geo:
        return JsonResponse({'error': f'Could not geocode: {dropoff_location}'}, status=400)

    all_coords = [[current_geo['lng'], current_geo['lat']],
                  [pickup_geo['lng'], pickup_geo['lat']],
                  [dropoff_geo['lng'], dropoff_geo['lat']]]

    total_distance, total_duration, waypoints, legs = get_route_osrm(all_coords)

    if total_distance is None:
        d1 = haversine_distance(current_geo['lat'], current_geo['lng'], pickup_geo['lat'], pickup_geo['lng'])
        d2 = haversine_distance(pickup_geo['lat'], pickup_geo['lng'], dropoff_geo['lat'], dropoff_geo['lng'])
        total_distance, total_duration = d1 + d2, (d1 + d2) / 55
        waypoints = [{'lat': current_geo['lat'], 'lng': current_geo['lng']},
                     {'lat': pickup_geo['lat'], 'lng': pickup_geo['lng']},
                     {'lat': dropoff_geo['lat'], 'lng': dropoff_geo['lng']}]
        legs = [{'distance_miles': d1, 'duration_hours': d1/55},
                {'distance_miles': d2, 'duration_hours': d2/55}]

    d_to_pickup = legs[0]['distance_miles'] if legs else total_distance * 0.4
    d_pickup_to_dropoff = legs[1]['distance_miles'] if len(legs) > 1 else total_distance * 0.6

    calculator = HOSCalculator()
    trip_plan = calculator.calculate_trip(
        total_distance=total_distance,
        current_location=current_location,
        pickup_location=pickup_location,
        dropoff_location=dropoff_location,
        current_cycle_used=current_cycle_used,
        waypoints=waypoints,
        distance_to_pickup=d_to_pickup,
        distance_pickup_to_dropoff=d_pickup_to_dropoff,
    )

    log_svgs = generate_all_logs_svg(trip_plan.daily_logs, start_date)

    return JsonResponse({
        'success': True,
        'trip_summary': {
            'total_distance_miles': round(total_distance, 1),
            'total_drive_time_hours': round(trip_plan.total_drive_time, 2),
            'total_trip_time_hours': round(trip_plan.total_trip_time, 2),
            'num_days': len(trip_plan.daily_logs),
            'warnings': trip_plan.warnings,
        },
        'locations': {
            'current': {'lat': current_geo['lat'], 'lng': current_geo['lng'], 'name': current_location},
            'pickup': {'lat': pickup_geo['lat'], 'lng': pickup_geo['lng'], 'name': pickup_location},
            'dropoff': {'lat': dropoff_geo['lat'], 'lng': dropoff_geo['lng'], 'name': dropoff_location},
        },
        'route': {'waypoints': waypoints[:300], 'total_distance_miles': round(total_distance, 1)},
        'stops': [
            {'type': s.stop_type, 'location': s.location,
             'arrival_time': round(s.arrival_time, 2),
             'departure_time': round(s.departure_time, 2),
             'duration_hours': round(s.departure_time - s.arrival_time, 2),
             'notes': s.notes}
            for s in trip_plan.stops
        ],
        'daily_logs': [
            {'day': log.date_offset, 'total_miles': log.total_miles,
             'from_location': log.from_location, 'to_location': log.to_location,
             'hours': log.get_hours_by_type(),
             'events': [{'type': e.event_type, 'start': round(e.start_time, 3),
                         'end': round(e.end_time, 3), 'location': e.location, 'notes': e.notes}
                        for e in log.events]}
            for log in trip_plan.daily_logs
        ],
        'log_svgs': log_svgs,
    })


@require_http_methods(["GET"])
def health_check(request):
    return JsonResponse({'status': 'ok', 'service': 'ELD Trip Planner API'})
