from django.urls import path, include

urlpatterns = [
    path('api/trip/', include('trip_planner.urls')),
]
