"""
============================================================
  AGADIR TSUNAMI-READY — API Flask + MySQL (PyMySQL)
  VERSION MODIFIÉE :
  - auth/register
  - auth/login réel via table users
  - logique simplifiée admin / citizen
============================================================
"""

import os
import json
import logging
import hashlib
from pathlib import Path

import pymysql
import pymysql.cursors
from flask import Flask, request, jsonify, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config["JSON_SORT_KEYS"] = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "port": int(os.environ.get("DB_PORT", "3307")),
    "db": os.environ.get("DB_NAME", "tsunami_ready"),
    "user": os.environ.get("DB_USER", "root"),
    "passwd": os.environ.get("DB_PASSWORD", ""),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": False,
}


def get_db():
    if "db" not in g:
        g.db = pymysql.connect(**DB_CONFIG)
    return g.db


@app.teardown_appcontext
def close_db(error):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def sha256_password(password):
    return hashlib.sha256(str(password).encode("utf-8")).hexdigest()


def validate_magnitude(value):
    try:
        mag = float(value)
        if not (0.0 <= mag <= 10.0):
            return None, "Magnitude doit etre entre 0 et 10"
        return round(mag, 2), None
    except (ValueError, TypeError):
        return None, "Magnitude invalide"


def validate_coordinates(lat, lon):
    try:
        lat_f, lon_f = float(lat), float(lon)
        if not (-90.0 <= lat_f <= 90.0):
            return None, None, "Latitude hors limites"
        if not (-180.0 <= lon_f <= 180.0):
            return None, None, "Longitude hors limites"
        return round(lat_f, 6), round(lon_f, 6), None
    except (ValueError, TypeError):
        return None, None, "Coordonnees GPS invalides"


def sanitize_int(value, min_val=1, max_val=10000):
    try:
        v = int(value)
        if not (min_val <= v <= max_val):
            return None, f"Hors plage [{min_val}-{max_val}]"
        return v, None
    except (ValueError, TypeError):
        return None, "Entier attendu"


def log_action(conn, action, table_name, description, ip_address=None):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO system_logs (action, table_name, description, ip_address)
                VALUES (%s, %s, %s, %s)
                """,
                (action, table_name, description, ip_address),
            )
    except Exception as e:
        logger.warning("Impossible d'ecrire dans system_logs: %s", e)


@app.route("/auth/register", methods=["POST"])
def register():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Corps JSON manquant"}), 400

    username = str(data.get("username", "")).strip()
    full_name = str(data.get("full_name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    phone = str(data.get("phone", "")).strip()
    password = str(data.get("password", "")).strip()

    lat, lon, coord_err = validate_coordinates(
        data.get("latitude", 30.420200),
        data.get("longitude", -9.598200)
    )

    if not username or not full_name or not email or not password:
        return jsonify({
            "error": "username, full_name, email et password sont obligatoires"
        }), 400

    if len(password) < 6:
        return jsonify({
            "error": "Le mot de passe doit contenir au moins 6 caractères"
        }), 400

    if coord_err:
        return jsonify({"error": coord_err}), 422

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT user_id FROM users WHERE email=%s OR username=%s",
                (email, username)
            )
            existing = cur.fetchone()
            if existing:
                return jsonify({"error": "Email ou nom d'utilisateur déjà utilisé"}), 409

            cur.execute(
                """
                INSERT INTO users
                (username, password_hash, role, email, full_name, phone, latitude, longitude, is_active)
                VALUES (%s, %s, 'citizen', %s, %s, %s, %s, %s, 1)
                """,
                (
                    username,
                    sha256_password(password),
                    email,
                    full_name,
                    phone if phone else None,
                    lat,
                    lon
                )
            )
            user_id = cur.lastrowid

        log_action(
            conn,
            "REGISTER",
            "users",
            f"Nouvelle inscription citizen: {email}",
            request.remote_addr
        )
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Inscription réussie",
            "user": {
                "user_id": user_id,
                "username": username,
                "full_name": full_name,
                "email": email,
                "role": "citizen",
                "phone": phone,
                "latitude": lat,
                "longitude": lon
            }
        }), 201

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Corps JSON manquant"}), 400

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if not email or not password:
        return jsonify({"error": "Email et mot de passe obligatoires"}), 400

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, username, email, full_name, phone, role,
                       latitude, longitude, is_active, password_hash
                FROM users
                WHERE email = %s
                LIMIT 1
                """,
                (email,)
            )
            user = cur.fetchone()

        if not user:
            return jsonify({"error": "Utilisateur introuvable"}), 404

        if int(user["is_active"]) != 1:
            return jsonify({"error": "Compte désactivé"}), 403

        if user["password_hash"] != sha256_password(password):
            return jsonify({"error": "Mot de passe incorrect"}), 401

        token = f"user-{user['user_id']}"

        log_action(
            conn,
            "LOGIN",
            "users",
            f"Connexion réussie: {email}",
            request.remote_addr
        )
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Connexion réussie",
            "token": token,
            "user": {
                "user_id": user["user_id"],
                "username": user["username"],
                "full_name": user["full_name"],
                "email": user["email"],
                "phone": user["phone"],
                "role": user["role"],
                "latitude": float(user["latitude"]) if user["latitude"] is not None else None,
                "longitude": float(user["longitude"]) if user["longitude"] is not None else None
            }
        }), 200

    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/events", methods=["POST"])
def add_event():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Corps JSON manquant"}), 400

    errors = {}
    sensor_id, err = sanitize_int(data.get("sensor_id"), 1, 9999)
    if err:
        errors["sensor_id"] = err

    magnitude, err = validate_magnitude(data.get("magnitude"))
    if err:
        errors["magnitude"] = err

    lat, lon, err = validate_coordinates(data.get("latitude"), data.get("longitude"))
    if err:
        errors["coordinates"] = err

    if errors:
        return jsonify({"error": "Donnees invalides", "details": errors}), 422

    depth_km = float(data["depth_km"]) if "depth_km" in data else 10.0
    duration_sec = int(data["duration_seconds"]) if "duration_seconds" in data else None
    description = str(data.get("epicenter_description", ""))[:250]

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO seismic_events
                    (sensor_id, magnitude, depth_km, latitude, longitude,
                     duration_seconds, epicenter_description)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (sensor_id, magnitude, depth_km, lat, lon, duration_sec, description)
            )
            event_id = cur.lastrowid
        conn.commit()

        alert_msg = "ALERTE TSUNAMI DECLENCHEE" if magnitude >= 6.5 else "Surveillance normale"
        return jsonify({
            "success": True,
            "event_id": event_id,
            "magnitude": magnitude,
            "status": alert_msg
        }), 201

    except pymysql.err.DataError as e:
        conn.rollback()
        return jsonify({"error": f"Donnees rejetees: {str(e)}"}), 422
    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/events", methods=["GET"])
def get_events():
    limit, err = sanitize_int(request.args.get("limit", 50), 1, 500)
    if err:
        limit = 50

    try:
        min_mag = max(0.0, min(float(request.args.get("min_magnitude", 0)), 10.0))
    except ValueError:
        min_mag = 0.0

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT e.event_id, e.magnitude, e.depth_km,
                       e.latitude, e.longitude, e.event_time,
                       e.duration_seconds, e.epicenter_description,
                       s.sensor_code, s.name AS sensor_name
                FROM seismic_events e
                JOIN seismic_sensors s ON e.sensor_id = s.sensor_id
                WHERE e.magnitude >= %s
                ORDER BY e.event_time DESC
                LIMIT %s
                """,
                (min_mag, limit)
            )
            events = cur.fetchall()
        return jsonify({"count": len(events), "events": events}), 200
    except pymysql.Error as e:
        return jsonify({"error": str(e)}), 500


@app.route("/alerts", methods=["GET"])
def get_alerts():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT a.*, e.magnitude, e.latitude, e.longitude,
                       s.name AS sensor_name
                FROM alerts a
                JOIN seismic_events  e ON a.event_id  = e.event_id
                JOIN seismic_sensors s ON e.sensor_id = s.sensor_id
                ORDER BY a.triggered_at DESC
                LIMIT 200
                """
            )
            alerts = cur.fetchall()
        return jsonify({"count": len(alerts), "alerts": alerts}), 200
    except pymysql.Error as e:
        return jsonify({"error": str(e)}), 500


@app.route("/alerts/<int:alert_id>/acknowledge", methods=["PUT"])
def acknowledge_alert(alert_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE alerts
                SET status = 'ACKNOWLEDGED',
                    acknowledged_by = 1,
                    acknowledged_at = NOW()
                WHERE alert_id = %s AND status = 'ACTIVE'
                """,
                (alert_id,)
            )
            if cur.rowcount == 0:
                return jsonify({"error": "Alerte introuvable ou deja traitee"}), 404
        conn.commit()
        return jsonify({"success": True, "alert_id": alert_id}), 200
    except pymysql.Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500


@app.route("/risk/<magnitude>", methods=["GET"])
def get_risk(magnitude):
    mag, err = validate_magnitude(magnitude)
    if err:
        return jsonify({"error": err}), 422

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.callproc("calculate_risk_level", (mag,))
            result = cur.fetchone()
        return jsonify({"magnitude": mag, **result}), 200
    except pymysql.Error as e:
        return jsonify({"error": str(e)}), 500


@app.route("/tsunami-eval/<int:event_id>", methods=["GET"])
def tsunami_eval(event_id):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.callproc("evaluate_tsunami_risk", (event_id,))
            result = cur.fetchone()
        if not result:
            return jsonify({"error": f"Evenement #{event_id} introuvable"}), 404
        return jsonify(result), 200
    except pymysql.Error as e:
        return jsonify({"error": str(e)}), 500


@app.route("/sensors", methods=["GET"])
def get_sensors():
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT sensor_id, sensor_code, name, latitude, longitude,
                       status, last_ping, installed_at
                FROM seismic_sensors
                ORDER BY sensor_id
                """
            )
            sensors = cur.fetchall()
        return jsonify({"count": len(sensors), "sensors": sensors}), 200
    except pymysql.Error as e:
        return jsonify({"error": str(e)}), 500


@app.route("/report", methods=["GET"])
def get_report():
    days, err = sanitize_int(request.args.get("days", 30), 1, 365)
    if err:
        days = 30

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.callproc("get_seismic_report", (days,))
            report = cur.fetchone()
        return jsonify(report), 200
    except pymysql.Error as e:
        return jsonify({"error": str(e)}), 500


@app.route("/logs", methods=["GET"])
def get_logs():
    limit, err = sanitize_int(request.args.get("limit", 100), 1, 1000)
    if err:
        limit = 100

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT log_id, action, table_name, record_id,
                       description, performed_at, ip_address
                FROM system_logs
                ORDER BY performed_at DESC
                LIMIT %s
                """,
                (limit,)
            )
            logs = cur.fetchall()
        return jsonify({"count": len(logs), "logs": logs}), 200
    except pymysql.Error as e:
        return jsonify({"error": str(e)}), 500


_JSON_MAX_BYTES = 5 * 1024 * 1024
_IMPORT_ROOT = os.environ.get("IMPORT_ROOT", None)


def _safe_file_path(raw_path):
    if not raw_path or not isinstance(raw_path, str):
        return None, "Parametre file_path manquant ou invalide."
    try:
        p = Path(raw_path).resolve()
    except Exception:
        return None, "Chemin de fichier malforme."
    if p.suffix.lower() != ".json":
        return None, "Seuls les fichiers .json sont acceptes."
    if _IMPORT_ROOT:
        allowed = Path(_IMPORT_ROOT).resolve()
        try:
            p.relative_to(allowed)
        except ValueError:
            return None, f"Acces refuse : fichier hors de {_IMPORT_ROOT}"
    if not p.exists():
        return None, f"Fichier introuvable : {p}"
    if not p.is_file():
        return None, "Le chemin ne designe pas un fichier regulier."
    if p.stat().st_size > _JSON_MAX_BYTES:
        return None, "Fichier trop volumineux (max 5 Mo)."
    return str(p), None


def _validate_event_fields(raw):
    errors = {}
    clean = {}

    sensor_id, err = sanitize_int(raw.get("sensor_id"), 1, 9999)
    if err:
        errors["sensor_id"] = err
    else:
        clean["sensor_id"] = sensor_id

    magnitude, err = validate_magnitude(raw.get("magnitude"))
    if err:
        errors["magnitude"] = err
    else:
        clean["magnitude"] = magnitude

    lat, lon, err = validate_coordinates(raw.get("latitude"), raw.get("longitude"))
    if err:
        errors["coordinates"] = err
    else:
        clean["latitude"] = lat
        clean["longitude"] = lon

    raw_depth = raw.get("depth_km")
    if raw_depth is not None:
        try:
            d = float(raw_depth)
            if d < 0:
                errors["depth_km"] = "Negatif"
            else:
                clean["depth_km"] = round(d, 2)
        except Exception:
            errors["depth_km"] = "Valeur numerique attendue."
    else:
        clean["depth_km"] = 10.0

    raw_dur = raw.get("duration_seconds")
    if raw_dur is not None:
        try:
            clean["duration_seconds"] = int(raw_dur)
        except Exception:
            errors["duration_seconds"] = "Entier attendu."
    else:
        clean["duration_seconds"] = None

    clean["epicenter_description"] = str(raw.get("epicenter_description", ""))[:250]
    return clean, errors


@app.route("/events/import-json", methods=["POST"])
def import_events_json():
    ip_addr = request.remote_addr

    body = request.get_json(silent=True)
    if not body or "file_path" not in body:
        return jsonify({"error": "Champ 'file_path' requis dans le corps JSON."}), 400

    safe_path, path_err = _safe_file_path(body["file_path"])
    if path_err:
        return jsonify({"error": path_err}), 400

    try:
        with open(safe_path, "r", encoding="utf-8") as fh:
            file_data = json.load(fh)
    except json.JSONDecodeError as e:
        return jsonify({"error": f"Fichier JSON invalide : {e.msg} (ligne {e.lineno})"}), 400
    except OSError:
        return jsonify({"error": "Impossible de lire le fichier."}), 500

    if not isinstance(file_data, dict) or "events" not in file_data:
        return jsonify({"error": "Format invalide : cle 'events' attendue a la racine."}), 400

    raw_events = file_data["events"]
    if not isinstance(raw_events, list):
        return jsonify({"error": "La valeur de 'events' doit etre un tableau JSON."}), 400
    if len(raw_events) == 0:
        return jsonify({"message": "Fichier vide.", "imported": 0}), 200
    if len(raw_events) > 500:
        return jsonify({"error": "Import limite a 500 evenements par appel."}), 400

    results = []
    inserted = 0
    skipped = 0
    errored = 0
    conn = get_db()

    for idx, raw in enumerate(raw_events):
      entry = {"index": idx, "input": raw}

      if not isinstance(raw, dict):
          entry.update({"status": "ERROR", "reason": "L'evenement doit etre un objet JSON."})
          errored += 1
          results.append(entry)
          continue

      clean, field_errors = _validate_event_fields(raw)
      if field_errors:
          entry.update({"status": "ERROR", "reason": "Validation echouee.", "details": field_errors})
          errored += 1
          results.append(entry)
          continue

      magnitude = clean["magnitude"]

      if magnitude < 6.5:
          try:
              with conn.cursor() as cur:
                  cur.execute(
                      """
                      INSERT INTO system_logs
                          (action, table_name, description, new_data, ip_address)
                      VALUES ('API_CALL', 'seismic_events', %s, %s, %s)
                      """,
                      (
                          f"Import JSON — Evenement ignore (M{magnitude} < 6.5)",
                          json.dumps({
                              "source": "import-json",
                              "sensor_id": clean["sensor_id"],
                              "magnitude": magnitude,
                              "latitude": clean["latitude"],
                              "longitude": clean["longitude"],
                          }),
                          ip_addr,
                      )
                  )
              conn.commit()
          except pymysql.Error as e:
              conn.rollback()
              logger.error("log SKIPPED idx=%d : %s", idx, e)

          entry.update({
              "status": "SKIPPED",
              "magnitude": magnitude,
              "reason": "Magnitude < 6.5 — evenement normal, non insere en base.",
          })
          skipped += 1
          results.append(entry)
          continue

      try:
          with conn.cursor() as cur:
              cur.execute(
                  """
                  INSERT INTO seismic_events
                      (sensor_id, magnitude, depth_km,
                       latitude, longitude,
                       duration_seconds, epicenter_description)
                  VALUES (%s, %s, %s, %s, %s, %s, %s)
                  """,
                  (
                      clean["sensor_id"], clean["magnitude"], clean["depth_km"],
                      clean["latitude"], clean["longitude"],
                      clean["duration_seconds"], clean["epicenter_description"],
                  )
              )
              event_id = cur.lastrowid
          conn.commit()

          entry.update({
              "status": "INSERTED",
              "event_id": event_id,
              "magnitude": magnitude,
              "note": "Evenement critique insere — triggers MySQL executes (alerte auto).",
          })
          inserted += 1

      except pymysql.Error as e:
          conn.rollback()
          entry.update({"status": "ERROR", "magnitude": magnitude, "reason": str(e)})
          errored += 1

      results.append(entry)

    http_status = 200 if errored == 0 else 207
    return jsonify({
        "success": errored == 0,
        "file_processed": safe_path,
        "total_events": len(raw_events),
        "summary": {
            "inserted": inserted,
            "skipped": skipped,
            "errors": errored,
        },
        "results": results,
    }), http_status


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Route introuvable"}), 404


@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Methode HTTP non autorisee"}), 405


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=True
    )