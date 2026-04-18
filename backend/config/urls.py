from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({
        'service': 'ELD Trip Planner API',
        'status': 'running',
        'version': '1.0',
        'endpoints': {
            'health': '/api/trip/health/',
            'plan_trip': '/api/trip/plan/  [POST]',
        },
        'docs': 'Send POST to /api/trip/plan/ with current_location, pickup_location, dropoff_location, current_cycle_used'
    })

urlpatterns = [
    path('', home),
    path('api/trip/', include('trip_planner.urls')),
]