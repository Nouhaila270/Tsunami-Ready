from django.shortcuts import render

def home(request):
    return render(request, "utilisateur/home.html")

def prevention(request):
    return render(request, "utilisateur/prevention.html")