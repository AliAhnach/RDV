# Vidéo de fond — Dashboard

Placer ici le fichier : `admin-background.mp4`

Recommandations :
- Résolution : 1920×1080 minimum
- Durée : 10–30 secondes (boucle fluide)
- Taille : < 10 Mo (compresser avec HandBrake ou ffmpeg)
- Format : MP4 (H.264) — compatibilité maximale

Commande ffmpeg pour optimiser :
```
ffmpeg -i source.mp4 -vcodec h264 -acodec aac -b:v 1500k -vf scale=1920:-2 admin-background.mp4
```
